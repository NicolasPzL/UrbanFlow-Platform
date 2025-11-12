import os
from pydantic import BaseModel
from typing import Optional

# Cargar variables de entorno del sistema principal
try:
    from dotenv import load_dotenv, find_dotenv
    from pathlib import Path
    
    # Buscar .env en el directorio raíz del proyecto (4 niveles arriba desde config.py)
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent.parent.parent
    env_file = project_root / ".env"
    
    if env_file.exists():
        load_dotenv(env_file)
        print(f"Info: Cargando configuración desde: {env_file}")
    else:
        # Intentar buscar con find_dotenv
        env_file = find_dotenv()
        if env_file:
            load_dotenv(env_file)
            print(f"Info: Cargando configuración desde: {env_file}")
        else:
            print("Info: No se encontró archivo .env, usando valores por defecto")
except Exception as e:
    print(f"Info: No se pudo cargar archivo .env: {e}")
    # Continuar sin archivo .env

# Construcción de la URL de base de datos usando las mismas variables que db.js
def _build_db_url() -> str:
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "password")  # Usar 'password' como en db.js
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "Urbanflow_db")  # Usar 'Urbanflow_db' como en db.js
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"

_DATABASE_URL_DEFAULT = _build_db_url()

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
    CORS_ORIGINS: list = ["*"]  # Permitir todos los orígenes para desarrollo
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # LLM Configuration
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "llama3")
    
    # Chatbot Settings
    CHATBOT_MAX_CONTEXT_MESSAGES: int = int(os.getenv("CHATBOT_MAX_CONTEXT_MESSAGES", "10"))
    CHATBOT_SQL_ROW_LIMIT: int = int(os.getenv("CHATBOT_SQL_ROW_LIMIT", "100"))
    CHATBOT_ENABLE_ML_ANALYSIS: bool = os.getenv("CHATBOT_ENABLE_ML_ANALYSIS", "true").lower() == "true"

settings = Settings()
