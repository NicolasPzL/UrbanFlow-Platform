"""
Procesador de telemetría simplificado para procesamiento fila por fila
"""
import numpy as np
import math
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from ..db import models as m
from scipy import signal
from scipy.stats import kurtosis, skew


class TelemetryProcessorSimple:
    """Procesador simplificado de telemetría para procesamiento fila por fila"""
    
    def __init__(self, db: Session):
        self.db = db
        self.R_EARTH = 6371000  # Radio de la Tierra en metros
    
    def process_new_telemetry(self):
        """Procesa datos nuevos de telemetría_cruda y los inserta en mediciones"""
        try:
            # Obtener datos no procesados
            raw_data = self._get_unprocessed_telemetry()
            
            if not raw_data:
                return {
                    "status": "no_new_data",
                    "message": "No hay datos nuevos para procesar",
                    "processed_count": 0
                }
            
            # Procesar fila por fila con cálculo de distancia acumulada
            processed_count = 0
            processed_data = []
            
            # Variables para cálculo de distancia acumulada
            last_lat, last_lon = None, None
            distancia_acumulada_m = 0.0
            
            for i, row in enumerate(raw_data):
                try:
                    # Calcular distancia incremental
                    current_lat = float(row.lat) if row.lat is not None else 0.0
                    current_lon = float(row.lon) if row.lon is not None else 0.0
                    
                    if last_lat is not None and last_lon is not None:
                        distancia_m = self._haversine_distance(last_lat, last_lon, current_lat, current_lon)
                        distancia_acumulada_m += distancia_m
                    else:
                        distancia_m = 0.0  # Primera fila
                        distancia_acumulada_m = 0.0
                    
                    # Calcular métricas para esta fila con distancia acumulada
                    metrics = self._process_single_row(row, distancia_acumulada_m)
                    
                    if metrics:
                        processed_data.append(metrics)
                    
                    # Actualizar coordenadas para siguiente iteración
                    last_lat, last_lon = current_lat, current_lon
                        
                except Exception as e:
                    print(f"Error procesando fila {i}: {e}")
                    continue
            
            # Insertar en lotes
            if processed_data:
                processed_count = self._batch_insert_measurements(processed_data)
            
            return {
                "status": "success",
                "message": f"Procesados {processed_count} registros",
                "processed_count": processed_count
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error en procesamiento: {str(e)}",
                "processed_count": 0
            }
    
    def _get_unprocessed_telemetry(self):
        """Obtiene datos de telemetría_cruda que no han sido procesados"""
        try:
            # Obtener el último timestamp procesado
            last_processed = self.db.query(func.max(m.Medicion.timestamp)).scalar()
            
            if last_processed:
                # Procesar solo datos nuevos
                query = text("""
                    SELECT * FROM telemetria_cruda 
                    WHERE timestamp > :last_timestamp
                    ORDER BY timestamp ASC
                """)
                result = self.db.execute(query, {"last_timestamp": last_processed})
            else:
                # Procesar todos los datos si no hay mediciones
                query = text("""
                    SELECT * FROM telemetria_cruda 
                    ORDER BY timestamp ASC
                    LIMIT 1000
                """)
                result = self.db.execute(query)
            
            data = result.fetchall()
            print(f"Encontrados {len(data)} registros para procesar")
            return data
            
        except Exception as e:
            print(f"Error obteniendo datos no procesados: {e}")
            return []
    
    def _process_single_row(self, row, distancia_acumulada_m):
        """Procesa una sola fila de telemetría cruda"""
        try:
            # Datos básicos
            sensor_id = row.sensor_id
            timestamp = row.timestamp
            lat = float(row.lat) if row.lat is not None else 0.0
            lon = float(row.lon) if row.lon is not None else 0.0
            alt = float(row.alt) if row.alt is not None else 0.0
            velocidad_kmh = float(row.velocidad_kmh) if row.velocidad_kmh is not None else 0.0
            velocidad_m_s = velocidad_kmh / 3.6
            
            # Calcular métricas vibracionales
            vib_metrics = self._calculate_vibration_metrics(row)
            
            # Determinar estado operativo usando distancia acumulada
            estado_procesado = self._determine_operational_state(velocidad_kmh, distancia_acumulada_m)
            
            return {
                'sensor_id': sensor_id,
                'timestamp': timestamp,
                'latitud': lat,
                'longitud': lon,
                'altitud': alt,
                'velocidad': velocidad_m_s,
                'distancia_acumulada_m': distancia_acumulada_m,
                **vib_metrics,
                'estado_procesado': estado_procesado
            }
            
        except Exception as e:
            print(f"Error procesando fila: {e}")
            return None
    
    def _calculate_vibration_metrics(self, row):
        """Calcula métricas vibracionales para una fila con análisis espectral"""
        try:
            # Extraer datos de vibración
            vib_x = float(row.vibracion_x) if row.vibracion_x is not None else 0.0
            vib_y = float(row.vibracion_y) if row.vibracion_y is not None else 0.0
            vib_z = float(row.vibracion_z) if row.vibracion_z is not None else 0.0
            
            # Vector de vibración total
            vib_total = np.sqrt(vib_x**2 + vib_y**2 + vib_z**2)
            
            # RMS (Root Mean Square)
            rms = float(vib_total)
            
            # Pico (valor máximo absoluto)
            pico = float(max(abs(vib_x), abs(vib_y), abs(vib_z)))
            
            # Crest Factor
            crest_factor = float(pico / rms) if rms > 0 else 0.0
            
            # Para análisis espectral, necesitamos una ventana de datos
            # Por ahora, usamos valores aproximados basados en la señal actual
            vib_signal = np.array([vib_x, vib_y, vib_z])
            
            # Kurtosis y Skewness (aproximados para señal de 3 puntos)
            if len(vib_signal) > 1:
                kurt = float(kurtosis(vib_signal, fisher=True))
                skew_val = float(skew(vib_signal))
            else:
                kurt = 0.0
                skew_val = 0.0
            
            # Zero Crossing Rate (aproximado)
            zcr = self._calculate_zcr(vib_signal)
            
            # Análisis espectral (simplificado para señal corta)
            freq_media, freq_dominante, amp_max, energia_bandas = self._spectral_analysis(vib_signal)
            
            return {
                'rms': rms,
                'kurtosis': kurt,
                'skewness': skew_val,
                'zcr': zcr,
                'pico': pico,
                'crest_factor': crest_factor,
                'frecuencia_media': freq_media,
                'frecuencia_dominante': freq_dominante,
                'amplitud_max_espectral': amp_max,
                'energia_banda_1': energia_bandas[0],
                'energia_banda_2': energia_bandas[1],
                'energia_banda_3': energia_bandas[2]
            }
            
        except Exception as e:
            print(f"Error calculando métricas vibracionales: {e}")
            return {
                'rms': 0.0, 'kurtosis': 0.0, 'skewness': 0.0, 'zcr': 0.0,
                'pico': 0.0, 'crest_factor': 0.0, 'frecuencia_media': 0.0,
                'frecuencia_dominante': 0.0, 'amplitud_max_espectral': 0.0,
                'energia_banda_1': 0.0, 'energia_banda_2': 0.0, 'energia_banda_3': 0.0
            }
    
    def _determine_operational_state(self, velocidad_kmh, distancia_acumulada_m):
        """Determina el estado operativo basado en velocidad y distancia acumulada"""
        try:
            # Longitud total de la ruta (aproximadamente 18.2 km)
            RUTA_TOTAL_M = 18200
            
            # Reglas de clasificación según especificaciones
            if velocidad_kmh < 1.0:
                return "Parado"
            elif velocidad_kmh < 5.0:
                # Zona lenta: ~5 km/h durante ~40 m
                if distancia_acumulada_m > 0 and distancia_acumulada_m < 50:
                    return "Zona lenta"
                else:
                    return "Zona lenta"
            elif velocidad_kmh < 15.0 and distancia_acumulada_m < 1000:
                # Inicio: desde 0 m hasta alcanzar ~25 km/h
                return "Inicio"
            elif 24.0 <= velocidad_kmh <= 26.0 and 1000 <= distancia_acumulada_m <= RUTA_TOTAL_M - 450:
                # Crucero: se mantiene constante en ~25 km/h
                return "Crucero"
            elif velocidad_kmh > 15.0 and distancia_acumulada_m >= RUTA_TOTAL_M - 450:
                # Frenado: empieza aprox. a 450 m antes del final
                return "Frenado"
            elif velocidad_kmh > 26.0:
                # Reaceleración: después de la zona lenta
                return "Reaceleración"
            else:
                return "Transición"
                
        except Exception as e:
            print(f"Error determinando estado operativo: {e}")
            return "Desconocido"
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calcula la distancia Haversine entre dos puntos en metros"""
        # Convertir grados a radianes
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Diferencia de coordenadas
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        # Fórmula de Haversine
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        # Distancia en metros
        distance = self.R_EARTH * c
        return distance
    
    def _calculate_zcr(self, signal):
        """Calcula la tasa de cruces por cero"""
        try:
            if len(signal) < 2:
                return 0.0
            
            # Contar cambios de signo
            sign_changes = 0
            for i in range(1, len(signal)):
                if (signal[i-1] >= 0) != (signal[i] >= 0):
                    sign_changes += 1
            
            return float(sign_changes) / (len(signal) - 1)
        except:
            return 0.0
    
    def _spectral_analysis(self, signal):
        """Análisis espectral simplificado para señal corta"""
        try:
            if len(signal) < 3:
                return 0.0, 0.0, 0.0, [0.0, 0.0, 0.0]
            
            # FFT simplificado
            fft = np.fft.fft(signal)
            freqs = np.fft.fftfreq(len(signal))
            magnitude = np.abs(fft)
            
            # Frecuencia media (centroide espectral)
            if np.sum(magnitude) > 0:
                freq_media = float(np.sum(freqs * magnitude) / np.sum(magnitude))
            else:
                freq_media = 0.0
            
            # Frecuencia dominante
            dominant_idx = np.argmax(magnitude)
            freq_dominante = float(abs(freqs[dominant_idx]))
            
            # Amplitud máxima espectral
            amp_max = float(np.max(magnitude))
            
            # Energía en bandas de frecuencia (simplificado)
            # Banda 1: 0-50 Hz, Banda 2: 50-200 Hz, Banda 3: >200 Hz
            energia_banda_1 = float(np.sum(magnitude[:len(magnitude)//3]))
            energia_banda_2 = float(np.sum(magnitude[len(magnitude)//3:2*len(magnitude)//3]))
            energia_banda_3 = float(np.sum(magnitude[2*len(magnitude)//3:]))
            
            return freq_media, freq_dominante, amp_max, [energia_banda_1, energia_banda_2, energia_banda_3]
            
        except Exception as e:
            print(f"Error en análisis espectral: {e}")
            return 0.0, 0.0, 0.0, [0.0, 0.0, 0.0]
    
    def _calculate_total_distance(self):
        """Calcula la distancia total real del recorrido usando Haversine"""
        try:
            query = text("""
                SELECT latitud, longitud 
                FROM mediciones 
                ORDER BY timestamp ASC
            """)
            
            result = self.db.execute(query)
            coordinates = [(float(row.latitud), float(row.longitud)) for row in result if row.latitud and row.longitud]
            
            if len(coordinates) < 2:
                return 18.2  # Valor por defecto si no hay suficientes puntos
            
            total_distance = 0.0
            for i in range(1, len(coordinates)):
                lat1, lon1 = coordinates[i-1]
                lat2, lon2 = coordinates[i]
                distance = self._haversine_distance(lat1, lon1, lat2, lon2)
                total_distance += distance
            
            return total_distance / 1000  # Convertir a km
            
        except Exception as e:
            print(f"Error calculando distancia total: {e}")
            return 18.2  # Valor por defecto en caso de error
    
    def _batch_insert_measurements(self, measurements):
        """Inserta mediciones en lotes"""
        try:
            # Filtrar duplicados
            filtered_measurements = self._filter_duplicate_measurements(measurements)
            
            if not filtered_measurements:
                return 0
            
            # Insertar en lotes
            batch_size = 1000
            total_inserted = 0
            
            for i in range(0, len(filtered_measurements), batch_size):
                batch = filtered_measurements[i:i + batch_size]
                
                for measurement in batch:
                    try:
                        # Crear objeto de medición
                        medicion = m.Medicion(
                            sensor_id=measurement['sensor_id'],
                            timestamp=measurement['timestamp'],
                            latitud=measurement['latitud'],
                            longitud=measurement['longitud'],
                            altitud=measurement.get('altitud', 0.0),
                            velocidad=measurement['velocidad'],
                            rms=measurement['rms'],
                            kurtosis=measurement['kurtosis'],
                            skewness=measurement['skewness'],
                            zcr=measurement['zcr'],
                            pico=measurement['pico'],
                            crest_factor=measurement['crest_factor'],
                            frecuencia_media=measurement['frecuencia_media'],
                            frecuencia_dominante=measurement['frecuencia_dominante'],
                            amplitud_max_espectral=measurement['amplitud_max_espectral'],
                            energia_banda_1=measurement['energia_banda_1'],
                            energia_banda_2=measurement['energia_banda_2'],
                            energia_banda_3=measurement['energia_banda_3'],
                            estado_procesado=measurement['estado_procesado']
                        )
                        
                        self.db.add(medicion)
                        total_inserted += 1
                        
                    except Exception as e:
                        print(f"Error insertando medición: {e}")
                        continue
                
                # Commit del lote
                try:
                    self.db.commit()
                except Exception as e:
                    print(f"Error en commit del lote: {e}")
                    self.db.rollback()
                    continue
            
            return total_inserted
            
        except Exception as e:
            print(f"Error en inserción por lotes: {e}")
            self.db.rollback()
            return 0
    
    def _filter_duplicate_measurements(self, measurements):
        """Filtra mediciones duplicadas basadas en sensor_id y timestamp"""
        try:
            # Obtener timestamps existentes para los sensores
            sensor_ids = list(set(m['sensor_id'] for m in measurements))
            
            if not sensor_ids:
                return measurements
            
            # Consultar mediciones existentes
            query = text("""
                SELECT sensor_id, timestamp 
                FROM mediciones 
                WHERE sensor_id = ANY(:sensor_ids)
            """)
            
            result = self.db.execute(query, {"sensor_ids": sensor_ids})
            existing = {(row.sensor_id, row.timestamp) for row in result}
            
            # Filtrar duplicados
            filtered = []
            for measurement in measurements:
                key = (measurement['sensor_id'], measurement['timestamp'])
                if key not in existing:
                    filtered.append(measurement)
            
            return filtered
            
        except Exception as e:
            print(f"Error filtrando duplicados: {e}")
            return measurements
    
    def get_complete_trajectory(self):
        """Obtiene la trayectoria completa desde mediciones"""
        try:
            from sqlalchemy import text
            
            query = text("""
                SELECT 
                    timestamp,
                    latitud,
                    longitud,
                    altitud,
                    velocidad,
                    rms,
                    kurtosis,
                    skewness,
                    estado_procesado
                FROM mediciones 
                ORDER BY timestamp ASC
            """)
            
            result = self.db.execute(query)
            trajectory = []
            
            for row in result:
                trajectory.append({
                    'timestamp': row.timestamp.isoformat() if row.timestamp else None,
                    'latitud': float(row.latitud) if row.latitud else None,
                    'longitud': float(row.longitud) if row.longitud else None,
                    'altitud': float(row.altitud) if row.altitud else None,
                    'velocidad_m_s': float(row.velocidad) if row.velocidad else None,
                    'velocidad_kmh': float(row.velocidad * 3.6) if row.velocidad else None,
                    'rms': float(row.rms) if row.rms else None,
                    'kurtosis': float(row.kurtosis) if row.kurtosis else None,
                    'skewness': float(row.skewness) if row.skewness else None,
                    'estado_procesado': row.estado_procesado
                })
            
            return trajectory
            
        except Exception as e:
            print(f"Error obteniendo trayectoria: {e}")
            return []
    
    def get_system_summary(self):
        """Obtiene resumen del sistema desde mediciones"""
        try:
            # Contar total de mediciones
            total_mediciones = self.db.query(func.count(m.Medicion.medicion_id)).scalar() or 0
            
            if total_mediciones == 0:
                return {
                    'total_mediciones': 0,
                    'distancia_total_km': 0.0,
                    'velocidad_promedio_kmh': 0.0,
                    'temperatura_promedio_c': 0.0,
                    'rms_promedio': 0.0,
                    'estados_distribucion': {},
                    'estado_cabina_actual': 'desconocido'
                }
            
            # Obtener estadísticas básicas
            query = text("""
                SELECT 
                    AVG(velocidad * 3.6) as velocidad_promedio_kmh,
                    AVG(rms) as rms_promedio,
                    COUNT(*) as total_mediciones
                FROM mediciones
            """)
            
            result = self.db.execute(query).fetchone()
            
            # Obtener distribución de estados
            estados_query = text("""
                SELECT 
                    estado_procesado,
                    COUNT(*) as count
                FROM mediciones 
                WHERE estado_procesado IS NOT NULL
                GROUP BY estado_procesado
            """)
            
            estados_result = self.db.execute(estados_query)
            estados_distribucion = {}
            for row in estados_result:
                estados_distribucion[row.estado_procesado] = row.count
            
            # Obtener estado actual de la cabina
            cabina_query = text("""
                SELECT estado_actual 
                FROM cabinas 
                WHERE cabina_id = 1
            """)
            
            cabina_result = self.db.execute(cabina_query).fetchone()
            estado_cabina = cabina_result.estado_actual if cabina_result else 'desconocido'
            
            # Calcular distancia total real usando Haversine
            distancia_total_km = self._calculate_total_distance()
            
            return {
                'total_mediciones': total_mediciones,
                'distancia_total_km': distancia_total_km,
                'velocidad_promedio_kmh': float(result.velocidad_promedio_kmh) if result.velocidad_promedio_kmh else 0.0,
                'temperatura_promedio_c': 0.0,  # No disponible en mediciones
                'rms_promedio': float(result.rms_promedio) if result.rms_promedio else 0.0,
                'estados_distribucion': estados_distribucion,
                'estado_cabina_actual': estado_cabina
            }
            
        except Exception as e:
            print(f"Error obteniendo resumen del sistema: {e}")
            return {
                'total_mediciones': 0,
                'distancia_total_km': 0.0,
                'velocidad_promedio_kmh': 0.0,
                'temperatura_promedio_c': 0.0,
                'rms_promedio': 0.0,
                'estados_distribucion': {},
                'estado_cabina_actual': 'desconocido'
            }
