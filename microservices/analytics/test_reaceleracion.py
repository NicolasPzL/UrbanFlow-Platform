#!/usr/bin/env python3
"""
Script de prueba para verificar la implementación de la etapa "reaceleracion"
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.telemetry_processor_simple import TelemetryProcessorSimple
from app.db.session import get_db
from sqlalchemy.orm import Session

def test_reacceleration_detection():
    """Prueba la detección de la fase de reaceleración"""
    print("🧪 Probando detección de reaceleración...")
    
    # Obtener sesión de base de datos
    db = next(get_db())
    processor = TelemetryProcessorSimple(db)
    
    # Casos de prueba para diferentes escenarios
    test_cases = [
        {
            "name": "Zona lenta → Reaceleración",
            "velocidad_kmh": 8.5,
            "distancia_acumulada_m": 2000,
            "previous_state": "zona_lenta",
            "velocity_history": [4.2, 5.1, 6.8, 8.5],
            "expected": "reaceleracion"
        },
        {
            "name": "Reaceleración → Crucero",
            "velocidad_kmh": 25.0,
            "distancia_acumulada_m": 3000,
            "previous_state": "reaceleracion",
            "velocity_history": [8.5, 12.3, 18.7, 25.0],
            "expected": "crucero"
        },
        {
            "name": "Zona lenta directa",
            "velocidad_kmh": 4.5,
            "distancia_acumulada_m": 1500,
            "previous_state": "crucero",
            "velocity_history": [24.5, 15.2, 8.1, 4.5],
            "expected": "zona_lenta"
        },
        {
            "name": "Inicio normal",
            "velocidad_kmh": 12.0,
            "distancia_acumulada_m": 500,
            "previous_state": None,
            "velocity_history": [0.0, 5.2, 8.7, 12.0],
            "expected": "inicio"
        },
        {
            "name": "Crucero estable",
            "velocidad_kmh": 24.8,
            "distancia_acumulada_m": 5000,
            "previous_state": "crucero",
            "velocity_history": [24.5, 24.7, 24.6, 24.8],
            "expected": "crucero"
        }
    ]
    
    passed = 0
    total = len(test_cases)
    
    for test_case in test_cases:
        print(f"\n📋 {test_case['name']}")
        print(f"   Velocidad: {test_case['velocidad_kmh']} km/h")
        print(f"   Estado anterior: {test_case['previous_state']}")
        print(f"   Historial velocidad: {test_case['velocity_history']}")
        
        # Llamar a la función de clasificación
        result = processor._determine_operational_state(
            test_case['velocidad_kmh'],
            test_case['distancia_acumulada_m'],
            test_case['previous_state'],
            test_case['velocity_history']
        )
        
        print(f"   Resultado: {result}")
        print(f"   Esperado: {test_case['expected']}")
        
        if result == test_case['expected']:
            print("   ✅ PASÓ")
            passed += 1
        else:
            print("   ❌ FALLÓ")
    
    print(f"\n📊 Resultados: {passed}/{total} pruebas pasaron")
    return passed == total

def test_api_endpoints():
    """Prueba que los endpoints devuelvan el nuevo estado"""
    print("\n🌐 Probando endpoints de API...")
    
    try:
        import requests
        
        # Probar endpoint de trayectoria
        print("   Probando /api/analytics/trayecto...")
        response = requests.get("http://localhost:8080/api/analytics/trayecto")
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') and 'data' in data:
                trajectory = data['data']
                if trajectory and len(trajectory) > 0:
                    # Verificar que hay campo estado_procesado
                    first_point = trajectory[0]
                    if 'estado_procesado' in first_point:
                        print("   ✅ Campo estado_procesado presente")
                        
                        # Verificar si hay algún punto con reaceleracion
                        reacceleration_points = [p for p in trajectory if p.get('estado_procesado') == 'reaceleracion']
                        if reacceleration_points:
                            print(f"   ✅ Encontrados {len(reacceleration_points)} puntos en reaceleración")
                        else:
                            print("   ⚠️  No se encontraron puntos en reaceleración (puede ser normal si no hay datos suficientes)")
                    else:
                        print("   ❌ Campo estado_procesado no encontrado")
                else:
                    print("   ⚠️  Trayectoria vacía")
            else:
                print("   ❌ Respuesta no válida")
        else:
            print(f"   ❌ Error HTTP {response.status_code}")
        
        # Probar endpoint de summary
        print("   Probando /api/analytics/summary...")
        response = requests.get("http://localhost:8080/api/analytics/summary")
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') and 'data' in data:
                summary = data['data']
                if 'distribucion_estados' in summary:
                    estados = summary['distribucion_estados']
                    print("   ✅ Campo distribucion_estados presente")
                    
                    # Verificar si hay reaceleracion en la distribución
                    if 'reaceleracion' in estados:
                        reacceleration_data = estados['reaceleracion']
                        print(f"   ✅ Reaceleración encontrada: {reacceleration_data['count']} puntos ({reacceleration_data['percentage']}%)")
                    else:
                        print("   ⚠️  Reaceleración no encontrada en distribución (puede ser normal si no hay datos suficientes)")
                    
                    print("   Estados encontrados:", list(estados.keys()))
                else:
                    print("   ❌ Campo distribucion_estados no encontrado")
            else:
                print("   ❌ Respuesta no válida")
        else:
            print(f"   ❌ Error HTTP {response.status_code}")
            
    except ImportError:
        print("   ⚠️  requests no disponible, saltando pruebas de API")
    except Exception as e:
        print(f"   ❌ Error en pruebas de API: {e}")

def main():
    """Función principal de pruebas"""
    print("Iniciando pruebas de implementacion de reaceleracion")
    print("=" * 60)
    
    # Probar detección de reaceleración
    detection_ok = test_reacceleration_detection()
    
    # Probar endpoints de API
    test_api_endpoints()
    
    print("\n" + "=" * 60)
    if detection_ok:
        print("🎉 Todas las pruebas de detección pasaron correctamente!")
        print("✅ La implementación de reaceleración está funcionando")
    else:
        print("❌ Algunas pruebas fallaron")
        print("🔧 Revisar la implementación de detección de reaceleración")
    
    print("\n📝 Próximos pasos:")
    print("   1. Ejecutar procesamiento de datos: POST /api/analytics/process")
    print("   2. Verificar datos en frontend dashboard")
    print("   3. Confirmar visualización en mapa")

if __name__ == "__main__":
    main()
