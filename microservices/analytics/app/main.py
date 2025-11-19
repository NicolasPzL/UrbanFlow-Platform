from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .api.routes import api_router, chatbot_router
from .core.config import settings
from .db.session import SessionLocal
from .services.chatbot import ChatbotService
from .services.telemetry_simulator import TelemetrySimulator
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


def _init_chatbot() -> dict:
    """Initializa el chatbot con Ollama y devuelve metadatos básicos."""
    db = SessionLocal()
    try:
        chatbot = ChatbotService(
            db=db,
            llm_provider=settings.LLM_PROVIDER,
            model_name=settings.MODEL_NAME,
            enable_ml_analysis=settings.CHATBOT_ENABLE_ML_ANALYSIS
        )

        logger.info(
            "Chatbot initialized (provider=%s, model=%s)",
            chatbot.llm_provider,
            chatbot.model_name,
        )

        return {
            "initialized": True,
            "provider": chatbot.llm_provider,
            "model": chatbot.model_name,
            "ml_analysis_enabled": chatbot.enable_ml_analysis,
        }
    except Exception as exc:
        logger.error("Chatbot initialization failed: %s", exc)
        return {
            "initialized": False,
            "error": str(exc),
            "provider": settings.LLM_PROVIDER,
            "model": settings.MODEL_NAME,
        }
    finally:
        db.close()

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
    description="Microservicio de análisis y procesamiento de telemetría para UrbanFlow Platform",
    debug=settings.DEBUG
)


@app.on_event("startup")
def on_startup() -> None:
    """Initializa componentes críticos (chatbot) al arrancar la aplicación."""
    app.state.chatbot_info = _init_chatbot()

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

        chatbot_info = getattr(app.state, "chatbot_info", {"initialized": False})

        return {
            "ok": True,
            "service": "analytics",
            "status": "up",
            "version": settings.SERVICE_VERSION,
            "database": "connected",
            "chatbot": chatbot_info,
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        chatbot_info = getattr(app.state, "chatbot_info", {"initialized": False, "error": str(e)})

        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "service": "analytics",
                "status": "down",
                "version": settings.SERVICE_VERSION,
                "database": "disconnected",
                "error": str(e),
                "chatbot": chatbot_info,
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
        ],
        "chatbot": getattr(app.state, "chatbot_info", {"initialized": False}),
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
# Incluir router del chatbot con prefijo /api/chatbot
app.include_router(chatbot_router, prefix="/api/chatbot")

@app.on_event("startup")
async def on_startup():
    generator_enabled = os.getenv("GENERATOR_ENABLED", "false").lower() == "true"
    _write_audit("GENERATOR_START", {"enabled": generator_enabled})
    
    simulator = None
    if settings.ENABLE_SIMULATOR:
        simulator = TelemetrySimulator(
            interval_seconds=settings.SIMULATOR_INTERVAL_SECONDS,
            slice_size=settings.SIMULATOR_SLICE_SIZE,
        )
        simulator.start()
        _write_audit("SIMULATOR_START", simulator.status())
    else:
        logger.info("Simulador de telemetría desactivado por configuración.")
    app.state.telemetry_simulator = simulator

@app.on_event("shutdown")
async def on_shutdown():
    simulator = getattr(app.state, "telemetry_simulator", None)
    if simulator:
        await simulator.stop()
        _write_audit("SIMULATOR_STOP", simulator.status())
    _write_audit("GENERATOR_STOP", {})
