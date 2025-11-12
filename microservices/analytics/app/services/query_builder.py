"""
Generador inteligente de consultas (NL → SQL) usado junto al chatbot basado en Ollama
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
import re

class QueryBuilder:
    """
    Builds and validates SQL queries from natural language.
    Provides safety checks and query optimization.
    """
    
    def __init__(self, db: Session, max_rows: int = 100):
        self.db = db
        self.max_rows = max_rows
        self.dangerous_keywords = [
            'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE',
            'INSERT', 'UPDATE', 'GRANT', 'REVOKE'
        ]
    
    def validate_query(self, sql_query: str) -> tuple[bool, Optional[str]]:
        """
        Validate that a SQL query is safe to execute.
        Returns (is_valid, error_message)
        """
        # Remove comments and normalize whitespace
        cleaned_query = re.sub(r'--.*$', '', sql_query, flags=re.MULTILINE)
        cleaned_query = re.sub(r'/\*.*?\*/', '', cleaned_query, flags=re.DOTALL)
        cleaned_query = cleaned_query.upper()
        
        # Check for dangerous keywords
        for keyword in self.dangerous_keywords:
            if keyword in cleaned_query:
                return False, f"Query contains forbidden keyword: {keyword}"
        
        # Ensure it's a SELECT query
        if not cleaned_query.strip().startswith('SELECT'):
            return False, "Only SELECT queries are allowed"
        
        # Check for semicolons (prevent multiple statements)
        if cleaned_query.count(';') > 1:
            return False, "Multiple statements are not allowed"
        
        return True, None
    
    def add_limit_if_missing(self, sql_query: str) -> str:
        """
        Add LIMIT clause if not present to prevent excessive results.
        """
        query_upper = sql_query.upper()
        if 'LIMIT' not in query_upper:
            # Remove trailing semicolon if present
            sql_query = sql_query.rstrip().rstrip(';')
            sql_query += f" LIMIT {self.max_rows}"
        return sql_query
    
    def execute_query(self, sql_query: str) -> Dict[str, Any]:
        """
        Execute a validated SQL query and return results.
        Returns dict with 'success', 'data', 'error', 'row_count', 'columns'
        """
        try:
            # Validate query
            is_valid, error = self.validate_query(sql_query)
            if not is_valid:
                return {
                    "success": False,
                    "error": error,
                    "data": [],
                    "row_count": 0
                }
            
            # Add LIMIT if missing
            sql_query = self.add_limit_if_missing(sql_query)
            
            # Execute query
            result = self.db.execute(text(sql_query))
            
            # Fetch results
            rows = result.fetchall()
            columns = list(result.keys()) if rows else []
            
            # Convert to list of dicts
            data = []
            for row in rows:
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    # Convert special types to JSON-serializable formats
                    if hasattr(value, 'isoformat'):  # datetime
                        value = value.isoformat()
                    elif isinstance(value, (bytes, bytearray)):
                        value = value.hex()
                    elif hasattr(value, '__float__'):  # Decimal, etc.
                        value = float(value)
                    row_dict[col] = value
                data.append(row_dict)
            
            return {
                "success": True,
                "data": data,
                "row_count": len(data),
                "columns": columns,
                "query": sql_query
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": [],
                "row_count": 0,
                "query": sql_query
            }
    
    def identify_query_type(self, question: str) -> str:
        """
        Identify what type of query the user is asking for.
        Returns: 'data_query', 'analysis', 'prediction', 'report', 'unknown'
        """
        question_lower = question.lower()
        
        # Prediction-related keywords
        if any(word in question_lower for word in ['predict', 'forecast', 'will', 'future', 'maintenance']):
            return 'prediction'
        
        # Analysis keywords
        if any(word in question_lower for word in ['analyze', 'trend', 'pattern', 'compare', 'insight']):
            return 'analysis'
        
        # Report keywords
        if any(word in question_lower for word in ['report', 'summary', 'overview', 'dashboard']):
            return 'report'
        
        # Data query keywords
        if any(word in question_lower for word in ['show', 'list', 'get', 'find', 'how many', 'what', 'which']):
            return 'data_query'
        
        return 'unknown'
    
    def extract_temporal_context(self, question: str) -> Optional[str]:
        """
        Extract temporal context from the question.
        Returns SQL WHERE clause for time filtering, or None
        """
        question_lower = question.lower()
        
        # Today
        if 'today' in question_lower:
            return "timestamp >= CURRENT_DATE"
        
        # Yesterday
        if 'yesterday' in question_lower:
            return "timestamp >= CURRENT_DATE - INTERVAL '1 day' AND timestamp < CURRENT_DATE"
        
        # Last N hours
        hours_match = re.search(r'last (\d+) hour', question_lower)
        if hours_match:
            hours = hours_match.group(1)
            return f"timestamp >= NOW() - INTERVAL '{hours} hours'"
        
        # Last N days
        days_match = re.search(r'last (\d+) day', question_lower)
        if days_match:
            days = days_match.group(1)
            return f"timestamp >= NOW() - INTERVAL '{days} days'"
        
        # This week
        if 'this week' in question_lower or 'past week' in question_lower:
            return "timestamp >= NOW() - INTERVAL '7 days'"
        
        # This month
        if 'this month' in question_lower or 'past month' in question_lower:
            return "timestamp >= NOW() - INTERVAL '30 days'"
        
        return None
    
    def extract_sensor_context(self, question: str) -> Optional[int]:
        """
        Extract sensor ID from the question.
        Returns sensor_id or None
        """
        # Look for patterns like "sensor 1", "sensor #1", "sensor ID 1"
        match = re.search(r'sensor\s*#?\s*(?:id\s*)?(\d+)', question.lower())
        if match:
            return int(match.group(1))
        return None
    
    def extract_cabin_context(self, question: str) -> Optional[int]:
        """
        Extract cabin ID from the question.
        Returns cabina_id or None
        """
        # Look for patterns like "cabin 1", "cabina 1", "cable car 1"
        match = re.search(r'(?:cabin|cabina|cable car)\s*#?\s*(\d+)', question.lower())
        if match:
            return int(match.group(1))
        return None
    
    def build_context_dict(self, question: str) -> Dict[str, Any]:
        """
        Build a context dictionary from the question.
        This helps guide the LLM in generating the right query.
        """
        return {
            "query_type": self.identify_query_type(question),
            "temporal_filter": self.extract_temporal_context(question),
            "sensor_id": self.extract_sensor_context(question),
            "cabina_id": self.extract_cabin_context(question),
            "original_question": question
        }
    
    def get_suggested_queries(self, context: Dict[str, Any]) -> List[str]:
        """
        Generate suggested queries based on context.
        These are templates that can be used directly or modified.
        """
        suggestions = []
        
        if context["sensor_id"]:
            sensor_id = context["sensor_id"]
            suggestions.append(
                f"SELECT * FROM mediciones WHERE sensor_id = {sensor_id} "
                f"ORDER BY timestamp DESC LIMIT 10"
            )
        
        if context["cabina_id"]:
            cabina_id = context["cabina_id"]
            suggestions.append(
                f"SELECT c.*, s.sensor_id FROM cabinas c "
                f"LEFT JOIN sensores s ON c.cabina_id = s.cabina_id "
                f"WHERE c.cabina_id = {cabina_id}"
            )
        
        if context["query_type"] == "report":
            suggestions.append(
                "SELECT estado_actual, COUNT(*) as count FROM cabinas GROUP BY estado_actual"
            )
        
        return suggestions
    
    def format_results_as_text(self, results: Dict[str, Any]) -> str:
        """
        Format query results as readable text for the LLM to interpret.
        """
        if not results["success"]:
            return f"Error executing query: {results.get('error', 'Unknown error')}"
        
        if results["row_count"] == 0:
            return "No results found."
        
        # Create a formatted table
        lines = [f"Found {results['row_count']} results:\n"]
        
        columns = results["columns"]
        data = results["data"]
        
        # Add column headers
        lines.append(" | ".join(columns))
        lines.append("-" * (len(" | ".join(columns))))
        
        # Add data rows (limit to first 10 for readability)
        for row in data[:10]:
            row_values = [str(row.get(col, "")) for col in columns]
            lines.append(" | ".join(row_values))
        
        if results["row_count"] > 10:
            lines.append(f"\n... and {results['row_count'] - 10} more rows")
        
        return "\n".join(lines)


