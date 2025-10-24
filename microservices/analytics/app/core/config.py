import os
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv, find_dotenv

# Carga variables desde el .env del proyecto raíz si existe
load_dotenv(find_dotenv())

# Construcción segura de la URL de base de datos a nivel de módulo (fuera del modelo)
def _build_db_url_from_discrete_env() -> str:
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "urbanflow_db")
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"

_DATABASE_URL_DEFAULT = (
    os.getenv("ANALYTICS_DATABASE_URL")
    or os.getenv("DATABASE_URL")
    or _build_db_url_from_discrete_env()
)

class Settings(BaseModel):
    # Database configuration
    # Prioridad: ANALYTICS_DATABASE_URL > DATABASE_URL > construir desde DB_*
    DATABASE_URL: str = _DATABASE_URL_DEFAULT
    
    # Service configuration
    SERVICE_NAME: str = "UrbanFlow Analytics Service"
    SERVICE_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # ML Configuration
    ML_CONTAMINATION: float = float(os.getenv("ML_CONTAMINATION", "0.1"))
    ML_RANDOM_STATE: int = int(os.getenv("ML_RANDOM_STATE", "42"))
    ML_DBSCAN_EPS: float = float(os.getenv("ML_DBSCAN_EPS", "0.5"))
    ML_DBSCAN_MIN_SAMPLES: int = int(os.getenv("ML_DBSCAN_MIN_SAMPLES", "5"))
    
    # Analytics Configuration
    DEFAULT_ANALYSIS_DAYS: int = int(os.getenv("DEFAULT_ANALYSIS_DAYS", "7"))
    MAX_HISTORICAL_DAYS: int = int(os.getenv("MAX_HISTORICAL_DAYS", "30"))
    MAX_MEASUREMENTS_LIMIT: int = int(os.getenv("MAX_MEASUREMENTS_LIMIT", "1000"))
    
    # API Configuration
    API_V1_STR: str = "/api"
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8080"]
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
