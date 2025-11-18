#!/usr/bin/env python3
"""
Script de verificación para todos los servicios de UrbanFlow Platform
Verifica que todos los microservicios estén funcionando correctamente
"""

import requests
import time
import json
from datetime import datetime

# Configuración de servicios
SERVICES = {
    'backend': {
        'url': 'http://localhost:3000',
        'health_endpoint': '/health',
        'name': 'Backend Node.js'
    },
    'frontend': {
        'url': 'http://localhost:5173',
        'health_endpoint': '/',
        'name': 'Frontend Vite'
    },
    'analytics': {
        'url': 'http://localhost:8080',
        'health_endpoint': '/health',
        'name': 'Analytics Service'
    },
    'predictions': {
        'url': 'http://localhost:3001',
        'health_endpoint': '/api/v1/health',
        'name': 'Predictions Service'
    }
}

def check_service(service_name, config):
    """Verifica si un servicio está funcionando"""
    try:
        url = f"{config['url']}{config['health_endpoint']}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            print(f"✅ {config['name']}: {url}")
            return True
        else:
            print(f"❌ {config['name']}: {url} (Status: {response.status_code})")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {config['name']}: {url} (No disponible)")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ {config['name']}: {url} (Timeout)")
        return False
    except Exception as e:
        print(f"❌ {config['name']}: {url} (Error: {e})")
        return False

def test_predictions_api():
    """Prueba específica de la API de predicciones"""
    try:
        # Probar endpoint de sensores
        response = requests.get('http://localhost:3001/api/v1/sensors', timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Predictions API - Sensores: {data.get('total', 0)} sensores encontrados")
            
            # Si hay sensores, probar predicción
            if data.get('sensors') and len(data['sensors']) > 0:
                sensor_id = data['sensors'][0]['sensor_id']
                
                # Probar predicción
                payload = {
                    "method": "moving_average",
                    "window": 10,
                    "hours": 24
                }
                
                pred_response = requests.post(
                    f'http://localhost:3001/api/v1/sensors/{sensor_id}/predict',
                    json=payload,
                    timeout=10
                )
                
                if pred_response.status_code == 200:
                    pred_data = pred_response.json()
                    print(f"✅ Predictions API - Predicción exitosa para sensor {sensor_id}")
                    return True
                else:
                    print(f"❌ Predictions API - Error en predicción: {pred_response.status_code}")
                    return False
            else:
                print("⚠️  Predictions API - No hay sensores disponibles para probar")
                return True
        else:
            print(f"❌ Predictions API - Error obteniendo sensores: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Predictions API - Error: {e}")
        return False

def test_analytics_api():
    """Prueba específica de la API de analytics"""
    try:
        response = requests.get('http://localhost:8080/api/summary', timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Analytics API - Resumen obtenido")
            return True
        else:
            print(f"❌ Analytics API - Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Analytics API - Error: {e}")
        return False

def main():
    """Función principal de verificación"""
    print("🔍 Verificando servicios de UrbanFlow Platform...")
    print("=" * 60)
    
    results = {}
    
    # Verificar servicios básicos
    for service_name, config in SERVICES.items():
        results[service_name] = check_service(service_name, config)
        time.sleep(1)  # Pequeña pausa entre verificaciones
    
    # Pruebas específicas
    print("\n🧪 Ejecutando pruebas específicas...")
    
    if results.get('analytics'):
        results['analytics_detailed'] = test_analytics_api()
    
    if results.get('predictions'):
        results['predictions_detailed'] = test_predictions_api()
    
    # Resumen de resultados
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE VERIFICACIÓN")
    print("=" * 60)
    
    passed = 0
    total = len([k for k in results.keys() if not k.endswith('_detailed')])
    
    for service_name, config in SERVICES.items():
        status = "✅ FUNCIONANDO" if results.get(service_name) else "❌ NO DISPONIBLE"
        print(f"{config['name']:.<30} {status}")
        if results.get(service_name):
            passed += 1
    
    # Mostrar pruebas específicas
    if 'analytics_detailed' in results:
        status = "✅ FUNCIONANDO" if results['analytics_detailed'] else "❌ ERROR"
        print(f"{'Analytics API (detallada)':.<30} {status}")
    
    if 'predictions_detailed' in results:
        status = "✅ FUNCIONANDO" if results['predictions_detailed'] else "❌ ERROR"
        print(f"{'Predictions API (detallada)':.<30} {status}")
    
    print(f"\nResultado: {passed}/{total} servicios básicos funcionando")
    
    if passed == total:
        print("🎉 ¡Todos los servicios están funcionando correctamente!")
        print("\n🌐 URLs disponibles:")
        print("   - Aplicación principal: http://localhost:5173")
        print("   - Backend API: http://localhost:3000")
        print("   - Analytics API: http://localhost:8080")
        print("   - Predictions API: http://localhost:3001")
    else:
        print("⚠️  Algunos servicios no están disponibles. Verifica que estén ejecutándose.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
