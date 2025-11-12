#!/usr/bin/env python3
"""
Script para generar datos de ejemplo en la base de datos
Esto ayudará a que los KPIs muestren valores realistas en lugar de 0
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_db
from app.db import models as m
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import numpy as np

def generate_sample_data(db: Session):
    """Genera datos de ejemplo para el sistema"""
    
    print("Generando datos de ejemplo...")
    
    # 1. Crear cabinas de ejemplo
    cabinas_data = [
        {"cabina_id": 1, "codigo_interno": "CB001", "estado_actual": "operativa"},
        {"cabina_id": 2, "codigo_interno": "CB002", "estado_actual": "operativa"},
        {"cabina_id": 3, "codigo_interno": "CB003", "estado_actual": "mantenimiento"},
        {"cabina_id": 4, "codigo_interno": "CB004", "estado_actual": "operativa"},
        {"cabina_id": 5, "codigo_interno": "CB005", "estado_actual": "operativa"},
    ]
    
    for cabina_data in cabinas_data:
        existing = db.query(m.Cabina).filter(m.Cabina.cabina_id == cabina_data["cabina_id"]).first()
        if not existing:
            cabina = m.Cabina(**cabina_data)
            db.add(cabina)
    
    # 2. Crear sensores para las cabinas
    sensores_data = [
        {"sensor_id": 101, "cabina_id": 1, "modelo": "VIB-001", "version_firmware": "1.2.3"},
        {"sensor_id": 102, "cabina_id": 2, "modelo": "VIB-001", "version_firmware": "1.2.3"},
        {"sensor_id": 103, "cabina_id": 3, "modelo": "VIB-001", "version_firmware": "1.2.3"},
        {"sensor_id": 104, "cabina_id": 4, "modelo": "VIB-001", "version_firmware": "1.2.3"},
        {"sensor_id": 105, "cabina_id": 5, "modelo": "VIB-001", "version_firmware": "1.2.3"},
    ]
    
    for sensor_data in sensores_data:
        existing = db.query(m.Sensor).filter(m.Sensor.sensor_id == sensor_data["sensor_id"]).first()
        if not existing:
            sensor = m.Sensor(**sensor_data)
            db.add(sensor)
    
    db.commit()
    
    # 3. Generar mediciones de ejemplo
    print("Generando mediciones de ejemplo...")
    
    sensor_ids = [101, 102, 103, 104, 105]
    base_time = datetime.utcnow() - timedelta(days=7)
    
    for i in range(1000):  # Generar 1000 mediciones
        sensor_id = random.choice(sensor_ids)
        timestamp = base_time + timedelta(minutes=i * 5)  # Cada 5 minutos
        
        # Simular datos realistas de vibración
        velocidad_base = random.uniform(5, 25)  # km/h
        velocidad_ms = velocidad_base / 3.6
        
        # Calcular métricas basadas en velocidad
        rms = 0.3 + (velocidad_ms * 0.02) + random.normalvariate(0, 0.05)
        kurtosis = 3.0 + (velocidad_ms * 0.1) + random.normalvariate(0, 0.3)
        skewness = 0.05 + (velocidad_ms * 0.01) + random.normalvariate(0, 0.05)
        zcr = 0.4 + (velocidad_ms * 0.05) + random.normalvariate(0, 0.05)
        pico = rms * (1.8 + random.normalvariate(0, 0.2))
        crest_factor = pico / rms if rms > 0 else 3.0
        
        # Métricas espectrales
        frecuencia_media = 20.0 + (velocidad_ms * 1.0) + random.normalvariate(0, 2.0)
        frecuencia_dominante = frecuencia_media + random.normalvariate(0, 2)
        amplitud_max_espectral = 1.2 + (velocidad_ms * 0.1) + random.normalvariate(0, 0.2)
        
        # Energías de banda
        energia_banda_1 = 0.5 + (velocidad_ms * 0.05) - 0.1 + random.normalvariate(0, 0.1)
        energia_banda_2 = 0.5 + (velocidad_ms * 0.05) - 0.2 + random.normalvariate(0, 0.1)
        energia_banda_3 = 0.5 + (velocidad_ms * 0.05) - 0.3 + random.normalvariate(0, 0.1)
        
        # Determinar estado operativo
        if velocidad_base < 1:
            estado_procesado = "parado"
        elif velocidad_base < 5:
            estado_procesado = "zona_lenta"
        elif velocidad_base < 15:
            estado_procesado = "inicio"
        elif velocidad_base < 25:
            estado_procesado = "crucero"
        else:
            estado_procesado = "frenado"
        
        # Coordenadas simuladas
        latitud = 40.4168 + random.normalvariate(0, 0.01)
        longitud = -3.7038 + random.normalvariate(0, 0.01)
        altitud = 600 + random.normalvariate(0, 10)
        
        medicion = m.Medicion(
            sensor_id=sensor_id,
            timestamp=timestamp,
            latitud=latitud,
            longitud=longitud,
            altitud=altitud,
            velocidad=velocidad_ms,
            rms=max(0.1, rms),
            kurtosis=max(2.0, kurtosis),
            skewness=skewness,
            zcr=max(0.1, zcr),
            pico=max(0.1, pico),
            crest_factor=max(1.0, crest_factor),
            frecuencia_media=max(5.0, frecuencia_media),
            frecuencia_dominante=max(5.0, frecuencia_dominante),
            amplitud_max_espectral=max(0.2, amplitud_max_espectral),
            energia_banda_1=max(0.1, energia_banda_1),
            energia_banda_2=max(0.1, energia_banda_2),
            energia_banda_3=max(0.1, energia_banda_3),
            estado_procesado=estado_procesado
        )
        
        db.add(medicion)
        
        # Cada 100 mediciones, hacer commit
        if i % 100 == 0:
            db.commit()
            print(f"Generadas {i+1} mediciones...")
    
    db.commit()
    
    # 4. Generar algunas predicciones de ejemplo
    print("Generando predicciones de ejemplo...")
    
    # Crear modelo ML de ejemplo
    modelo = m.ModeloML(
        nombre="Modelo Vibración v1.0",
        version="1.0.0",
        framework="scikit-learn",
        fecha_entrenamiento=datetime.utcnow().date(),
        descripcion="Modelo de clasificación de estados operativos"
    )
    db.add(modelo)
    db.commit()
    
    # Obtener algunas mediciones para generar predicciones
    mediciones = db.query(m.Medicion).limit(50).all()
    
    for medicion in mediciones:
        # Simular predicción basada en el estado procesado
        if medicion.estado_procesado in ["parado", "zona_lenta"]:
            clase_predicha = "normal"
        elif medicion.estado_procesado == "crucero":
            clase_predicha = "normal"
        elif medicion.estado_procesado == "frenado":
            clase_predicha = "inusual"
        else:
            clase_predicha = "normal"
        
        prediccion = m.Prediccion(
            medicion_id=medicion.medicion_id,
            modelo_id=modelo.modelo_id,
            clase_predicha=clase_predicha,
            probabilidades={
                "normal": 0.8 if clase_predicha == "normal" else 0.2,
                "inusual": 0.15 if clase_predicha == "inusual" else 0.1,
                "alerta": 0.05
            },
            timestamp_prediccion=medicion.timestamp + timedelta(seconds=30)
        )
        
        db.add(prediccion)
    
    db.commit()
    
    print("¡Datos de ejemplo generados exitosamente!")
    print(f"- {len(cabinas_data)} cabinas creadas")
    print(f"- {len(sensores_data)} sensores creados")
    print("- 1000 mediciones generadas")
    print("- 50 predicciones generadas")
    print("- 1 modelo ML creado")

if __name__ == "__main__":
    db = next(get_db())
    try:
        generate_sample_data(db)
    except Exception as e:
        print(f"Error generando datos: {e}")
        db.rollback()
    finally:
        db.close()



