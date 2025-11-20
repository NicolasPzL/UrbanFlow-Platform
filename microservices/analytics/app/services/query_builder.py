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
    
    def auto_correct_cabin_state_query(self, sql_query: str) -> str:
        """
        Corregir consultas que usan incorrectamente 'cabinas.estado' o 'cabinas WHERE estado'.
        La tabla 'cabinas' NO tiene columna 'estado', solo tiene 'estado_actual'.
        Para consultar estados de cabinas, se debe usar 'cabina_estado_hist.estado'.
        """
        # Patrón: SELECT ... FROM cabinas WHERE estado = ...
        pattern = r'FROM\s+cabinas\s+WHERE\s+estado\s*='
        
        if re.search(pattern, sql_query, re.IGNORECASE):
            print("[QUERY_BUILDER] [ERROR] Se está usando 'cabinas.estado' que NO EXISTE")
            print("[QUERY_BUILDER]   - La tabla 'cabinas' NO tiene columna 'estado', solo tiene 'estado_actual'")
            print("[QUERY_BUILDER]   - Para consultar estados de cabinas, se debe usar 'cabina_estado_hist.estado'")
            print("[QUERY_BUILDER] Corrigiendo consulta automáticamente...")
            
            # Extraer el valor del estado (operativa, alerta, inusual, etc.)
            estado_match = re.search(r'estado\s*=\s*[\'"]?(\w+)[\'"]?', sql_query, re.IGNORECASE)
            estado_value = estado_match.group(1) if estado_match else 'operativa'
            
            # Reemplazar FROM cabinas WHERE estado = ... con FROM cabina_estado_hist WHERE estado = ...
            corrected_query = re.sub(
                r'FROM\s+cabinas\s+WHERE\s+estado\s*=',
                f'FROM cabina_estado_hist WHERE estado =',
                sql_query,
                flags=re.IGNORECASE
            )
            
            # Si hay SELECT COUNT(*), mantenerlo
            # Si hay otros campos, ajustar según sea necesario
            if 'SELECT COUNT(*)' in sql_query.upper() or 'SELECT COUNT' in sql_query.upper():
                # Para COUNT, la corrección ya está hecha arriba
                pass
            else:
                # Para otros SELECT, podría necesitar ajustes adicionales
                # Por ahora, solo corregimos la tabla y columna
                pass
            
            print(f"[QUERY_BUILDER] Consulta corregida: {corrected_query[:200]}...")
            return corrected_query.strip()
        
        # Patrón: SELECT ... FROM cabinas WHERE c.estado = ... (con alias)
        pattern2 = r'FROM\s+cabinas\s+(?:AS\s+)?\w*\s+WHERE\s+\w+\.estado\s*='
        
        if re.search(pattern2, sql_query, re.IGNORECASE):
            print("[QUERY_BUILDER] [WARNING] ERROR DETECTADO: Se está usando alias de 'cabinas' con columna 'estado' que NO EXISTE")
            print("[QUERY_BUILDER] Corrigiendo consulta automáticamente...")
            
            # Extraer el alias si existe
            alias_match = re.search(r'FROM\s+cabinas\s+(?:AS\s+)?(\w+)', sql_query, re.IGNORECASE)
            alias = alias_match.group(1) if alias_match else 'c'
            
            # Reemplazar con cabina_estado_hist
            corrected_query = re.sub(
                r'FROM\s+cabinas\s+(?:AS\s+)?\w+',
                'FROM cabina_estado_hist AS ceh',
                sql_query,
                flags=re.IGNORECASE
            )
            # Reemplazar el alias.estado con ceh.estado
            corrected_query = re.sub(
                rf'{alias}\.estado',
                'ceh.estado',
                corrected_query,
                flags=re.IGNORECASE
            )
            
            print(f"[QUERY_BUILDER] Consulta corregida: {corrected_query[:200]}...")
            return corrected_query.strip()
        
        return sql_query
    
    def auto_correct_aggregation_query(self, sql_query: str) -> str:
        """
        Corregir consultas de agregación con límites incorrectos y filtros de tiempo innecesarios.
        Detecta y corrige:
        1. SELECT AVG(...) FROM ... ORDER BY ... LIMIT N
        2. SELECT AVG(...) FROM ... WHERE timestamp >= NOW() - INTERVAL (sin que se solicite tiempo)
        """
        # Patrón 1: AVG/MAX/MIN/SUM con ORDER BY y LIMIT (necesita subconsulta)
        pattern1 = r'SELECT\s+(AVG|MAX|MIN|SUM)\((\w+)\)\s+FROM\s+(\w+)(?:\s+WHERE\s+[^O]+)?\s+ORDER\s+BY\s+(\w+)\s+(?:DESC|ASC)?\s+LIMIT\s+(\d+)'
        
        match1 = re.search(pattern1, sql_query, re.IGNORECASE | re.DOTALL)
        if match1:
            agg_func, column, table, order_column, limit = match1.groups()
            
            print(f"[QUERY_BUILDER] Detectado patrón incorrecto de agregación con LIMIT")
            print(f"[QUERY_BUILDER]   - Función: {agg_func}, Columna: {column}, Tabla: {table}")
            print(f"[QUERY_BUILDER]   - Orden: {order_column}, Límite: {limit}")
            print(f"[QUERY_BUILDER] Corrigiendo consulta automáticamente...")
            
            # Extraer WHERE clause si existe
            where_match = re.search(r'WHERE\s+([^O]+?)(?=\s+ORDER\s+BY)', sql_query, re.IGNORECASE | re.DOTALL)
            where_clause = f"WHERE {where_match.group(1).strip()}" if where_match else ""
            
            # Determinar columna de ordenamiento (preferir medicion_id sobre timestamp)
            if order_column.lower() == 'timestamp':
                order_col = 'medicion_id'  # Usar medicion_id para ordenar por registro
                print(f"[QUERY_BUILDER] Cambiando ordenamiento de timestamp a medicion_id")
            else:
                order_col = order_column
            
            # Construir consulta corregida con subconsulta
            if where_clause:
                corrected_query = f"""SELECT {agg_func}({column}) as promedio_{column}
FROM (
    SELECT {column} 
    FROM {table} 
    {where_clause}
    ORDER BY {order_col} DESC 
    LIMIT {limit}
) AS ultimas_mediciones"""
            else:
                corrected_query = f"""SELECT {agg_func}({column}) as promedio_{column}
FROM (
    SELECT {column} 
    FROM {table} 
    ORDER BY {order_col} DESC 
    LIMIT {limit}
) AS ultimas_mediciones"""
            
            print(f"[QUERY_BUILDER] Consulta corregida: {corrected_query[:150]}...")
            return corrected_query.strip()
        
        # Patrón 2: AVG/MAX/MIN/SUM con WHERE timestamp (eliminar WHERE si no se solicita tiempo explícitamente)
        # Solo para promedios simples sin ORDER BY ni LIMIT
        pattern2 = r'SELECT\s+(AVG|MAX|MIN|SUM)\((\w+)\)\s+FROM\s+(\w+)\s+WHERE\s+timestamp\s*>=\s*NOW\(\)\s*-\s*INTERVAL\s+[\'"]\d+\s+(?:hour|hours|day|days|minute|minutes)[\'"]'
        
        match2 = re.search(pattern2, sql_query, re.IGNORECASE | re.DOTALL)
        if match2:
            agg_func, column, table = match2.groups()
            
            print(f"[QUERY_BUILDER] Detectado filtro de tiempo innecesario en consulta de promedio")
            print(f"[QUERY_BUILDER]   - Función: {agg_func}, Columna: {column}, Tabla: {table}")
            print(f"[QUERY_BUILDER] Eliminando WHERE clause con filtro de tiempo...")
            
            # Construir consulta corregida sin WHERE
            corrected_query = f"SELECT {agg_func}({column}) as promedio_{column} FROM {table}"
            
            print(f"[QUERY_BUILDER] Consulta corregida: {corrected_query}")
            return corrected_query.strip()
        
        return sql_query
    
    def validate_aggregation_query(self, sql_query: str) -> tuple[bool, Optional[str]]:
        """
        Validar consultas de agregación para detectar patrones incorrectos.
        Returns (is_valid, error_message)
        """
        query_upper = sql_query.upper()
        
        # Patrones prohibidos: agregación con ORDER BY y LIMIT en la misma consulta externa
        forbidden_patterns = [
            r'SELECT\s+AVG\([^)]+\)[^]*ORDER\s+BY[^]*LIMIT\s+\d+',
            r'SELECT\s+MAX\([^)]+\)[^]*ORDER\s+BY[^]*LIMIT\s+\d+',
            r'SELECT\s+MIN\([^)]+\)[^]*ORDER\s+BY[^]*LIMIT\s+\d+',
            r'SELECT\s+SUM\([^)]+\)[^]*ORDER\s+BY[^]*LIMIT\s+\d+',
        ]
        
        for pattern in forbidden_patterns:
            if re.search(pattern, sql_query, re.IGNORECASE | re.DOTALL):
                return False, "Consulta inválida: No se puede usar ORDER BY y LIMIT directamente con funciones de agregación (AVG, MAX, MIN, SUM). Use una subconsulta."
        
        return True, None
    
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
        
        # Validar consultas de agregación
        is_valid_agg, agg_error = self.validate_aggregation_query(sql_query)
        if not is_valid_agg:
            return False, agg_error
        
        return True, None
    
    def add_limit_if_missing(self, sql_query: str) -> str:
        """
        Add LIMIT clause if not present to prevent excessive results.
        But don't add LIMIT for aggregations (COUNT, SUM, AVG, etc.) or when explicitly not needed.
        """
        query_upper = sql_query.upper()
        if 'LIMIT' not in query_upper:
            # Don't add LIMIT for aggregation queries (they return single row anyway)
            aggregation_keywords = ['COUNT(', 'SUM(', 'AVG(', 'MAX(', 'MIN(', 'GROUP BY', 'HAVING']
            has_aggregation = any(keyword in query_upper for keyword in aggregation_keywords)
            
            # Don't add LIMIT if query explicitly requests all data
            # (though this is rare, we check for patterns like "SELECT ALL" or similar)
            if not has_aggregation:
                # Remove trailing semicolon if present
                sql_query = sql_query.rstrip().rstrip(';')
                sql_query += f" LIMIT {self.max_rows}"
        return sql_query
    
    def execute_query(self, sql_query: str) -> Dict[str, Any]:
        """
        Execute a validated SQL query and return results.
        Returns dict with 'success', 'data', 'error', 'row_count', 'columns'
        """
        print(f"\n[QUERY_BUILDER] Ejecutando consulta SQL...")
        print(f"[QUERY_BUILDER] Consulta original: {sql_query[:200]}...")
        
        try:
            # Intentar corregir automáticamente consultas de agregación incorrectas
            print("[QUERY_BUILDER] Verificando si necesita corrección automática...")
            # Auto-correct cabin state queries first (critical error)
            sql_query = self.auto_correct_cabin_state_query(sql_query)
            
            # Auto-correct aggregation queries if needed
            sql_query_corrected = self.auto_correct_aggregation_query(sql_query)
            if sql_query_corrected != sql_query:
                print("[QUERY_BUILDER] Consulta corregida automáticamente [OK]")
                sql_query = sql_query_corrected
            
            # Validate query
            print("[QUERY_BUILDER] Validando consulta...")
            is_valid, error = self.validate_query(sql_query)
            if not is_valid:
                print(f"[QUERY_BUILDER] ERROR: Consulta no válida - {error}")
                return {
                    "success": False,
                    "error": error,
                    "data": [],
                    "row_count": 0
                }
            print("[QUERY_BUILDER] Consulta válida [OK]")
            
            # Add LIMIT if missing
            sql_query_before_limit = sql_query
            sql_query = self.add_limit_if_missing(sql_query)
            if sql_query != sql_query_before_limit:
                print(f"[QUERY_BUILDER] LIMIT agregado automáticamente")
                print(f"[QUERY_BUILDER] Consulta con LIMIT: {sql_query}")
            
            # Execute query
            print("[QUERY_BUILDER] Ejecutando consulta en base de datos...")
            result = self.db.execute(text(sql_query))
            print("[QUERY_BUILDER] Consulta ejecutada exitosamente")
            
            # Fetch results
            print("[QUERY_BUILDER] Obteniendo resultados...")
            rows = result.fetchall()
            columns = list(result.keys()) if rows else []
            print(f"[QUERY_BUILDER] Filas obtenidas: {len(rows)}, Columnas: {len(columns)}")
            if columns:
                print(f"[QUERY_BUILDER] Nombres de columnas: {columns}")
            
            # Convert to list of dicts
            print("[QUERY_BUILDER] Convirtiendo resultados a formato JSON...")
            data = []
            for idx, row in enumerate(rows):
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    # Convert special types to JSON-serializable formats
                    if value is None:
                        row_dict[col] = None
                    elif hasattr(value, 'isoformat'):  # datetime, date
                        value = value.isoformat()
                    elif isinstance(value, (bytes, bytearray)):
                        value = value.hex()
                    elif hasattr(value, '__float__') and not isinstance(value, (int, float, bool)):  # Decimal, etc.
                        try:
                            value = float(value)
                        except (ValueError, TypeError):
                            value = str(value)
                    elif isinstance(value, dict):
                        # Handle JSONB/JSON types - already a dict, keep as is
                        value = value
                    elif isinstance(value, list):
                        # Handle array types - convert to list if needed
                        value = list(value) if not isinstance(value, list) else value
                    elif hasattr(value, '__dict__'):  # Custom objects
                        # Try to convert to dict or string
                        try:
                            import json
                            value = json.loads(json.dumps(value, default=str))
                        except:
                            value = str(value)
                    else:
                        # Keep as is for int, float, bool, str
                        value = value
                    row_dict[col] = value
                data.append(row_dict)
                if idx == 0 and len(rows) > 0:
                    print(f"[QUERY_BUILDER] Primera fila convertida: {list(row_dict.keys())[:5]}...")
            
            print(f"[QUERY_BUILDER] Conversión completada: {len(data)} filas procesadas")
            
            return {
                "success": True,
                "data": data,
                "row_count": len(data),
                "columns": columns,
                "query": sql_query
            }
            
        except Exception as e:
            print(f"[QUERY_BUILDER] ERROR ejecutando consulta: {e}")
            import traceback
            print(f"[QUERY_BUILDER] Traceback: {traceback.format_exc()}")
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
        Returns: 'data_query', 'analysis', 'prediction', 'report', 'informational', 'unknown'
        """
        question_lower = question.lower()
        
        # Informational/general questions (about the system, what it does, how it works)
        informational_keywords = [
            'what is', 'what does', 'que es', 'que hace', 'que es urbanflow',
            'what is urbanflow', 'what does urbanflow', 'explain', 'describe',
            'how does', 'como funciona', 'what can', 'que puede', 'help',
            'capabilities', 'capacidades', 'who are you', 'quien eres'
        ]
        if any(keyword in question_lower for keyword in informational_keywords):
            return 'informational'
        
        # Prediction-related keywords
        if any(word in question_lower for word in ['predict', 'forecast', 'will', 'future', 'maintenance']):
            return 'prediction'
        
        # Analysis keywords
        if any(word in question_lower for word in ['analyze', 'trend', 'pattern', 'compare', 'insight']):
            return 'analysis'
        
        # Report keywords
        if any(word in question_lower for word in ['report', 'summary', 'overview', 'dashboard']):
            return 'report'
        
        # Data query keywords (but not if it's informational)
        if any(word in question_lower for word in ['show', 'list', 'get', 'find', 'how many', 'which']):
            return 'data_query'
        
        # "What" questions that are data queries (not informational)
        if question_lower.startswith('what') and any(word in question_lower for word in ['sensor', 'cabin', 'measurement', 'data', 'status', 'alert']):
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


