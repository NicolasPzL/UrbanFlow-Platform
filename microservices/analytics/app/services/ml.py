from sqlalchemy.orm import Session
from ..db import models as m
from datetime import datetime

# Placeholder de pipeline de inferencia: usa umbral simple sobre RMS

def run_prediction_for_measurement(db: Session, medicion_id: int, model_id: int | None = None):
    med = db.query(m.Medicion).filter(m.Medicion.medicion_id == medicion_id).first()
    if not med:
        return None

    # lógica dummy: si rms > 1.0 => 'alerta', si no 'normal'
    try:
        rms_val = float(med.rms) if med.rms is not None else 0.0
    except Exception:
        rms_val = 0.0

    clase = "alerta" if rms_val > 1.0 else "normal"
    prob = {"alerta": 0.8 if clase == "alerta" else 0.2, "normal": 0.2 if clase == "alerta" else 0.8}

    # elegir un modelo existente si no se pasa
    if model_id is None:
        model_row = db.query(m.ModeloML).order_by(m.ModeloML.modelo_id.asc()).first()
        model_id = model_row.modelo_id if model_row else 1

    pred = m.Prediccion(
        medicion_id=medicion_id,
        modelo_id=model_id,
        clase_predicha=clase,
        probabilidades=prob,
        timestamp_prediccion=datetime.utcnow(),
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)
    return pred
