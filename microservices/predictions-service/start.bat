@echo off
REM Script de inicio para el microservicio de predicciones
REM Urban Flow Platform

echo 🚀 Iniciando Urban Flow Predictions Service...

REM Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python no está instalado. Por favor instala Python 3.11+
    pause
    exit /b 1
)

REM Verificar si pip está instalado
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip no está instalado. Por favor instala pip
    pause
    exit /b 1
)

REM Cambiar al directorio del script
cd /d "%~dp0"

REM Verificar si existe requirements.txt
if not exist "requirements.txt" (
    echo ❌ requirements.txt no encontrado
    pause
    exit /b 1
)

REM Instalar dependencias si es necesario
echo 📦 Verificando dependencias...
pip install -r requirements.txt

REM Verificar variables de entorno
echo 🔧 Verificando configuración...

REM Crear archivo .env si no existe
if not exist ".env" (
    echo 📝 Creando archivo .env...
    (
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=urbanflow
        echo DB_USER=postgres
        echo DB_PASSWORD=your_password
        echo.
        echo # Service Configuration
        echo PORT=3001
        echo NODE_ENV=development
        echo.
        echo # Prediction Settings
        echo PREDICTION_WINDOW_HOURS=24
        echo ANOMALY_THRESHOLD_RMS=1.5
        echo ANOMALY_THRESHOLD_KURTOSIS=4.0
        echo ANOMALY_THRESHOLD_SKEWNESS=2.0
        echo.
        echo # API Configuration
        echo API_VERSION=v1
        echo CORS_ORIGIN=http://localhost:3000
    ) > .env
    echo ⚠️  Archivo .env creado. Por favor configura las variables de entorno.
)

REM Verificar conexión a base de datos
echo 🔍 Verificando conexión a base de datos...
python -c "import os; import psycopg2; from dotenv import load_dotenv; load_dotenv(); conn = psycopg2.connect(host=os.getenv('DB_HOST', 'localhost'), port=os.getenv('DB_PORT', '5432'), database=os.getenv('DB_NAME', 'urbanflow'), user=os.getenv('DB_USER', 'postgres'), password=os.getenv('DB_PASSWORD', '')); conn.close(); print('✅ Conexión a base de datos exitosa')" 2>nul
if %errorlevel% neq 0 (
    echo ❌ No se pudo conectar a la base de datos. Verifica la configuración.
    pause
    exit /b 1
)

REM Iniciar el servicio
echo 🚀 Iniciando servicio de predicciones...
echo 📍 URL: http://localhost:3001
echo 📚 API Docs: http://localhost:3001/api/v1/health
echo.
echo Para detener el servicio, presiona Ctrl+C
echo.

REM Ejecutar la aplicación
python app.py
