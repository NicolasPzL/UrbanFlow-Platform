#!/usr/bin/env python3
"""
Script para verificar la integración del microservicio
Verifica que el microservicio esté configurado correctamente para funcionar con frontend y backend
"""

import os
import sys
import json
from pathlib import Path

def check_file_structure():
    """Verifica que la estructura de archivos esté correcta"""
    print("🔍 Verificando estructura de archivos...")
    
    required_files = [
        'microservices/predictions-service/app.py',
        'microservices/predictions-service/requirements.txt',
        'microservices/predictions-service/README.md',
        'start-all-services.bat',
        'start-all-services.sh',
        'docker-compose.yml',
        'verify-services.py',
        'test-integration.py',
        'frontend-integration-example.js'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Archivos faltantes:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        return False
    else:
        print("✅ Todos los archivos necesarios están presentes")
        return True

def check_microservice_config():
    """Verifica la configuración del microservicio"""
    print("\n🔍 Verificando configuración del microservicio...")
    
    try:
        # Verificar app.py
        app_path = Path('microservices/predictions-service/app.py')
        if not app_path.exists():
            print("❌ app.py no encontrado")
            return False
        
        app_content = app_path.read_text()
        
        # Verificar que use las mismas variables de entorno que el proyecto principal
        if 'DB_NAME=urbanflow_db' in app_content:
            print("✅ Configuración de base de datos correcta")
        else:
            print("❌ Configuración de base de datos incorrecta")
            return False
        
        if 'CORS(app)' in app_content:
            print("✅ CORS configurado")
        else:
            print("❌ CORS no configurado")
            return False
        
        # Verificar endpoints
        endpoints = [
            '/api/v1/health',
            '/api/v1/sensors',
            '/api/v1/sensors/<int:sensor_id>/historical',
            '/api/v1/sensors/<int:sensor_id>/predict',
            '/api/v1/sensors/<int:sensor_id>/stats',
            '/api/v1/system/overview'
        ]
        
        for endpoint in endpoints:
            if endpoint.replace('<int:sensor_id>', '{sensor_id}') in app_content:
                print(f"✅ Endpoint {endpoint} configurado")
            else:
                print(f"❌ Endpoint {endpoint} no encontrado")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error verificando configuración: {e}")
        return False

def check_integration_scripts():
    """Verifica los scripts de integración"""
    print("\n🔍 Verificando scripts de integración...")
    
    # Verificar script de inicio
    start_script = Path('start-all-services.bat')
    if start_script.exists():
        content = start_script.read_text()
        if 'predictions-service' in content and '3001' in content:
            print("✅ Script de inicio Windows configurado")
        else:
            print("❌ Script de inicio Windows mal configurado")
            return False
    else:
        print("❌ Script de inicio Windows no encontrado")
        return False
    
    # Verificar Docker Compose
    docker_compose = Path('docker-compose.yml')
    if docker_compose.exists():
        content = docker_compose.read_text()
        if 'predictions:' in content and '3001:3001' in content:
            print("✅ Docker Compose configurado")
        else:
            print("❌ Docker Compose mal configurado")
            return False
    else:
        print("❌ Docker Compose no encontrado")
        return False
    
    return True

def check_frontend_integration():
    """Verifica la integración con frontend"""
    print("\n🔍 Verificando integración con frontend...")
    
    # Verificar ejemplo de integración
    frontend_example = Path('frontend-integration-example.js')
    if frontend_example.exists():
        content = frontend_example.read_text()
        if 'http://localhost:3001/api/v1' in content:
            print("✅ Ejemplo de integración frontend configurado")
        else:
            print("❌ Ejemplo de integración frontend mal configurado")
            return False
    else:
        print("❌ Ejemplo de integración frontend no encontrado")
        return False
    
    return True

def check_documentation():
    """Verifica la documentación"""
    print("\n🔍 Verificando documentación...")
    
    docs = [
        'INTEGRATION.md',
        'MICROSERVICES_SUMMARY.md',
        'microservices/predictions-service/README.md'
    ]
    
    for doc in docs:
        if Path(doc).exists():
            print(f"✅ {doc} presente")
        else:
            print(f"❌ {doc} faltante")
            return False
    
    return True

def generate_integration_summary():
    """Genera un resumen de la integración"""
    print("\n📊 RESUMEN DE INTEGRACIÓN")
    print("=" * 50)
    
    print("✅ El microservicio está configurado para funcionar con:")
    print("   - Backend Node.js (Puerto 3000)")
    print("   - Frontend Vite (Puerto 5173)")
    print("   - Base de datos PostgreSQL compartida")
    
    print("\n🔗 Integración implementada:")
    print("   - CORS configurado para comunicación entre servicios")
    print("   - Mismas variables de entorno que el proyecto principal")
    print("   - APIs REST completas para consumo desde frontend")
    print("   - Scripts de inicio automático")
    print("   - Docker Compose para despliegue")
    
    print("\n🌐 URLs de servicios:")
    print("   - Frontend: http://localhost:5173")
    print("   - Backend: http://localhost:3000")
    print("   - Predictions: http://localhost:3001")
    
    print("\n💡 Cómo usar desde el frontend:")
    print("   fetch('http://localhost:3001/api/v1/sensors')")
    print("   fetch('http://localhost:3001/api/v1/sensors/1/predict', {")
    print("     method: 'POST',")
    print("     headers: {'Content-Type': 'application/json'},")
    print("     body: JSON.stringify({method: 'moving_average', window: 10})")
    print("   })")
    
    print("\n🚀 Para iniciar todos los servicios:")
    print("   Windows: start-all-services.bat")
    print("   Linux/macOS: ./start-all-services.sh")
    print("   Docker: docker-compose up -d")
    
    print("\n🔍 Para verificar funcionamiento:")
    print("   python verify-services.py")
    print("   python test-integration.py")

def main():
    """Función principal de verificación"""
    print("🧪 VERIFICACIÓN DE INTEGRACIÓN DEL MICROSERVICIO")
    print("=" * 60)
    print("Verificando que el microservicio esté configurado para funcionar")
    print("con frontend y backend...")
    print()
    
    tests = [
        ("Estructura de archivos", check_file_structure),
        ("Configuración del microservicio", check_microservice_config),
        ("Scripts de integración", check_integration_scripts),
        ("Integración con frontend", check_frontend_integration),
        ("Documentación", check_documentation)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
        except Exception as e:
            print(f"❌ Error en {test_name}: {e}")
            results[test_name] = False
    
    # Resumen de resultados
    print("\n" + "=" * 60)
    print("📊 RESULTADOS DE VERIFICACIÓN")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ EXITOSO" if result else "❌ FALLÓ"
        print(f"{test_name:.<30} {status}")
        if result:
            passed += 1
    
    print(f"\nResultado: {passed}/{total} verificaciones pasaron")
    
    if passed == total:
        print("\n🎉 ¡INTEGRACIÓN COMPLETAMENTE CONFIGURADA!")
        generate_integration_summary()
    else:
        print("\n⚠️  Algunas verificaciones fallaron. Revisa la configuración.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
