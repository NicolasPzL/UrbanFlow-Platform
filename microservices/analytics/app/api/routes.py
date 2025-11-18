from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from ..db.session import get_db
from ..db import models as m
from ..services.analytics import AnalyticsService
from ..services.ml import MLPredictionService
from ..services.telemetry_processor_simple import TelemetryProcessorSimple as TelemetryProcessor
from ..services.chatbot import ChatbotService
from ..services.context_manager import get_context_manager
from ..core.config import settings
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import uuid

api_router = APIRouter()

# Router separado para el chatbot
chatbot_router = APIRouter()

# Pydantic models for chatbot endpoints
class ChatbotQueryRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    include_ml_analysis: Optional[bool] = False

class ChatbotConversationRequest(BaseModel):
    question: str
    session_id: str

# =============================================================================
# CHATBOT ENDPOINTS
# =============================================================================

@chatbot_router.post("/query")
def chatbot_query(request: ChatbotQueryRequest, db: Session = Depends(get_db)):
    """
    Main chatbot endpoint for natural language queries.
    Can optionally maintain conversation context via session_id.
    """
    try:
        # Initialize chatbot service
        print(
            "[DEBUG chatbot_query] provider=",
            settings.LLM_PROVIDER,
            "model=",
            settings.MODEL_NAME,
            "ollama_base_url=",
            settings.OLLAMA_BASE_URL,
        )
        chatbot = ChatbotService(
            db=db,
            llm_provider=settings.LLM_PROVIDER,
            model_name=settings.MODEL_NAME,
            enable_ml_analysis=settings.CHATBOT_ENABLE_ML_ANALYSIS
        )
        
        # Get or create conversation context
        context = None
        if request.session_id:
            context_manager = get_context_manager()
            context = context_manager.get_or_create_context(
                request.session_id,
                max_messages=settings.CHATBOT_MAX_CONTEXT_MESSAGES
            )
            context.add_user_message(request.question)
        
        # Process the query
        result = chatbot.process_query(
            question=request.question,
            context=context,
            include_ml_analysis=request.include_ml_analysis
        )
        
        # Add response to context if session exists
        if context and result.get("success"):
            context.add_assistant_message(result.get("response", ""))
        
        return {"ok": True, "data": result}
    
    except Exception as e:
        return {"ok": False, "error": str(e)}

@chatbot_router.post("/conversation")
def chatbot_conversation(request: ChatbotConversationRequest, db: Session = Depends(get_db)):
    """
    Chatbot endpoint that maintains full conversation context.
    Requires a session_id to track the conversation.
    """
    try:
        # Initialize chatbot service
        print(
            "[DEBUG chatbot_conversation] provider=",
            settings.LLM_PROVIDER,
            "model=",
            settings.MODEL_NAME,
            "ollama_base_url=",
            settings.OLLAMA_BASE_URL,
        )
        chatbot = ChatbotService(
            db=db,
            llm_provider=settings.LLM_PROVIDER,
            model_name=settings.MODEL_NAME,
            enable_ml_analysis=settings.CHATBOT_ENABLE_ML_ANALYSIS
        )
        
        # Get or create conversation context
        context_manager = get_context_manager()
        context = context_manager.get_or_create_context(
            request.session_id,
            max_messages=settings.CHATBOT_MAX_CONTEXT_MESSAGES
        )
        
        # Add user message to context
        context.add_user_message(request.question)
        
        # Process the query with full context
        result = chatbot.process_query(
            question=request.question,
            context=context,
            include_ml_analysis=True
        )
        
        # Add response to context
        if result.get("success"):
            context.add_assistant_message(result.get("response", ""))
        
        # Include conversation history in response
        result["conversation_history"] = context.get_messages_for_llm()
        result["session_id"] = request.session_id
        
        return {"ok": True, "data": result}
    
    except Exception as e:
        return {"ok": False, "error": str(e)}

@chatbot_router.get("/capabilities")
def chatbot_capabilities(db: Session = Depends(get_db)):
    print("DEBUG provider:", settings.LLM_PROVIDER, "model:", settings.MODEL_NAME)
    """
    Returns information about chatbot capabilities and supported queries.
    """
    try:
        print(
            "[DEBUG chatbot_capabilities] provider=",
            settings.LLM_PROVIDER,
            "model=",
            settings.MODEL_NAME,
            "ollama_base_url=",
            settings.OLLAMA_BASE_URL,
        )

        chatbot = ChatbotService(
            db=db,
            llm_provider=settings.LLM_PROVIDER,
            model_name=settings.MODEL_NAME,
            enable_ml_analysis=settings.CHATBOT_ENABLE_ML_ANALYSIS
)
        
        capabilities = chatbot.get_capabilities()
        return {"ok": True, "data": capabilities}
    
    except Exception as e:
        return {"ok": False, "error": str(e)}

@chatbot_router.post("/session/new")
def create_chatbot_session():
    """
    Create a new chatbot session and return a session_id.
    """
    try:
        session_id = str(uuid.uuid4())
        context_manager = get_context_manager()
        context = context_manager.create_context(
            session_id,
            max_messages=settings.CHATBOT_MAX_CONTEXT_MESSAGES
        )
        
        return {
            "ok": True,
            "data": {
                "session_id": session_id,
                "created_at": context.created_at.isoformat(),
                "max_messages": settings.CHATBOT_MAX_CONTEXT_MESSAGES
            }
        }
    
    except Exception as e:
        return {"ok": False, "error": str(e)}

@chatbot_router.delete("/session/{session_id}")
def delete_chatbot_session(session_id: str):
    """
    Delete a chatbot session and clear its context.
    """
    try:
        context_manager = get_context_manager()
        deleted = context_manager.delete_context(session_id)
        
        if deleted:
            return {"ok": True, "data": {"message": "Session deleted successfully"}}
        else:
            return {"ok": False, "error": "Session not found"}
    
    except Exception as e:
        return {"ok": False, "error": str(e)}

@chatbot_router.get("/session/{session_id}")
def get_chatbot_session(session_id: str):
    """
    Get conversation history for a specific session.
    """
    try:
        context_manager = get_context_manager()
        context = context_manager.get_context(session_id)
        
        if not context:
            return {"ok": False, "error": "Session not found"}
        
        return {"ok": True, "data": context.to_dict()}
    
    except Exception as e:
        return {"ok": False, "error": str(e)}

# =============================================================================
# ENDPOINTS DE PROCESAMIENTO DE TELEMETRÍA
# =============================================================================

@api_router.post("/analytics/process")
def process_telemetry_data(db: Session = Depends(get_db)):
    """Procesa datos de telemetría cruda y calcula métricas analíticas"""
    try:
        processor = TelemetryProcessor(db)
        result = processor.process_new_telemetry()
        return {"ok": True, "data": result}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@api_router.get("/analytics/trayecto")
def get_trayecto_completo(db: Session = Depends(get_db)):
    """Devuelve la trayectoria completa ordenada por timestamp"""
    processor = TelemetryProcessor(db)
    trayecto = processor.get_complete_trajectory()
    return {"ok": True, "data": trayecto}

# Endpoint /analytics/summary duplicado - eliminado, usar el de AnalyticsService más abajo

@api_router.get("/data/measurements/recent")
def get_recent_measurements(limit: int = 500, db: Session = Depends(get_db)):
    """Obtiene mediciones recientes para el dashboard"""
    try:
        from sqlalchemy import text
        
        query = text("""
            SELECT 
                medicion_id,
                sensor_id,
                timestamp,
                latitud,
                longitud,
                altitud,
                velocidad,
                rms,
                kurtosis,
                skewness,
                zcr,
                pico,
                crest_factor,
                frecuencia_media,
                frecuencia_dominante,
                amplitud_max_espectral,
                energia_banda_1,
                energia_banda_2,
                energia_banda_3,
                estado_procesado
            FROM mediciones 
            ORDER BY timestamp DESC 
            LIMIT :limit
        """)
        
        result = db.execute(query, {"limit": limit})
        measurements = []
        
        for row in result:
            measurements.append({
                'medicion_id': row.medicion_id,
                'sensor_id': row.sensor_id,
                'timestamp': row.timestamp.isoformat() if row.timestamp else None,
                'latitud': float(row.latitud) if row.latitud else None,
                'longitud': float(row.longitud) if row.longitud else None,
                'altitud': float(row.altitud) if row.altitud else None,
                'velocidad': float(row.velocidad) if row.velocidad else None,
                'rms': float(row.rms) if row.rms else None,
                'kurtosis': float(row.kurtosis) if row.kurtosis else None,
                'skewness': float(row.skewness) if row.skewness else None,
                'zcr': float(row.zcr) if row.zcr else None,
                'pico': float(row.pico) if row.pico else None,
                'crest_factor': float(row.crest_factor) if row.crest_factor else None,
                'frecuencia_media': float(row.frecuencia_media) if row.frecuencia_media else None,
                'frecuencia_dominante': float(row.frecuencia_dominante) if row.frecuencia_dominante else None,
                'amplitud_max_espectral': float(row.amplitud_max_espectral) if row.amplitud_max_espectral else None,
                'energia_banda_1': float(row.energia_banda_1) if row.energia_banda_1 else None,
                'energia_banda_2': float(row.energia_banda_2) if row.energia_banda_2 else None,
                'energia_banda_3': float(row.energia_banda_3) if row.energia_banda_3 else None,
                'estado_procesado': row.estado_procesado
            })
        
        return {"ok": True, "data": {"measurements": measurements}}
        
    except Exception as e:
        return {"ok": False, "error": str(e)}

# =============================================================================
# ENDPOINTS DE ANÁLISIS EXISTENTES
# =============================================================================

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

@api_router.get("/data/measurements/by-cab/{cabina_id}")
def get_measurements_by_cabin(cabina_id: int, limit: int = 300, db: Session = Depends(get_db)):
    """Obtiene mediciones recientes para una cabina resolviendo su sensor."""
    sensor = db.query(m.Sensor).filter(m.Sensor.cabina_id == cabina_id).first()
    if not sensor:
        return {"ok": True, "data": {"measurements": []}}

    measurements = db.query(m.Medicion).filter(
        m.Medicion.sensor_id == sensor.sensor_id
    ).order_by(desc(m.Medicion.timestamp)).limit(limit).all()

    measurement_data = []
    for med in measurements:
        measurement_data.append({
            "medicion_id": int(med.medicion_id),
            "timestamp": med.timestamp.isoformat(),
            "rms": float(med.rms) if med.rms else None,
            "velocidad": float(med.velocidad) if med.velocidad else None,
            "sensor_id": sensor.sensor_id,
            "cabina_id": cabina_id,
        })
    return {"ok": True, "data": {"measurements": measurement_data}}

# Cabins endpoints
@api_router.get("/analytics/cabins/summary")
def get_cabins_summary(db: Session = Depends(get_db)):
    """Devuelve todas las cabinas (aunque no tengan sensor) con su último estado y medición (si existe)."""
    # 1) Todas las cabinas
    cabinas = db.query(m.Cabina).order_by(m.Cabina.cabina_id).all()

    # 2) Sensores por cabina
    sensores = db.query(m.Sensor).all()
    sensor_by_cab = {s.cabina_id: s.sensor_id for s in sensores}

    # 3) Última medición por sensor (bulk)
    if sensores:
        sensor_ids = [s.sensor_id for s in sensores]
        subq = (
            db.query(
                m.Medicion.sensor_id.label("sensor_id"),
                func.max(m.Medicion.timestamp).label("max_ts"),
            )
            .filter(m.Medicion.sensor_id.in_(sensor_ids))
            .group_by(m.Medicion.sensor_id)
            .subquery()
        )

        latest = (
            db.query(m.Medicion)
            .join(subq, (m.Medicion.sensor_id == subq.c.sensor_id) & (m.Medicion.timestamp == subq.c.max_ts))
            .all()
        )
        latest_by_sensor = {int(med.sensor_id): med for med in latest}
    else:
        latest_by_sensor = {}

    # 4) Armar respuesta
    result = []
    for cab in cabinas:
        sid = sensor_by_cab.get(cab.cabina_id)
        med = latest_by_sensor.get(sid) if sid else None
        result.append({
            "cabina_id": int(cab.cabina_id),
            "codigo_interno": cab.codigo_interno,
            "estado_actual": cab.estado_actual,
            "sensor_id": int(sid) if sid else None,
            "latest": None if not med else {
                "timestamp": med.timestamp.isoformat() if med.timestamp else None,
                "rms": float(med.rms) if med.rms is not None else None,
                "velocidad": float(med.velocidad) if med.velocidad is not None else None,
                "latitud": float(med.latitud) if med.latitud is not None else None,
                "longitud": float(med.longitud) if med.longitud is not None else None,
            }
        })

    return {"ok": True, "data": {"cabins": result}}

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

@api_router.get("/analytics/sensors/status")
def get_sensors_status(db: Session = Depends(get_db)):
    """Obtiene el estado de todos los sensores"""
    try:
        query = text("""
            SELECT 
                s.sensor_id,
                s.cabina_id,
                c.codigo_interno,
                c.estado_actual,
                c.numero_cabina
            FROM sensores s
            JOIN cabinas c ON s.cabina_id = c.cabina_id
        """)
        
        result = db.execute(query)
        sensors = []
        
        for row in result:
            sensors.append({
                'sensor_id': row.sensor_id,
                'cabina_id': row.cabina_id,
                'codigo_interno': row.codigo_interno,
                'estado_actual': row.estado_actual,
                'numero_cabina': row.numero_cabina,
                'health': {
                    'status': 'normal' if row.estado_actual == 'operativa' else 'warning',
                    'system_status': row.estado_actual
                }
            })
        
        return {"ok": True, "data": {"sensors": sensors}}
        
    except Exception as e:
        return {"ok": False, "error": str(e)}

@api_router.get("/debug/telemetry-count")
def debug_telemetry_count(db: Session = Depends(get_db)):
    """Debug: cuenta registros en telemetria_cruda"""
    try:
        from sqlalchemy import text
        
        # Contar total de registros en telemetria_cruda
        total_query = text("SELECT COUNT(*) as total FROM telemetria_cruda")
        total_result = db.execute(total_query).fetchone()
        
        # Contar registros en mediciones
        mediciones_query = text("SELECT COUNT(*) as total FROM mediciones")
        mediciones_result = db.execute(mediciones_query).fetchone()
        
        # Obtener último timestamp en mediciones
        last_medicion_query = text("SELECT MAX(timestamp) as last_timestamp FROM mediciones")
        last_medicion_result = db.execute(last_medicion_query).fetchone()
        
        # Obtener algunos registros de telemetria_cruda
        sample_query = text("SELECT * FROM telemetria_cruda ORDER BY timestamp ASC LIMIT 5")
        sample_result = db.execute(sample_query).fetchall()
        
        return {
            "ok": True,
            "data": {
                "telemetria_cruda_total": total_result.total if total_result else 0,
                "mediciones_total": mediciones_result.total if mediciones_result else 0,
                "last_medicion_timestamp": last_medicion_result.last_timestamp.isoformat() if last_medicion_result and last_medicion_result.last_timestamp else None,
                "sample_telemetry": [
                    {
                        "telemetria_id": row.telemetria_id,
                        "sensor_id": row.sensor_id,
                        "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                        "velocidad_kmh": float(row.velocidad_kmh) if row.velocidad_kmh else None
                    } for row in sample_result
                ]
            }
        }
        
    except Exception as e:
        return {"ok": False, "error": str(e)}
