# Tutorial de Instalación del Chatbot UrbanFlow

Este tutorial te guiará paso a paso para instalar y ejecutar el chatbot de UrbanFlow en tu entorno local.

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación de Ollama](#instalación-de-ollama)
3. [Configuración de la Base de Datos](#configuración-de-la-base-de-datos)
4. [Configuración del Entorno](#configuración-del-entorno)
5. [Instalación de Dependencias](#instalación-de-dependencias)
6. [Ejecución de los Servicios](#ejecución-de-los-servicios)
7. [Probar el Chatbot](#probar-el-chatbot)
8. [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión >= 18.18.0) - [Descargar Node.js](https://nodejs.org/)
- **Python** (versión 3.8 o superior) - [Descargar Python](https://www.python.org/downloads/)
- **PostgreSQL** (versión 12 o superior) - [Descargar PostgreSQL](https://www.postgresql.org/download/)
- **Git** - [Descargar Git](https://git-scm.com/downloads)

### Verificar Instalaciones

```bash
# Verificar Node.js
node --version

# Verificar Python
python --version

# Verificar PostgreSQL
psql --version

# Verificar Git
git --version
```

---

## 🤖 Instalación de Ollama

El chatbot utiliza Ollama con el modelo Llama 3 para procesar las consultas en lenguaje natural.

### Paso 1: Descargar Ollama

1. Ve a la página oficial de Ollama: **https://ollama.ai/download**
2. Descarga el instalador para tu sistema operativo:
   - **Windows**: Ejecuta el instalador `.exe`
   - **macOS**: Ejecuta el instalador `.dmg`
   - **Linux**: Sigue las instrucciones en la página

### Paso 2: Instalar Ollama

**Windows:**
- Ejecuta el archivo `OllamaSetup.exe` descargado
- Sigue el asistente de instalación
- Ollama se instalará y ejecutará automáticamente

**macOS:**
- Abre el archivo `.dmg` descargado
- Arrastra Ollama a la carpeta Aplicaciones
- Ejecuta Ollama desde Aplicaciones

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Paso 3: Verificar Instalación

Abre una terminal o PowerShell y ejecuta:

```bash
ollama --version
```

Deberías ver la versión de Ollama instalada.

### Paso 4: Descargar el Modelo Llama 3

Ejecuta el siguiente comando para descargar el modelo:

```bash
ollama pull llama3
```

Este proceso puede tardar varios minutos dependiendo de tu conexión a internet. El modelo tiene aproximadamente 4.7 GB.

### Paso 5: Verificar que Ollama está Corriendo

Abre tu navegador y ve a: **http://localhost:11434**

Si ves información sobre Ollama, está funcionando correctamente.

También puedes verificar con:

```bash
ollama list
```

Deberías ver `llama3` en la lista de modelos descargados.

---

## 🗄️ Configuración de la Base de Datos

### Paso 1: Crear la Base de Datos

Abre PostgreSQL (pgAdmin, psql, o tu cliente preferido) y crea la base de datos:

```sql
CREATE DATABASE Urbanflow_db;
```

### Paso 2: Verificar Conexión

Asegúrate de que PostgreSQL esté corriendo y puedas conectarte con tus credenciales.

---

## ⚙️ Configuración del Entorno

### Paso 1: Crear el Archivo .env

En la raíz del proyecto, crea un archivo llamado `.env` (si no existe) con el siguiente contenido:

```env
# Configuración de Base de Datos
DB_USER=postgres
DB_PASSWORD=tu_contraseña_postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Urbanflow_db

# Configuración del Chatbot (Ollama)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=llama3

# Configuración del Servicio Analytics
DEBUG=false
LOG_LEVEL=INFO

# Configuración del Chatbot
CHATBOT_MAX_CONTEXT_MESSAGES=10
CHATBOT_SQL_ROW_LIMIT=100
CHATBOT_ENABLE_ML_ANALYSIS=true
```

**⚠️ Importante:** 
- Reemplaza `tu_contraseña_postgres` con tu contraseña real de PostgreSQL
- Si tu base de datos tiene otro nombre o usuario, actualiza esos valores

---

## 📦 Instalación de Dependencias

### Paso 1: Instalar Dependencias de Node.js

Desde la raíz del proyecto:

```bash
npm install
```

### Paso 2: Crear y Activar Entorno Virtual de Python

**Windows (PowerShell):**
```powershell
cd microservices/analytics
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
cd microservices\analytics
python -m venv venv
venv\Scripts\activate.bat
```

**macOS/Linux:**
```bash
cd microservices/analytics
python3 -m venv venv
source venv/bin/activate
```

### Paso 3: Instalar Dependencias de Python

Con el entorno virtual activado:

```bash
pip install -r requirements.txt
```

Este proceso puede tardar varios minutos.

### Paso 4: Instalar Dependencias del Frontend

Desde la raíz del proyecto:

```bash
npm --prefix "views" run build
```

---

## 🚀 Ejecución de los Servicios

###  Ejecutar Todo 

#### Terminal 1(raiz del proyecto):
```bash
npm run dev
```

#### Terminal 2:
**Windows:**
```powershell
cd microservices/analytics
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8001
```

**macOS/Linux:**
```bash
cd microservices/analytics
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8001
```

### Paso 1: Asegúrate de que Ollama esté Corriendo

Antes de ejecutar los servicios, asegúrate de que Ollama esté activo:

```bash
# Verificar que Ollama está corriendo
curl http://localhost:11434/api/version
```

O simplemente abre tu navegador en: http://localhost:11434

### Paso 2: Verificar que Todos los Servicios Estén Corriendo

Abre tu navegador y verifica los siguientes endpoints:

- **Backend Node.js**: http://localhost:3000/health
- **Servicio Analytics**: http://localhost:8001/health

---

## 💬 Probar el Chatbot

### Paso 1: Acceder a la Aplicación

1. Abre tu navegador en: **http://localhost:3000**

### Paso 2: Iniciar Sesión

1. Haz clic en **"Iniciar Sesión"**
2. Ingresa tus credenciales (debes tener un usuario creado en la base de datos)


### Paso 3: Abrir el Chatbot

1. En el **Navbar** (barra superior), verás el botón **"Asistente IA"** al lado del botón "Cerrar Sesión"
2. Haz clic en **"Asistente IA"**
3. Se abrirá una ventana del chatbot en la esquina inferior derecha

### Paso 4: Hacer Preguntas de Prueba

Puedes probar con estas preguntas:

- **Preguntas informativas:**
  - "¿Qué hace UrbanFlow?"
  - "¿Cómo funciona el sistema?"

- **Consultas de datos:**
  - "¿Cuántas cabinas están operativas?"
  - "Muéstrame las mediciones recientes del sensor 1"
  - "¿Cuál es el valor promedio de RMS hoy?"

- **Análisis:**
  - "¿Cuáles sensores tienen los niveles de vibración más altos?"
  - "Genera un reporte de salud del sistema"

- **Reportes:**
  - "Dame un reporte completo del sistema"

---

## 🔍 Verificación de Estado

### Verificar Estado de Ollama

```bash
# Ver modelos instalados
ollama list

# Verificar que Ollama está corriendo
curl http://localhost:11434/api/version

# Probar el modelo directamente
ollama run llama3 "Hola, ¿cómo estás?"
```

### Verificar Estado del Servicio Analytics

Abre: **http://localhost:8001/health**

Deberías ver algo como:
```json
{
  "status": "healthy",
  "service": "UrbanFlow Analytics Service",
  "version": "1.0.0",
  "chatbot": {
    "initialized": true,
    "provider": "ollama",
    "model": "llama3"
  }
}
```

### Verificar Estado del Backend

Abre: **http://localhost:3000/health**

---

## 🛠️ Solución de Problemas

### Problema: "Ollama no se reconoce como comando"

**Solución:**
- Asegúrate de haber instalado Ollama correctamente
- Reinicia tu terminal después de la instalación
- En Windows, es posible que necesites agregar Ollama al PATH manualmente
- Verifica que Ollama esté corriendo: abre el navegador en http://localhost:11434

### Problema: "Modelo llama3 no encontrado"

**Solución:**
```bash
# Descargar el modelo
ollama pull llama3

# Verificar que se descargó
ollama list
```

### Problema: "Error: No module named 'langchain'"

**Solución:**
```bash
cd microservices/analytics
# Asegúrate de tener el entorno virtual activado
.\venv\Scripts\Activate.ps1  # Windows
# o
source venv/bin/activate  # macOS/Linux

# Reinstalar dependencias
pip install -r requirements.txt
```

### Problema: "Error de conexión a la base de datos"

**Solución:**
1. Verifica que PostgreSQL esté corriendo
2. Verifica las credenciales en el archivo `.env`
3. Verifica que la base de datos `Urbanflow_db` exista:
   ```sql
   SELECT datname FROM pg_database WHERE datname = 'Urbanflow_db';
   ```

### Problema: "Error: OPENAI_API_KEY not found"

**Solución:**
Este error no debería aparecer si estás usando Ollama. Asegúrate de que en tu `.env` tengas:
```env
LLM_PROVIDER=ollama
```

### Problema: "El chatbot no responde o da errores"

**Solución:**
1. Verifica que Ollama esté corriendo: http://localhost:11434
2. Verifica los logs del servicio Analytics (terminal donde está corriendo uvicorn)
3. Verifica los logs del backend Node.js
4. Revisa la consola del navegador (F12) para ver errores del frontend

### Problema: "El botón 'Asistente IA' no aparece"

**Solución:**
1. Asegúrate de estar autenticado (haz clic en "Iniciar Sesión")
2. Verifica que el frontend se haya recargado después de los cambios
3. Revisa la consola del navegador para ver si hay errores de JavaScript

### Problema: "Error: UPSTREAM_ERROR"

**Solución:**
1. Verifica que el servicio Analytics esté corriendo en el puerto 8001
2. Verifica la configuración en `app.js`: `ANALYTICS_BASE_URL=http://localhost:8001/api`
3. Verifica que no haya un firewall bloqueando la conexión

### Problema: "El chatbot dice que no tiene información"

**Solución:**
1. Verifica que la base de datos tenga datos (tablas `mediciones`, `sensores`, `cabinas`, etc.)
2. Si la base de datos está vacía, el chatbot puede no tener información para consultar
3. Verifica los logs del servicio Analytics para ver errores específicos

---

## 📝 Comandos Útiles

### Detener Todos los Servicios

Presiona `Ctrl + C` en cada terminal donde estén corriendo los servicios.

### Ver Logs del Servicio Analytics

Los logs aparecen en la terminal donde ejecutaste uvicorn. Busca mensajes como:
- `"Initializing LLM with provider: ollama"`
- `"Connecting to Ollama at: http://localhost:11434"`
- `"Ollama client initialized successfully"`

### Reiniciar Ollama

Si necesitas reiniciar Ollama:

**Windows:**
- Cierra la aplicación Ollama desde la bandeja del sistema
- Vuelve a abrirla desde el menú de inicio

**macOS/Linux:**
```bash
# Detener
pkill ollama

# Iniciar (se inicia automáticamente al usar ollama pull/run)
ollama serve
```

---

## 🎯 Próximos Pasos

Una vez que tengas todo funcionando:

1. **Explora las capacidades del chatbot:**
   - Haz preguntas sobre el sistema
   - Consulta datos específicos de sensores y cabinas
   - Genera reportes de salud del sistema

2. **Personaliza el chatbot:**
   - Edita los prompts en `microservices/analytics/app/core/prompts.py`
   - Ajusta las configuraciones en el archivo `.env`

3. **Contribuye:**
   - Reporta bugs o sugiere mejoras
   - Mejora la documentación
   - Agrega nuevas funcionalidades

---

## 📚 Recursos Adicionales

- **Documentación de Ollama**: https://ollama.ai/docs
- **Modelo Llama 3**: https://ollama.ai/library/llama3
- **LangChain Documentation**: https://python.langchain.com/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/

---

## ❓ Preguntas Frecuentes

**P: ¿Necesito una conexión a internet para usar el chatbot?**
R: Solo necesitas internet para descargar Ollama y el modelo Llama 3. Una vez descargado, todo funciona localmente.

**P: ¿Puedo usar otro modelo de Ollama además de llama3?**
R: Sí, solo necesitas cambiar `MODEL_NAME` en el archivo `.env` y descargar el modelo con `ollama pull <nombre-modelo>`.

**P: ¿Cuánto espacio en disco necesito?**
R: El modelo Llama 3 ocupa aproximadamente 4.7 GB. Además, necesitas espacio para Python, Node.js y PostgreSQL.

**P: ¿El chatbot funciona sin base de datos?**
R: No, el chatbot necesita acceso a la base de datos PostgreSQL para consultar información del sistema.

---

## 📞 Soporte

Si encuentras problemas que no se resuelven con este tutorial:

1. Revisa los logs de todos los servicios
2. Verifica que todas las dependencias estén instaladas correctamente
3. Asegúrate de que todos los servicios estén corriendo en los puertos correctos
4. Contacta al equipo de desarrollo para soporte adicional

---

**¡Disfruta probando el chatbot de UrbanFlow! 🚀**

