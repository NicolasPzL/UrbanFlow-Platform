from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..services import analytics as analytics_svc
from ..services import ml as ml_svc

api_router = APIRouter()

@api_router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db)):
    return {"ok": True, "data": analytics_svc.summary(db)}

@api_router.post("/predictions/run")
def predictions_run(medicion_id: int, model_id: int | None = None, db: Session = Depends(get_db)):
    pred = ml_svc.run_prediction_for_measurement(db, medicion_id=medicion_id, model_id=model_id)
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
