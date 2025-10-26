#!/usr/bin/env python3
"""
Pruebas unitarias para la implementación de la etapa "reaceleracion"
en el microservicio de analítica UrbanFlow.
"""

import unittest
from unittest.mock import MagicMock, patch
from app.services.telemetry_processor_simple import TelemetryProcessorSimple
from datetime import datetime, timedelta

class TestReaceleracion(unittest.TestCase):
    """Pruebas para la detección de la fase de reaceleración"""

    def setUp(self):
        """Configuración inicial para cada prueba"""
        self.db_session = MagicMock()
        self.processor = TelemetryProcessorSimple(self.db_session)

    def test_reaceleracion_from_zona_lenta(self):
        """Prueba: Detectar reaceleración después de zona_lenta"""
        # Escenario: Viene de zona_lenta, velocidad empieza a subir
        velocidad_kmh = 8.0
        previous_state = "zona_lenta"
        velocity_history = [4.0, 4.5, 5.0, 6.0, 8.0]  # Tendencia creciente
        
        is_reacceleration = self.processor._is_reacceleration_phase(
            velocidad_kmh, previous_state, velocity_history
        )
        self.assertTrue(is_reacceleration, "Debería detectar reaceleración desde zona_lenta con velocidad creciente")

    def test_reaceleracion_speed_increase_from_low_range(self):
        """Prueba: Detectar reaceleración con aumento de velocidad desde rango bajo"""
        # Escenario: Velocidad aumentando desde un rango bajo (ej: 4-6 km/h)
        velocidad_kmh = 10.0
        previous_state = "transicion"  # No explícitamente zona_lenta, pero velocidad era baja
        velocity_history = [3.0, 4.0, 5.0, 7.0, 10.0]
        
        is_reacceleration = self.processor._is_reacceleration_phase(
            velocidad_kmh, previous_state, velocity_history
        )
        self.assertTrue(is_reacceleration, "Debería detectar reaceleración con velocidad aumentando desde rango bajo")

    def test_not_reaceleracion_already_cruising(self):
        """Prueba: No detectar reaceleración si ya está en crucero"""
        # Escenario: Ya está en velocidad de crucero
        velocidad_kmh = 25.0
        previous_state = "reaceleracion"
        velocity_history = [18.0, 20.0, 22.0, 24.0, 25.0]
        
        is_reacceleration = self.processor._is_reacceleration_phase(
            velocidad_kmh, previous_state, velocity_history
        )
        self.assertFalse(is_reacceleration, "No debería ser reaceleración si ya está en crucero")

    def test_not_reaceleracion_speed_decreasing(self):
        """Prueba: No detectar reaceleración si la velocidad está bajando"""
        # Escenario: Velocidad está disminuyendo
        velocidad_kmh = 15.0
        previous_state = "reaceleracion"
        velocity_history = [20.0, 18.0, 17.0, 16.0, 15.0]
        
        is_reacceleration = self.processor._is_reacceleration_phase(
            velocidad_kmh, previous_state, velocity_history
        )
        self.assertFalse(is_reacceleration, "No debería ser reaceleración si la velocidad está disminuyendo")

    def test_not_reaceleracion_too_low_speed(self):
        """Prueba: No detectar reaceleración si la velocidad es muy baja"""
        # Escenario: Velocidad muy baja (aún en zona_lenta o parado)
        velocidad_kmh = 3.0
        previous_state = "zona_lenta"
        velocity_history = [4.0, 3.5, 3.0]
        
        is_reacceleration = self.processor._is_reacceleration_phase(
            velocidad_kmh, previous_state, velocity_history
        )
        self.assertFalse(is_reacceleration, "No debería ser reaceleración si la velocidad es muy baja")

    def test_determine_operational_state_reaceleracion_flow(self):
        """Prueba: Flujo completo dentro de _determine_operational_state"""
        # Probar el flujo completo dentro de _determine_operational_state
        # Simular estados anteriores e historial de velocidad
        self.processor.previous_state = "zona_lenta"
        self.processor.velocity_history = [4.0, 4.5, 5.0, 6.0, 8.0]
        
        state = self.processor._determine_operational_state(8.0, 1500, "zona_lenta", [4.0, 4.5, 5.0, 6.0, 8.0])
        self.assertEqual(state, "reaceleracion", "Debería clasificar como reaceleracion")
        
        state = self.processor._determine_operational_state(25.0, 2000, "reaceleracion", [10.0, 15.0, 20.0, 23.0, 25.0])
        self.assertEqual(state, "crucero", "Debería transicionar a crucero después de reaceleracion")

def test_reacceleration_detection():
    """Prueba la detección de reaceleración con casos específicos"""
    print("\n--- Probando detección de reaceleración ---")
    
    # Crear instancia del procesador
    db_session = MagicMock()
    processor = TelemetryProcessorSimple(db_session)
    
    test_cases = [
        {
            "name": "Desde zona_lenta con velocidad creciente",
            "velocidad": 8.0,
            "previous_state": "zona_lenta",
            "velocity_history": [4.0, 4.5, 5.0, 6.0, 8.0],
            "expected": True
        },
        {
            "name": "Velocidad muy baja",
            "velocidad": 3.0,
            "previous_state": "zona_lenta",
            "velocity_history": [4.0, 3.5, 3.0],
            "expected": False
        },
        {
            "name": "Ya en crucero",
            "velocidad": 25.0,
            "previous_state": "reaceleracion",
            "velocity_history": [18.0, 20.0, 22.0, 24.0, 25.0],
            "expected": False
        }
    ]
    
    passed = 0
    total = len(test_cases)
    
    for case in test_cases:
        result = processor._is_reacceleration_phase(
            case["velocidad"], 
            case["previous_state"], 
            case["velocity_history"]
        )
        
        if result == case["expected"]:
            print(f"   PASO: {case['name']}")
            passed += 1
        else:
            print(f"   FALLO: {case['name']} (esperado: {case['expected']}, obtenido: {result})")
    
    print(f"\nResultado: {passed}/{total} pruebas pasaron")
    return passed == total

if __name__ == '__main__':
    print("\n=== Iniciando pruebas de implementacion de reaceleracion ===")
    print("=" * 60)
    
    # Probar detección de reaceleración
    detection_ok = test_reacceleration_detection()
    
    # Ejecutar pruebas unitarias
    print("\n--- Ejecutando pruebas unitarias ---")
    unittest.main(verbosity=2)
    
    if detection_ok:
        print("\nOK La implementacion de reaceleracion esta funcionando")
    else:
        print("\nERROR Algunas pruebas fallaron")
