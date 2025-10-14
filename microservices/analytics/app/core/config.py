import os
from pydantic import BaseModel

class Settings(BaseModel):
    DATABASE_URL: str = os.getenv(
        "ANALYTICS_DATABASE_URL",
        os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/urbanflow_db",
        ),
    )

settings = Settings()
