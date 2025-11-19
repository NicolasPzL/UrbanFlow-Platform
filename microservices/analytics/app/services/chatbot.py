"""
Main chatbot service for UrbanFlow Platform
Orchestrates LLM interactions, SQL generation, and ML analysis
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import json
import os
import re

from .query_builder import QueryBuilder
from .context_manager import ConversationContext
from ..core.prompts import (
    SQL_AGENT_PROMPT,
    ANALYSIS_PROMPT,
    REPORT_PROMPT,
    SYSTEM_CONTEXT,
    EXAMPLE_QUERIES
)
from ..db.schema_info import format_schema_for_llm
from .ml import MLPredictionService
from .analytics import AnalyticsService
from .access_control import AccessControl
from .intent_router import IntentRouter, IntentMatch
from ..core import role_catalog


class ChatbotService:
    """
    Main chatbot service that handles natural language queries about
    the UrbanFlow cable car monitoring system.
    """
    
    def __init__(
        self,
        db: Session,
        llm_provider: str = "ollama",
        model_name: str = "llama3",
        enable_ml_analysis: bool = True,
        user_role: Optional[str] = None,
        extra_roles: Optional[List[str]] = None
    ):
        self.db = db
        self.llm_provider = llm_provider
        self.model_name = model_name
        self.enable_ml_analysis = enable_ml_analysis
        self.access_control = AccessControl(user_role, extra_roles)
        self.user_role = self.access_control.role
        self.role_info = self.access_control.role_info
        self.intent_router = IntentRouter(self.role_info)
        
        # Initialize services
        self.query_builder = QueryBuilder(db)
        self.ml_service = MLPredictionService(db) if enable_ml_analysis else None
        self.analytics_service = AnalyticsService(db)
        
        # Initialize LLM client
        self.llm_client = None
        self._initialize_llm()
    
    def _initialize_llm(self):
        """Initialize the LLM client based on provider"""
        try:
            print(f"Initializing LLM with provider: {self.llm_provider}, model: {self.model_name}")
            
            if self.llm_provider != "ollama":
                raise ValueError(
                    "Este servicio solo admite Ollama. Ajusta LLM_PROVIDER=ollama en tu configuración."
                )

            from langchain_community.chat_models import ChatOllama
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            print(f"Connecting to Ollama at: {base_url}")
            self.llm_client = ChatOllama(
                model=self.model_name,
                base_url=base_url,
                temperature=0.1
            )
            print("Ollama client initialized successfully")
        except (ImportError, ValueError) as e:
            print(f"Warning: Could not initialize LLM client: {e}")
            print(
                "Chatbot will run in limited mode without LLM capabilities. "
                "Verifica la configuración de Ollama."
            )
            self.llm_client = None
    
    def process_query(
        self,
        question: str,
        context: Optional[ConversationContext] = None,
        include_ml_analysis: bool = False
    ) -> Dict[str, Any]:
        """
        Process a natural language question and return a structured response.
        
        Args:
            question: User's question in natural language
            context: Optional conversation context
            include_ml_analysis: Whether to include ML predictions in response
        
        Returns:
            Dictionary with response, data, query_type, etc.
        """
        print("\n" + "="*80)
        print("[CHATBOT] Iniciando procesamiento de consulta")
        print("="*80)
        print(f"[CHATBOT] Pregunta del usuario: {question}")
        print(f"[CHATBOT] Incluir análisis ML: {include_ml_analysis}")
        print(f"[CHATBOT] Contexto disponible: {context is not None}")
        print(f"[CHATBOT] Rol del usuario: {self.user_role}")
        
        try:
            # Verificar políticas por rol antes de cualquier otro procesamiento
            is_allowed_question, deny_message = self.access_control.check_question(question)
            if not is_allowed_question:
                print(f"[CHATBOT] Bloqueado por política de acceso: {deny_message}")
                return self._deny_access(deny_message, "policy_block")

            if self.role_info and self.role_info.name == "ciudadano":
                include_ml_analysis = False
                print("[CHATBOT] Deshabilitando análisis ML para perfil ciudadano")

            intent_match = self.intent_router.match(question)
            if intent_match:
                print(
                    f"[CHATBOT] Pregunta resuelta vía intent router "
                    f"(intent_id={intent_match.entry.id}, score={intent_match.confidence:.3f})"
                )
                return self._handle_intent_result(intent_match, context)

            if self.access_control.should_use_role_catalog(question):
                print("[CHATBOT] Pregunta sobre roles detectada - usando catálogo estático")
                return self._handle_role_question(question)

            # Verificar seguridad ANTES de procesar
            print("\n[CHATBOT] Paso 0: Verificando seguridad de la consulta...")
            is_dangerous, danger_message = self._detect_dangerous_operations(question)
            if is_dangerous:
                print(f"[CHATBOT] ⚠️  ALERTA DE SEGURIDAD: {danger_message}")
                print("[CHATBOT] Bloqueando consulta - Operación no permitida")
                return {
                    "success": False,
                    "response": "Lo siento, no puedo ejecutar operaciones de eliminación, modificación o creación de datos. Solo puedo ayudarte con consultas de lectura (SELECT) para analizar información existente.\n\nPuedo ayudarte con:\n• Consultar información existente\n• Ver estadísticas y promedios\n• Analizar datos históricos\n• Generar reportes",
                    "query_type": "security_block",
                    "error": danger_message
                }
            print("[CHATBOT] Consulta segura ✓")
            
            # Build context from question
            print("\n[CHATBOT] Paso 1: Analizando contexto de la pregunta...")
            query_context = self.query_builder.build_context_dict(question)
            print(f"[CHATBOT] Contexto extraído: {query_context}")
            
            # Determine query type - mejorar detección de preguntas informacionales
            query_type = query_context["query_type"]
            
            # Verificación adicional para preguntas informacionales
            question_lower = question.lower()
            informational_patterns = [
                'que hace', 'que es', 'que hace urbanflow', 'que es urbanflow',
                'what does', 'what is', 'what does urbanflow', 'what is urbanflow',
                'como funciona', 'how does', 'explain', 'describe', 'help'
            ]
            if any(pattern in question_lower for pattern in informational_patterns):
                query_type = 'informational'
                print(f"[CHATBOT] Pregunta informacional detectada por patrón adicional")
            
            print(f"\n[CHATBOT] Paso 2: Tipo de consulta identificado: {query_type}")
            
            # Route to appropriate handler
            print(f"\n[CHATBOT] Paso 3: Enrutando a handler específico...")
            if query_type == "informational":
                return self._handle_informational_query(question, query_context, context)
            elif query_type == "prediction":
                return self._handle_prediction_query(question, query_context, context)
            elif query_type == "analysis":
                return self._handle_analysis_query(question, query_context, context)
            elif query_type == "report":
                return self._handle_report_query(question, query_context, context)
            else:
                return self._handle_data_query(question, query_context, context)
        
        except Exception as e:
            print(f"\n[CHATBOT] ERROR en procesamiento: {e}")
            import traceback
            print(f"[CHATBOT] Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "response": "Lo siento, en este momento no tengo esa información disponible. Por favor, contacta con soporte técnico para que puedan ayudarte con tu consulta o actualizarme con esa información.",
                "error": str(e),
                "query_type": "error"
            }
    
    def _handle_informational_query(
        self,
        question: str,
        query_context: Dict[str, Any],
        context: Optional[ConversationContext]
    ) -> Dict[str, Any]:
        """Handle informational questions about the system that don't require SQL"""
        
        if not self.llm_client:
            # Fallback response without LLM
            return {
                "success": True,
                "response": """UrbanFlow Platform es un sistema integral de monitoreo y análisis de teleféricos. Proporciona:

• Monitoreo en tiempo real de cabinas y sensores del teleférico
• Análisis de vibraciones y detección de anomalías
• Insights de mantenimiento predictivo usando machine learning
• Análisis de datos históricos y generación de reportes
• Monitoreo de salud del sistema y alertas

Puedo ayudarte a consultar datos, analizar tendencias, generar reportes y responder preguntas sobre la operación del sistema.""",
                "query_type": "informational"
            }
        
        try:
            informational_prompt = f"""Eres un asistente para UrbanFlow Platform, un sistema de monitoreo y análisis de teleféricos.

El usuario preguntó: "{question}"

Proporciona una respuesta clara e informativa sobre qué hace UrbanFlow Platform y sus capacidades.
NO generes consultas SQL para preguntas informativas. Enfócate en explicar:
- Qué es el sistema y qué hace
- Características y capacidades clave
- Cómo ayuda a monitorear las operaciones del teleférico
- Qué tipo de datos e insights proporciona

Mantén la respuesta concisa, amigable e informativa. Responde SIEMPRE en español."""

            from langchain_core.messages import HumanMessage
            
            response = self.llm_client.invoke([HumanMessage(content=informational_prompt)])
            return {
                "success": True,
                "response": response.content.strip(),
                "query_type": "informational"
            }
        
        except Exception as e:
            print(f"Error handling informational query: {e}")
            return {
                "success": True,
                "response": """UrbanFlow Platform es un sistema integral de monitoreo y análisis de teleféricos que proporciona monitoreo en tiempo real, análisis de vibraciones, insights de mantenimiento predictivo y análisis de datos históricos para las operaciones del teleférico.""",
                "query_type": "informational"
            }
    
    def _handle_data_query(
        self,
        question: str,
        query_context: Dict[str, Any],
        context: Optional[ConversationContext]
    ) -> Dict[str, Any]:
        """Handle direct data queries that can be answered with SQL"""
        print("\n[CHATBOT] Handler: Consulta de datos (data_query)")
        
        # Generate SQL query using LLM
        print("\n[CHATBOT] Paso 4: Generando consulta SQL con LLM...")
        sql_query = self._generate_sql_query(question, query_context, context)
        
        if not sql_query:
            print("[CHATBOT] ERROR: No se pudo generar la consulta SQL")
            return {
                "success": False,
                "response": "Lo siento, en este momento no tengo esa información disponible. Por favor, contacta con soporte técnico para que puedan ayudarte con tu consulta o actualizarme con esa información.",
                "query_type": "data_query"
            }
        
        print(f"[CHATBOT] Consulta SQL generada:")
        print(f"[CHATBOT] {sql_query}")

        is_allowed_sql, deny_message = self.access_control.check_sql(sql_query)
        if not is_allowed_sql:
            print(f"[CHATBOT] Bloqueado por política de SQL: {deny_message}")
            return self._deny_access(deny_message, "policy_block")
        
        # Validar que la consulta generada es realmente SQL
        sql_query_upper = sql_query.upper().strip()
        if not sql_query_upper.startswith('SELECT'):
            print(f"[CHATBOT] ADVERTENCIA: El LLM no generó SQL válido, parece ser texto explicativo")
            print(f"[CHATBOT] Redirigiendo a handler informacional...")
            # Si no es SQL válido, tratar como pregunta informacional
            return self._handle_informational_query(question, query_context, context)
        
        # Execute query
        print("\n[CHATBOT] Paso 5: Ejecutando consulta SQL en la base de datos...")
        results = self.query_builder.execute_query(sql_query)
        
        # Debug logging
        print(f"[CHATBOT] Resultado de ejecución:")
        print(f"[CHATBOT]   - Éxito: {results.get('success')}")
        print(f"[CHATBOT]   - Filas encontradas: {results.get('row_count', 0)}")
        print(f"[CHATBOT]   - Columnas: {results.get('columns', [])}")
        if results.get("success") and results.get("data"):
            print(f"[CHATBOT]   - Muestra primera fila: {str(results['data'][0])[:200] if results['data'] else 'No data'}")
        
        if not results["success"]:
            error_msg = results['error']
            print(f"\n[CHATBOT] ERROR en ejecución SQL:")
            print(f"[CHATBOT]   - Mensaje: {error_msg}")
            print(f"[CHATBOT]   - Consulta fallida: {sql_query}")
            
            # Log específico para errores conocidos para mejor debugging
            if "does not exist" in error_msg or "UndefinedColumn" in error_msg:
                print("[CHATBOT] Hints para corregir el error:")
                if "estado_actual" in error_msg and "cabina_estado_hist" in error_msg:
                    print("[CHATBOT]   - cabina_estado_hist usa columna 'estado', no 'estado_actual'")
                elif "medicion_id" in error_msg and "telemetria_cruda" in error_msg:
                    print("[CHATBOT]   - telemetria_cruda NO tiene medicion_id. predicciones solo se relaciona con mediciones")
                elif "clase_predicha" in error_msg and ("telemetria_cruda" in error_msg or ("m." in error_msg and "telemetria_cruda" in sql_query.lower())):
                    print("[CHATBOT]   - clase_predicha solo está disponible a través de predicciones, que solo se relaciona con mediciones")
                elif "clase_predicha" in error_msg and ("mediciones" in error_msg or "m." in error_msg):
                    print("[CHATBOT]   - clase_predicha solo está en tabla predicciones, no en mediciones. Necesitas JOIN con predicciones")
            
            print("\n[CHATBOT] Retornando respuesta de error al usuario")
            return {
                "success": False,
                "response": "Lo siento, en este momento no tengo esa información disponible. Por favor, contacta con soporte técnico para que puedan ayudarte con tu consulta o actualizarme con esa información.",
                "query_type": "data_query",
                # No incluir sql_query ni error en la respuesta
            }
        
        # Format response using LLM (but don't wait if it takes too long)
        print("\n[CHATBOT] Paso 6: Formateando respuesta con LLM...")
        try:
            response_text = self._format_data_response(question, results)
            print(f"[CHATBOT] Respuesta formateada (primeros 200 chars): {response_text[:200]}...")
        except Exception as e:
            print(f"[CHATBOT] ERROR al formatear respuesta con LLM: {e}")
            print("[CHATBOT] Usando formateo simple como fallback...")
            # Fallback to simple formatting
            response_text = self.query_builder.format_results_as_text(results)
        
        # Ensure data is properly serialized
        print("\n[CHATBOT] Paso 7: Preparando respuesta final...")
        response_data = {
            "success": True,
            "response": response_text,
            "query_type": "data_query",
            "data": results.get("data", []),
            "row_count": results.get("row_count", 0),
            "columns": results.get("columns", [])
        }
        
        # Debug: Log response structure
        print(f"[CHATBOT] Respuesta preparada:")
        print(f"[CHATBOT]   - Éxito: {response_data['success']}")
        print(f"[CHATBOT]   - Filas: {response_data['row_count']}")
        print(f"[CHATBOT]   - Columnas: {len(response_data['columns'])}")
        if response_data["data"]:
            print(f"[CHATBOT]   - Claves primera fila: {list(response_data['data'][0].keys())[:5]}")
        
        print("\n" + "="*80)
        print("[CHATBOT] Procesamiento completado exitosamente")
        print("="*80 + "\n")
        
        return response_data
    
    def _handle_role_question(
        self,
        question: str,
        context: Optional[ConversationContext] = None
    ) -> Dict[str, Any]:
        """Responde preguntas sobre roles usando el catálogo estático."""

        roles = role_catalog.list_roles()
        is_citizen = self.role_info and self.role_info.name == "ciudadano"

        lines = [
            "Estos son los roles oficiales definidos en UrbanFlow Platform:",
            ""
        ]

        for role in roles:
            if is_citizen and role.sensitive_access:
                lines.append(
                    f"• {role.name.title()}: Perfil interno del personal autorizado. "
                    "Gestiona aspectos técnicos y está restringido al equipo operativo."
                )
                continue

            lines.append(
                f"• {role.name.title()}: {role.description} "
                f"(Público objetivo: {role.audience})."
            )

        if is_citizen:
            lines.append("")
            lines.append(
                "Como ciudadano puedes acceder a información pública del servicio y "
                "recibir recomendaciones de uso. Cualquier información técnica o "
                "operativa detallada es gestionada por el personal autorizado."
            )

        response_text = "\n".join(lines)
        return {
            "success": True,
            "response": response_text,
            "query_type": "role_info"
        }

    def _handle_intent_result(
        self,
        intent_match: IntentMatch,
        context: Optional[ConversationContext]
    ) -> Dict[str, Any]:
        """Gestiona respuestas provenientes del intent router."""

        entry = intent_match.entry
        response_type = entry.response_type.lower()

        if response_type == "static":
            response_text = entry.answer or "La información solicitada está disponible en la documentación oficial."
            return {
                "success": True,
                "response": response_text,
                "query_type": entry.query_type,
                "intent_id": entry.id,
                "intent_confidence": intent_match.confidence,
            }

        if response_type == "role_catalog":
            return self._handle_role_question(entry.primary_question, context)

        if response_type == "sql":
            if not entry.sql:
                return self._deny_access(
                    "La consulta pre-configurada no está disponible en este momento.",
                    "config_error"
                )

            is_allowed_sql, deny_message = self.access_control.check_sql(entry.sql)
            if not is_allowed_sql:
                print(f"[CHATBOT] Intent router SQL bloqueado: {deny_message}")
                return self._deny_access(deny_message, "policy_block")

            results = self.query_builder.execute_query(entry.sql)
            if not results.get("success"):
                return {
                    "success": False,
                    "response": "No fue posible obtener la información solicitada en este momento. Inténtalo más tarde.",
                    "query_type": entry.query_type,
                    "intent_id": entry.id,
                    "intent_confidence": intent_match.confidence,
                }

            response_text: Optional[str] = None
            if entry.answer_template and results.get("data"):
                try:
                    context_row = dict(results["data"][0])
                    context_row["row_count"] = results.get("row_count", 0)
                    response_text = entry.answer_template.format(**context_row)
                except Exception:
                    response_text = self.query_builder.format_results_as_text(results)
            else:
                response_text = self.query_builder.format_results_as_text(results)

            return {
                "success": True,
                "response": response_text,
                "query_type": entry.query_type,
                "intent_id": entry.id,
                "intent_confidence": intent_match.confidence,
                "data": results.get("data", []),
                "row_count": results.get("row_count", 0),
                "columns": results.get("columns", []),
            }

        # Desconocido: responder de forma amistosa
        return {
            "success": True,
            "response": entry.answer or "Puedo ayudarte con preguntas generales sobre el sistema o el servicio.",
            "query_type": entry.query_type,
            "intent_id": entry.id,
            "intent_confidence": intent_match.confidence,
        }

    def _deny_access(self, message: str, code: str) -> Dict[str, Any]:
        """Construye una respuesta uniforme cuando se bloquea por políticas."""

        return {
            "success": False,
            "response": message,
            "query_type": code,
            "error": "policy_violation"
        }
    
    def _handle_prediction_query(
        self,
        question: str,
        query_context: Dict[str, Any],
        context: Optional[ConversationContext]
    ) -> Dict[str, Any]:
        """Handle prediction-related queries using ML models"""
        
        if not self.ml_service:
            return {
                "success": False,
                "response": "Lo siento, en este momento no tengo esa información disponible. Por favor, contacta con soporte técnico para que puedan ayudarte con tu consulta o actualizarme con esa información.",
                "query_type": "prediction"
            }
        
        # Extract relevant context
        sensor_id = query_context.get("sensor_id")
        cabina_id = query_context.get("cabina_id")
        
        # Get system health or specific sensor health
        if sensor_id:
            health_data = self.ml_service.get_sensor_health_summary(sensor_id)
            response_text = self._format_prediction_response(
                question, health_data, sensor_id=sensor_id
            )
            return {
                "success": True,
                "response": response_text,
                "query_type": "prediction",
                "data": health_data,
                "sensor_id": sensor_id
            }
        else:
            # General system health
            summary = self.analytics_service.summary()
            response_text = self._format_system_health_response(question, summary)
            return {
                "success": True,
                "response": response_text,
                "query_type": "prediction",
                "data": summary
            }
    
    def _handle_analysis_query(
        self,
        question: str,
        query_context: Dict[str, Any],
        context: Optional[ConversationContext]
    ) -> Dict[str, Any]:
        """Handle analytical queries that require interpretation"""
        
        # First, get relevant data via SQL
        sql_query = self._generate_sql_query(question, query_context, context)
        
        if sql_query:
            is_allowed_sql, deny_message = self.access_control.check_sql(sql_query)
            if not is_allowed_sql:
                print(f"[CHATBOT] Bloqueado por política durante análisis: {deny_message}")
                return self._deny_access(deny_message, "policy_block")

            results = self.query_builder.execute_query(sql_query)
            if results["success"] and results["row_count"] > 0:
                # Use LLM to analyze the data
                analysis = self._generate_analysis(question, results)
                return {
                    "success": True,
                    "response": analysis,
                    "query_type": "analysis",
                    # No incluir sql_query en la respuesta
                    "data": results["data"]
                }
        
        # Fall back to using analytics service
        summary = self.analytics_service.summary()
        analysis = self._generate_analysis_from_summary(question, summary)
        
        return {
            "success": True,
            "response": analysis,
            "query_type": "analysis",
            "data": summary
        }
    
    def _handle_report_query(
        self,
        question: str,
        query_context: Dict[str, Any],
        context: Optional[ConversationContext]
    ) -> Dict[str, Any]:
        """Handle report generation requests"""
        
        # Get comprehensive system data
        summary = self.analytics_service.summary()
        health_data = self.analytics_service.get_system_health()
        
        # Generate structured report using LLM
        report = self._generate_report(question, summary, health_data)
        
        return {
            "success": True,
            "response": report,
            "query_type": "report",
            "data": {
                "summary": summary,
                "health": health_data
            }
        }
    
    def _generate_sql_query(
        self,
        question: str,
        query_context: Dict[str, Any],
        context: Optional[ConversationContext]
    ) -> Optional[str]:
        """Generate SQL query from natural language using LLM"""
        
        print(f"[CHATBOT] Generando consulta SQL...")
        print(f"[CHATBOT]   - LLM disponible: {self.llm_client is not None}")
        
        if not self.llm_client:
            print("[CHATBOT] LLM no disponible, usando consultas sugeridas...")
            # Fallback: use suggested queries
            suggestions = self.query_builder.get_suggested_queries(query_context)
            if suggestions:
                print(f"[CHATBOT] Consulta sugerida: {suggestions[0]}")
                return suggestions[0]
            else:
                print("[CHATBOT] No hay consultas sugeridas disponibles")
                return None
        
        try:
            # Build prompt with schema and examples
            print("[CHATBOT] Construyendo prompt para LLM...")
            schema_info = format_schema_for_llm(self.db)
            print(f"[CHATBOT] Schema info obtenido ({len(schema_info)} caracteres)")
            
            prompt = f"""{SQL_AGENT_PROMPT}

{schema_info}

{EXAMPLE_QUERIES}

═══════════════════════════════════════════════════════════════════════════════
PREGUNTA DEL USUARIO: {question}
═══════════════════════════════════════════════════════════════════════════════

IMPORTANTE: Si la pregunta es sobre "cuántas cabinas están operativas/en alerta":
- USA SOLO: SELECT COUNT(*) FROM cabina_estado_hist WHERE estado = 'operativa' (o 'alerta')
- NO uses JOIN con mediciones
- NO uses m.estado_actual
- NO agregues filtros de tiempo

IMPORTANTE: Si la pregunta es sobre "últimas N mediciones" o "muéstrame mediciones":
- USA SOLO: SELECT * FROM mediciones ORDER BY medicion_id DESC LIMIT N
- NO uses JOIN con sensores ni cabinas
- NO filtres por sensor_id (solo hay un sensor)
- NO uses s.codigo_interno (sensores NO tiene codigo_interno)
- NO uses m.cabina_id (mediciones NO tiene cabina_id, solo tiene sensor_id)
- La relación correcta es: mediciones.sensor_id → sensores.sensor_id → sensores.cabina_id → cabinas.cabina_id

Genera SOLO la consulta SQL (sin explicaciones). La consulta debe:
1. Usar sintaxis PostgreSQL correcta
2. Incluir JOINs apropiados si se necesitan múltiples tablas
3. Filtrar por tiempo SOLO si el usuario explícitamente solicita "últimas X horas/días":
   - Si pregunta "promedio de RMS" sin especificar tiempo: SELECT AVG(rms) FROM mediciones (SIN WHERE)
   - Si pregunta "promedio de RMS de las últimas 24 horas": SELECT AVG(rms) FROM mediciones WHERE timestamp >= NOW() - INTERVAL '24 hours'
   - CRÍTICO: NO agregues filtros de tiempo automáticamente si el usuario no los solicita
4. Usar LIMIT solo cuando sea necesario:
   - Si el usuario solicita "todos", "completo", "sin límite": NO uses LIMIT
   - Para agregaciones (COUNT, SUM, AVG, etc.): NO uses LIMIT directamente con la función de agregación
   - CRÍTICO: Para "promedio de las últimas N mediciones", usa SUBCONSULTA:
     ✅ CORRECTO: SELECT AVG(columna) FROM (SELECT columna FROM tabla ORDER BY medicion_id DESC LIMIT N) AS subquery
     ❌ INCORRECTO: SELECT AVG(columna) FROM tabla ORDER BY medicion_id DESC LIMIT N
   - Para consultas exploratorias iniciales: LIMIT 100-1000 es razonable
   - Para consultas específicas con WHERE: evalúa si LIMIT es necesario
5. CRÍTICO - TIPOS DE DATOS: Usa los tipos correctos en comparaciones:
   - codigo_interno es VARCHAR: usa comillas codigo_interno = '1' NO codigo_interno = 1
   - estado_actual es VARCHAR: usa comillas estado_actual = 'operativo'
   - sensor_id, cabina_id, medicion_id son INTEGER: NO uses comillas sensor_id = 1
   - Valores numéricos (rms, kurtosis, etc.) son NUMERIC: NO uses comillas rms > 5.0
6. Ser segura de ejecutar (solo SELECT)
7. Si necesitas explorar la estructura, usa information_schema

Consulta SQL:"""
            
            print("[CHATBOT] Invocando LLM para generar consulta SQL...")
            from langchain_core.messages import HumanMessage, SystemMessage
            
            messages = [
                SystemMessage(content=SQL_AGENT_PROMPT),
                HumanMessage(content=prompt)
            ]
            
            response = self.llm_client.invoke(messages)
            sql_query_raw = response.content.strip()
            print(f"[CHATBOT] Respuesta cruda del LLM ({len(sql_query_raw)} caracteres):")
            print(f"[CHATBOT] {sql_query_raw[:300]}...")
            
            # Clean up response (remove markdown, explanations, etc.)
            sql_query = self._clean_sql_response(sql_query_raw)
            
            # Validar que la consulta generada sea segura (solo SELECT)
            print(f"[CHATBOT] Validando tipo de consulta generada...")
            is_valid_type, type_error = self._validate_query_type(sql_query)
            if not is_valid_type:
                print(f"[CHATBOT] ⚠️  ERROR: {type_error}")
                print(f"[CHATBOT] Consulta bloqueada por seguridad")
                return None
            
            sql_query = sql_query.strip()
            print(f"[CHATBOT] Consulta SQL final generada ({len(sql_query)} caracteres)")
            
            return sql_query
        
        except Exception as e:
            print(f"[CHATBOT] ERROR generando consulta SQL: {e}")
            import traceback
            print(f"[CHATBOT] Traceback: {traceback.format_exc()}")
            # Si hay un error de columna, intentar sugerir una corrección
            error_str = str(e)
            if "does not exist" in error_str or "UndefinedColumn" in error_str:
                print(f"[CHATBOT] Error de columna detectado: {error_str}")
                # Intentar extraer la columna problemática y sugerir corrección
                if "estado_actual" in error_str and "cabina_estado_hist" in error_str:
                    print("[CHATBOT] Hint: cabina_estado_hist usa columna 'estado', no 'estado_actual'")
            return None
    
    def _detect_dangerous_operations(self, question: str) -> tuple[bool, str]:
        """
        Detectar operaciones peligrosas antes de generar SQL.
        Returns (is_dangerous, message)
        """
        question_lower = question.lower()
        
        dangerous_keywords = {
            'elimina': 'eliminación',
            'borra': 'eliminación',
            'delete': 'eliminación',
            'drop': 'eliminación de estructura',
            'truncate': 'eliminación masiva',
            'actualiza': 'modificación',
            'update': 'modificación',
            'modifica': 'modificación',
            'inserta': 'inserción',
            'insert': 'inserción',
            'crea': 'creación',
            'create': 'creación',
            'alter': 'modificación de estructura',
            'grant': 'permisos',
            'revoke': 'permisos'
        }
        
        for keyword, operation_type in dangerous_keywords.items():
            if keyword in question_lower:
                return True, f"Operación no permitida: {operation_type} (palabra clave: '{keyword}')"
        
        return False, "Consulta segura"
    
    def _clean_sql_response(self, llm_response: str) -> str:
        """
        Limpiar respuesta del LLM sin romper la consulta completa.
        Busca cualquier operación SQL (SELECT, DELETE, etc.) y mantiene la consulta completa.
        """
        # Remover markdown primero
        cleaned = llm_response.replace("```sql", "").replace("```", "").strip()
        
        # Buscar cualquier operación SQL (no solo SELECT)
        sql_pattern = r'\b(SELECT|DELETE|UPDATE|INSERT|WITH|CREATE|ALTER|DROP|TRUNCATE)\b'
        match = re.search(sql_pattern, cleaned, re.IGNORECASE)
        
        if match:
            start_index = match.start()
            sql_query = cleaned[start_index:]
            
            # Encontrar el final de la consulta (último punto y coma o fin de línea)
            # Buscar el último punto y coma que no esté dentro de comillas o paréntesis
            semicolon_pos = sql_query.rfind(';')
            if semicolon_pos != -1:
                sql_query = sql_query[:semicolon_pos + 1]
            else:
                # Si no hay punto y coma, buscar el final lógico
                # Eliminar líneas que parezcan explicaciones
                lines = sql_query.split('\n')
                cleaned_lines = []
                for line in lines:
                    line = line.strip()
                    if line and not line.lower().startswith(('here', 'this', 'the', 'query', 'answer', 'esta', 'esta consulta')):
                        cleaned_lines.append(line)
                sql_query = ' '.join(cleaned_lines)
            
            print(f"[CHATBOT] Operación SQL encontrada: {match.group(1)} en posición {start_index}")
            print(f"[CHATBOT] Limpiando respuesta (removiendo markdown y explicaciones)...")
            return sql_query.strip()
        
        # Si no se encuentra operación SQL, devolver tal cual (será rechazada en validación)
        print(f"[CHATBOT] ADVERTENCIA: No se encontró operación SQL en la respuesta del LLM")
        return cleaned
    
    def _validate_query_type(self, sql_query: str) -> tuple[bool, str]:
        """
        Validar que la consulta generada sea del tipo esperado (solo SELECT).
        Returns (is_valid, error_message)
        """
        if not sql_query or not sql_query.strip():
            return False, "Consulta vacía generada"
        
        sql_upper = sql_query.upper().strip()
        
        # Bloquear operaciones peligrosas
        dangerous_operations = ['DELETE', 'UPDATE', 'INSERT', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE']
        for operation in dangerous_operations:
            if sql_upper.startswith(operation):
                return False, f"Operación no permitida: {operation}. Solo se permiten consultas SELECT."
        
        # Asegurar que sea SELECT
        if not sql_upper.startswith('SELECT'):
            return False, f"Se esperaba SELECT pero se generó: {sql_upper.split()[0] if sql_upper.split() else 'N/A'}"
        
        return True, "Consulta válida"
    
    def _format_data_response(self, question: str, results: Dict[str, Any]) -> str:
        """Format query results into a natural language response"""
        
        if not self.llm_client:
            # Simple formatting without LLM
            return self.query_builder.format_results_as_text(results)
        
        try:
            results_text = self.query_builder.format_results_as_text(results)
            
            # Contexto adicional para interpretar mejor los resultados
            interpretation_guidance = ""
            
            # Detectar si hay valores NULL en agregaciones (AVG, MAX, MIN, etc.)
            if results.get("row_count") == 1 and results.get("data"):
                first_row = results["data"][0]
                has_null_aggregation = any(
                    key.lower() in ['avg', 'max', 'min', 'sum', 'promedio', 'maximo', 'minimo', 'suma'] 
                    and value is None 
                    for key, value in first_row.items()
                )
                if has_null_aggregation:
                    interpretation_guidance = "\nIMPORTANTE: El resultado contiene NULL, lo que significa que no hay datos disponibles para calcular esta agregación. Indica esto claramente al usuario."
            
            if results.get("row_count") == 1 and results.get("data"):
                # Si hay una sola fila con un COUNT u otra agregación, interpretarla correctamente
                first_row = results["data"][0]
                for key, value in first_row.items():
                    if 'count' in key.lower() or 'total' in key.lower() or 'cantidad' in key.lower():
                        interpretation_guidance = f"\n\nIMPORTANTE: El valor '{value}' en la columna '{key}' representa el resultado de una consulta de conteo o agregación. Si el valor es 0, significa que NO hay registros que cumplan la condición. Si el valor es mayor a 0, ese es el número real de registros encontrados."
                    elif value == 0 or value == 0.0:
                        interpretation_guidance = f"\n\nIMPORTANTE: El valor {value} en '{key}' indica que NO se encontraron registros que cumplan la condición. No asumas que esto significa que el sistema está fuera de servicio - simplemente no hay datos que cumplan los criterios específicos de la consulta."
            
            prompt = f"""Basándote en los siguientes resultados de la consulta, proporciona una respuesta clara y precisa en lenguaje natural a la pregunta del usuario.

Pregunta del Usuario: {question}

Resultados de la Consulta:
{results_text}
{interpretation_guidance}

IMPORTANTE:
- Si los resultados muestran un COUNT de 0, simplemente di que no se encontraron registros que cumplan esa condición específica, NO digas que el sistema está fuera de servicio o que hay un problema.
- Si hay valores numéricos, úsalos directamente en tu respuesta.
- Sé preciso y no hagas suposiciones sobre el estado general del sistema basándote solo en una consulta específica.
- Responde SIEMPRE en español.
- Sé conciso y directo."""
            
            from langchain_core.messages import HumanMessage, SystemMessage
            
            messages = [
                SystemMessage(content=ANALYSIS_PROMPT),
                HumanMessage(content=prompt)
            ]
            
            response = self.llm_client.invoke(messages)
            return response.content.strip()
        
        except Exception as e:
            print(f"Error formatting response: {e}")
            return self.query_builder.format_results_as_text(results)
    
    def _format_prediction_response(
        self,
        question: str,
        health_data: Dict[str, Any],
        sensor_id: Optional[int] = None
    ) -> str:
        """Format prediction/health data into natural language"""
        
        if not self.llm_client:
            # Simple formatting
            return f"Health data for sensor {sensor_id}: {json.dumps(health_data, indent=2)}"
        
        try:
            prompt = f"""Basándote en los siguientes datos de salud del sensor, proporciona una respuesta clara a la pregunta del usuario.

Pregunta del Usuario: {question}
ID del Sensor: {sensor_id if sensor_id else 'N/A'}

Datos de Salud:
{json.dumps(health_data, indent=2)}

Proporciona insights sobre:
1. Estado operativo actual
2. Tendencias preocupantes
3. Recomendaciones de mantenimiento si aplica

Responde SIEMPRE en español."""
            
            from langchain_core.messages import HumanMessage, SystemMessage
            
            messages = [
                SystemMessage(content=ANALYSIS_PROMPT),
                HumanMessage(content=prompt)
            ]
            
            response = self.llm_client.invoke(messages)
            return response.content.strip()
        
        except Exception as e:
            return f"Sensor health summary: {json.dumps(health_data)}"
    
    def _format_system_health_response(self, question: str, summary: Dict[str, Any]) -> str:
        """Format system-wide health summary"""
        
        if not self.llm_client:
            return f"System summary: {json.dumps(summary, indent=2)}"
        
        try:
            prompt = f"""Basándote en el siguiente resumen del sistema, proporciona una evaluación completa de salud.

Pregunta del Usuario: {question}

Datos del Sistema:
{json.dumps(summary, indent=2)}

Proporciona:
1. Estado general del sistema
2. Métricas clave y su significado
3. Áreas de preocupación
4. Recomendaciones si aplica

Responde SIEMPRE en español."""
            
            from langchain_core.messages import HumanMessage, SystemMessage
            
            messages = [
                SystemMessage(content=ANALYSIS_PROMPT),
                HumanMessage(content=prompt)
            ]
            
            response = self.llm_client.invoke(messages)
            return response.content.strip()
        
        except Exception as e:
            return f"System summary: {json.dumps(summary)}"
    
    def _generate_analysis(self, question: str, results: Dict[str, Any]) -> str:
        """Generate analytical insights from query results"""
        
        if not self.llm_client:
            return f"Analysis results: {json.dumps(results['data'][:5], indent=2)}"
        
        try:
            results_text = self.query_builder.format_results_as_text(results)
            
            # Contexto adicional para interpretar mejor los resultados
            interpretation_guidance = ""
            if results.get("row_count") == 1 and results.get("data"):
                first_row = results["data"][0]
                for key, value in first_row.items():
                    if 'count' in key.lower() or 'total' in key.lower() or 'cantidad' in key.lower():
                        interpretation_guidance = f"\n\nIMPORTANTE: El valor '{value}' en la columna '{key}' representa el resultado de una consulta de conteo. Si el valor es 0, significa que NO hay registros que cumplan la condición específica. Si el valor es mayor a 0, ese es el número real de registros encontrados."
                    elif value == 0 or value == 0.0:
                        interpretation_guidance = f"\n\nIMPORTANTE: El valor {value} en '{key}' indica que NO se encontraron registros que cumplan la condición. No asumas que esto significa que el sistema está fuera de servicio - simplemente no hay datos que cumplan los criterios específicos."
            
            prompt = f"""{ANALYSIS_PROMPT}

Pregunta del Usuario: {question}

Datos a Analizar:
{results_text}
{interpretation_guidance}

IMPORTANTE:
- Si los resultados muestran un COUNT de 0, simplemente di que no se encontraron registros que cumplan esa condición específica, NO digas que el sistema está fuera de servicio.
- Sé preciso y no hagas suposiciones sobre el estado general del sistema basándote solo en una consulta específica.

Proporciona:
1. Insights y patrones clave
2. Tendencias o anomalías
3. Implicaciones potenciales
4. Recomendaciones accionables

Responde SIEMPRE en español."""
            
            from langchain_core.messages import HumanMessage
            
            response = self.llm_client.invoke([HumanMessage(content=prompt)])
            return response.content.strip()
        
        except Exception as e:
            return f"Analysis: {json.dumps(results['data'][:5])}"
    
    def _generate_analysis_from_summary(self, question: str, summary: Dict[str, Any]) -> str:
        """Generate analysis from summary data"""
        
        return f"Basado en el resumen actual del sistema:\n\n{json.dumps(summary, indent=2)}"
    
    def _generate_report(
        self,
        question: str,
        summary: Dict[str, Any],
        health_data: Dict[str, Any]
    ) -> str:
        """Generate a structured report"""
        
        if not self.llm_client:
            return f"System Report:\n\nSummary: {json.dumps(summary, indent=2)}\n\nHealth: {json.dumps(health_data, indent=2)}"
        
        try:
            prompt = f"""{REPORT_PROMPT}

Solicitud del Usuario: {question}

Resumen del Sistema:
{json.dumps(summary, indent=2)}

Salud del Sistema:
{json.dumps(health_data, indent=2)}

Genera un reporte completo que aborde la solicitud del usuario."""
            
            from langchain_core.messages import HumanMessage
            
            response = self.llm_client.invoke([HumanMessage(content=prompt)])
            return response.content.strip()
        
        except Exception as e:
            return f"Report:\n\nSummary: {json.dumps(summary)}\n\nHealth: {json.dumps(health_data)}"
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Return information about chatbot capabilities"""
        if self.role_info and self.role_info.name == "ciudadano":
            return {
                "role": self.role_info.name,
                "capabilities": [
                    "Consultar el estado general del servicio de teleférico",
                    "Recibir avisos públicos y recomendaciones de uso",
                    "Conocer los roles oficiales y su propósito",
                ],
                "supported_queries": [
                    "¿El servicio del teleférico está operando con normalidad?",
                    "¿Cuántas cabinas están disponibles para pasajeros?",
                    "¿Qué roles existen en UrbanFlow y qué hace cada uno?",
                    "¿Qué recomendaciones de seguridad debo seguir?",
                ],
                "restrictions": (
                    "No se exponen datos personales ni información técnica avanzada. "
                    "Para detalles operativos se requiere un rol autorizado."
                ),
                "llm_provider": self.llm_provider,
                "model_name": self.model_name,
                "ml_analysis_enabled": False,
            }

        return {
            "role": self.role_info.name if self.role_info else self.user_role,
            "capabilities": [
                "Consultar datos históricos y en tiempo real de sensores",
                "Analizar salud del sistema y rendimiento operativo",
                "Generar insights predictivos y reportes técnicos",
                "Responder preguntas sobre operación y mantenimiento",
                "Identificar tendencias, anomalías y cabinas en riesgo",
            ],
            "supported_queries": [
                "¿Cuántas cabinas están en alerta actualmente?",
                "Muéstrame las últimas mediciones del sensor 1",
                "Promedio de RMS de las últimas 24 horas",
                "Genera un reporte de salud del sistema",
                "¿Qué cabinas necesitan mantenimiento preventivo?",
            ],
            "restrictions": (
                "El chatbot no accede a datos personales ni a la tabla de usuarios. "
                "Toda consulta se valida contra políticas de seguridad."
            ),
            "llm_provider": self.llm_provider,
            "model_name": self.model_name,
            "ml_analysis_enabled": self.enable_ml_analysis,
        }


