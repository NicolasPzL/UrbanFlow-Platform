# microservices/analytics/app/services/telemetry_processor.py
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc
from ..db import models as m
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from scipy import signal
from scipy.fft import fft, fftfreq
import math

class TelemetryProcessor:
    """Servicio para procesar datos de telemetría y calcular métricas analíticas"""
    
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
            
            # Procesar fila por fila (no ventanas)
            processed_count = 0
            processed_data = self._process_row_by_row(raw_data)
            
            # Insertar en lotes para eficiencia
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
        # Obtener el último timestamp procesado
        last_processed = self.db.query(func.max(m.Medicion.timestamp)).scalar()
        
        if last_processed:
            query = text("""
                SELECT * FROM telemetria_cruda 
                WHERE timestamp > :last_processed
                ORDER BY timestamp ASC
            """)
            result = self.db.execute(query, {"last_processed": last_processed})
        else:
            query = text("""
                SELECT * FROM telemetria_cruda 
                ORDER BY timestamp ASC
                LIMIT 1000
            """)
            result = self.db.execute(query)
        
        return result.fetchall()
    
    def _process_row_by_row(self, raw_data):
        """Procesa datos fila por fila, calculando métricas para cada muestra"""
        if not raw_data:
            return []
        
        processed_measurements = []
        data_list = list(raw_data)
        
        # Procesar cada fila individualmente
        for i, row in enumerate(data_list):
            try:
                # Calcular métricas para esta fila
                metrics = self._calculate_single_row_metrics(row, data_list, i)
                
                if metrics:
                    processed_measurements.append(metrics)
                    
            except Exception as e:
                print(f"Error procesando fila {i}: {e}")
                continue
        
        return processed_measurements
    
    def _process_chunk_consecutive(self, chunk_data, initial_distance=0.0):
        """Procesa un chunk de datos consecutivos"""
        processed = []
        distancia_acumulada = initial_distance
        
        for i in range(len(chunk_data)):
            current_row = chunk_data[i]
            
            # Calcular métricas para la fila actual
            metrics = self._calculate_row_metrics(current_row, chunk_data, i, distancia_acumulada)
            
            if metrics:
                processed.append(metrics)
                distancia_acumulada = metrics.get('distancia_acumulada_m', distancia_acumulada)
        
        return processed
    
    def _calculate_row_metrics(self, current_row, all_data, current_index, distancia_acumulada):
        """Calcula métricas para una fila específica"""
        try:
            # Datos básicos de la fila actual
            sensor_id = current_row.sensor_id
            timestamp = current_row.timestamp
            lat = float(current_row.lat) if current_row.lat is not None else 0.0
            lon = float(current_row.lon) if current_row.lon is not None else 0.0
            alt = float(current_row.alt) if current_row.alt is not None else 0.0
            velocidad_kmh = float(current_row.velocidad_kmh) if current_row.velocidad_kmh is not None else 0.0
            velocidad_m_s = velocidad_kmh / 3.6
            
            # Calcular distancia desde la fila anterior
            distancia_m = 0.0
            if current_index > 0:
                prev_row = all_data[current_index - 1]
                prev_lat = float(prev_row.lat) if prev_row.lat is not None else 0.0
                prev_lon = float(prev_row.lon) if prev_row.lon is not None else 0.0
                
                if prev_lat != 0.0 and prev_lon != 0.0 and lat != 0.0 and lon != 0.0:
                    distancia_m = self._haversine_distance(prev_lat, prev_lon, lat, lon)
            
            # Actualizar distancia acumulada
            distancia_acumulada += distancia_m
            
            # Calcular métricas vibracionales
            vib_metrics = self._calculate_single_row_vibration_metrics(current_row)
            
            # Determinar estado operativo basado en posición y velocidad
            estado_procesado = self._determine_operational_state_by_position(
                distancia_acumulada, velocidad_m_s, current_row
            )
            
            return {
                'sensor_id': sensor_id,
                'timestamp': timestamp,
                'latitud': lat,
                'longitud': lon,
                'altitud': alt,
                'velocidad': velocidad_m_s,
                'distancia_m': distancia_m,
                'distancia_acumulada_m': distancia_acumulada,
                **vib_metrics,
                'estado_procesado': estado_procesado
            }
            
        except Exception as e:
            print(f"Error procesando fila {current_index}: {e}")
            return None
    
    def _calculate_single_row_vibration_metrics(self, row):
        """Calcula métricas vibracionales para una sola fila"""
        try:
            # Extraer datos de vibración
            vib_x = float(row.vibracion_x) if row.vibracion_x is not None else 0.0
            vib_y = float(row.vibracion_y) if row.vibracion_y is not None else 0.0
            vib_z = float(row.vibracion_z) if row.vibracion_z is not None else 0.0
            
            # Vector de vibración total
            vib_total = np.sqrt(vib_x**2 + vib_y**2 + vib_z**2)
            
            # RMS (Root Mean Square) - para una sola muestra
            rms = float(vib_total)
            
            # Para métricas que requieren múltiples puntos, usar valores por defecto
            kurtosis = 0.0
            skewness = 0.0
            zcr = 0.0
            pico = float(vib_total)
            crest_factor = 1.0 if rms > 0 else 0.0
            
            # Métricas espectrales por defecto para una sola muestra
            return {
                'rms': rms,
                'kurtosis': kurtosis,
                'skewness': skewness,
                'zcr': zcr,
                'pico': pico,
                'crest_factor': crest_factor,
                'frecuencia_media': 0.0,
                'frecuencia_dominante': 0.0,
                'amplitud_max_espectral': rms,
                'energia_banda_1': 0.0,
                'energia_banda_2': 0.0,
                'energia_banda_3': 0.0
            }
            
        except Exception as e:
            print(f"Error calculando métricas vibracionales: {e}")
            return self._get_default_vibration_metrics()
    
    def _determine_operational_state_by_position(self, distancia_acumulada, velocidad_m_s, row):
        """Determina el estado operativo basado en la posición y velocidad"""
        try:
            # Convertir velocidad a km/h para comparación
            velocidad_kmh = velocidad_m_s * 3.6
            
            # Obtener posición del sistema si está disponible
            pos_m = float(row.pos_m) if row.pos_m is not None else distancia_acumulada
            
            # Longitud total de la ruta (aproximadamente 18.2 km)
            RUTA_TOTAL_M = 18200
            
            # Reglas de clasificación basadas en posición y velocidad
            if velocidad_kmh < 1.0:
                return "parado"
            elif velocidad_kmh < 5.0:
                return "zona_lenta"
            elif velocidad_kmh < 15.0 and pos_m < 1000:  # Primera parte del recorrido
                return "inicio"
            elif 24.0 <= velocidad_kmh <= 26.0 and 1000 <= pos_m <= RUTA_TOTAL_M - 450:
                return "crucero"
            elif velocidad_kmh > 15.0 and pos_m >= RUTA_TOTAL_M - 450:  # Últimos 450m
                return "frenado"
            elif velocidad_kmh > 26.0:
                return "reaceleracion"
            else:
                return "transicion"
                
        except Exception as e:
            print(f"Error determinando estado operativo: {e}")
            return "desconocido"
    
    def _batch_insert_measurements(self, processed_data):
        """Inserta mediciones en lotes para eficiencia, evitando duplicados"""
        try:
            # Insertar en lotes de 100 registros
            batch_size = 100
            total_inserted = 0
            
            for i in range(0, len(processed_data), batch_size):
                batch = processed_data[i:i + batch_size]
                
                # Filtrar duplicados antes de insertar
                filtered_batch = self._filter_duplicate_measurements(batch)
                
                if not filtered_batch:
                    continue
                
                # Crear objetos de medición
                measurements = []
                for data in filtered_batch:
                    medicion = m.Medicion(
                        sensor_id=data['sensor_id'],
                        timestamp=data['timestamp'],
                        latitud=data['latitud'],
                        longitud=data['longitud'],
                        velocidad=data['velocidad'],
                        rms=data['rms'],
                        kurtosis=data['kurtosis'],
                        skewness=data['skewness'],
                        zcr=data['zcr'],
                        pico=data['pico'],
                        crest_factor=data['crest_factor'],
                        frecuencia_media=data['frecuencia_media'],
                        frecuencia_dominante=data['frecuencia_dominante'],
                        amplitud_max_espectral=data['amplitud_max_espectral'],
                        energia_banda_1=data['energia_banda_1'],
                        energia_banda_2=data['energia_banda_2'],
                        energia_banda_3=data['energia_banda_3'],
                        estado_procesado=data['estado_procesado']
                    )
                    measurements.append(medicion)
                
                # Insertar lote usando ON CONFLICT para evitar duplicados
                try:
                    self.db.add_all(measurements)
                    self.db.commit()
                    total_inserted += len(measurements)
                    
                    print(f"Insertados {len(measurements)} registros (total: {total_inserted})")
                    
                except Exception as e:
                    print(f"Error en lote, insertando uno por uno: {e}")
                    self.db.rollback()
                    
                    # Insertar uno por uno para identificar duplicados específicos
                    for measurement in measurements:
                        try:
                            self.db.add(measurement)
                            self.db.commit()
                            total_inserted += 1
                        except Exception as single_error:
                            print(f"Duplicado detectado: {single_error}")
                            self.db.rollback()
            
            return total_inserted
            
        except Exception as e:
            print(f"Error insertando mediciones: {e}")
            self.db.rollback()
            return 0
    
    def _filter_duplicate_measurements(self, batch_data):
        """Filtra mediciones duplicadas basándose en sensor_id y timestamp"""
        try:
            # Obtener timestamps existentes para los sensores en el lote
            sensor_ids = list(set([data['sensor_id'] for data in batch_data]))
            timestamps = [data['timestamp'] for data in batch_data]
            
            # Verificar duplicados en la base de datos
            query = text("""
                SELECT sensor_id, timestamp 
                FROM mediciones 
                WHERE sensor_id = ANY(:sensor_ids) 
                AND timestamp = ANY(:timestamps)
            """)
            
            result = self.db.execute(query, {
                'sensor_ids': sensor_ids,
                'timestamps': timestamps
            })
            
            existing_combinations = set()
            for row in result:
                existing_combinations.add((row.sensor_id, row.timestamp))
            
            # Filtrar duplicados
            filtered_data = []
            for data in batch_data:
                key = (data['sensor_id'], data['timestamp'])
                if key not in existing_combinations:
                    filtered_data.append(data)
                else:
                    print(f"Duplicado filtrado: sensor_id={data['sensor_id']}, timestamp={data['timestamp']}")
            
            return filtered_data
            
        except Exception as e:
            print(f"Error filtrando duplicados: {e}")
            return batch_data  # Retornar datos originales si hay error
    
    def _create_time_windows(self, raw_data, window_size=60):
        """Crea ventanas temporales de datos para procesamiento"""
        if not raw_data:
            return []
        
        # Convertir a DataFrame para facilitar el procesamiento
        df = pd.DataFrame(raw_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        windows = []
        current_time = df['timestamp'].min()
        end_time = df['timestamp'].max()
        
        while current_time < end_time:
            window_end = current_time + timedelta(seconds=window_size)
            window_data = df[
                (df['timestamp'] >= current_time) & 
                (df['timestamp'] < window_end)
            ]
            
            if len(window_data) > 0:
                windows.append(window_data)
            
            current_time = window_end
        
        return windows
    
    def _calculate_metrics(self, window_data):
        """Calcula todas las métricas analíticas para una ventana de datos"""
        if len(window_data) == 0:
            return None
        
        # Obtener el primer registro para datos básicos
        first_row = window_data.iloc[0]
        
        # Métricas básicas
        sensor_id = first_row['sensor_id']
        timestamp = window_data['timestamp'].iloc[-1]  # Timestamp del final de la ventana
        
        # Posición (usar el último valor de la ventana)
        latitud = float(window_data['lat'].iloc[-1])
        longitud = float(window_data['lon'].iloc[-1])
        altitud = float(window_data['alt'].iloc[-1])
        
        # Velocidad en m/s
        velocidad_kmh = window_data['velocidad_kmh'].iloc[-1]
        velocidad = float(velocidad_kmh) / 3.6 if velocidad_kmh is not None else 0.0
        
        # Cálculos vibracionales
        vib_metrics = self._calculate_vibration_metrics(window_data)
        
        # Estado operativo
        estado_procesado = self._determine_operational_state(window_data)
        
        return {
            'sensor_id': sensor_id,
            'timestamp': timestamp,
            'latitud': latitud,
            'longitud': longitud,
            'altitud': altitud,
            'velocidad': velocidad,
            **vib_metrics,
            'estado_procesado': estado_procesado
        }
    
    def _calculate_vibration_metrics(self, window_data):
        """Calcula métricas vibracionales y espectrales"""
        # Extraer datos de vibración
        vib_x = window_data['vibracion_x'].dropna().values
        vib_y = window_data['vibracion_y'].dropna().values
        vib_z = window_data['vibracion_z'].dropna().values
        
        if len(vib_x) == 0:
            return self._get_default_vibration_metrics()
        
        # Vector de vibración total
        vib_total = np.sqrt(vib_x**2 + vib_y**2 + vib_z**2)
        
        # RMS (Root Mean Square)
        rms = float(np.sqrt(np.mean(vib_total**2)))
        
        # Kurtosis
        kurtosis = float(self._calculate_kurtosis(vib_total))
        
        # Skewness
        skewness = float(self._calculate_skewness(vib_total))
        
        # Zero Crossing Rate
        zcr = float(self._calculate_zcr(vib_total))
        
        # Pico
        pico = float(np.max(vib_total))
        
        # Crest Factor
        crest_factor = float(pico / rms) if rms > 0 else 0.0
        
        # Análisis espectral
        spectral_metrics = self._calculate_spectral_metrics(vib_total)
        
        return {
            'rms': rms,
            'kurtosis': kurtosis,
            'skewness': skewness,
            'zcr': zcr,
            'pico': pico,
            'crest_factor': crest_factor,
            **spectral_metrics
        }
    
    def _calculate_kurtosis(self, data):
        """Calcula la curtosis de los datos"""
        if len(data) < 4:
            return 0.0
        
        mean = np.mean(data)
        std = np.std(data)
        
        if std == 0:
            return 0.0
        
        normalized = (data - mean) / std
        return np.mean(normalized**4) - 3
    
    def _calculate_skewness(self, data):
        """Calcula la asimetría de los datos"""
        if len(data) < 3:
            return 0.0
        
        mean = np.mean(data)
        std = np.std(data)
        
        if std == 0:
            return 0.0
        
        normalized = (data - mean) / std
        return np.mean(normalized**3)
    
    def _calculate_zcr(self, data):
        """Calcula la tasa de cruce por cero"""
        if len(data) < 2:
            return 0.0
        
        zero_crossings = np.sum(np.diff(np.sign(data)) != 0)
        return zero_crossings / len(data)
    
    def _calculate_spectral_metrics(self, vib_data):
        """Calcula métricas espectrales"""
        if len(vib_data) < 10:
            return {
                'frecuencia_media': 0.0,
                'frecuencia_dominante': 0.0,
                'amplitud_max_espectral': 0.0,
                'energia_banda_1': 0.0,
                'energia_banda_2': 0.0,
                'energia_banda_3': 0.0
            }
        
        # FFT
        fft_data = fft(vib_data)
        freqs = fftfreq(len(vib_data))
        amplitudes = np.abs(fft_data)
        
        # Frecuencia media (centroide espectral)
        freq_weights = freqs * amplitudes
        frecuencia_media = float(np.sum(freq_weights) / np.sum(amplitudes)) if np.sum(amplitudes) > 0 else 0.0
        
        # Frecuencia dominante
        dominant_idx = np.argmax(amplitudes)
        frecuencia_dominante = float(freqs[dominant_idx])
        
        # Amplitud máxima espectral
        amplitud_max_espectral = float(np.max(amplitudes))
        
        # Energías por bandas de frecuencia
        # Banda 1: 0-50 Hz (baja frecuencia)
        # Banda 2: 50-200 Hz (media frecuencia)  
        # Banda 3: >200 Hz (alta frecuencia)
        
        # Convertir frecuencias a Hz (asumiendo frecuencia de muestreo)
        fs = 1000  # Hz - frecuencia de muestreo típica
        freqs_hz = freqs * fs
        
        # Filtrar frecuencias positivas
        positive_freqs = freqs_hz > 0
        freqs_pos = freqs_hz[positive_freqs]
        amps_pos = amplitudes[positive_freqs]
        
        # Calcular energías por banda
        energia_banda_1 = float(np.sum(amps_pos[(freqs_pos >= 0) & (freqs_pos < 50)]**2))
        energia_banda_2 = float(np.sum(amps_pos[(freqs_pos >= 50) & (freqs_pos < 200)]**2))
        energia_banda_3 = float(np.sum(amps_pos[freqs_pos >= 200]**2))
        
        return {
            'frecuencia_media': abs(frecuencia_media),
            'frecuencia_dominante': abs(frecuencia_dominante),
            'amplitud_max_espectral': amplitud_max_espectral,
            'energia_banda_1': energia_banda_1,
            'energia_banda_2': energia_banda_2,
            'energia_banda_3': energia_banda_3
        }
    
    def _determine_operational_state(self, window_data):
        """Determina el estado operativo basado en las reglas definidas"""
        if len(window_data) == 0:
            return "desconocido"
        
        # Obtener velocidad promedio de la ventana
        velocidades = window_data['velocidad_kmh'].dropna()
        if len(velocidades) == 0:
            return "desconocido"
        
        vel_promedio = velocidades.mean()
        
        # Obtener posición para determinar si está cerca del final
        posiciones = window_data['pos_m'].dropna()
        if len(posiciones) > 0:
            pos_actual = posiciones.iloc[-1]
            # Asumiendo que la ruta total es ~18.2 km = 18200 m
            distancia_final = 18200 - pos_actual
        else:
            distancia_final = float('inf')
        
        # Reglas de clasificación
        if vel_promedio < 1.0:
            return "parado"
        elif vel_promedio < 5.0:
            return "zona_lenta"
        elif vel_promedio < 15.0 and distancia_final > 450:
            return "inicio"
        elif 24.0 <= vel_promedio <= 26.0:
            return "crucero"
        elif vel_promedio > 15.0 and distancia_final <= 450:
            return "frenado"
        elif vel_promedio > 26.0:
            return "reaceleracion"
        else:
            return "transicion"
    
    def _get_default_vibration_metrics(self):
        """Retorna métricas por defecto cuando no hay datos de vibración"""
        return {
            'rms': 0.0,
            'kurtosis': 0.0,
            'skewness': 0.0,
            'zcr': 0.0,
            'pico': 0.0,
            'crest_factor': 0.0,
            'frecuencia_media': 0.0,
            'frecuencia_dominante': 0.0,
            'amplitud_max_espectral': 0.0,
            'energia_banda_1': 0.0,
            'energia_banda_2': 0.0,
            'energia_banda_3': 0.0
        }
    
    def _insert_measurement(self, metrics):
        """Inserta una medición procesada en la base de datos"""
        medicion = m.Medicion(
            sensor_id=metrics['sensor_id'],
            timestamp=metrics['timestamp'],
            latitud=metrics['latitud'],
            longitud=metrics['longitud'],
            velocidad=metrics['velocidad'],
            rms=metrics['rms'],
            kurtosis=metrics['kurtosis'],
            skewness=metrics['skewness'],
            zcr=metrics['zcr'],
            pico=metrics['pico'],
            crest_factor=metrics['crest_factor'],
            frecuencia_media=metrics['frecuencia_media'],
            frecuencia_dominante=metrics['frecuencia_dominante'],
            amplitud_max_espectral=metrics['amplitud_max_espectral'],
            energia_banda_1=metrics['energia_banda_1'],
            energia_banda_2=metrics['energia_banda_2'],
            energia_banda_3=metrics['energia_banda_3'],
            estado_procesado=metrics['estado_procesado']
        )
        
        self.db.add(medicion)
        self.db.commit()
        self.db.refresh(medicion)
        return medicion
    
    def get_complete_trajectory(self):
        """Obtiene la trayectoria completa ordenada por timestamp"""
        query = text("""
            SELECT 
                timestamp,
                latitud,
                longitud,
                altitud,
                velocidad,
                estado_procesado,
                rms,
                kurtosis,
                skewness
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
                'estado_procesado': row.estado_procesado,
                'rms': float(row.rms) if row.rms else None,
                'kurtosis': float(row.kurtosis) if row.kurtosis else None,
                'skewness': float(row.skewness) if row.skewness else None
            })
        
        return {
            'trajectory': trajectory,
            'total_points': len(trajectory)
        }
    
    def get_system_summary(self):
        """Obtiene KPIs agregados del sistema"""
        # Longitud total (usando Haversine)
        total_distance = self._calculate_total_distance()
        
        # Estadísticas de velocidad
        vel_stats = self._get_velocity_stats()
        
        # Estadísticas de temperatura
        temp_stats = self._get_temperature_stats()
        
        # Estadísticas de RMS
        rms_stats = self._get_rms_stats()
        
        # Distribución por estado
        state_distribution = self._get_state_distribution()
        
        # Estado actual de la cabina y verificar cambios
        cabina_status = self._get_cabina_status()
        self._check_cabina_status_changes(cabina_status)
        
        return {
            'distancia_total_km': total_distance,
            'velocidad_promedio_kmh': vel_stats['promedio'],
            'velocidad_maxima_kmh': vel_stats['maxima'],
            'temperatura_promedio_c': temp_stats['promedio'],
            'rms_promedio': rms_stats['promedio'],
            'distribucion_estados': state_distribution,
            'estado_cabina_actual': cabina_status,
            'total_mediciones': self._get_total_measurements()
        }
    
    def _calculate_total_distance(self):
        """Calcula la distancia total usando fórmula de Haversine"""
        query = text("""
            SELECT lat, lon 
            FROM telemetria_cruda 
            ORDER BY timestamp ASC
        """)
        
        result = self.db.execute(query)
        points = list(result)
        
        if len(points) < 2:
            return 0.0
        
        total_distance = 0.0
        
        for i in range(1, len(points)):
            lat1, lon1 = float(points[i-1].lat), float(points[i-1].lon)
            lat2, lon2 = float(points[i].lat), float(points[i].lon)
            
            distance = self._haversine_distance(lat1, lon1, lat2, lon2)
            total_distance += distance
        
        return total_distance / 1000  # Convertir a km
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calcula distancia entre dos puntos usando fórmula de Haversine"""
        # Convertir a radianes
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Fórmula de Haversine
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return self.R_EARTH * c
    
    def _get_velocity_stats(self):
        """Obtiene estadísticas de velocidad"""
        query = text("""
            SELECT AVG(velocidad_kmh) as promedio, MAX(velocidad_kmh) as maxima
            FROM telemetria_cruda 
            WHERE velocidad_kmh IS NOT NULL
        """)
        
        result = self.db.execute(query).fetchone()
        return {
            'promedio': float(result.promedio) if result.promedio else 0.0,
            'maxima': float(result.maxima) if result.maxima else 0.0
        }
    
    def _get_temperature_stats(self):
        """Obtiene estadísticas de temperatura"""
        query = text("""
            SELECT AVG(temperatura_c) as promedio
            FROM telemetria_cruda 
            WHERE temperatura_c IS NOT NULL
        """)
        
        result = self.db.execute(query).fetchone()
        return {
            'promedio': float(result.promedio) if result.promedio else 0.0
        }
    
    def _get_rms_stats(self):
        """Obtiene estadísticas de RMS"""
        query = text("""
            SELECT AVG(rms) as promedio
            FROM mediciones 
            WHERE rms IS NOT NULL
        """)
        
        result = self.db.execute(query).fetchone()
        return {
            'promedio': float(result.promedio) if result.promedio else 0.0
        }
    
    def _get_state_distribution(self):
        """Obtiene distribución por estado procesado"""
        query = text("""
            SELECT estado_procesado, COUNT(*) as count
            FROM mediciones 
            WHERE estado_procesado IS NOT NULL
            GROUP BY estado_procesado
        """)
        
        result = self.db.execute(query)
        distribution = {}
        total = 0
        
        for row in result:
            distribution[row.estado_procesado] = int(row.count)
            total += int(row.count)
        
        # Convertir a porcentajes
        for state in distribution:
            distribution[state] = {
                'count': distribution[state],
                'percentage': (distribution[state] / total * 100) if total > 0 else 0
            }
        
        return distribution
    
    def _get_cabina_status(self):
        """Obtiene el estado actual de la cabina"""
        query = text("""
            SELECT estado_actual 
            FROM cabinas 
            WHERE cabina_id = 1
        """)
        
        result = self.db.execute(query).fetchone()
        return result.estado_actual if result else "desconocido"
    
    def _check_cabina_status_changes(self, current_status):
        """Verifica si el estado de la cabina ha cambiado y registra en historial"""
        try:
            # Obtener el último estado registrado en el historial
            query = text("""
                SELECT estado 
                FROM cabina_estado_hist 
                WHERE cabina_id = 1 
                ORDER BY timestamp_inicio DESC 
                LIMIT 1
            """)
            
            result = self.db.execute(query).fetchone()
            last_known_status = result.estado if result else None
            
            # Si el estado ha cambiado, registrar en el historial
            if last_known_status != current_status and current_status != "desconocido":
                self._record_cabina_status_change(last_known_status, current_status)
                
        except Exception as e:
            print(f"Error verificando cambios de estado de cabina: {e}")
    
    def _record_cabina_status_change(self, estado_anterior, estado_nuevo):
        """Registra un cambio de estado de la cabina en el historial"""
        try:
            # Insertar registro en historial usando la estructura correcta
            historial = m.CabinaEstadoHist(
                cabina_id=1,
                estado=estado_nuevo,
                timestamp_inicio=datetime.utcnow(),
                timestamp_fin=None  # Estado actual, sin fin
            )
            
            self.db.add(historial)
            self.db.commit()
            
            print(f"Registrado cambio de estado: {estado_anterior} -> {estado_nuevo}")
            
        except Exception as e:
            print(f"Error registrando cambio de estado: {e}")
            self.db.rollback()
    
    def _determine_status_change_reason(self, estado_anterior, estado_nuevo):
        """Determina el motivo del cambio de estado"""
        if estado_anterior is None:
            return "Estado inicial"
        elif estado_anterior == "operativa" and estado_nuevo == "alerta":
            return "Detección de anomalías en sensores"
        elif estado_anterior == "alerta" and estado_nuevo == "operativa":
            return "Resolución de anomalías"
        elif estado_anterior == "operativa" and estado_nuevo == "inusual":
            return "Patrones de vibración inusuales detectados"
        elif estado_anterior == "inusual" and estado_nuevo == "operativa":
            return "Normalización de patrones de vibración"
        elif estado_anterior == "operativa" and estado_nuevo == "fuera_servicio":
            return "Mantenimiento programado"
        elif estado_anterior == "fuera_servicio" and estado_nuevo == "operativa":
            return "Finalización de mantenimiento"
        else:
            return "Cambio de estado automático"
    
    def _get_total_measurements(self):
        """Obtiene el total de mediciones procesadas"""
        query = text("SELECT COUNT(*) as total FROM mediciones")
        result = self.db.execute(query).fetchone()
        return int(result.total) if result else 0
