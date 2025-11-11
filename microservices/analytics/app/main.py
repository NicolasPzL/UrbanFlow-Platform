from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .api.routes import api_router
from .core.config import settings
import logging
import os
import json
from pathlib import Path
from datetime import datetime, timezone

# Configurar logging
try:
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
except Exception as e:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

logger = logging.getLogger(__name__)
AUDIT_LOG_PATH = Path(__file__).resolve().parents[2] / 'logs' / 'auditoria.log'

def _write_audit(event: str, details: dict | None = None):
    payload = {
        "event": event,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    if details:
        payload["details"] = details
    message = json.dumps(payload, ensure_ascii=False)
    logger.info("[AUDIT] %s", message)
    try:
        AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with AUDIT_LOG_PATH.open("a", encoding="utf-8") as fh:
            fh.write(f"{message}\n")
    except Exception as exc:
        logger.warning("No se pudo escribir en auditoria.log: %s", exc)

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
    description="Microservicio de análisis y procesamiento de telemetría para UrbanFlow Platform",
    debug=settings.DEBUG
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    """Endpoint de health check"""
    try:
        # Verificar conexión a la base de datos
        from .db.session import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        return {
            "ok": True, 
            "service": "analytics", 
            "status": "up",
            "version": settings.SERVICE_VERSION,
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "service": "analytics",
                "status": "down",
                "version": settings.SERVICE_VERSION,
                "database": "disconnected",
                "error": str(e)
            }
        )

@app.get("/")
def root():
    """Endpoint raíz con información del servicio"""
    return {
        "message": "UrbanFlow Analytics Service",
        "version": settings.SERVICE_VERSION,
        "description": "Microservicio de análisis y procesamiento de telemetría",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "api": "/api"
        },
        "features": [
            "Procesamiento de telemetría cruda",
            "Cálculo de métricas vibracionales",
            "Análisis espectral",
            "Clasificación de estados operativos",
            "Predicciones ML"
        ]
    }

# Manejo global de errores
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTP Exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"ok": False, "error": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    _write_audit("GENERATOR_ERROR", {"detail": str(exc)})
    return JSONResponse(
        status_code=500,
        content={"ok": False, "error": "Internal server error"}
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def on_startup():
    generator_enabled = os.getenv("GENERATOR_ENABLED", "false").lower() == "true"
    _write_audit("GENERATOR_START", {"enabled": generator_enabled})

@app.on_event("shutdown")
async def on_shutdown():
    _write_audit("GENERATOR_STOP", {})
