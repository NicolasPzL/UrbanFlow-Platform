from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import api_router
from .core.config import settings

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
    description="Microservicio centralizado de análisis y predicciones ML para UrbanFlow Platform",
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
    return {
        "ok": True, 
        "service": "analytics", 
        "status": "up",
        "version": settings.SERVICE_VERSION
    }

@app.get("/")
def root():
    return {
        "message": "UrbanFlow Analytics Service",
        "version": settings.SERVICE_VERSION,
        "docs": "/docs",
        "health": "/health"
    }

app.include_router(api_router, prefix=settings.API_V1_STR)
