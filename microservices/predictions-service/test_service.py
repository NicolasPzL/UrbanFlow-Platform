#!/usr/bin/env python3
"""
Script de prueba para el microservicio de predicciones
Verifica la integración con la base de datos y los algoritmos
"""

import requests
import json
import time
from datetime import datetime

# Configuración del servicio
BASE_URL = "http://localhost:3001"
API_BASE = f"{BASE_URL}/api/v1"

def test_health_check():
    """Prueba el endpoint de salud"""
    print("🔍 Probando health check...")
    try:
        response = requests.get(f"{API_BASE}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check exitoso: {data['status']}")
            return True
        else:
            print(f"❌ Health check falló: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error en health check: {e}")
        return False

def test_system_overview():
    """Prueba el resumen del sistema"""
    print("\n🔍 Probando resumen del sistema...")
    try:
        response = requests.get(f"{API_BASE}/system/overview")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Resumen del sistema obtenido:")
            print(f"   - Total sensores: {data['overview']['total_sensores']}")
            print(f"   - Total cabinas: {data['overview']['total_cabinas']}")
            print(f"   - Total mediciones: {data['overview']['total_mediciones']}")
            print(f"   - Distribución de estados: {data['state_distribution']}")
            return True
        else:
            print(f"❌ Resumen del sistema falló: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error en resumen del sistema: {e}")
        return False

def test_sensors_list():
    """Prueba la lista de sensores"""
    print("\n🔍 Probando lista de sensores...")
    try:
        response = requests.get(f"{API_BASE}/sensors")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Lista de sensores obtenida: {data['total']} sensores")
            
            # Mostrar primeros 3 sensores
            for i, sensor in enumerate(data['sensors'][:3]):
                print(f"   Sensor {i+1}: ID={sensor['sensor_id']}, Cabina={sensor['codigo_interno']}, Estado={sensor['estado_actual']}")
            
            return data['sensors'][0]['sensor_id'] if data['sensors'] else None
        else:
            print(f"❌ Lista de sensores falló: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error en lista de sensores: {e}")
        return None

def test_historical_data(sensor_id):
    """Prueba los datos históricos de un sensor"""
    print(f"\n🔍 Probando datos históricos del sensor {sensor_id}...")
    try:
        response = requests.get(f"{API_BASE}/sensors/{sensor_id}/historical?hours=24")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Datos históricos obtenidos: {data['total']} mediciones")
            
            if data['measurements']:
                # Mostrar estadísticas básicas
                rms_values = [m['rms'] for m in data['measurements'] if m['rms']]
                if rms_values:
                    avg_rms = sum(rms_values) / len(rms_values)
                    print(f"   - RMS promedio: {avg_rms:.4f}")
                    print(f"   - RMS min: {min(rms_values):.4f}")
                    print(f"   - RMS max: {max(rms_values):.4f}")
                
                # Mostrar última medición
                last_measurement = data['measurements'][-1]
                print(f"   - Última medición: {last_measurement['timestamp']}")
                print(f"   - Estado: {last_measurement['estado_procesado']}")
            
            return True
        else:
            print(f"❌ Datos históricos fallaron: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error en datos históricos: {e}")
        return False

def test_sensor_stats(sensor_id):
    """Prueba las estadísticas de un sensor"""
    print(f"\n🔍 Probando estadísticas del sensor {sensor_id}...")
    try:
        response = requests.get(f"{API_BASE}/sensors/{sensor_id}/stats?hours=24")
        if response.status_code == 200:
            data = response.json()
            stats = data['statistics']
            print(f"✅ Estadísticas obtenidas:")
            print(f"   - RMS promedio: {stats['avg_rms']:.4f}")
            print(f"   - RMS desviación: {stats['std_rms']:.4f}")
            print(f"   - Total mediciones: {stats['total_mediciones']}")
            print(f"   - Alertas: {stats['alertas_count']}")
            print(f"   - Inusuales: {stats['inusual_count']}")
            return True
        else:
            print(f"❌ Estadísticas fallaron: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error en estadísticas: {e}")
        return False

def test_prediction(sensor_id):
    """Prueba la predicción de un sensor"""
    print(f"\n🔍 Probando predicción del sensor {sensor_id}...")
    try:
        payload = {
            "method": "moving_average",
            "window": 10,
            "hours": 24
        }
        
        response = requests.post(
            f"{API_BASE}/sensors/{sensor_id}/predict",
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Predicción generada:")
            
            # Mostrar predicciones
            if 'rms' in data['predictions']:
                rms_pred = data['predictions']['rms']
                print(f"   - RMS predicho: {rms_pred['predicted_value']:.4f}")
                print(f"   - Confianza: {rms_pred['confidence']:.4f}")
                print(f"   - Método: {rms_pred['method']}")
            
            # Mostrar tendencia
            if 'rms_trend' in data['predictions']:
                trend = data['predictions']['rms_trend']
                print(f"   - Tendencia: {trend['trend']}")
                print(f"   - Pendiente: {trend['slope']:.4f}")
                print(f"   - Confianza: {trend['confidence']:.4f}")
            
            # Mostrar salud
            health = data['health']
            print(f"   - Score de salud: {health['health_score']:.2f}")
            print(f"   - Estado: {health['status']}")
            print(f"   - RMS promedio: {health['avg_rms']:.4f}")
            
            return True
        else:
            print(f"❌ Predicción falló: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error en predicción: {e}")
        return False

def test_anomaly_detection(sensor_id):
    """Prueba la detección de anomalías"""
    print(f"\n🔍 Probando detección de anomalías del sensor {sensor_id}...")
    try:
        payload = {
            "method": "moving_average",
            "window": 20,
            "hours": 48
        }
        
        response = requests.post(
            f"{API_BASE}/sensors/{sensor_id}/predict",
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Análisis de anomalías completado:")
            
            # Mostrar anomalías RMS
            if 'rms_anomalies' in data['predictions']:
                anomalies = data['predictions']['rms_anomalies']
                print(f"   - Anomalías detectadas: {len(anomalies)}")
                
                for i, anomaly in enumerate(anomalies[:3]):  # Mostrar primeras 3
                    print(f"     Anomalía {i+1}: valor={anomaly['value']:.4f}, z_score={anomaly['z_score']:.2f}, severidad={anomaly['severity']}")
            
            return True
        else:
            print(f"❌ Detección de anomalías falló: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error en detección de anomalías: {e}")
        return False

def main():
    """Función principal de pruebas"""
    print("🚀 Iniciando pruebas del microservicio de predicciones...")
    print("=" * 60)
    
    # Lista de pruebas
    tests = [
        ("Health Check", test_health_check),
        ("Resumen del Sistema", test_system_overview),
        ("Lista de Sensores", test_sensors_list),
    ]
    
    results = {}
    
    # Ejecutar pruebas básicas
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
        except Exception as e:
            print(f"❌ Error en {test_name}: {e}")
            results[test_name] = False
    
    # Obtener sensor ID para pruebas avanzadas
    sensor_id = None
    if results.get("Lista de Sensores"):
        print("\n🔍 Obteniendo ID de sensor para pruebas avanzadas...")
        try:
            response = requests.get(f"{API_BASE}/sensors")
            if response.status_code == 200:
                data = response.json()
                if data['sensors']:
                    sensor_id = data['sensors'][0]['sensor_id']
                    print(f"✅ Usando sensor ID: {sensor_id}")
                else:
                    print("❌ No hay sensores disponibles")
        except Exception as e:
            print(f"❌ Error obteniendo sensor ID: {e}")
    
    # Pruebas avanzadas si hay sensor disponible
    if sensor_id:
        advanced_tests = [
            ("Datos Históricos", lambda: test_historical_data(sensor_id)),
            ("Estadísticas", lambda: test_sensor_stats(sensor_id)),
            ("Predicción", lambda: test_prediction(sensor_id)),
            ("Detección de Anomalías", lambda: test_anomaly_detection(sensor_id)),
        ]
        
        for test_name, test_func in advanced_tests:
            try:
                result = test_func()
                results[test_name] = result
            except Exception as e:
                print(f"❌ Error en {test_name}: {e}")
                results[test_name] = False
    
    # Resumen de resultados
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASÓ" if result else "❌ FALLÓ"
        print(f"{test_name:.<30} {status}")
        if result:
            passed += 1
    
    print(f"\nResultado: {passed}/{total} pruebas pasaron")
    
    if passed == total:
        print("🎉 ¡Todas las pruebas pasaron! El microservicio está funcionando correctamente.")
    else:
        print("⚠️  Algunas pruebas fallaron. Revisa la configuración y la base de datos.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
