from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from ..db.session import get_db
from ..db import models as m
from ..services.analytics import AnalyticsService
from ..services.ml import MLPredictionService
from datetime import datetime, timedelta

api_router = APIRouter()

# Analytics endpoints
@api_router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db)):
    analytics_service = AnalyticsService(db)
    return {"ok": True, "data": analytics_service.summary()}

@api_router.get("/analytics/system-health")
def get_system_health(db: Session = Depends(get_db)):
    """Obtiene el estado de salud del sistema completo"""
    analytics_service = AnalyticsService(db)
    health_data = analytics_service.get_system_health()
    return {"ok": True, "data": health_data}

@api_router.get("/analytics/sensor/{sensor_id}")
def get_sensor_analytics(sensor_id: int, days: int = 7, db: Session = Depends(get_db)):
    """Obtiene análisis detallado de un sensor específico"""
    analytics_service = AnalyticsService(db)
    analytics_data = analytics_service.get_sensor_analytics(sensor_id, days)
    return {"ok": True, "data": analytics_data}

@api_router.get("/analytics/trends/{sensor_id}")
def get_trend_analysis(sensor_id: int, days: int = 30, db: Session = Depends(get_db)):
    """Obtiene análisis de tendencias para un sensor"""
    analytics_service = AnalyticsService(db)
    trend_data = analytics_service.get_trend_analysis(sensor_id, days)
    return {"ok": True, "data": trend_data}

@api_router.get("/analytics/sensor-health/{sensor_id}")
def get_sensor_health(sensor_id: int, db: Session = Depends(get_db)):
    """Obtiene el estado de salud de un sensor específico"""
    ml_service = MLPredictionService(db)
    health_data = ml_service.get_sensor_health_summary(sensor_id)
    return {"ok": True, "data": health_data}

@api_router.get("/analytics/sensors/status")
def get_all_sensors_status(db: Session = Depends(get_db)):
    """Obtiene el estado de todos los sensores"""
    sensors = db.query(m.Sensor).all()
    ml_service = MLPredictionService(db)
    
    sensor_statuses = []
    for sensor in sensors:
        health_data = ml_service.get_sensor_health_summary(sensor.sensor_id)
        sensor_statuses.append({
            "sensor_id": sensor.sensor_id,
            "cabina_id": sensor.cabina_id,
            "health": health_data
        })
    
    return {"ok": True, "data": {"sensors": sensor_statuses}}

# ML Prediction endpoints
@api_router.post("/predictions/run")
def predictions_run(medicion_id: int, model_id: int | None = None, db: Session = Depends(get_db)):
    """Ejecuta predicción para una medición específica"""
    ml_service = MLPredictionService(db)
    pred = ml_service.run_prediction_for_measurement(medicion_id, model_id)
    if not pred:
        raise HTTPException(status_code=404, detail="Medición no encontrada")
    return {"ok": True, "data": {
        "prediccion_id": int(pred.prediccion_id),
        "medicion_id": int(pred.medicion_id),
        "modelo_id": int(pred.modelo_id),
        "clase_predicha": pred.clase_predicha,
        "probabilidades": pred.probabilidades,
        "timestamp_prediccion": pred.timestamp_prediccion.isoformat() if pred.timestamp_prediccion else None,
    }}

@api_router.post("/predictions/batch")
def batch_predictions(sensor_ids: list[int], model_id: int | None = None, db: Session = Depends(get_db)):
    """Ejecuta predicciones en lote para múltiples sensores"""
    ml_service = MLPredictionService(db)
    results = []
    
    for sensor_id in sensor_ids:
        # Obtener la medición más reciente del sensor
        latest_medicion = db.query(m.Medicion).filter(
            m.Medicion.sensor_id == sensor_id
        ).order_by(desc(m.Medicion.timestamp)).first()
        
        if latest_medicion:
            pred = ml_service.run_prediction_for_measurement(
                latest_medicion.medicion_id, model_id
            )
            if pred:
                results.append({
                    "sensor_id": sensor_id,
                    "prediccion_id": int(pred.prediccion_id),
                    "clase_predicha": pred.clase_predicha,
                    "probabilidades": pred.probabilidades
                })
    
    return {"ok": True, "data": {"predictions": results}}

@api_router.get("/predictions/history/{sensor_id}")
def get_prediction_history(sensor_id: int, days: int = 7, db: Session = Depends(get_db)):
    """Obtiene el historial de predicciones para un sensor"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    predictions = db.query(m.Prediccion).join(m.Medicion).filter(
        m.Medicion.sensor_id == sensor_id,
        m.Prediccion.timestamp_prediccion >= cutoff_date
    ).order_by(desc(m.Prediccion.timestamp_prediccion)).all()
    
    prediction_data = []
    for pred in predictions:
        prediction_data.append({
            "prediccion_id": int(pred.prediccion_id),
            "medicion_id": int(pred.medicion_id),
            "clase_predicha": pred.clase_predicha,
            "probabilidades": pred.probabilidades,
            "timestamp_prediccion": pred.timestamp_prediccion.isoformat()
        })
    
    return {"ok": True, "data": {"predictions": prediction_data}}

# Data endpoints
@api_router.get("/data/measurements/recent")
def get_recent_measurements(limit: int = 100, db: Session = Depends(get_db)):
    """Obtiene las mediciones más recientes"""
    measurements = db.query(m.Medicion).order_by(
        desc(m.Medicion.timestamp)
    ).limit(limit).all()
    
    measurement_data = []
    for med in measurements:
        measurement_data.append({
            "medicion_id": int(med.medicion_id),
            "sensor_id": med.sensor_id,
            "timestamp": med.timestamp.isoformat(),
            "rms": float(med.rms) if med.rms else None,
            "velocidad": float(med.velocidad) if med.velocidad else None,
            "estado_procesado": med.estado_procesado
        })
    
    return {"ok": True, "data": {"measurements": measurement_data}}

@api_router.get("/data/measurements/sensor/{sensor_id}")
def get_sensor_measurements(sensor_id: int, limit: int = 50, db: Session = Depends(get_db)):
    """Obtiene las mediciones de un sensor específico"""
    measurements = db.query(m.Medicion).filter(
        m.Medicion.sensor_id == sensor_id
    ).order_by(desc(m.Medicion.timestamp)).limit(limit).all()
    
    measurement_data = []
    for med in measurements:
        measurement_data.append({
            "medicion_id": int(med.medicion_id),
            "timestamp": med.timestamp.isoformat(),
            "rms": float(med.rms) if med.rms else None,
            "kurtosis": float(med.kurtosis) if med.kurtosis else None,
            "velocidad": float(med.velocidad) if med.velocidad else None,
            "estado_procesado": med.estado_procesado
        })
    
    return {"ok": True, "data": {"measurements": measurement_data}}

# Model management endpoints
@api_router.get("/models")
def get_models(db: Session = Depends(get_db)):
    """Obtiene todos los modelos ML disponibles"""
    models = db.query(m.ModeloML).all()
    
    model_data = []
    for model in models:
        model_data.append({
            "modelo_id": model.modelo_id,
            "nombre": model.nombre,
            "version": model.version,
            "framework": model.framework,
            "fecha_entrenamiento": model.fecha_entrenamiento.isoformat() if model.fecha_entrenamiento else None,
            "descripcion": model.descripcion
        })
    
    return {"ok": True, "data": {"models": model_data}}

@api_router.post("/models")
def create_model(
    nombre: str, 
    version: str, 
    framework: str = None, 
    descripcion: str = None, 
    db: Session = Depends(get_db)
):
    """Crea un nuevo modelo ML"""
    model = m.ModeloML(
        nombre=nombre,
        version=version,
        framework=framework,
        fecha_entrenamiento=datetime.utcnow().date(),
        descripcion=descripcion
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    
    return {"ok": True, "data": {
        "modelo_id": model.modelo_id,
        "nombre": model.nombre,
        "version": model.version
    }}
