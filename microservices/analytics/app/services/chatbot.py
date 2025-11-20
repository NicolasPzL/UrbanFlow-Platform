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
    CHATBOT_MAIN_PROMPT,
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

            try:
                from langchain_ollama import ChatOllama
            except ImportError:
                # Fallback para versiones antiguas
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
        include_ml_analysis: bool = False,
        user_role: str = "cliente"
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
                print(f"[CHATBOT] [WARNING] ALERTA DE SEGURIDAD: {danger_message}")
                print("[CHATBOT] Bloqueando consulta - Operación no permitida")
                return {
                    "success": False,
                    "response": "Lo siento, no puedo ejecutar operaciones de eliminación, modificación o creación de datos. Solo puedo ayudarte con consultas de lectura (SELECT) para analizar información existente.\n\nPuedo ayudarte con:\n• Consultar información existente\n• Ver estadísticas y promedios\n• Analizar datos históricos\n• Generar reportes",
                    "query_type": "security_block",
                    "error": danger_message
                }
            print("[CHATBOT] Consulta segura [OK]")
            
            # Verificar permisos por rol ANTES de procesar
            print("\n[CHATBOT] Paso 1: Verificando permisos por rol...")
            access_check = self._check_role_access(question, user_role)
            if not access_check["allowed"]:
                print(f"[CHATBOT] [WARNING] ACCESO DENEGADO: {access_check['message']}")
                return {
                    "success": False,
                    "response": access_check["message"],
                    "query_type": "access_denied",
                    "user_role": user_role
                }
            print(f"[CHATBOT] Acceso permitido para rol: {user_role}")
            
            # Build context from question
            print("\n[CHATBOT] Paso 2: Analizando contexto de la pregunta...")
            query_context = self.query_builder.build_context_dict(question)
            print(f"[CHATBOT] Contexto extraído: {query_context}")
            
            # Determine query type using improved detection
            query_type = self._detect_query_type(question)
            query_context["query_type"] = query_type  # Update context with detected type
            
            print(f"\n[CHATBOT] Paso 3: Tipo de consulta identificado: {query_type}")
            
            # Route to appropriate handler
            print(f"\n[CHATBOT] Paso 4: Enrutando a handler específico...")
            if query_type == "informational":
                return self._handle_informational_query(question, query_context, context, user_role)
            elif query_type == "prediction":
                return self._handle_prediction_query(question, query_context, context, user_role)
            elif query_type == "analysis":
                return self._handle_analysis_query(question, query_context, context, user_role)
            elif query_type == "report":
                return self._handle_report_query(question, query_context, context, user_role)
            else:
                # 'data' o 'unknown' → tratar como data_query
                return self._handle_data_query(question, query_context, context, user_role)
        
        except Exception as e:
            print(f"\n[CHATBOT] ERROR en procesamiento: {e}")
            import traceback
            print(f"[CHATBOT] Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "response": "La información solicitada no está disponible en la base de datos ni en la documentación proporcionada.",
                "error": str(e),
                "query_type": "error"
            }
    
    def _handle_informational_query(
        self,
        question: str,
        query_context: Dict[str, Any],
        context: Optional[ConversationContext],
        user_role: str = "cliente"
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
            informational_prompt = f"""{CHATBOT_MAIN_PROMPT.format(user_role=user_role)}

El usuario preguntó: "{question}"

Esta es una pregunta TIPO B (documentada, no requiere SQL).

IMPORTANTE:
- Responde SOLO con información que esté en la documentación proporcionada.
- Si la documentación no cubre el tema, di claramente:
  "La información solicitada no está disponible en la base de datos ni en la documentación proporcionada."
- NO inventes información.
- NO uses conocimiento externo.
- Sé breve, directo y preciso.
- Responde SIEMPRE en español."""

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
        context: Optional[ConversationContext],
        user_role: str = "cliente"
    ) -> Dict[str, Any]:
        """Handle direct data queries that can be answered with SQL"""
        print("\n[CHATBOT] Handler: Consulta de datos (data_query)")
        
        # Generate SQL query using LLM
        print("\n[CHATBOT] Paso 5: Generando consulta SQL con LLM...")
        sql_query = self._generate_sql_query(question, query_context, context, user_role)
        
        if not sql_query:
            print("[CHATBOT] ERROR: No se pudo generar la consulta SQL")
            return {
                "success": False,
                "response": "No tengo suficiente información documentada o en la base de datos para responder eso con certeza.",
                "query_type": "data_query"
            }
        
        # Aplicar filtros por rol
        sql_query = self._apply_role_filters_to_sql(sql_query, user_role)
        
        print(f"[CHATBOT] Consulta SQL generada (con filtros de rol):")
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
            return self._handle_informational_query(question, query_context, context, user_role)
        
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
                "response": "La información solicitada no está disponible en la base de datos ni en la documentación proporcionada.",
                "query_type": "data_query",
                # No incluir sql_query ni error en la respuesta
            }
        
        # Format response - optimización para respuestas numéricas simples
        print("\n[CHATBOT] Paso 6: Formateando respuesta...")
        
        # OPTIMIZACIÓN: Si es una respuesta numérica simple (1 fila, 1 columna), no usar LLM
        row_count = results.get("row_count", 0)
        columns = results.get("columns", [])
        
        if row_count == 1 and len(columns) == 1 and results.get("data"):
            print("[CHATBOT] Respuesta numérica simple detectada, formateando sin LLM...")
            response_text = self._format_simple_numeric_response(question, results)
            print(f"[CHATBOT] Respuesta formateada (sin LLM): {response_text}")
        else:
            # Para respuestas complejas, usar LLM
            print("[CHATBOT] Respuesta compleja, usando LLM para formatear...")
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
        context: Optional[ConversationContext],
        user_role: str = "cliente"
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
        context: Optional[ConversationContext],
        user_role: str = "cliente"
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
        context: Optional[ConversationContext],
        user_role: str = "cliente"
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
        context: Optional[ConversationContext],
        user_role: str = "cliente"
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
            
            # Incluir restricciones de rol en el prompt
            role_restrictions = self._get_role_restrictions_prompt(user_role)
            
            prompt = f"""{CHATBOT_MAIN_PROMPT.format(user_role=user_role)}

{role_restrictions}

{SQL_AGENT_PROMPT}

{schema_info}

{EXAMPLE_QUERIES}

═══════════════════════════════════════════════════════════════════════════════
PREGUNTA DEL USUARIO: {question}
═══════════════════════════════════════════════════════════════════════════════

CRÍTICO - CONSULTAS DE ESTADOS DE CABINAS:
Si la pregunta es sobre "cuántas cabinas están operativas/en alerta/inusuales":
- REGLA ABSOLUTA: USA SOLO la tabla 'cabina_estado_hist', NUNCA la tabla 'cabinas'
- CORRECTO: SELECT COUNT(*) FROM cabina_estado_hist WHERE estado = 'operativa' (o 'alerta', 'inusual')
- INCORRECTO: SELECT COUNT(*) FROM cabinas WHERE estado = 'operativa' (la columna 'estado' NO EXISTE en 'cabinas')
- La tabla 'cabinas' tiene 'estado_actual', pero NO tiene 'estado'
- NO uses JOIN con mediciones
- NO uses m.estado_actual
- NO agregues filtros de tiempo a menos que el usuario lo solicite explícitamente

IMPORTANTE: Si la pregunta es sobre "últimas N mediciones" o "muéstrame mediciones":
- USA SOLO: SELECT * FROM mediciones ORDER BY medicion_id DESC LIMIT N
- NO uses JOIN con sensores ni cabinas
- NO filtres por sensor_id (solo hay un sensor)
- NO uses s.codigo_interno (sensores NO tiene codigo_interno)
- NO uses m.cabina_id (mediciones NO tiene cabina_id, solo tiene sensor_id)
- La relación correcta es: mediciones.sensor_id → sensores.sensor_id → sensores.cabina_id → cabinas.cabina_id

═══════════════════════════════════════════════════════════════════════════════
INSTRUCCIONES CRÍTICAS PARA GENERAR SQL:
═══════════════════════════════════════════════════════════════════════════════

TU ÚNICA TAREA: Devolver UNA sola sentencia SQL de solo lectura (SELECT) para responder la pregunta.

REGLAS ABSOLUTAS:
1. Devuelve ÚNICAMENTE la sentencia SQL, sin explicaciones, sin markdown, sin comentarios, sin texto adicional.
2. NO uses ```sql``` ni bloques de código.
3. NO escribas "Here is the SQL query" ni ningún texto antes o después.
4. NO uses múltiples sentencias ni punto y coma extra.
5. NO agregues comentarios dentro del SQL.

REQUISITOS TÉCNICOS:
- Usa sintaxis PostgreSQL correcta
- Solo SELECT (nunca DELETE, UPDATE, INSERT, etc.)
- Incluye JOINs apropiados si se necesitan múltiples tablas
- Filtra por tiempo SOLO si el usuario explícitamente solicita "últimas X horas/días"
- Usa LIMIT solo cuando sea necesario
- Usa tipos de datos correctos (VARCHAR con comillas, INTEGER sin comillas, NUMERIC sin comillas)

EJEMPLOS DE FORMATO CORRECTO:
✅ SELECT COUNT(*) FROM cabina_estado_hist WHERE estado = 'operativa';
✅ SELECT AVG(rms) FROM mediciones;
✅ SELECT * FROM mediciones ORDER BY medicion_id DESC LIMIT 10;

EJEMPLOS DE FORMATO INCORRECTO:
❌ "Here is the SQL: SELECT COUNT(*) FROM cabinas;"
❌ ```sql\nSELECT COUNT(*) FROM cabinas;\n```
❌ SELECT COUNT(*) FROM cabinas; -- This counts cabins
❌ SELECT COUNT(*) FROM cabinas; SELECT * FROM mediciones;

═══════════════════════════════════════════════════════════════════════════════

PREGUNTA DEL USUARIO: {question}

GENERA SOLO LA SENTENCIA SQL (sin nada más):"""
            
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
                print(f"[CHATBOT] [WARNING] ERROR: {type_error}")
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
        Limpiar respuesta del LLM para extraer SOLO la sentencia SQL.
        Elimina todo el texto extra, markdown, explicaciones, etc.
        """
        # Remover markdown primero
        cleaned = llm_response.replace("```sql", "").replace("```", "").strip()
        
        # Buscar SELECT (la única operación permitida)
        sql_pattern = r'\bSELECT\b'
        match = re.search(sql_pattern, cleaned, re.IGNORECASE)
        
        if match:
            start_index = match.start()
            sql_query = cleaned[start_index:]
            
            # Encontrar el final de la consulta (último punto y coma)
            semicolon_pos = sql_query.rfind(';')
            if semicolon_pos != -1:
                sql_query = sql_query[:semicolon_pos + 1]
            else:
                # Si no hay punto y coma, tomar hasta la primera línea que no parezca SQL
                lines = sql_query.split('\n')
                cleaned_lines = []
                for line in lines:
                    line = line.strip()
                    # Detener si encontramos texto que no parece SQL
                    if line and line.lower().startswith(('here', 'this', 'the', 'query', 'answer', 'esta', 'esta consulta', 'note:', 'important:')):
                        break
                    if line:
                        cleaned_lines.append(line)
                sql_query = ' '.join(cleaned_lines)
                # Agregar punto y coma si falta
                if not sql_query.endswith(';'):
                    sql_query += ';'
            
            print(f"[CHATBOT] SELECT encontrado en posición {start_index}")
            print(f"[CHATBOT] Limpiando respuesta (removiendo texto extra)...")
            return sql_query.strip()
        
        # Si no se encuentra SELECT, devolver tal cual (será rechazada en validación)
        print(f"[CHATBOT] ADVERTENCIA: No se encontró SELECT en la respuesta del LLM")
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
    
    def _format_simple_numeric_response(self, question: str, results: Dict[str, Any]) -> str:
        """
        Formatea respuestas numéricas simples (1 fila, 1 columna) sin usar LLM.
        Optimización para respuestas rápidas.
        """
        if not results.get("data") or len(results["data"]) == 0:
            return "No hay datos disponibles para esa consulta."
        
        first_row = results["data"][0]
        columns = results.get("columns", [])
        
        if len(columns) != 1:
            # Fallback si hay más de una columna
            return self.query_builder.format_results_as_text(results)
        
        column_name = columns[0]
        value = first_row.get(column_name)
        question_lower = question.lower()
        
        # Formatear según el tipo de columna y pregunta
        if value is None:
            return "No hay datos disponibles para calcular ese valor."
        
        # Para COUNT
        if 'count' in column_name.lower() or 'total' in column_name.lower() or 'cantidad' in column_name.lower():
            if value == 0:
                return "No se encontraron registros que cumplan esa condición."
            else:
                return f"Hay {value} registros que cumplen esa condición."
        
        # Para AVG/promedio
        if 'avg' in column_name.lower() or 'promedio' in column_name.lower():
            if 'promedio' in question_lower or 'average' in question_lower:
                return f"El promedio solicitado es {value:.4f}." if isinstance(value, (int, float)) else f"El promedio solicitado es {value}."
            else:
                return f"El resultado es: {value:.4f}." if isinstance(value, (int, float)) else f"El resultado es: {value}."
        
        # Para MAX
        if 'max' in column_name.lower() or 'maximo' in column_name.lower():
            return f"El valor máximo es {value:.4f}." if isinstance(value, (int, float)) else f"El valor máximo es {value}."
        
        # Para MIN
        if 'min' in column_name.lower() or 'minimo' in column_name.lower():
            return f"El valor mínimo es {value:.4f}." if isinstance(value, (int, float)) else f"El valor mínimo es {value}."
        
        # Para SUM
        if 'sum' in column_name.lower() or 'suma' in column_name.lower():
            return f"La suma es {value:.4f}." if isinstance(value, (int, float)) else f"La suma es {value}."
        
        # Respuesta genérica
        if isinstance(value, (int, float)):
            return f"El resultado es: {value:.4f}."
        else:
            return f"El resultado es: {value}."
    
    def _format_data_response(self, question: str, results: Dict[str, Any]) -> str:
        """Format query results into a natural language response using LLM"""
        
        if not self.llm_client:
            # Simple formatting without LLM
            return self.query_builder.format_results_as_text(results)
        
        try:
            results_text = self.query_builder.format_results_as_text(results)
            
            # Preparar datos para el prompt
            rows = results.get("data", [])
            columns = results.get("columns", [])
            row_count = results.get("row_count", 0)
            
            # Construir prompt mejorado (sin mencionar roles, tipos internos, etc.)
            prompt = f"""Eres un formateador de respuestas para un sistema de monitoreo.

Tu única tarea es construir una respuesta breve en español basada EXCLUSIVAMENTE en los resultados de una consulta SQL ya ejecutada.

Pregunta del usuario: {question}

Resultados de la consulta:
- Filas encontradas: {row_count}
- Columnas: {', '.join(columns) if columns else 'Ninguna'}
- Datos: {results_text}

REGLAS ESTRICTAS:
1. Responde SOLO con información que esté en los resultados proporcionados.
2. NO generes nuevas consultas SQL.
3. NO menciones tipos internos de consulta (tipo A, tipo B, etc.).
4. NO menciones el rol del usuario.
5. NO expliques el proceso interno.
6. NO inventes datos que no estén en los resultados.
7. Si no hay filas (row_count = 0), di claramente: "No hay datos disponibles para esa consulta."
8. Si hay valores NULL, indica que no hay datos disponibles.
9. Responde máximo en 2-3 frases.
10. Sé breve, directo y preciso.

Responde en español:"""
            
            from langchain_core.messages import HumanMessage, SystemMessage
            
            messages = [
                SystemMessage(content="Eres un formateador de respuestas. Tu única tarea es convertir resultados de consultas SQL en respuestas breves y claras en español."),
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
    
    def _get_role_restrictions_prompt(self, user_role: str) -> str:
        """Genera un prompt con las restricciones específicas del rol"""
        user_role_lower = user_role.lower()
        
        if user_role_lower == "cliente":
            return """
RESTRICCIONES ESPECÍFICAS PARA ROL CLIENTE:
- Solo puedes generar consultas con agregaciones (AVG, COUNT, SUM, MAX, MIN)
- NO generes SELECT * sin agregaciones
- NO uses tablas: telemetria_cruda, audit_log, auditoria, usuarios, modelos_ml
- Limita resultados a resúmenes generales
- Si el usuario pide detalles, sugiere una consulta agregada alternativa
"""
        elif user_role_lower == "operador":
            return """
RESTRICCIONES ESPECÍFICAS PARA ROL OPERADOR:
- Limita consultas a datos recientes (últimas 24 horas)
- NO generes consultas sobre históricos masivos
- NO uses tablas: audit_log, auditoria, usuarios
- Enfócate en estado actual y alertas
"""
        elif user_role_lower == "analista":
            return """
PERMISOS PARA ROL ANALISTA:
- Acceso a mediciones, telemetría, sensores, cabinas, predicciones, modelos
- Puedes consultar históricos grandes
- NO muestres datos sensibles de usuarios (password_hash, tokens)
"""
        else:  # admin
            return """
PERMISOS PARA ROL ADMIN:
- Acceso amplio a todas las tablas técnicas
- Puedes consultar mediciones completas, telemetría, predicciones, modelos ML, auditoría parcial
- NUNCA muestres contraseñas, hashes, tokens o información de seguridad
"""
    
    def _check_role_access(self, question: str, user_role: str) -> Dict[str, Any]:
        """
        Verifica si el usuario tiene permisos para realizar la consulta según su rol.
        Returns: {"allowed": bool, "message": str}
        """
        question_lower = question.lower()
        user_role_lower = user_role.lower()
        
        # Restricciones para rol CLIENTE
        if user_role_lower == "cliente":
            restricted_keywords = [
                "telemetria_cruda", "telemetría cruda", "raw telemetry",
                "auditoria", "auditoría", "audit",
                "usuarios", "users", "password", "contraseña",
                "modelos_ml", "modelos ml", "model details",
                "hash", "token", "credenciales"
            ]
            
            # Verificar si pregunta por datos detallados (no agregados)
            detail_keywords = [
                "muéstrame todas las", "show all", "todas las mediciones",
                "cada medición", "por fila", "detalle de"
            ]
            
            for keyword in restricted_keywords:
                if keyword in question_lower:
                    return {
                        "allowed": False,
                        "message": "Por tu rol de cliente no puedo mostrarte ese nivel de detalle, pero sí puedo darte un resumen general."
                    }
            
            for keyword in detail_keywords:
                if keyword in question_lower:
                    return {
                        "allowed": False,
                        "message": "Por tu rol de cliente no puedo mostrarte ese nivel de detalle, pero sí puedo darte un resumen general."
                    }
        
        # Restricciones para rol OPERADOR
        elif user_role_lower == "operador":
            restricted_keywords = [
                "histórico completo", "all history", "todos los registros históricos",
                "auditoria", "auditoría", "audit",
                "usuarios", "users", "password", "contraseña"
            ]
            
            for keyword in restricted_keywords:
                if keyword in question_lower:
                    return {
                        "allowed": False,
                        "message": "Por tu rol de operador no puedes acceder a históricos masivos ni a información de auditoría. Puedo ayudarte con datos recientes y alertas actuales."
                    }
        
        # ADMIN y ANALISTA tienen acceso amplio (pero nunca a contraseñas/hashes)
        if "password" in question_lower or "contraseña" in question_lower or "hash" in question_lower:
            return {
                "allowed": False,
                "message": "No puedo mostrar información de seguridad como contraseñas o hashes, independientemente del rol."
            }
        
        return {"allowed": True, "message": "Acceso permitido"}
    
    def _detect_query_type(self, question: str) -> str:
        """
        Detecta el tipo de pregunta de forma clara y precisa.
        Returns: 'informational', 'data', o 'unknown' (que se trata como 'data')
        """
        question_lower = question.lower().strip()
        
        # REGLAS PARA PREGUNTAS INFORMACIONALES (NO requieren SQL)
        informational_patterns = [
            # Patrones de "qué es" / "what is"
            'que es', 'qué es', 'what is',
            # Patrones de "qué significa" / "what means"
            'que significa', 'qué significa', 'what means', 'what does mean',
            # Patrones de explicación
            'explica', 'explícame', 'explicame', 'explain', 'describe',
            # Patrones de funcionamiento
            'como funciona', 'cómo funciona', 'how does', 'how works',
            # Patrones específicos de RMS u otros términos técnicos
            'que significa rms', 'qué significa rms', 'what means rms',
            'que es rms', 'qué es rms', 'what is rms',
            # Patrones de ayuda general
            'help', 'ayuda', 'que hace', 'qué hace'
        ]
        
        # Verificar si es informacional
        for pattern in informational_patterns:
            if pattern in question_lower:
                print(f"[CHATBOT] Patrón informacional detectado: '{pattern}'")
                return 'informational'
        
        # REGLAS PARA PREGUNTAS DE DATOS (SÍ requieren SQL)
        data_patterns = [
            # Patrones de mostrar/listar
            'muéstrame', 'muestrame', 'muestra', 'show', 'show me',
            'dame', 'dame', 'lista', 'listame', 'list', 'list me',
            # Patrones de conteo
            'cuántas', 'cuantos', 'cuántos', 'how many', 'how much',
            # Patrones de promedios/agregaciones
            'cuál es el promedio', 'cual es el promedio', 'promedio de',
            'average', 'avg', 'promedio',
            # Patrones temporales
            'últimas', 'ultimas', 'primeras', 'last', 'first',
            'histórico', 'historico', 'historical',
            # Patrones de comparación/análisis de datos
            'cuál es', 'cual es', 'what is the', 'what are the',
            'dónde', 'donde', 'where', 'cuando', 'cuándo', 'when'
        ]
        
        # Verificar si es de datos
        for pattern in data_patterns:
            if pattern in question_lower:
                print(f"[CHATBOT] Patrón de datos detectado: '{pattern}'")
                return 'data'
        
        # Si no coincide con ningún patrón claro, tratar como 'data' (fallback)
        print(f"[CHATBOT] No se detectó patrón específico, tratando como 'data' (fallback)")
        return 'data'
    
    def _apply_role_filters_to_sql(self, sql_query: str, user_role: str) -> str:
        """
        Aplica filtros adicionales a la consulta SQL según el rol del usuario.
        """
        user_role_lower = user_role.lower()
        sql_upper = sql_query.upper()
        
        # Para CLIENTE: solo agregaciones, no filas individuales
        if user_role_lower == "cliente":
            # Si no hay agregación (AVG, COUNT, SUM, MAX, MIN), agregar LIMIT muy restrictivo
            if not any(func in sql_upper for func in ["AVG(", "COUNT(", "SUM(", "MAX(", "MIN("]):
                if "LIMIT" not in sql_upper:
                    # Agregar LIMIT 10 para clientes
                    sql_query = sql_query.rstrip(";")
                    sql_query += " LIMIT 10;"
        
        # Para OPERADOR: limitar a datos recientes (últimas 24 horas)
        elif user_role_lower == "operador":
            if "WHERE" not in sql_upper and "mediciones" in sql_upper:
                # Agregar filtro de tiempo si no existe
                sql_query = sql_query.rstrip(";")
                if "ORDER BY" in sql_upper:
                    sql_query = sql_query.replace("ORDER BY", "WHERE timestamp >= NOW() - INTERVAL '24 hours' ORDER BY")
                else:
                    sql_query += " WHERE timestamp >= NOW() - INTERVAL '24 hours'"
                sql_query += ";"
        
        return sql_query
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Return information about chatbot capabilities"""
        return {
            "capabilities": [
                "Query real-time and historical sensor data",
                "Analyze system health and performance",
                "Generate predictive maintenance insights",
                "Create comprehensive reports",
                "Answer questions about cable car operations",
                "Identify trends and anomalies"
            ],
            "supported_queries": [
                "How many cabins are in alert status?",
                "Show me recent measurements from sensor 1",
                "What's the average RMS value today?",
                "Which sensors have high vibration levels?",
                "Generate a system health report",
                "Predict which cabins need maintenance",
                "Compare performance this week vs last week"
            ],
            "llm_provider": self.llm_provider,
            "model_name": self.model_name,
            "ml_analysis_enabled": self.enable_ml_analysis,
            "role_based_access": True
        }


