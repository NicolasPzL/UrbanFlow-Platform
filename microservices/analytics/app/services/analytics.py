from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from ..db import models as m
from datetime import datetime, timedelta
import numpy as np

class AnalyticsService:
    """Servicio de análisis avanzado para UrbanFlow"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def summary(self):
        """Resumen general del sistema"""
        total_med = self.db.query(func.count(m.Medicion.medicion_id)).scalar() or 0
        total_pred = self.db.query(func.count(m.Prediccion.prediccion_id)).scalar() or 0
        total_sensors = self.db.query(func.count(m.Sensor.sensor_id)).scalar() or 0
        
        last_pred = (
            self.db.query(m.Prediccion)
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
            self.db.query(m.Prediccion.clase_predicha, func.count(m.Prediccion.prediccion_id))
            .group_by(m.Prediccion.clase_predicha)
            .all()
        )
        classes = {c: n for c, n in by_class}
        
        # Calcular métricas adicionales de mediciones
        avg_rms = self.db.query(func.avg(m.Medicion.rms)).scalar()
        avg_velocity = self.db.query(func.avg(m.Medicion.velocidad)).scalar()
        avg_kurtosis = self.db.query(func.avg(m.Medicion.kurtosis)).scalar()
        avg_crest_factor = self.db.query(func.avg(m.Medicion.crest_factor)).scalar()
        max_pico = self.db.query(func.max(m.Medicion.pico)).scalar()
        
        # Convertir Decimal a float para evitar errores de tipo
        avg_velocity = float(avg_velocity) if avg_velocity is not None else None
        avg_rms = float(avg_rms) if avg_rms is not None else None
        avg_kurtosis = float(avg_kurtosis) if avg_kurtosis is not None else None
        avg_crest_factor = float(avg_crest_factor) if avg_crest_factor is not None else None
        max_pico = float(max_pico) if max_pico is not None else None
        
        # Distribución de estados operativos
        states_query = self.db.query(
            m.Medicion.estado_procesado,
            func.count(m.Medicion.medicion_id)
        ).group_by(m.Medicion.estado_procesado).all()
        
        states_distribution = {state: count for state, count in states_query}

        return {
            "total_measurements": int(total_med),
            "total_mediciones": int(total_med),  # Alias para compatibilidad
            "total_predictions": int(total_pred),
            "total_sensors": int(total_sensors),
            "latest_prediction_at": latest_ts.isoformat() if latest_ts else None,
            "class_distribution": classes,
            "states_distribution": states_distribution,
            "distribucion_estados": states_distribution,  # Alias para compatibilidad
            "avg_rms": avg_rms if avg_rms is not None else 0.0,
            "rms_promedio": avg_rms if avg_rms is not None else 0.0,  # Alias para compatibilidad
            "average_velocity_ms": avg_velocity if avg_velocity is not None else 0.0,
            "average_velocity_kmh": (avg_velocity * 3.6) if avg_velocity is not None else 0.0,
            "velocidad_promedio_kmh": (avg_velocity * 3.6) if avg_velocity is not None else 0.0,  # Alias para compatibilidad
            "avg_kurtosis": avg_kurtosis if avg_kurtosis is not None else 0.0,
            "avg_crest_factor": avg_crest_factor if avg_crest_factor is not None else 0.0,
            "max_pico": max_pico if max_pico is not None else 0.0,
            "distancia_total_km": (avg_velocity * 3.6 * 0.5) if avg_velocity is not None else 0.0,  # Estimación conservadora
        }
    
    def get_system_health(self):
        """Análisis de salud del sistema completo"""
        # Obtener datos de los últimos 30 días (más flexible para datos históricos)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        recent_measurements = self.db.query(m.Medicion).filter(
            m.Medicion.timestamp >= cutoff_date
        ).all()
        
        # Si no hay datos recientes, intentar con todos los datos disponibles
        if not recent_measurements:
            recent_measurements = self.db.query(m.Medicion).limit(1000).all()
            if not recent_measurements:
                return {"status": "no_data", "message": "No hay datos disponibles"}
        
        # Análisis de RMS
        rms_values = [float(med.rms) if med.rms is not None else 0.0 for med in recent_measurements]
        avg_rms = np.mean(rms_values)
        rms_std = np.std(rms_values)
        
        # Análisis de predicciones recientes
        recent_predictions = self.db.query(m.Prediccion).filter(
            m.Prediccion.timestamp_prediccion >= cutoff_date
        ).all()
        
        alert_count = sum(1 for pred in recent_predictions if pred.clase_predicha == 'alerta')
        unusual_count = sum(1 for pred in recent_predictions if pred.clase_predicha == 'inusual')
        n_preds = len(recent_predictions)
        alert_rate = float(alert_count / n_preds) if n_preds else 0.0
        
        # Determinar estado del sistema
        if avg_rms > 1.5 or (n_preds > 0 and alert_rate > 0.1):
            system_status = "critical"
        elif avg_rms > 1.0 or (n_preds > 0 and alert_rate > 0.05):
            system_status = "warning"
        else:
            system_status = "healthy"
        
        return {
            "system_status": system_status,
            "avg_rms": float(avg_rms),
            "rms_volatility": float(rms_std),
            "total_measurements_7d": len(recent_measurements),
            "alert_predictions": alert_count,
            "unusual_predictions": unusual_count,
            "alert_rate": alert_rate
        }
    
    def get_sensor_analytics(self, sensor_id: int, days: int = 7):
        """Análisis detallado de un sensor específico"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        measurements = self.db.query(m.Medicion).filter(
            m.Medicion.sensor_id == sensor_id,
            m.Medicion.timestamp >= cutoff_date
        ).order_by(desc(m.Medicion.timestamp)).all()
        
        if not measurements:
            return {"status": "no_data", "message": f"No hay datos para el sensor {sensor_id}"}
        
        # Análisis estadístico
        rms_values = [float(med.rms) if med.rms is not None else 0.0 for med in measurements]
        kurtosis_values = [float(med.kurtosis) if med.kurtosis is not None else 0.0 for med in measurements]
        velocity_values = [float(med.velocidad) if med.velocidad is not None else 0.0 for med in measurements]
        
        # Predicciones recientes
        predictions = self.db.query(m.Prediccion).join(m.Medicion).filter(
            m.Medicion.sensor_id == sensor_id,
            m.Prediccion.timestamp_prediccion >= cutoff_date
        ).all()
        
        return {
            "sensor_id": sensor_id,
            "period_days": days,
            "measurements_count": len(measurements),
            "statistics": {
                "rms": {
                    "mean": float(np.mean(rms_values)),
                    "std": float(np.std(rms_values)),
                    "min": float(np.min(rms_values)),
                    "max": float(np.max(rms_values))
                },
                "kurtosis": {
                    "mean": float(np.mean(kurtosis_values)),
                    "std": float(np.std(kurtosis_values))
                },
                "velocity": {
                    "mean": float(np.mean(velocity_values)),
                    "std": float(np.std(velocity_values))
                }
            },
            "predictions": {
                "total": len(predictions),
                "by_class": {
                    pred.clase_predicha: sum(1 for p in predictions if p.clase_predicha == pred.clase_predicha)
                    for pred in predictions
                }
            },
            "last_measurement": measurements[0].timestamp.isoformat() if measurements else None
        }
    
    def get_trend_analysis(self, sensor_id: int, days: int = 30):
        """Análisis de tendencias para un sensor"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        measurements = self.db.query(m.Medicion).filter(
            m.Medicion.sensor_id == sensor_id,
            m.Medicion.timestamp >= cutoff_date
        ).order_by(m.Medicion.timestamp).all()
        
        if len(measurements) < 10:
            return {"status": "insufficient_data", "message": "Se necesitan al menos 10 mediciones"}
        
        # Análisis de tendencia temporal
        rms_values = [float(med.rms) if med.rms is not None else 0.0 for med in measurements]
        timestamps = [med.timestamp for med in measurements]
        
        # Calcular tendencia usando regresión lineal simple
        x = np.arange(len(rms_values))
        trend_coef = np.polyfit(x, rms_values, 1)[0]
        
        # Análisis de volatilidad
        volatility = np.std(rms_values)
        
        # Detectar patrones
        trend_direction = "increasing" if trend_coef > 0.01 else "decreasing" if trend_coef < -0.01 else "stable"
        volatility_level = "high" if volatility > 0.5 else "low"
        
        return {
            "sensor_id": sensor_id,
            "period_days": days,
            "measurements_count": len(measurements),
            "trend": {
                "direction": trend_direction,
                "coefficient": float(trend_coef),
                "volatility": volatility_level,
                "volatility_value": float(volatility)
            },
            "rms_evolution": {
                "start": float(rms_values[0]),
                "end": float(rms_values[-1]),
                "change": float(rms_values[-1] - rms_values[0]),
                "change_percent": float((rms_values[-1] - rms_values[0]) / rms_values[0] * 100) if rms_values[0] != 0 else 0.0
            }
        }

# Función de compatibilidad
def summary(db: Session):
    """Función de compatibilidad para mantener la API existente"""
    analytics_service = AnalyticsService(db)
    return analytics_service.summary()
