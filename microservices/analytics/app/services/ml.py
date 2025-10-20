from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from ..db import models as m
from datetime import datetime, timedelta
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
import json

class MLPredictionService:
    """Servicio de predicciones ML usando datos históricos"""
    
    def __init__(self, db: Session):
        self.db = db
        self.scaler = StandardScaler()
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.dbscan = DBSCAN(eps=0.5, min_samples=5)
    
    def run_prediction_for_measurement(self, medicion_id: int, model_id: int | None = None):
        """Ejecuta predicción para una medición específica usando datos históricos"""
        med = self.db.query(m.Medicion).filter(m.Medicion.medicion_id == medicion_id).first()
        if not med:
            return None

        # Obtener datos históricos para entrenar el modelo
        historical_data = self._get_historical_data(med.sensor_id)
        
        if len(historical_data) < 10:  # Necesitamos suficientes datos históricos
            return self._simple_prediction(med, model_id)
        
        # Entrenar modelo con datos históricos
        model_result = self._train_and_predict(med, historical_data)
        
        # Elegir modelo existente si no se especifica
        if model_id is None:
            model_row = self.db.query(m.ModeloML).order_by(m.ModeloML.modelo_id.asc()).first()
            model_id = model_row.modelo_id if model_row else 1

        pred = m.Prediccion(
            medicion_id=medicion_id,
            modelo_id=model_id,
            clase_predicha=model_result['clase'],
            probabilidades=model_result['probabilidades'],
            timestamp_prediccion=datetime.utcnow(),
        )
        self.db.add(pred)
        self.db.commit()
        self.db.refresh(pred)
        return pred
    
    def _get_historical_data(self, sensor_id: int, days_back: int = 30):
        """Obtiene datos históricos del sensor para los últimos N días"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        historical_meds = self.db.query(m.Medicion).filter(
            m.Medicion.sensor_id == sensor_id,
            m.Medicion.timestamp >= cutoff_date
        ).order_by(desc(m.Medicion.timestamp)).limit(1000).all()
        
        return historical_meds
    
    def _train_and_predict(self, current_medicion, historical_data):
        """Entrena modelo con datos históricos y predice para medición actual"""
        # Preparar características
        features = self._extract_features(historical_data)
        current_features = self._extract_single_features(current_medicion)
        
        if len(features) < 5:
            return self._simple_prediction(current_medicion, None)
        
        # Normalizar características
        features_scaled = self.scaler.fit_transform(features)
        current_scaled = self.scaler.transform([current_features])
        
        # Detección de anomalías con Isolation Forest
        anomaly_scores = self.isolation_forest.fit_predict(features_scaled)
        current_anomaly = self.isolation_forest.predict(current_scaled)[0]
        current_score = self.isolation_forest.score_samples(current_scaled)[0]
        
        # Clustering para patrones
        clusters = self.dbscan.fit_predict(features_scaled)
        
        # Análisis de tendencias
        trend_analysis = self._analyze_trends(historical_data)
        
        # Determinar clase basada en múltiples factores
        clase, probabilidades = self._classify_measurement(
            current_anomaly, current_score, trend_analysis, current_medicion
        )
        
        return {
            'clase': clase,
            'probabilidades': probabilidades,
            'anomaly_score': float(current_score),
            'is_anomaly': current_anomaly == -1
        }
    
    def _extract_features(self, mediciones):
        """Extrae características de las mediciones para ML"""
        features = []
        for med in mediciones:
            feature_vector = [
                float(med.rms) if med.rms is not None else 0.0,
                float(med.kurtosis) if med.kurtosis is not None else 0.0,
                float(med.skewness) if med.skewness is not None else 0.0,
                float(med.zcr) if med.zcr is not None else 0.0,
                float(med.pico) if med.pico is not None else 0.0,
                float(med.crest_factor) if med.crest_factor is not None else 0.0,
                float(med.frecuencia_media) if med.frecuencia_media is not None else 0.0,
                float(med.frecuencia_dominante) if med.frecuencia_dominante is not None else 0.0,
                float(med.amplitud_max_espectral) if med.amplitud_max_espectral is not None else 0.0,
                float(med.velocidad) if med.velocidad is not None else 0.0
            ]
            features.append(feature_vector)
        return np.array(features)
    
    def _extract_single_features(self, medicion):
        """Extrae características de una sola medición"""
        return [
            float(medicion.rms) if medicion.rms is not None else 0.0,
            float(medicion.kurtosis) if medicion.kurtosis is not None else 0.0,
            float(medicion.skewness) if medicion.skewness is not None else 0.0,
            float(medicion.zcr) if medicion.zcr is not None else 0.0,
            float(medicion.pico) if medicion.pico is not None else 0.0,
            float(medicion.crest_factor) if medicion.crest_factor is not None else 0.0,
            float(medicion.frecuencia_media) if medicion.frecuencia_media is not None else 0.0,
            float(medicion.frecuencia_dominante) if medicion.frecuencia_dominante is not None else 0.0,
            float(medicion.amplitud_max_espectral) if medicion.amplitud_max_espectral is not None else 0.0,
            float(medicion.velocidad) if medicion.velocidad is not None else 0.0
        ]
    
    def _analyze_trends(self, historical_data):
        """Analiza tendencias en los datos históricos"""
        if len(historical_data) < 5:
            return {'trend': 'stable', 'volatility': 'low'}
        
        # Calcular tendencia de RMS
        rms_values = [float(med.rms) if med.rms is not None else 0.0 for med in historical_data[:10]]
        rms_trend = np.polyfit(range(len(rms_values)), rms_values, 1)[0]
        
        # Calcular volatilidad
        rms_std = np.std(rms_values)
        
        trend = 'increasing' if rms_trend > 0.1 else 'decreasing' if rms_trend < -0.1 else 'stable'
        volatility = 'high' if rms_std > 0.5 else 'low'
        
        return {'trend': trend, 'volatility': volatility}
    
    def _classify_measurement(self, anomaly, score, trend_analysis, medicion):
        """Clasifica la medición basada en múltiples factores"""
        # Factores de decisión
        is_anomaly = anomaly == -1
        low_score = score < -0.5
        high_volatility = trend_analysis['volatility'] == 'high'
        increasing_trend = trend_analysis['trend'] == 'increasing'
        
        # Valores umbrales basados en datos históricos
        rms_val = float(medicion.rms) if medicion.rms is not None else 0.0
        kurtosis_val = float(medicion.kurtosis) if medicion.kurtosis is not None else 0.0
        
        # Lógica de clasificación mejorada
        if is_anomaly or low_score:
            clase = 'alerta'
            prob_alerta = 0.9
        elif rms_val > 1.5 or kurtosis_val > 5.0:
            clase = 'inusual'
            prob_alerta = 0.6
        elif high_volatility or increasing_trend:
            clase = 'monitoreo'
            prob_alerta = 0.4
        else:
            clase = 'normal'
            prob_alerta = 0.1
        
        probabilidades = {
            'alerta': prob_alerta,
            'inusual': 0.3 if clase == 'inusual' else 0.1,
            'monitoreo': 0.3 if clase == 'monitoreo' else 0.1,
            'normal': 1.0 - prob_alerta - 0.2
        }
        
        return clase, probabilidades
    
    def _simple_prediction(self, medicion, model_id):
        """Predicción simple como fallback"""
        rms_val = float(medicion.rms) if medicion.rms is not None else 0.0
        clase = "alerta" if rms_val > 1.0 else "normal"
        prob = {"alerta": 0.8 if clase == "alerta" else 0.2, "normal": 0.2 if clase == "alerta" else 0.8}
        
        return {
            'clase': clase,
            'probabilidades': prob,
            'anomaly_score': 0.0,
            'is_anomaly': False
        }
    
    def get_sensor_health_summary(self, sensor_id: int):
        """Obtiene resumen de salud del sensor basado en datos históricos"""
        historical_data = self._get_historical_data(sensor_id, days_back=7)
        
        if not historical_data:
            return {"status": "no_data", "message": "No hay datos históricos suficientes"}
        
        # Análisis de salud
        rms_values = [float(med.rms) if med.rms is not None else 0.0 for med in historical_data]
        avg_rms = np.mean(rms_values)
        rms_std = np.std(rms_values)
        
        # Clasificar salud del sensor
        if avg_rms > 1.5 or rms_std > 0.8:
            health_status = "critical"
        elif avg_rms > 1.0 or rms_std > 0.5:
            health_status = "warning"
        else:
            health_status = "healthy"
        
        return {
            "sensor_id": sensor_id,
            "health_status": health_status,
            "avg_rms": float(avg_rms),
            "rms_volatility": float(rms_std),
            "data_points": len(historical_data),
            "last_measurement": historical_data[0].timestamp.isoformat() if historical_data else None
        }

# Función de compatibilidad con el código existente
def run_prediction_for_measurement(db: Session, medicion_id: int, model_id: int | None = None):
    """Función de compatibilidad para mantener la API existente"""
    ml_service = MLPredictionService(db)
    return ml_service.run_prediction_for_measurement(medicion_id, model_id)
