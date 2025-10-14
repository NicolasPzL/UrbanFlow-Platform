from fastapi import FastAPI
from .api.routes import api_router

app = FastAPI(title="UrbanFlow Analytics Service", version="0.1.0")

@app.get("/health")
def health():
    return {"ok": True, "service": "analytics", "status": "up"}

app.include_router(api_router, prefix="/api")
