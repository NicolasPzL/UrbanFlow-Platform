import os
from pydantic import BaseModel
from typing import Optional

class Settings(BaseModel):
    # Database configuration
    DATABASE_URL: str = os.getenv(
        "ANALYTICS_DATABASE_URL",
        os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/urbanflow_db",
        ),
    )
    
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
