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
        enable_ml_analysis: bool = True
    ):
        self.db = db
        self.llm_provider = llm_provider
        self.model_name = model_name
        self.enable_ml_analysis = enable_ml_analysis
        
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
        try:
            # Build context from question
            query_context = self.query_builder.build_context_dict(question)
            
            # Determine query type
            query_type = query_context["query_type"]
            
            # Route to appropriate handler
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
            print(f"Error processing query: {e}")  # Log para debugging
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
        
        # Generate SQL query using LLM
        sql_query = self._generate_sql_query(question, query_context, context)
        
        if not sql_query:
            return {
                "success": False,
                "response": "Lo siento, en este momento no tengo esa información disponible. Por favor, contacta con soporte técnico para que puedan ayudarte con tu consulta o actualizarme con esa información.",
                "query_type": "data_query"
            }
        
        # Execute query
        results = self.query_builder.execute_query(sql_query)
        
        if not results["success"]:
            error_msg = results['error']
            # Log el error para debugging pero no lo expongas al usuario
            print(f"SQL execution error: {error_msg}")
            print(f"Query that failed: {sql_query}")
            
            # Log específico para errores conocidos para mejor debugging
            if "does not exist" in error_msg or "UndefinedColumn" in error_msg:
                if "estado_actual" in error_msg and "cabina_estado_hist" in error_msg:
                    print("Hint: cabina_estado_hist uses 'estado' column, not 'estado_actual'")
                elif "clase_predicha" in error_msg and ("mediciones" in error_msg or "m." in error_msg):
                    print("Hint: clase_predicha is only in predicciones table, not mediciones. Need JOIN with predicciones.")
            
            return {
                "success": False,
                "response": "Lo siento, en este momento no tengo esa información disponible. Por favor, contacta con soporte técnico para que puedan ayudarte con tu consulta o actualizarme con esa información.",
                "query_type": "data_query",
                "sql_query": sql_query,
                "error": results["error"]
            }
        
        # Format response using LLM
        response_text = self._format_data_response(question, results)
        
        return {
            "success": True,
            "response": response_text,
            "query_type": "data_query",
            "sql_query": sql_query,
            "data": results["data"],
            "row_count": results["row_count"],
            "columns": results["columns"]
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
            results = self.query_builder.execute_query(sql_query)
            if results["success"] and results["row_count"] > 0:
                # Use LLM to analyze the data
                analysis = self._generate_analysis(question, results)
                return {
                    "success": True,
                    "response": analysis,
                    "query_type": "analysis",
                    "sql_query": sql_query,
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
        
        if not self.llm_client:
            # Fallback: use suggested queries
            suggestions = self.query_builder.get_suggested_queries(query_context)
            return suggestions[0] if suggestions else None
        
        try:
            # Build prompt with schema and examples
            schema_info = format_schema_for_llm(self.db)
            
            prompt = f"""{SQL_AGENT_PROMPT}

{schema_info}

{EXAMPLE_QUERIES}

Pregunta del Usuario: {question}

Genera SOLO la consulta SQL (sin explicaciones). La consulta debe:
1. Usar sintaxis PostgreSQL correcta
2. Incluir JOINs apropiados si se necesitan múltiples tablas
3. Filtrar por tiempo si es relevante (usar INTERVAL para filtros basados en tiempo)
4. Limitar resultados apropiadamente
5. Ser segura de ejecutar (solo SELECT)

Consulta SQL:"""
            
            from langchain_core.messages import HumanMessage, SystemMessage
            
            messages = [
                SystemMessage(content=SQL_AGENT_PROMPT),
                HumanMessage(content=prompt)
            ]
            
            response = self.llm_client.invoke(messages)
            sql_query = response.content.strip()
            
            # Clean up response (remove markdown, explanations, etc.)
            # Remove markdown code blocks
            sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
            
            # Extract SQL query if there's explanatory text before/after
            # Look for SELECT statement (case insensitive)
            select_match = re.search(r'SELECT\s+', sql_query, re.IGNORECASE)
            if select_match:
                # Extract from SELECT onwards
                sql_query = sql_query[select_match.start():]
                # Remove everything after the last semicolon or end of query
                if ';' in sql_query:
                    sql_query = sql_query[:sql_query.rindex(';') + 1]
                else:
                    # Remove any trailing text that's not SQL
                    # Keep only up to the last valid SQL token
                    lines = sql_query.split('\n')
                    cleaned_lines = []
                    for line in lines:
                        line = line.strip()
                        if line and not line.lower().startswith(('here', 'this', 'the', 'query', 'answer')):
                            cleaned_lines.append(line)
                    sql_query = ' '.join(cleaned_lines)
            
            sql_query = sql_query.strip()
            
            return sql_query
        
        except Exception as e:
            print(f"Error generating SQL query: {e}")
            # Si hay un error de columna, intentar sugerir una corrección
            error_str = str(e)
            if "does not exist" in error_str or "UndefinedColumn" in error_str:
                print(f"SQL Error detected: {error_str}")
                # Intentar extraer la columna problemática y sugerir corrección
                if "estado_actual" in error_str and "cabina_estado_hist" in error_str:
                    print("Hint: cabina_estado_hist uses 'estado' column, not 'estado_actual'")
            return None
    
    def _format_data_response(self, question: str, results: Dict[str, Any]) -> str:
        """Format query results into a natural language response"""
        
        if not self.llm_client:
            # Simple formatting without LLM
            return self.query_builder.format_results_as_text(results)
        
        try:
            results_text = self.query_builder.format_results_as_text(results)
            
            prompt = f"""Basándote en los siguientes resultados de la consulta, proporciona una respuesta clara en lenguaje natural a la pregunta del usuario.

Pregunta del Usuario: {question}

Resultados de la Consulta:
{results_text}

Proporciona una respuesta concisa e informativa que responda directamente la pregunta. Incluye números clave e insights.
Responde SIEMPRE en español."""
            
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
            
            prompt = f"""{ANALYSIS_PROMPT}

Pregunta del Usuario: {question}

Datos a Analizar:
{results_text}

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
            "ml_analysis_enabled": self.enable_ml_analysis
        }


