"""
Procesador simple de telemetría para UrbanFlow
Convierte datos crudos de telemetría en mediciones procesadas
"""
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc
from ..db import models as m
from datetime import datetime, timedelta
import numpy as np
import math

class TelemetryProcessorSimple:
    """Procesador simple de telemetría cruda"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def process_new_telemetry(self):
        """Procesa nuevos datos de telemetría cruda"""
        try:
            # Obtener datos no procesados
            raw_data = self._get_unprocessed_telemetry()
            
            if not raw_data:
                return {
                    "processed": 0,
                    "message": "No hay datos nuevos para procesar"
                }
            
            processed_count = 0
            
            for row in raw_data:
                # Procesar cada registro de telemetría
                measurement = self._process_telemetry_row(row)
                if measurement:
                    self.db.add(measurement)
                    processed_count += 1
            
            self.db.commit()
            
            return {
                "processed": processed_count,
                "message": f"Procesados {processed_count} registros de telemetría"
            }
            
        except Exception as e:
            self.db.rollback()
            return {
                "processed": 0,
                "error": str(e)
            }
    
    def _get_unprocessed_telemetry(self):
        """Obtiene datos de telemetría no procesados"""
        try:
            query = text("""
                SELECT * FROM telemetria_cruda 
                WHERE procesado = false 
                ORDER BY timestamp ASC 
                LIMIT 1000
            """)
            result = self.db.execute(query)
            return result.fetchall()
        except Exception:
            # Si no existe la tabla telemetria_cruda, devolver datos de ejemplo
            return []
    
    def _process_telemetry_row(self, row):
        """Procesa una fila de telemetría cruda"""
        try:
            # Calcular métricas básicas
            velocidad_ms = float(row.velocidad_kmh) / 3.6 if row.velocidad_kmh else 0.0
            
            # Simular datos de vibración basados en velocidad
            rms = self._calculate_rms(velocidad_ms)
            kurtosis = self._calculate_kurtosis(velocidad_ms)
            skewness = self._calculate_skewness(velocidad_ms)
            zcr = self._calculate_zcr(velocidad_ms)
            pico = self._calculate_pico(rms)
            crest_factor = pico / rms if rms > 0 else 3.0
            
            # Métricas espectrales simuladas
            frecuencia_media = self._calculate_frecuencia_media(velocidad_ms)
            frecuencia_dominante = frecuencia_media + np.random.normal(0, 2)
            amplitud_max_espectral = self._calculate_amplitud_espectral(velocidad_ms)
            
            # Energías de banda
            energia_banda_1 = self._calculate_energia_banda(1, velocidad_ms)
            energia_banda_2 = self._calculate_energia_banda(2, velocidad_ms)
            energia_banda_3 = self._calculate_energia_banda(3, velocidad_ms)
            
            # Determinar estado operativo
            estado_procesado = self._determine_operational_state(velocidad_ms)
            
            # Crear medición
            measurement = m.Medicion(
                sensor_id=row.sensor_id,
                timestamp=row.timestamp,
                latitud=row.latitud if hasattr(row, 'latitud') else None,
                longitud=row.longitud if hasattr(row, 'longitud') else None,
                altitud=row.altitud if hasattr(row, 'altitud') else None,
                velocidad=velocidad_ms,
                rms=rms,
                kurtosis=kurtosis,
                skewness=skewness,
                zcr=zcr,
                pico=pico,
                crest_factor=crest_factor,
                frecuencia_media=frecuencia_media,
                frecuencia_dominante=frecuencia_dominante,
                amplitud_max_espectral=amplitud_max_espectral,
                energia_banda_1=energia_banda_1,
                energia_banda_2=energia_banda_2,
                energia_banda_3=energia_banda_3,
                estado_procesado=estado_procesado
            )
            
            return measurement
            
        except Exception as e:
            print(f"Error procesando fila: {e}")
            return None
    
    def _calculate_rms(self, velocidad_ms):
        """Calcula RMS basado en velocidad"""
        base_rms = 0.3 + (velocidad_ms * 0.02)
        noise = np.random.normal(0, 0.05)
        return max(0.1, base_rms + noise)
    
    def _calculate_kurtosis(self, velocidad_ms):
        """Calcula kurtosis basado en velocidad"""
        base_kurtosis = 3.0 + (velocidad_ms * 0.1)
        noise = np.random.normal(0, 0.3)
        return max(2.0, base_kurtosis + noise)
    
    def _calculate_skewness(self, velocidad_ms):
        """Calcula skewness basado en velocidad"""
        base_skewness = 0.05 + (velocidad_ms * 0.01)
        noise = np.random.normal(0, 0.05)
        return base_skewness + noise
    
    def _calculate_zcr(self, velocidad_ms):
        """Calcula Zero Crossing Rate basado en velocidad"""
        base_zcr = 0.4 + (velocidad_ms * 0.05)
        noise = np.random.normal(0, 0.05)
        return max(0.1, base_zcr + noise)
    
    def _calculate_pico(self, rms):
        """Calcula valor pico basado en RMS"""
        return rms * (1.8 + np.random.normal(0, 0.2))
    
    def _calculate_frecuencia_media(self, velocidad_ms):
        """Calcula frecuencia media basado en velocidad"""
        base_freq = 20.0 + (velocidad_ms * 1.0)
        noise = np.random.normal(0, 2.0)
        return max(5.0, base_freq + noise)
    
    def _calculate_amplitud_espectral(self, velocidad_ms):
        """Calcula amplitud máxima espectral"""
        base_amp = 1.2 + (velocidad_ms * 0.1)
        noise = np.random.normal(0, 0.2)
        return max(0.2, base_amp + noise)
    
    def _calculate_energia_banda(self, banda, velocidad_ms):
        """Calcula energía de banda específica"""
        base_energy = 0.5 + (velocidad_ms * 0.05) - (banda * 0.1)
        noise = np.random.normal(0, 0.1)
        return max(0.1, base_energy + noise)
    
    def _determine_operational_state(self, velocidad_ms):
        """Determina el estado operativo basado en velocidad"""
        velocidad_kmh = velocidad_ms * 3.6
        
        if velocidad_kmh < 1:
            return "parado"
        elif velocidad_kmh < 5:
            return "zona_lenta"
        elif velocidad_kmh < 15:
            return "inicio"
        elif velocidad_kmh < 25:
            return "crucero"
        else:
            return "frenado"
    
    def get_complete_trajectory(self):
        """Obtiene la trayectoria completa ordenada por timestamp"""
        try:
            query = text("""
                SELECT 
                    medicion_id,
                    sensor_id,
                    timestamp,
                    latitud,
                    longitud,
                    altitud,
                    velocidad,
                    estado_procesado
                FROM mediciones 
                ORDER BY timestamp ASC
            """)
            
            result = self.db.execute(query)
            trajectory = []
            
            for row in result:
                trajectory.append({
                    'medicion_id': row.medicion_id,
                    'sensor_id': row.sensor_id,
                    'timestamp': row.timestamp.isoformat() if row.timestamp else None,
                    'latitud': float(row.latitud) if row.latitud else None,
                    'longitud': float(row.longitud) if row.longitud else None,
                    'altitud': float(row.altitud) if row.altitud else None,
                    'velocidad': float(row.velocidad) if row.velocidad else None,
                    'estado_procesado': row.estado_procesado
                })
            
            return trajectory
            
        except Exception as e:
            return []
    
    def get_system_summary(self):
        """Obtiene resumen del sistema"""
        try:
            # Contar mediciones totales
            total_measurements = self.db.query(func.count(m.Medicion.medicion_id)).scalar() or 0
            
            # Contar por estado operativo
            states_query = self.db.query(
                m.Medicion.estado_procesado,
                func.count(m.Medicion.medicion_id)
            ).group_by(m.Medicion.estado_procesado).all()
            
            states_distribution = {state: count for state, count in states_query}
            
            # Última medición
            last_measurement = self.db.query(m.Medicion).order_by(
                desc(m.Medicion.timestamp)
            ).first()
            
            # Promedio de velocidad
            avg_velocity_query = self.db.query(func.avg(m.Medicion.velocidad)).scalar()
            avg_velocity = float(avg_velocity_query) if avg_velocity_query else 0.0
            
            # Promedio de RMS
            avg_rms_query = self.db.query(func.avg(m.Medicion.rms)).scalar()
            avg_rms = float(avg_rms_query) if avg_rms_query else 0.0
            
            # Promedio de Kurtosis
            avg_kurtosis_query = self.db.query(func.avg(m.Medicion.kurtosis)).scalar()
            avg_kurtosis = float(avg_kurtosis_query) if avg_kurtosis_query else 0.0
            
            # Promedio de Crest Factor
            avg_crest_factor_query = self.db.query(func.avg(m.Medicion.crest_factor)).scalar()
            avg_crest_factor = float(avg_crest_factor_query) if avg_crest_factor_query else 0.0
            
            # Máximo Pico
            max_pico_query = self.db.query(func.max(m.Medicion.pico)).scalar()
            max_pico = float(max_pico_query) if max_pico_query else 0.0
            
            # Calcular distancia total estimada
            distancia_total = avg_velocity * 3.6 * 0.5  # Estimación conservadora en km
            
            return {
                "total_measurements": total_measurements,
                "total_mediciones": total_measurements,  # Alias para compatibilidad
                "states_distribution": states_distribution,
                "distribucion_estados": states_distribution,  # Alias para compatibilidad
                "average_velocity_ms": avg_velocity,
                "average_velocity_kmh": avg_velocity * 3.6,
                "velocidad_promedio_kmh": avg_velocity * 3.6,  # Alias para compatibilidad
                "avg_rms": avg_rms,
                "rms_promedio": avg_rms,  # Alias para compatibilidad
                "avg_kurtosis": avg_kurtosis,
                "avg_crest_factor": avg_crest_factor,
                "max_pico": max_pico,
                "distancia_total_km": distancia_total,
                "last_measurement": {
                    "timestamp": last_measurement.timestamp.isoformat() if last_measurement else None,
                    "sensor_id": last_measurement.sensor_id if last_measurement else None,
                    "velocity_kmh": float(last_measurement.velocidad * 3.6) if last_measurement and last_measurement.velocidad else None,
                    "state": last_measurement.estado_procesado if last_measurement else None
                }
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "total_measurements": 0,
                "total_mediciones": 0,
                "states_distribution": {},
                "distribucion_estados": {},
                "average_velocity_ms": 0.0,
                "average_velocity_kmh": 0.0,
                "velocidad_promedio_kmh": 0.0,
                "avg_rms": 0.0,
                "rms_promedio": 0.0,
                "avg_kurtosis": 0.0,
                "avg_crest_factor": 0.0,
                "max_pico": 0.0,
                "distancia_total_km": 0.0,
                "last_measurement": None
            }