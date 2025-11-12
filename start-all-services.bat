@echo off
REM Script para iniciar todos los servicios de UrbanFlow Platform
REM Incluye: Backend Node.js, Frontend Vite, Analytics Service, Predictions Service

echo 🚀 Iniciando UrbanFlow Platform - Todos los Servicios
echo =====================================================

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado. Por favor instala Node.js 20 LTS
    pause
    exit /b 1
)

REM Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python no está instalado. Por favor instala Python 3.11+
    pause
    exit /b 1
)

REM Verificar archivo .env
if not exist ".env" (
    echo ❌ Archivo .env no encontrado. Por favor crea el archivo .env con la configuración de la base de datos
    pause
    exit /b 1
)

echo ✅ Prerrequisitos verificados

REM Instalar dependencias del backend
echo 📦 Instalando dependencias del backend...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del backend
    pause
    exit /b 1
)

REM Instalar dependencias del frontend
echo 📦 Instalando dependencias del frontend...
call npm --prefix "views" install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del frontend
    pause
    exit /b 1
)

REM Instalar dependencias del microservicio de analytics
echo 📦 Instalando dependencias del microservicio de analytics...
cd microservices\analytics
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del microservicio de analytics
    pause
    exit /b 1
)
cd ..\..

REM Instalar dependencias del microservicio de predicciones
echo 📦 Instalando dependencias del microservicio de predicciones...
cd microservices\predictions-service
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del microservicio de predicciones
    pause
    exit /b 1
)
cd ..\..

echo ✅ Todas las dependencias instaladas

REM Crear archivos .env para microservicios si no existen
if not exist "microservices\analytics\.env" (
    echo 📝 Creando .env para analytics...
    (
        echo ANALYTICS_DATABASE_URL=postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/urbanflow_db
    ) > microservices\analytics\.env
)

if not exist "microservices\predictions-service\.env" (
    echo 📝 Creando .env para predictions...
    (
        echo DB_HOST=127.0.0.1
        echo DB_PORT=5432
        echo DB_NAME=urbanflow_db
        echo DB_USER=postgres
        echo DB_PASSWORD=postgres
        echo PORT=3001
    ) > microservices\predictions-service\.env
)

echo 🚀 Iniciando todos los servicios...
echo.
echo 📍 Backend Node.js: http://localhost:3000
echo 📍 Frontend Vite: http://localhost:5173
echo 📍 Analytics Service: http://localhost:8080
echo 📍 Predictions Service: http://localhost:3001
echo.
echo Para detener todos los servicios, presiona Ctrl+C
echo.

REM Iniciar servicios en ventanas separadas
start "UrbanFlow Backend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

start "UrbanFlow Frontend" cmd /k "npm --prefix views run dev"
timeout /t 3 /nobreak >nul

start "UrbanFlow Analytics" cmd /k "cd microservices\analytics && python -m uvicorn app.main:app --reload --port 8080"
timeout /t 3 /nobreak >nul

start "UrbanFlow Predictions" cmd /k "cd microservices\predictions-service && python app.py"

echo ✅ Todos los servicios iniciados
echo.
echo 🌐 Accede a la aplicación en: http://localhost:5173
echo 📊 Analytics API: http://localhost:8080
echo 🔮 Predictions API: http://localhost:3001
echo.
pause
