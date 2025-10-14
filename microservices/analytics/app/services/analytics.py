from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db import models as m


def summary(db: Session):
    total_med = db.query(func.count(m.Medicion.medicion_id)).scalar() or 0
    total_pred = db.query(func.count(m.Prediccion.prediccion_id)).scalar() or 0
    last_pred = (
        db.query(m.Prediccion)
        .order_by(m.Prediccion.timestamp_prediccion.desc())
        .limit(1)
        .first()
    )

    # métricas básicas
    latest_ts = None
    if last_pred:
        latest_ts = last_pred.timestamp_prediccion

    # distribución por clase
    by_class = (
        db.query(m.Prediccion.clase_predicha, func.count(m.Prediccion.prediccion_id))
        .group_by(m.Prediccion.clase_predicha)
        .all()
    )
    classes = {c: n for c, n in by_class}

    return {
        "total_measurements": int(total_med),
        "total_predictions": int(total_pred),
        "latest_prediction_at": latest_ts.isoformat() if latest_ts else None,
        "class_distribution": classes,
    }
