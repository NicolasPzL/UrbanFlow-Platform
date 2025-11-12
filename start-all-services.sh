#!/bin/bash

# Script para iniciar todos los servicios de UrbanFlow Platform
# Incluye: Backend Node.js, Frontend Vite, Analytics Service, Predictions Service

echo "🚀 Iniciando UrbanFlow Platform - Todos los Servicios"
echo "====================================================="

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 20 LTS"
    exit 1
fi

# Verificar si Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 no está instalado. Por favor instala Python 3.11+"
    exit 1
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado. Por favor crea el archivo .env con la configuración de la base de datos"
    exit 1
fi

echo "✅ Prerrequisitos verificados"

# Instalar dependencias del backend
echo "📦 Instalando dependencias del backend..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del backend"
    exit 1
fi

# Instalar dependencias del frontend
echo "📦 Instalando dependencias del frontend..."
npm --prefix "views" install
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del frontend"
    exit 1
fi

# Instalar dependencias del microservicio de analytics
echo "📦 Instalando dependencias del microservicio de analytics..."
cd microservices/analytics
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del microservicio de analytics"
    exit 1
fi
cd ../..

# Instalar dependencias del microservicio de predicciones
echo "📦 Instalando dependencias del microservicio de predicciones..."
cd microservices/predictions-service
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del microservicio de predicciones"
    exit 1
fi
cd ../..

echo "✅ Todas las dependencias instaladas"

# Crear archivos .env para microservicios si no existen
if [ ! -f "microservices/analytics/.env" ]; then
    echo "📝 Creando .env para analytics..."
    echo "ANALYTICS_DATABASE_URL=postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/urbanflow_db" > microservices/analytics/.env
fi

if [ ! -f "microservices/predictions-service/.env" ]; then
    echo "📝 Creando .env para predictions..."
    cat > microservices/predictions-service/.env << EOF
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=urbanflow_db
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
EOF
fi

echo "🚀 Iniciando todos los servicios..."
echo ""
echo "📍 Backend Node.js: http://localhost:3000"
echo "📍 Frontend Vite: http://localhost:5173"
echo "📍 Analytics Service: http://localhost:8080"
echo "📍 Predictions Service: http://localhost:3001"
echo ""
echo "Para detener todos los servicios, presiona Ctrl+C"
echo ""

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo todos los servicios..."
    kill $BACKEND_PID $FRONTEND_PID $ANALYTICS_PID $PREDICTIONS_PID 2>/dev/null
    exit 0
}

# Configurar trap para limpiar procesos
trap cleanup SIGINT SIGTERM

# Iniciar servicios en segundo plano
echo "🚀 Iniciando Backend Node.js..."
npm run dev &
BACKEND_PID=$!

sleep 3

echo "🚀 Iniciando Frontend Vite..."
npm --prefix "views" run dev &
FRONTEND_PID=$!

sleep 3

echo "🚀 Iniciando Analytics Service..."
cd microservices/analytics
python3 -m uvicorn app.main:app --reload --port 8080 &
ANALYTICS_PID=$!
cd ../..

sleep 3

echo "🚀 Iniciando Predictions Service..."
cd microservices/predictions-service
python3 app.py &
PREDICTIONS_PID=$!
cd ../..

echo "✅ Todos los servicios iniciados"
echo ""
echo "🌐 Accede a la aplicación en: http://localhost:5173"
echo "📊 Analytics API: http://localhost:8080"
echo "🔮 Predictions API: http://localhost:3001"
echo ""

# Esperar a que el usuario presione Ctrl+C
wait
