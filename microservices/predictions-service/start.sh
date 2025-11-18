#!/bin/bash

# Script de inicio para el microservicio de predicciones
# Urban Flow Platform

echo "🚀 Iniciando Urban Flow Predictions Service..."

# Verificar si Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 no está instalado. Por favor instala Python 3.11+"
    exit 1
fi

# Verificar si pip está instalado
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 no está instalado. Por favor instala pip"
    exit 1
fi

# Crear directorio de trabajo
cd "$(dirname "$0")"

# Verificar si existe requirements.txt
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt no encontrado"
    exit 1
fi

# Instalar dependencias si es necesario
echo "📦 Verificando dependencias..."
pip3 install -r requirements.txt

# Verificar variables de entorno
echo "🔧 Verificando configuración..."

# Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urbanflow
DB_USER=postgres
DB_PASSWORD=your_password

# Service Configuration
PORT=3001
NODE_ENV=development

# Prediction Settings
PREDICTION_WINDOW_HOURS=24
ANOMALY_THRESHOLD_RMS=1.5
ANOMALY_THRESHOLD_KURTOSIS=4.0
ANOMALY_THRESHOLD_SKEWNESS=2.0

# API Configuration
API_VERSION=v1
CORS_ORIGIN=http://localhost:3000
EOF
    echo "⚠️  Archivo .env creado. Por favor configura las variables de entorno."
fi

# Verificar conexión a base de datos
echo "🔍 Verificando conexión a base de datos..."
python3 -c "
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'urbanflow'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '')
    )
    conn.close()
    print('✅ Conexión a base de datos exitosa')
except Exception as e:
    print(f'❌ Error conectando a base de datos: {e}')
    print('Por favor verifica la configuración en .env')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ No se pudo conectar a la base de datos. Verifica la configuración."
    exit 1
fi

# Iniciar el servicio
echo "🚀 Iniciando servicio de predicciones..."
echo "📍 URL: http://localhost:3001"
echo "📚 API Docs: http://localhost:3001/api/v1/health"
echo ""
echo "Para detener el servicio, presiona Ctrl+C"
echo ""

# Ejecutar la aplicación
python3 app.py
