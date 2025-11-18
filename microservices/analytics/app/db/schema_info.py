"""
Database schema metadata for LangChain SQL Agent
"""

from sqlalchemy import MetaData, Table, inspect
from sqlalchemy.orm import Session
from typing import Dict, List

def get_table_descriptions() -> Dict[str, str]:
    """
    Returns human-readable descriptions for each table in the database.
    This helps the LLM understand what each table contains.
    """
    return {
        "telemetria_cruda": "Raw telemetry data from cable car sensors including position (lat/lon/alt), speed, acceleration, temperature, and 3-axis vibration measurements",
        "mediciones": "Processed measurements with extracted features like RMS, kurtosis, skewness, zero-crossing rate, spectral frequencies, and operational state classification",
        "sensores": "Sensor registry linking sensor IDs to cable car cabins (one sensor per cabin)",
        "cabinas": "Cable car units with internal code and current operational state (operativo/inusual/alerta)",
        "predicciones": "Machine learning prediction results for measurements, including predicted class and probability distributions",
        "modelos_ml": "Registry of ML models used for predictions, including version, framework, and training date",
        "cabina_estado_hist": "Historical log of cable car state changes over time. Columns: hist_id, cabina_id, estado (NOT estado_actual), timestamp_inicio, timestamp_fin",
        "lineas": "Cable car lines/routes with names and total length",
        "estaciones": "Stations along cable car lines with geographic coordinates",
        "tramos": "Track segments between stations with length and slope percentage"
    }

def get_column_descriptions() -> Dict[str, Dict[str, str]]:
    """
    Returns detailed descriptions for important columns that might be unclear to the LLM.
    """
    return {
        "mediciones": {
            "rms": "Root Mean Square - measure of vibration intensity (typical range 0-10)",
            "kurtosis": "Statistical measure of distribution shape - high values indicate sharp peaks/anomalies",
            "skewness": "Statistical measure of distribution asymmetry",
            "zcr": "Zero Crossing Rate - frequency of signal oscillation",
            "pico": "Peak value in signal",
            "crest_factor": "Ratio of peak to RMS - indicates impact vs sustained vibration",
            "frecuencia_media": "Average frequency in vibration spectrum",
            "frecuencia_dominante": "Dominant frequency component",
            "amplitud_max_espectral": "Maximum amplitude in frequency spectrum",
            "energia_banda_1": "Energy in low frequency band",
            "energia_banda_2": "Energy in mid frequency band",
            "energia_banda_3": "Energy in high frequency band",
            "estado_procesado": "ML classification: 'operativo' (normal), 'inusual' (unusual), 'alerta' (alert)"
        },
        "telemetria_cruda": {
            "vibracion_x": "Vibration measurement on X axis",
            "vibracion_y": "Vibration measurement on Y axis",
            "vibracion_z": "Vibration measurement on Z axis",
            "pos_m": "Position along the track in meters",
            "direccion": "Direction of travel"
        },
        "predicciones": {
            "clase_predicha": "Predicted operational state from ML model",
            "probabilidades": "JSON object with probability distribution for each class"
        }
    }

def get_important_relationships() -> List[str]:
    """
    Returns a list of important table relationships for the LLM to understand.
    """
    return [
        "Each cabina (cable car) has exactly one sensor in the 'sensores' table",
        "Measurements in 'mediciones' are linked to sensors via sensor_id",
        "Raw telemetry in 'telemetria_cruda' is linked to sensors via sensor_id",
        "Predictions in 'predicciones' are linked to specific measurements via medicion_id",
        "Each prediction is associated with a specific ML model via modelo_id",
        "To get cabin information from measurements, JOIN mediciones → sensores → cabinas",
        "Historical state changes in 'cabina_estado_hist' track when cabins changed operational states"
    ]

def get_table_metadata(db: Session) -> MetaData:
    """
    Returns SQLAlchemy MetaData object with all table information.
    This is used by LangChain SQL Agent to understand the schema.
    """
    metadata = MetaData()
    metadata.reflect(bind=db.get_bind())
    return metadata

def get_sample_data_info() -> Dict[str, str]:
    """
    Returns information about typical data ranges and patterns.
    """
    return {
        "timestamps": "Most queries should focus on recent data (last 24h, 7 days, 30 days)",
        "rms_values": "Typical RMS values range from 0-10. Values > 8 may indicate problems",
        "estados": "Three main states: 'operativo' (good), 'inusual' (warning), 'alerta' (critical)",
        "sensor_ids": "Sensor IDs typically range from 1-100",
        "velocidad": "Speed is measured in km/h for telemetria_cruda, and in m/s for mediciones"
    }

def get_query_optimization_tips() -> List[str]:
    """
    Returns tips for generating optimized SQL queries.
    """
    return [
        "Always use LIMIT clause to prevent returning excessive rows (default 100)",
        "Add WHERE clauses on timestamp to filter by date range",
        "Use indexes on timestamp, sensor_id, cabina_id columns",
        "Use JOINs instead of subqueries when possible for better performance",
        "For aggregations, use GROUP BY with appropriate columns",
        "Use ORDER BY timestamp DESC for most recent data first"
    ]

def format_schema_for_llm(db: Session) -> str:
    """
    Formats complete schema information as a string for LLM context.
    This combines all metadata into a single comprehensive description.
    """
    table_descs = get_table_descriptions()
    column_descs = get_column_descriptions()
    relationships = get_important_relationships()
    sample_info = get_sample_data_info()
    optimization_tips = get_query_optimization_tips()
    
    schema_text = "# UrbanFlow Platform Database Schema\n\n"
    
    schema_text += "## Tables Overview\n"
    for table, desc in table_descs.items():
        schema_text += f"- **{table}**: {desc}\n"
    
    schema_text += "\n## Important Column Details\n"
    for table, columns in column_descs.items():
        schema_text += f"\n### {table}\n"
        for col, desc in columns.items():
            schema_text += f"- **{col}**: {desc}\n"
    
    schema_text += "\n## Table Relationships\n"
    for rel in relationships:
        schema_text += f"- {rel}\n"
    
    schema_text += "\n## Data Characteristics\n"
    for key, value in sample_info.items():
        schema_text += f"- **{key}**: {value}\n"
    
    schema_text += "\n## Query Optimization Guidelines\n"
    for tip in optimization_tips:
        schema_text += f"- {tip}\n"
    
    return schema_text


