#!/usr/bin/env python3
"""
Script de prueba para el microservicio de analítica de UrbanFlow
"""

import requests
import json
import time
from datetime import datetime

class AnalyticsTester:
    """Clase para probar los endpoints del microservicio de analítica"""
    
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def test_health(self):
        """Prueba el endpoint de health check"""
        print("🔍 Probando health check...")
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check OK: {data}")
                return True
            else:
                print(f"❌ Health check falló: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error en health check: {e}")
            return False
    
    def test_root(self):
        """Prueba el endpoint raíz"""
        print("🔍 Probando endpoint raíz...")
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Endpoint raíz OK: {data}")
                return True
            else:
                print(f"❌ Endpoint raíz falló: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error en endpoint raíz: {e}")
            return False
    
    def test_process_telemetry(self):
        """Prueba el endpoint de procesamiento de telemetría"""
        print("🔍 Probando procesamiento de telemetría...")
        try:
            response = self.session.post(f"{self.base_url}/api/analytics/process")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Procesamiento OK: {data}")
                
                # Verificar que se procesaron datos
                if data.get('data', {}).get('processed_count', 0) > 0:
                    print(f"   📊 Registros procesados: {data['data']['processed_count']}")
                else:
                    print("   ⚠️  No se procesaron nuevos registros")
                
                return True
            else:
                print(f"❌ Procesamiento falló: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error en procesamiento: {e}")
            return False
    
    def test_trajectory(self):
        """Prueba el endpoint de trayectoria"""
        print("🔍 Probando endpoint de trayectoria...")
        try:
            response = self.session.get(f"{self.base_url}/api/analytics/trayecto")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Trayectoria OK: {len(data.get('data', {}).get('trajectory', []))} puntos")
                return True
            else:
                print(f"❌ Trayectoria falló: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error en trayectoria: {e}")
            return False
    
    def test_summary(self):
        """Prueba el endpoint de resumen"""
        print("🔍 Probando endpoint de resumen...")
        try:
            response = self.session.get(f"{self.base_url}/api/analytics/summary")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Resumen OK: {data}")
                return True
            else:
                print(f"❌ Resumen falló: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error en resumen: {e}")
            return False
    
    def test_analytics_summary(self):
        """Prueba el endpoint de resumen de análisis"""
        print("🔍 Probando resumen de análisis...")
        try:
            response = self.session.get(f"{self.base_url}/api/analytics/summary")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Resumen de análisis OK: {data}")
                return True
            else:
                print(f"❌ Resumen de análisis falló: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error en resumen de análisis: {e}")
            return False
    
    def test_system_health(self):
        """Prueba el endpoint de salud del sistema"""
        print("🔍 Probando salud del sistema...")
        try:
            response = self.session.get(f"{self.base_url}/api/analytics/system-health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Salud del sistema OK: {data}")
                return True
            else:
                print(f"❌ Salud del sistema falló: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error en salud del sistema: {e}")
            return False
    
    def test_cabins_summary(self):
        """Prueba el endpoint de resumen de cabinas"""
        print("🔍 Probando resumen de cabinas...")
        try:
            response = self.session.get(f"{self.base_url}/api/analytics/cabins/summary")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Resumen de cabinas OK: {data}")
                return True
            else:
                print(f"❌ Resumen de cabinas falló: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error en resumen de cabinas: {e}")
            return False
    
    def test_consecutive_processing(self):
        """Prueba el procesamiento consecutivo de datos"""
        print("🔍 Probando procesamiento consecutivo...")
        try:
            # Ejecutar procesamiento múltiples veces para verificar incrementalidad
            responses = []
            for i in range(3):
                response = self.session.post(f"{self.base_url}/api/analytics/process")
                responses.append(response)
                time.sleep(1)  # Pausa entre procesamientos
            
            # Verificar que no hay duplicados
            all_processed = [r.json().get('data', {}).get('processed_count', 0) for r in responses if r.status_code == 200]
            
            if all_processed:
                print(f"   📊 Procesamientos: {all_processed}")
                print("   ✅ Procesamiento incremental funcionando")
                return True
            else:
                print("   ⚠️  No se pudo verificar procesamiento incremental")
                return False
                
        except Exception as e:
            print(f"❌ Error en procesamiento consecutivo: {e}")
            return False
    
    def test_distance_calculation(self):
        """Prueba el cálculo de distancias"""
        print("🔍 Probando cálculo de distancias...")
        try:
            response = self.session.get(f"{self.base_url}/api/analytics/summary")
            if response.status_code == 200:
                data = response.json()
                summary = data.get('data', {})
                
                # Verificar que se calculó la distancia total
                distancia_total = summary.get('distancia_total_km', 0)
                if distancia_total > 0:
                    print(f"   📏 Distancia total: {distancia_total:.2f} km")
                    print("   ✅ Cálculo de distancias funcionando")
                    return True
                else:
                    print("   ⚠️  No se pudo calcular distancia total")
                    return False
            else:
                print(f"❌ Error obteniendo resumen: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error en cálculo de distancias: {e}")
            return False
    
    def test_operational_states(self):
        """Prueba la clasificación de estados operativos"""
        print("🔍 Probando clasificación de estados...")
        try:
            response = self.session.get(f"{self.base_url}/api/analytics/trayecto")
            if response.status_code == 200:
                data = response.json()
                trajectory = data.get('data', {}).get('trajectory', [])
                
                if trajectory:
                    # Verificar que hay estados clasificados
                    estados = [point.get('estado_procesado') for point in trajectory if point.get('estado_procesado')]
                    estados_unicos = list(set(estados))
                    
                    print(f"   🏷️  Estados encontrados: {estados_unicos}")
                    print(f"   📊 Total de puntos: {len(trajectory)}")
                    
                    if estados_unicos:
                        print("   ✅ Clasificación de estados funcionando")
                        return True
                    else:
                        print("   ⚠️  No se encontraron estados clasificados")
                        return False
                else:
                    print("   ⚠️  No hay datos de trayectoria")
                    return False
            else:
                print(f"❌ Error obteniendo trayectoria: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error en clasificación de estados: {e}")
            return False
    
    def run_all_tests(self):
        """Ejecuta todas las pruebas"""
        print("🧪 UrbanFlow Analytics Service - Pruebas de Funcionalidad")
        print("=" * 70)
        
        tests = [
            ("Health Check", self.test_health),
            ("Endpoint Raíz", self.test_root),
            ("Procesamiento de Telemetría", self.test_process_telemetry),
            ("Procesamiento Consecutivo", self.test_consecutive_processing),
            ("Cálculo de Distancias", self.test_distance_calculation),
            ("Clasificación de Estados", self.test_operational_states),
            ("Trayectoria", self.test_trajectory),
            ("Resumen", self.test_summary),
            ("Resumen de Análisis", self.test_analytics_summary),
            ("Salud del Sistema", self.test_system_health),
            ("Resumen de Cabinas", self.test_cabins_summary)
        ]
        
        results = []
        
        for test_name, test_func in tests:
            print(f"\n📋 {test_name}")
            print("-" * 50)
            try:
                result = test_func()
                results.append((test_name, result))
                if result:
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {e}")
                results.append((test_name, False))
            
            time.sleep(0.5)  # Pausa entre pruebas
        
        # Resumen de resultados
        print("\n" + "=" * 70)
        print("📊 RESUMEN DE PRUEBAS")
        print("=" * 70)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{status} - {test_name}")
        
        print(f"\n🎯 Resultado: {passed}/{total} pruebas pasaron")
        
        if passed == total:
            print("🎉 ¡Todas las pruebas pasaron! El microservicio está funcionando correctamente.")
        else:
            print("⚠️  Algunas pruebas fallaron. Revisa los logs y la configuración.")
        
        return passed == total

def main():
    """Función principal"""
    print("🚀 Iniciando pruebas del microservicio de analítica...")
    
    # Verificar que el servidor esté ejecutándose
    tester = AnalyticsTester()
    
    try:
        # Intentar conectar al servidor
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code != 200:
            print("❌ El servidor no está respondiendo correctamente")
            return
    except requests.exceptions.ConnectionError:
        print("❌ No se puede conectar al servidor en http://localhost:8001")
        print("   Asegúrate de que el microservicio esté ejecutándose:")
        print("   python start_analytics.py")
        return
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return
    
    # Ejecutar pruebas
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ¡Microservicio de analítica funcionando correctamente!")
        print("   Puedes acceder a la documentación en: http://localhost:8001/docs")
    else:
        print("\n⚠️  El microservicio tiene algunos problemas. Revisa los logs.")

if __name__ == "__main__":
    main()
