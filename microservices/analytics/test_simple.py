#!/usr/bin/env python3
"""
Script simple para probar el microservicio
"""
import sys
import os

# Agregar el directorio del proyecto al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("Probando importación del microservicio...")
    from app.main import app
    print("OK - Importacion exitosa")
    
    print("Probando configuracion...")
    from app.core.config import settings
    print(f"OK - Base de datos: {settings.DATABASE_URL}")
    
    print("Probando conexion a base de datos...")
    from app.db.session import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("OK - Conexion a base de datos exitosa")
    
    print("Probando procesador de telemetria...")
    from app.services.telemetry_processor_simple import TelemetryProcessorSimple
    print("OK - Procesador de telemetria importado correctamente")
    
    print("\nTodas las pruebas pasaron. El microservicio esta listo.")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
