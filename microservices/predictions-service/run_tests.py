#!/usr/bin/env python3
"""
Script para ejecutar pruebas del microservicio de predicciones
"""

import subprocess
import sys
import time
import requests
import json
from threading import Thread

def start_service():
    """Inicia el servicio en segundo plano"""
    try:
        process = subprocess.Popen([sys.executable, "app.py"], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        return process
    except Exception as e:
        print(f"❌ Error iniciando servicio: {e}")
        return None

def wait_for_service(max_attempts=30):
    """Espera a que el servicio esté disponible"""
    print("⏳ Esperando que el servicio esté disponible...")
    
    for attempt in range(max_attempts):
        try:
            response = requests.get("http://localhost:3001/api/v1/health", timeout=5)
            if response.status_code == 200:
                print("✅ Servicio disponible")
                return True
        except:
            pass
        
        time.sleep(1)
        print(f"   Intento {attempt + 1}/{max_attempts}...")
    
    print("❌ Servicio no disponible después de 30 segundos")
    return False

def run_tests():
    """Ejecuta las pruebas del servicio"""
    print("🧪 Ejecutando pruebas...")
    
    try:
        # Importar y ejecutar las pruebas
        from test_service import main
        return main()
    except Exception as e:
        print(f"❌ Error ejecutando pruebas: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando pruebas del microservicio de predicciones...")
    print("=" * 60)
    
    # Iniciar servicio
    print("1️⃣ Iniciando servicio...")
    process = start_service()
    
    if not process:
        print("❌ No se pudo iniciar el servicio")
        return False
    
    try:
        # Esperar a que esté disponible
        if not wait_for_service():
            print("❌ El servicio no se pudo iniciar correctamente")
            return False
        
        # Ejecutar pruebas
        print("\n2️⃣ Ejecutando pruebas...")
        success = run_tests()
        
        if success:
            print("\n🎉 ¡Todas las pruebas pasaron!")
        else:
            print("\n⚠️  Algunas pruebas fallaron")
        
        return success
    
    finally:
        # Detener el servicio
        print("\n3️⃣ Deteniendo servicio...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        print("✅ Servicio detenido")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
