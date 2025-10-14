# UrbanFlow Analytics Microservice

Microservicio en FastAPI para analítica y predicción sobre la BD de UrbanFlow.

## Estructura
- `app/main.py`: FastAPI app y rutas
- `app/api/routes.py`: endpoints `/api/*`
- `app/core/config.py`: configuración (DATABASE_URL)
- `app/db/session.py`: SQLAlchemy engine/session
- `app/db/models.py`: modelos (sensores, mediciones, modelos_ml, predicciones)
- `app/services/analytics.py`: lógicas de agregación
- `app/services/ml.py`: pipeline simple de inferencia (placeholder)

## Variables de entorno
- `ANALYTICS_DATABASE_URL` (opcional). Por defecto usa `postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/urbanflow_db`.

## Correr local
```bash
cd microservices/analytics
python -m venv .venv && . .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Endpoints
- `GET /health`
- `GET /api/analytics/summary`  -> totales, última predicción, distribución por clase
- `POST /api/predictions/run?medicion_id=...&model_id=...` -> corre inferencia dummy y persiste en `predicciones`

## Docker
```bash
cd microservices/analytics
docker build -t urbanflow-analytics:dev .
docker run --rm -e ANALYTICS_DATABASE_URL="postgresql+psycopg2://postgres:postgres@host.docker.internal:5432/urbanflow_db" -p 8080:8080 urbanflow-analytics:dev
```
