"""
Main chatbot service for UrbanFlow Platform
Orchestrates LLM interactions, SQL generation, and ML analysis
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import json
import os

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

            from langchain_community.llms import Ollama
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            print(f"Connecting to Ollama at: {base_url}")
            self.llm_client = Ollama(
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
            if query_type == "prediction":
                return self._handle_prediction_query(question, query_context, context)
            elif query_type == "analysis":
                return self._handle_analysis_query(question, query_context, context)
            elif query_type == "report":
                return self._handle_report_query(question, query_context, context)
            else:
                return self._handle_data_query(question, query_context, context)
        
        except Exception as e:
            return {
                "success": False,
                "response": f"I encountered an error processing your question: {str(e)}",
                "error": str(e),
                "query_type": "error"
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
                "response": "I couldn't generate a valid SQL query for your question. Could you please rephrase it?",
                "query_type": "data_query"
            }
        
        # Execute query
        results = self.query_builder.execute_query(sql_query)
        
        if not results["success"]:
            return {
                "success": False,
                "response": f"I encountered an error executing the query: {results['error']}",
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
                "response": "ML analysis is not currently enabled.",
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

User Question: {question}

Generate ONLY the SQL query (no explanations). The query should:
1. Use proper PostgreSQL syntax
2. Include appropriate JOINs if multiple tables are needed
3. Filter by time if relevant (use INTERVAL for time-based filters)
4. Limit results appropriately
5. Be safe to execute (SELECT only)

SQL Query:"""
            
            from langchain.schema import HumanMessage, SystemMessage
            
            messages = [
                SystemMessage(content=SQL_AGENT_PROMPT),
                HumanMessage(content=prompt)
            ]
            
            response = self.llm_client.invoke(messages)
            sql_query = response.content.strip()
            
            # Clean up response (remove markdown, etc.)
            sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
            
            return sql_query
        
        except Exception as e:
            print(f"Error generating SQL query: {e}")
            return None
    
    def _format_data_response(self, question: str, results: Dict[str, Any]) -> str:
        """Format query results into a natural language response"""
        
        if not self.llm_client:
            # Simple formatting without LLM
            return self.query_builder.format_results_as_text(results)
        
        try:
            results_text = self.query_builder.format_results_as_text(results)
            
            prompt = f"""Based on the following data query results, provide a clear, natural language answer to the user's question.

User Question: {question}

Query Results:
{results_text}

Provide a concise, informative response that directly answers the question. Include key numbers and insights."""
            
            from langchain.schema import HumanMessage, SystemMessage
            
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
            prompt = f"""Based on the following sensor health data, provide a clear answer to the user's question.

User Question: {question}
Sensor ID: {sensor_id if sensor_id else 'N/A'}

Health Data:
{json.dumps(health_data, indent=2)}

Provide insights about:
1. Current operational status
2. Any concerning trends
3. Maintenance recommendations if applicable"""
            
            from langchain.schema import HumanMessage, SystemMessage
            
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
            prompt = f"""Based on the following system summary, provide a comprehensive health assessment.

User Question: {question}

System Data:
{json.dumps(summary, indent=2)}

Provide:
1. Overall system status
2. Key metrics and their significance
3. Any areas of concern
4. Recommendations if applicable"""
            
            from langchain.schema import HumanMessage, SystemMessage
            
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

User Question: {question}

Data to Analyze:
{results_text}

Provide:
1. Key insights and patterns
2. Trends or anomalies
3. Potential implications
4. Actionable recommendations"""
            
            from langchain.schema import HumanMessage
            
            response = self.llm_client.invoke([HumanMessage(content=prompt)])
            return response.content.strip()
        
        except Exception as e:
            return f"Analysis: {json.dumps(results['data'][:5])}"
    
    def _generate_analysis_from_summary(self, question: str, summary: Dict[str, Any]) -> str:
        """Generate analysis from summary data"""
        
        return f"Based on the current system summary:\n\n{json.dumps(summary, indent=2)}"
    
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

User Request: {question}

System Summary:
{json.dumps(summary, indent=2)}

System Health:
{json.dumps(health_data, indent=2)}

Generate a comprehensive report addressing the user's request."""
            
            from langchain.schema import HumanMessage
            
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


