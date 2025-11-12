from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración de base de datos - usar las mismas variables que el proyecto principal
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'urbanflow_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

def get_db_connection():
    """Obtiene conexión a la base de datos"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

class PredictionEngine:
    """Motor de predicciones basado en datos históricos"""
    
    @staticmethod
    def calculate_moving_average(data, window=10):
        """Calcula media móvil simple"""
        if len(data) < window:
            return data[-1] if data else 0
        
        return sum(data[-window:]) / window
    
    @staticmethod
    def calculate_exponential_moving_average(data, alpha=0.3):
        """Calcula media móvil exponencial"""
        if not data:
            return 0
        
        ema = data[0]
        for value in data[1:]:
            ema = alpha * value + (1 - alpha) * ema
        
        return ema
    
    @staticmethod
    def detect_trend(data):
        """Detecta tendencia en los datos"""
        if len(data) < 2:
            return {'trend': 'insufficient_data', 'slope': 0, 'confidence': 0}
        
        x = np.arange(len(data))
        y = np.array(data)
        
        # Regresión lineal
        slope, intercept = np.polyfit(x, y, 1)
        
        # Calcular R²
        y_pred = slope * x + intercept
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        trend = 'stable'
        if slope > 0.1:
            trend = 'increasing'
        elif slope < -0.1:
            trend = 'decreasing'
        
        return {
            'trend': trend,
            'slope': float(slope),
            'confidence': float(r_squared)
        }
    
    @staticmethod
    def detect_anomalies(data, threshold=2):
        """Detecta anomalías usando desviación estándar"""
        if len(data) < 3:
            return []
        
        mean = np.mean(data)
        std = np.std(data)
        
        anomalies = []
        for i, value in enumerate(data):
            z_score = abs(value - mean) / std if std > 0 else 0
            if z_score > threshold:
                anomalies.append({
                    'index': i,
                    'value': float(value),
                    'z_score': float(z_score),
                    'severity': 'high' if z_score > 3 else 'medium'
                })
        
        return anomalies
    
    @staticmethod
    def predict_next_value(data, method='moving_average', window=10):
        """Predice el siguiente valor usando diferentes métodos"""
        if not data:
            return {'predicted_value': 0, 'confidence': 0, 'method': 'no_data'}
        
        if method == 'moving_average':
            predicted = PredictionEngine.calculate_moving_average(data, window)
            confidence = min(0.9, max(0.1, 1 - (np.std(data[-window:]) / np.mean(data[-window:])) if len(data) >= window else 0.5)
        elif method == 'exponential':
            predicted = PredictionEngine.calculate_exponential_moving_average(data)
            confidence = 0.7
        else:
            predicted = data[-1]
            confidence = 0.3
        
        return {
            'predicted_value': float(predicted),
            'confidence': float(confidence),
            'method': method
        }
    
    @staticmethod
    def calculate_health_score(measurements):
        """Calcula score de salud del sistema"""
        if not measurements:
            return {'health_score': 0, 'status': 'no_data'}
        
        rms_values = [float(m.get('rms', 0)) for m in measurements if m.get('rms')]
        kurtosis_values = [float(m.get('kurtosis', 0)) for m in measurements if m.get('kurtosis')]
        
        if not rms_values:
            return {'health_score': 0, 'status': 'no_data'}
        
        # Calcular score basado en RMS
        avg_rms = np.mean(rms_values)
        health_score = max(0, min(100, 100 - (avg_rms - 0.5) * 50))
        
        # Ajustar por kurtosis si está disponible
        if kurtosis_values:
            avg_kurtosis = np.mean(kurtosis_values)
            if avg_kurtosis > 4:
                health_score -= 20
        
        # Determinar status
        if health_score >= 80:
            status = 'healthy'
        elif health_score >= 60:
            status = 'moderate'
        elif health_score >= 40:
            status = 'warning'
        else:
            status = 'critical'
        
        return {
            'health_score': float(health_score),
            'status': status,
            'avg_rms': float(avg_rms),
            'total_measurements': len(measurements)
        }

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Endpoint de salud del servicio"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'predictions-service'
    })

@app.route('/api/v1/sensors', methods=['GET'])
def get_sensors():
    """Obtiene lista de sensores activos"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    s.sensor_id,
                    s.cabina_id,
                    s.modelo,
                    s.version_firmware,
                    c.codigo_interno,
                    c.estado_actual,
                    MAX(m.timestamp) as ultima_medicion
                FROM sensores s
                JOIN cabinas c ON s.cabina_id = c.cabina_id
                LEFT JOIN mediciones m ON s.sensor_id = m.sensor_id
                WHERE c.estado_actual IN ('operativa', 'inusual', 'alerta')
                GROUP BY s.sensor_id, s.cabina_id, s.modelo, s.version_firmware, c.codigo_interno, c.estado_actual
                ORDER BY s.sensor_id
            """)
            sensors = cur.fetchall()
            
            # Convertir a diccionario para JSON
            result = []
            for sensor in sensors:
                result.append({
                    'sensor_id': sensor['sensor_id'],
                    'cabina_id': sensor['cabina_id'],
                    'modelo': sensor['modelo'],
                    'version_firmware': sensor['version_firmware'],
                    'codigo_interno': sensor['codigo_interno'],
                    'estado_actual': sensor['estado_actual'],
                    'ultima_medicion': sensor['ultima_medicion'].isoformat() if sensor['ultima_medicion'] else None
                })
            
            return jsonify({
                'sensors': result,
                'total': len(result)
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/v1/sensors/<int:sensor_id>/historical', methods=['GET'])
def get_historical_data(sensor_id):
    """Obtiene datos históricos de un sensor"""
    hours = request.args.get('hours', 24, type=int)
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    sensor_id,
                    timestamp,
                    latitud,
                    longitud,
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
                WHERE sensor_id = %s 
                  AND timestamp >= NOW() - INTERVAL '%s hours'
                ORDER BY timestamp ASC
            """, (sensor_id, hours))
            
            measurements = cur.fetchall()
            
            # Convertir a diccionario
            result = []
            for measurement in measurements:
                result.append({
                    'sensor_id': measurement['sensor_id'],
                    'timestamp': measurement['timestamp'].isoformat(),
                    'latitud': float(measurement['latitud']) if measurement['latitud'] else None,
                    'longitud': float(measurement['longitud']) if measurement['longitud'] else None,
                    'velocidad': float(measurement['velocidad']) if measurement['velocidad'] else None,
                    'rms': float(measurement['rms']) if measurement['rms'] else None,
                    'kurtosis': float(measurement['kurtosis']) if measurement['kurtosis'] else None,
                    'skewness': float(measurement['skewness']) if measurement['skewness'] else None,
                    'zcr': float(measurement['zcr']) if measurement['zcr'] else None,
                    'pico': float(measurement['pico']) if measurement['pico'] else None,
                    'crest_factor': float(measurement['crest_factor']) if measurement['crest_factor'] else None,
                    'frecuencia_media': float(measurement['frecuencia_media']) if measurement['frecuencia_media'] else None,
                    'frecuencia_dominante': float(measurement['frecuencia_dominante']) if measurement['frecuencia_dominante'] else None,
                    'amplitud_max_espectral': float(measurement['amplitud_max_espectral']) if measurement['amplitud_max_espectral'] else None,
                    'energia_banda_1': float(measurement['energia_banda_1']) if measurement['energia_banda_1'] else None,
                    'energia_banda_2': float(measurement['energia_banda_2']) if measurement['energia_banda_2'] else None,
                    'energia_banda_3': float(measurement['energia_banda_3']) if measurement['energia_banda_3'] else None,
                    'estado_procesado': measurement['estado_procesado']
                })
            
            return jsonify({
                'sensor_id': sensor_id,
                'measurements': result,
                'total': len(result),
                'time_range_hours': hours
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/v1/sensors/<int:sensor_id>/predict', methods=['POST'])
def predict_sensor_data(sensor_id):
    """Genera predicciones para un sensor"""
    data = request.get_json()
    method = data.get('method', 'moving_average')
    window = data.get('window', 10)
    hours = data.get('hours', 24)
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Obtener datos históricos
            cur.execute("""
                SELECT rms, kurtosis, skewness, velocidad, timestamp
                FROM mediciones 
                WHERE sensor_id = %s 
                  AND timestamp >= NOW() - INTERVAL '%s hours'
                ORDER BY timestamp ASC
            """, (sensor_id, hours))
            
            measurements = cur.fetchall()
            
            if not measurements:
                return jsonify({'error': 'No historical data found'}), 404
            
            # Extraer datos para análisis
            rms_data = [float(m['rms']) for m in measurements if m['rms']]
            kurtosis_data = [float(m['kurtosis']) for m in measurements if m['kurtosis']]
            velocity_data = [float(m['velocidad']) for m in measurements if m['velocidad']]
            
            # Generar predicciones
            predictions = {}
            
            if rms_data:
                predictions['rms'] = PredictionEngine.predict_next_value(rms_data, method, window)
                predictions['rms_trend'] = PredictionEngine.detect_trend(rms_data)
                predictions['rms_anomalies'] = PredictionEngine.detect_anomalies(rms_data)
            
            if kurtosis_data:
                predictions['kurtosis'] = PredictionEngine.predict_next_value(kurtosis_data, method, window)
                predictions['kurtosis_trend'] = PredictionEngine.detect_trend(kurtosis_data)
            
            if velocity_data:
                predictions['velocity'] = PredictionEngine.predict_next_value(velocity_data, method, window)
                predictions['velocity_trend'] = PredictionEngine.detect_trend(velocity_data)
            
            # Calcular score de salud
            health = PredictionEngine.calculate_health_score(measurements)
            
            return jsonify({
                'sensor_id': sensor_id,
                'predictions': predictions,
                'health': health,
                'method': method,
                'window': window,
                'historical_data_points': len(measurements),
                'timestamp': datetime.utcnow().isoformat()
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/v1/sensors/<int:sensor_id>/stats', methods=['GET'])
def get_sensor_stats(sensor_id):
    """Obtiene estadísticas de un sensor"""
    hours = request.args.get('hours', 24, type=int)
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    AVG(rms) as avg_rms,
                    STDDEV(rms) as std_rms,
                    AVG(kurtosis) as avg_kurtosis,
                    STDDEV(kurtosis) as std_kurtosis,
                    AVG(skewness) as avg_skewness,
                    STDDEV(skewness) as std_skewness,
                    AVG(velocidad) as avg_velocidad,
                    COUNT(*) as total_mediciones,
                    COUNT(CASE WHEN estado_procesado = 'alerta' THEN 1 END) as alertas_count,
                    COUNT(CASE WHEN estado_procesado = 'inusual' THEN 1 END) as inusual_count
                FROM mediciones 
                WHERE sensor_id = %s 
                  AND timestamp >= NOW() - INTERVAL '%s hours'
            """, (sensor_id, hours))
            
            stats = cur.fetchone()
            
            if not stats:
                return jsonify({'error': 'No data found'}), 404
            
            return jsonify({
                'sensor_id': sensor_id,
                'time_range_hours': hours,
                'statistics': {
                    'avg_rms': float(stats['avg_rms']) if stats['avg_rms'] else None,
                    'std_rms': float(stats['std_rms']) if stats['std_rms'] else None,
                    'avg_kurtosis': float(stats['avg_kurtosis']) if stats['avg_kurtosis'] else None,
                    'std_kurtosis': float(stats['std_kurtosis']) if stats['std_kurtosis'] else None,
                    'avg_skewness': float(stats['avg_skewness']) if stats['avg_skewness'] else None,
                    'std_skewness': float(stats['std_skewness']) if stats['std_skewness'] else None,
                    'avg_velocidad': float(stats['avg_velocidad']) if stats['avg_velocidad'] else None,
                    'total_mediciones': int(stats['total_mediciones']),
                    'alertas_count': int(stats['alertas_count']),
                    'inusual_count': int(stats['inusual_count'])
                },
                'timestamp': datetime.utcnow().isoformat()
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/v1/system/overview', methods=['GET'])
def get_system_overview():
    """Obtiene resumen del sistema"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Estadísticas generales
            cur.execute("""
                SELECT 
                    COUNT(DISTINCT s.sensor_id) as total_sensores,
                    COUNT(DISTINCT c.cabina_id) as total_cabinas,
                    COUNT(m.medicion_id) as total_mediciones,
                    MAX(m.timestamp) as ultima_medicion
                FROM sensores s
                JOIN cabinas c ON s.cabina_id = c.cabina_id
                LEFT JOIN mediciones m ON s.sensor_id = m.sensor_id
            """)
            
            overview = cur.fetchone()
            
            # Distribución de estados
            cur.execute("""
                SELECT 
                    c.estado_actual,
                    COUNT(*) as count
                FROM cabinas c
                GROUP BY c.estado_actual
            """)
            
            states = cur.fetchall()
            state_distribution = {state['estado_actual']: int(state['count']) for state in states}
            
            return jsonify({
                'overview': {
                    'total_sensores': int(overview['total_sensores']),
                    'total_cabinas': int(overview['total_cabinas']),
                    'total_mediciones': int(overview['total_mediciones']),
                    'ultima_medicion': overview['ultima_medicion'].isoformat() if overview['ultima_medicion'] else None
                },
                'state_distribution': state_distribution,
                'timestamp': datetime.utcnow().isoformat()
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)
