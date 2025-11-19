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
            
            processed_count = 0
            processed_data = []

            # Procesar usando ventanas temporales para obtener métricas espectrales completas
            windows = self._create_time_windows(raw_data, window_size=60)
            for window in windows:
                metrics = self._calculate_metrics(window)
                if metrics:
                    processed_data.append(metrics)

            # Fallback: si no se generaron métricas (p.ej. datos muy escasos), procesar fila a fila
            if not processed_data:
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

    # ------------------------------------------------------------------
    # Métodos públicos de apoyo para reutilizar el cálculo en simuladores
    # ------------------------------------------------------------------
    def build_metrics_for_row(self, current_row, previous_row=None, distancia_acumulada=0.0):
        """
        Calcula las métricas para una fila individual reutilizando la lógica existente.
        Se expone para que tareas externas (ej. simulador) no dupliquen cálculos.
        """
        context = []
        if previous_row is not None:
            context.append(previous_row)
        context.append(current_row)
        current_index = len(context) - 1
        metrics = self._calculate_row_metrics(
            current_row,
            context,
            current_index,
            distancia_acumulada
        )
        return metrics

    def build_measurement_model(self, metrics):
        """
        Construye una instancia de Medicion a partir del diccionario de métricas
        calculado por build_metrics_for_row o procesos existentes.
        """
        if metrics is None:
            return None

        # Quitar campos internos que no forman parte del modelo
        metrics = dict(metrics)
        metrics.pop('distancia_m', None)
        metrics.pop('distancia_acumulada_m', None)

        return m.Medicion(
            sensor_id=metrics['sensor_id'],
            timestamp=metrics['timestamp'],
            latitud=metrics.get('latitud'),
            longitud=metrics.get('longitud'),
            altitud=metrics.get('altitud'),
            velocidad=metrics.get('velocidad'),
            rms=metrics.get('rms'),
            kurtosis=metrics.get('kurtosis'),
            skewness=metrics.get('skewness'),
            zcr=metrics.get('zcr'),
            pico=metrics.get('pico'),
            crest_factor=metrics.get('crest_factor'),
            frecuencia_media=metrics.get('frecuencia_media'),
            frecuencia_dominante=metrics.get('frecuencia_dominante'),
            amplitud_max_espectral=metrics.get('amplitud_max_espectral'),
            energia_banda_1=metrics.get('energia_banda_1'),
            energia_banda_2=metrics.get('energia_banda_2'),
            energia_banda_3=metrics.get('energia_banda_3'),
            estado_procesado=metrics.get('estado_procesado')
        )
    
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
    
    def _create_synthetic_axes(self, velocity_profile, target_rms=None, duration_seconds=60.0, sample_count=120):
        """Construye ejes sintéticos centrados en cero a partir de una serie de velocidades."""
        velocity_series = np.atleast_1d(velocity_profile).astype(float)
        velocity_series = velocity_series[np.isfinite(velocity_series)]
        if velocity_series.size == 0:
            velocity_series = np.full(12, 5.0, dtype=float)
        avg_vel = float(np.clip(np.mean(velocity_series), 0.0, 30.0))

        if target_rms is None:
            target_rms = 0.12 + 0.015 * avg_vel
        target_rms = float(max(target_rms, 0.05))

        freq_hz = 5.0 + 0.6 * avg_vel
        omega = 2.0 * math.pi * freq_hz
        t = np.linspace(0.0, duration_seconds, int(sample_count), endpoint=False)

        base_wave = np.sin(omega * t)
        axes = np.vstack([
            base_wave,
            np.sin(omega * t + 2.0 * math.pi / 3.0),
            np.sin(omega * t + 4.0 * math.pi / 3.0),
        ])

        axis_weights = np.array([0.95, 0.85, 1.05])
        axes *= axis_weights[:, None]

        magnitude = np.sqrt(np.sum(axes ** 2, axis=0))
        current_rms = np.sqrt(np.mean(magnitude ** 2))
        if current_rms > 0:
            scale = target_rms / current_rms
            axes *= scale

        return axes, velocity_series

    def _metrics_from_axes(self, axes, velocity_profile):
        """Calcula métricas vibracionales a partir de ejes cartesianos."""
        magnitude = np.sqrt(np.sum(np.square(axes), axis=0))
        rms = float(np.sqrt(np.mean(magnitude ** 2)))
        pico = float(np.max(np.abs(magnitude)))
        crest_factor = pico / rms if rms > 0 else 0.0

        centered = magnitude - np.mean(magnitude)
        variance = np.var(centered)
        if variance > 0:
            skewness = float(np.mean(centered ** 3) / (variance ** 1.5))
            kurtosis = float(np.mean(centered ** 4) / (variance ** 2) - 3.0)
        else:
            skewness = 0.0
            kurtosis = 0.0

        zero_crossings = np.sum(np.diff(np.sign(centered)) != 0)
        zcr = float(zero_crossings / len(centered)) if len(centered) > 0 else 0.0

        spectral = self._calculate_spectral_metrics(magnitude, velocity_profile)

        metrics = {
            'rms': rms,
            'kurtosis': kurtosis,
            'skewness': skewness,
            'zcr': zcr,
            'pico': pico,
            'crest_factor': crest_factor,
        }
        metrics.update(spectral)
        return metrics

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
        """Calcula métricas vibracionales para una sola fila usando datos reales de telemetria_cruda"""
        try:
            velocity_ms_value = float(row.velocidad_kmh) / 3.6 if hasattr(row, 'velocidad_kmh') and row.velocidad_kmh is not None else None

            # Extraer valores reales de vibración de la fila
            vib_x = float(row.vibracion_x) if hasattr(row, 'vibracion_x') and row.vibracion_x is not None else None
            vib_y = float(row.vibracion_y) if hasattr(row, 'vibracion_y') and row.vibracion_y is not None else None
            vib_z = float(row.vibracion_z) if hasattr(row, 'vibracion_z') and row.vibracion_z is not None else None

            # Si tenemos datos reales de vibración, usarlos para generar una ventana más realista
            if vib_x is not None and vib_y is not None and vib_z is not None:
                # Calcular magnitud del vector de vibración
                magnitude_single = math.sqrt(vib_x**2 + vib_y**2 + vib_z**2)
                
                # Crear una ventana de datos basada en los valores reales
                # Expandir los valores reales en una serie temporal para calcular métricas espectrales
                window_size = 60  # 60 muestras para análisis espectral
                
                # Generar variación alrededor de los valores reales para simular una ventana temporal
                # Usar los valores reales como base y agregar variación realista
                base_freq = 5.0 + 0.6 * (velocity_ms_value if velocity_ms_value else 5.0)
                t = np.linspace(0, 2 * np.pi, window_size)
                
                # Crear ejes basados en los valores reales con variación temporal
                vib_x_series = vib_x * (1.0 + 0.15 * np.sin(base_freq * t) + 0.1 * np.random.randn(window_size))
                vib_y_series = vib_y * (1.0 + 0.15 * np.sin(base_freq * t + 2*np.pi/3) + 0.1 * np.random.randn(window_size))
                vib_z_series = vib_z * (1.0 + 0.15 * np.sin(base_freq * t + 4*np.pi/3) + 0.1 * np.random.randn(window_size))
                
                # Asegurar que la media de la serie sea similar al valor real
                vib_x_series = vib_x_series - np.mean(vib_x_series) + vib_x
                vib_y_series = vib_y_series - np.mean(vib_y_series) + vib_y
                vib_z_series = vib_z_series - np.mean(vib_z_series) + vib_z
                
                axes = np.vstack([vib_x_series, vib_y_series, vib_z_series])
                velocity_series = np.full(window_size, velocity_ms_value if velocity_ms_value else 5.0)
                
                return self._metrics_from_axes(axes, velocity_series)
            
            # Si no hay datos reales, usar el método sintético pero mejorado
            available_components = []
            for axis in ['vibracion_x', 'vibracion_y', 'vibracion_z']:
                value = getattr(row, axis, None)
                if value is not None:
                    available_components.append(float(value))

            target_rms = None
            if available_components:
                vector_magnitude = math.sqrt(sum(component ** 2 for component in available_components))
                if vector_magnitude > 0:
                    target_rms = vector_magnitude / math.sqrt(2.0)

            velocity_profile = np.array([velocity_ms_value]) if velocity_ms_value is not None else np.array([])
            synthetic_axes, velocity_series = self._create_synthetic_axes(velocity_profile, target_rms=target_rms, sample_count=60)
            return self._metrics_from_axes(synthetic_axes, velocity_series)
            
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
            updates_count = 0

            for i in range(0, len(processed_data), batch_size):
                batch = processed_data[i:i + batch_size]
                
                if not batch:
                    continue

                for data in batch:
                    try:
                        existing = self.db.query(m.Medicion).filter(
                            m.Medicion.sensor_id == data['sensor_id'],
                            m.Medicion.timestamp == data['timestamp']
                        ).one_or_none()

                        if existing:
                            existing.latitud = data['latitud']
                            existing.longitud = data['longitud']
                            existing.velocidad = data['velocidad']
                            existing.rms = data['rms']
                            existing.kurtosis = data['kurtosis']
                            existing.skewness = data['skewness']
                            existing.zcr = data['zcr']
                            existing.pico = data['pico']
                            existing.crest_factor = data['crest_factor']
                            existing.frecuencia_media = data['frecuencia_media']
                            existing.frecuencia_dominante = data['frecuencia_dominante']
                            existing.amplitud_max_espectral = data['amplitud_max_espectral']
                            existing.energia_banda_1 = data['energia_banda_1']
                            existing.energia_banda_2 = data['energia_banda_2']
                            existing.energia_banda_3 = data['energia_banda_3']
                            existing.estado_procesado = data['estado_procesado']
                            updates_count += 1
                        else:
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
                            self.db.add(medicion)
                            updates_count += 1

                    except Exception as item_error:
                        print(f"Error al procesar medición para sensor {data['sensor_id']}: {item_error}")
                        self.db.rollback()
                        continue

                self.db.commit()
            
            return updates_count
            
        except Exception as e:
            print(f"Error insertando mediciones: {e}")
            self.db.rollback()
            return 0
    
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
        sensor_raw = first_row['sensor_id']
        sensor_id = int(sensor_raw) if sensor_raw is not None and not pd.isna(sensor_raw) else None
        raw_timestamp = window_data['timestamp'].iloc[-1]  # Timestamp del final de la ventana
        timestamp = pd.to_datetime(raw_timestamp)
        if hasattr(timestamp, "to_pydatetime"):
            timestamp = timestamp.to_pydatetime()
        
        # Posición (usar el último valor de la ventana)
        lat_raw = window_data['lat'].iloc[-1] if 'lat' in window_data else None
        lon_raw = window_data['lon'].iloc[-1] if 'lon' in window_data else None
        alt_raw = window_data['alt'].iloc[-1] if 'alt' in window_data else None
        latitud = float(lat_raw) if lat_raw is not None and not pd.isna(lat_raw) else None
        longitud = float(lon_raw) if lon_raw is not None and not pd.isna(lon_raw) else None
        altitud = float(alt_raw) if alt_raw is not None and not pd.isna(alt_raw) else None
        
        # Velocidad en m/s
        velocidad_kmh_raw = window_data['velocidad_kmh'].iloc[-1] if 'velocidad_kmh' in window_data else None
        velocidad_kmh = float(velocidad_kmh_raw) if velocidad_kmh_raw is not None and not pd.isna(velocidad_kmh_raw) else 0.0
        velocidad = velocidad_kmh / 3.6
        
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
        vib_x = window_data['vibracion_x'].dropna().values if 'vibracion_x' in window_data else np.array([])
        vib_y = window_data['vibracion_y'].dropna().values if 'vibracion_y' in window_data else np.array([])
        vib_z = window_data['vibracion_z'].dropna().values if 'vibracion_z' in window_data else np.array([])
        
        velocity_series_kmh = window_data['velocidad_kmh'].dropna().values if 'velocidad_kmh' in window_data else np.array([])
        velocity_ms = velocity_series_kmh / 3.6 if velocity_series_kmh.size > 0 else np.array([])
        
        has_vibration_data = (
            len(vib_x) > 0 and len(vib_y) > 0 and len(vib_z) > 0 and
            (np.max(np.abs(vib_x)) > 1e-6 or np.max(np.abs(vib_y)) > 1e-6 or np.max(np.abs(vib_z)) > 1e-6)
        )
        
        if has_vibration_data:
            axes = np.vstack([vib_x, vib_y, vib_z])
            return self._metrics_from_axes(axes, velocity_ms)
        
        synthetic_axes, velocity_profile = self._create_synthetic_axes(velocity_ms)
        return self._metrics_from_axes(synthetic_axes, velocity_profile)
    
    def _simulate_vibration_metrics(self, velocity_ms):
        """Genera métricas simuladas cuando no hay vibraciones registradas."""
        synthetic_axes, velocity_series = self._create_synthetic_axes(velocity_ms)
        return self._metrics_from_axes(synthetic_axes, velocity_series)
    
    def _generate_spectral_profile(self, rms, velocity_ms=None, sample_count=10):
        """Genera un perfil espectral consistente con el nivel de vibración y velocidad."""
        velocity_array = np.atleast_1d(velocity_ms).astype(float) if velocity_ms is not None else np.array([5.0])
        velocity_array = velocity_array[np.isfinite(velocity_array)]
        if velocity_array.size == 0:
            velocity_array = np.array([5.0])

        avg_vel = float(np.clip(np.mean(velocity_array), 0.0, 30.0))
        fs = 1000  # Frecuencia de muestreo en Hz

        # Calcular frecuencias en Hz basadas en velocidad y RMS
        # Las frecuencias más altas se asocian con mayor velocidad
        freq_media_hz = float(np.clip(10.0 + 1.4 * avg_vel, 5.0, 240.0))
        freq_dominante_hz = float(np.clip(freq_media_hz + 0.6 * avg_vel, 5.0, 260.0))
        
        # Normalizar frecuencias al rango 0-1 (dividir por fs para consistencia con FFT)
        freq_media = freq_media_hz / fs
        freq_dominante = freq_dominante_hz / fs
        
        # Amplitud espectral basada en RMS y velocidad
        # Mayor velocidad y RMS = mayor amplitud espectral
        amplitud_espectral = float(max(rms, 0.05) * (1.02 + avg_vel / 90.0))
        
        # Calcular energía total basada en RMS y número de muestras
        energia_total = float(max(0.02, (rms ** 2) * max(sample_count, 1)))
        
        # Distribución de energía por bandas basada en velocidad
        # A mayor velocidad, más energía en bandas medias y altas
        low_weight = np.clip(0.58 - avg_vel / 90.0, 0.1, 0.7)
        mid_weight = np.clip(0.32 + avg_vel / 140.0, 0.15, 0.5)
        high_weight = 1.0 - (low_weight + mid_weight)
        high_weight = np.clip(high_weight, 0.1, 0.4)

        weights = np.array([low_weight, mid_weight, high_weight])
        weights = weights / np.sum(weights)  # Normalizar

        energia_banda_1 = float(energia_total * weights[0])
        energia_banda_2 = float(energia_total * weights[1])
        energia_banda_3 = float(energia_total * weights[2])
        
        # Asegurar valores mínimos para evitar ceros
        energia_banda_1 = max(energia_banda_1, 0.01)
        energia_banda_2 = max(energia_banda_2, 0.01)
        energia_banda_3 = max(energia_banda_3, 0.01)

        return {
            'frecuencia_media': freq_media,  # Normalizado 0-1
            'frecuencia_dominante': freq_dominante,  # Normalizado 0-1
            'amplitud_max_espectral': amplitud_espectral,
            'energia_banda_1': energia_banda_1,
            'energia_banda_2': energia_banda_2,
            'energia_banda_3': energia_banda_3
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
    
    def _calculate_spectral_metrics(self, vib_data, velocity_ms=None):
        """Calcula métricas espectrales"""
        if len(vib_data) == 0:
            return self._generate_spectral_profile(0.08, velocity_ms, sample_count=1)

        min_samples = 6
        if len(vib_data) < min_samples:
            rms = float(np.sqrt(np.mean(vib_data**2))) if len(vib_data) > 0 else 0.08
            # Usar perfil espectral mejorado cuando hay pocos datos
            return self._generate_spectral_profile(rms, velocity_ms, sample_count=max(len(vib_data), 1))
        
        # FFT
        fft_data = fft(vib_data)
        freqs = fftfreq(len(vib_data))
        amplitudes = np.abs(fft_data)
        
        # Filtrar amplitudes muy pequeñas para evitar ruido
        threshold = np.max(amplitudes) * 0.01  # 1% del máximo
        amplitudes_filtered = np.where(amplitudes < threshold, 0, amplitudes)
        
        # Frecuencia media (centroide espectral) - solo usar frecuencias positivas
        positive_mask = freqs > 0
        if np.sum(amplitudes_filtered[positive_mask]) > 0:
            freq_weights = freqs[positive_mask] * amplitudes_filtered[positive_mask]
            frecuencia_media = float(np.sum(freq_weights) / np.sum(amplitudes_filtered[positive_mask]))
        else:
            # Fallback: usar perfil espectral basado en RMS
            rms = float(np.sqrt(np.mean(vib_data**2)))
            return self._generate_spectral_profile(rms, velocity_ms, sample_count=len(vib_data))
        
        # Frecuencia dominante (solo en frecuencias positivas)
        positive_amplitudes = amplitudes_filtered[positive_mask]
        if np.sum(positive_amplitudes) > 0:
            dominant_idx = np.argmax(positive_amplitudes)
            positive_freqs = freqs[positive_mask]
            frecuencia_dominante = float(positive_freqs[dominant_idx])
        else:
            frecuencia_dominante = frecuencia_media
        
        # Amplitud máxima espectral
        amplitud_max_espectral = float(np.max(amplitudes_filtered))
        
        # Energías por bandas de frecuencia
        # Banda 1: 0-50 Hz (baja frecuencia)
        # Banda 2: 50-200 Hz (media frecuencia)  
        # Banda 3: >200 Hz (alta frecuencia)
        
        # Convertir frecuencias a Hz (asumiendo frecuencia de muestreo)
        fs = 1000  # Hz - frecuencia de muestreo típica
        freqs_hz = freqs * fs
        
        # Filtrar frecuencias positivas
        positive_freqs_hz = freqs_hz[positive_mask]
        amps_pos = amplitudes_filtered[positive_mask]
        
        # Calcular energías por banda (usar valores al cuadrado para energía)
        energia_banda_1 = float(np.sum(amps_pos[(positive_freqs_hz >= 0) & (positive_freqs_hz < 50)]**2))
        energia_banda_2 = float(np.sum(amps_pos[(positive_freqs_hz >= 50) & (positive_freqs_hz < 200)]**2))
        energia_banda_3 = float(np.sum(amps_pos[positive_freqs_hz >= 200]**2))
        
        # Asegurar que las frecuencias estén en el rango esperado (0-0.34 normalizado o Hz)
        # Convertir frecuencia_media y frecuencia_dominante a Hz
        frecuencia_media_hz = abs(frecuencia_media * fs)
        frecuencia_dominante_hz = abs(frecuencia_dominante * fs)
        
        # Si las energías son muy pequeñas, usar el perfil espectral como fallback
        energia_total = energia_banda_1 + energia_banda_2 + energia_banda_3
        if energia_total < 1e-6:
            rms = float(np.sqrt(np.mean(vib_data**2)))
            return self._generate_spectral_profile(rms, velocity_ms, sample_count=len(vib_data))
        
        return {
            'frecuencia_media': frecuencia_media_hz / fs,  # Normalizar a 0-1 para consistencia
            'frecuencia_dominante': frecuencia_dominante_hz / fs,  # Normalizar a 0-1
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
        baseline_velocity = np.full(24, 5.0, dtype=float)
        return self._simulate_vibration_metrics(baseline_velocity)
    
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
