#!/usr/bin/env python3
"""
Script para debuggear los datos de telemetría
"""
import sys
import os

# Agregar el directorio del proyecto al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.db.session import get_db
    from sqlalchemy import text
    
    print("Conectando a la base de datos...")
    db = next(get_db())
    
    # Contar registros en telemetria_cruda
    print("\n=== TELEMETRIA_CRUDA ===")
    query = text("SELECT COUNT(*) as total FROM telemetria_cruda")
    result = db.execute(query).fetchone()
    print(f"Total registros en telemetria_cruda: {result.total}")
    
    # Contar registros en mediciones
    print("\n=== MEDICIONES ===")
    query = text("SELECT COUNT(*) as total FROM mediciones")
    result = db.execute(query).fetchone()
    print(f"Total registros en mediciones: {result.total}")
    
    # Obtener último timestamp en mediciones
    query = text("SELECT MAX(timestamp) as last_timestamp FROM mediciones")
    result = db.execute(query).fetchone()
    print(f"Último timestamp en mediciones: {result.last_timestamp}")
    
    # Obtener algunos registros de telemetria_cruda
    print("\n=== MUESTRA DE TELEMETRIA_CRUDA ===")
    query = text("SELECT telemetria_id, sensor_id, timestamp, velocidad_kmh FROM telemetria_cruda ORDER BY timestamp ASC LIMIT 5")
    result = db.execute(query).fetchall()
    
    for row in result:
        print(f"ID: {row.telemetria_id}, Sensor: {row.sensor_id}, Timestamp: {row.timestamp}, Velocidad: {row.velocidad_kmh} km/h")
    
    # Verificar si hay datos para procesar
    print("\n=== VERIFICACION DE PROCESAMIENTO ===")
    if result.total == 0:
        print("No hay datos en telemetria_cruda para procesar")
    else:
        print(f"Hay {result.total} registros en telemetria_cruda")
        
        # Verificar si ya se procesaron
        mediciones_count = db.execute(text("SELECT COUNT(*) as total FROM mediciones")).fetchone().total
        if mediciones_count == 0:
            print("No hay mediciones procesadas. Se pueden procesar todos los datos.")
        else:
            print(f"Ya hay {mediciones_count} mediciones. Solo se procesarán datos nuevos.")
    
    print("\nDebug completado.")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
