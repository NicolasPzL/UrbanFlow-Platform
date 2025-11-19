# UrbanFlow AI Chatbot - Implementation Guide

## Overview

The UrbanFlow AI Chatbot is an intelligent assistant that allows users to query and analyze cable car system data using natural language. It integrates with the existing analytics microservice and provides real-time insights, predictions, and reports.

## Architecture

### Backend Components

#### 1. Core Services

**`app/services/chatbot.py`** - Main orchestration service
- Handles natural language query processing
- Routes queries to appropriate handlers (data, analysis, prediction, report)
- Integrates exclusively with Llama 3 a través de Ollama
- Manages context and conversation flow

**`app/services/query_builder.py`** - SQL query generation and validation
- Converts natural language to SQL queries
- Validates queries for safety (prevents SQL injection)
- Adds row limits and optimizations
- Formats results for display

**`app/services/context_manager.py`** - Conversation state management
- Maintains conversation history per session
- Manages multiple concurrent sessions
- Provides context to LLM for better responses

**`app/services/intent_router.py`** - Intent routing y caché
- Detecta preguntas frecuentes usando embeddings (Ollama o fallback BoW)
- Entrega respuestas aprobadas o ejecuta SQL certificadas sin llamar al LLM
- Mantiene un caché LRU configurable para minimizar latencia

#### 2. Configuration Files

**`app/core/prompts.py`** - Specialized prompts for different query types
- `SQL_AGENT_PROMPT` - For database queries
- `ANALYSIS_PROMPT` - For analytical insights
- `REPORT_PROMPT` - For report generation
- `SYSTEM_CONTEXT` - Database schema and domain knowledge
- `EXAMPLE_QUERIES` - Few-shot learning examples

**`app/db/schema_info.py`** - Database metadata
- Table and column descriptions
- Relationships and constraints
- Sample data patterns
- Query optimization tips

**`app/core/config.py`** - Environment configuration
- LLM provider settings
- API keys
- Chatbot parameters

**`app/core/role_catalog.py`** - Catálogo estático de roles y permisos
- Describe roles aprobados sin consultar la tabla `usuarios`
- Facilita auditorías y respuestas controladas para preguntas sobre roles

**`app/data/faq_catalog.json`** - Catálogo de preguntas frecuentes
- Define intents aprobados por audiencia (ciudadano/staff)
- Usado por `intent_router.py` para respuestas guiadas sin LLM
#### 3. API Endpoints

```
POST /api/chatbot/query
    - Single query without conversation context
    - Body: { question: string, session_id?: string, include_ml_analysis?: bool }

POST /api/chatbot/conversation
    - Query with full conversation context
    - Body: { question: string, session_id: string }

GET /api/chatbot/capabilities
    - Returns chatbot capabilities and supported queries

POST /api/chatbot/session/new
    - Create a new conversation session

GET /api/chatbot/session/{session_id}
    - Get conversation history

DELETE /api/chatbot/session/{session_id}
    - Delete a conversation session
```

### Frontend Component

**`views/src/components/Chatbot.tsx`** - React component
- Chat interface with message history
- Real-time query processing
- Data table visualization
- SQL query inspection
- Suggested questions
- Minimize/maximize functionality

## Installation

### 1. Install Backend Dependencies

```bash
cd microservices/analytics
pip install -r requirements.txt
```

New dependencies added:
- `langchain>=0.1.0`
- `langchain-community>=0.0.20`

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=llama3
CHATBOT_INTENT_THRESHOLD=0.82         # Umbral de similitud para intents
CHATBOT_INTENT_CACHE_SIZE=128         # Tamaño del caché LRU de intents
CHATBOT_INTENT_EMBED_MODEL=nomic-embed-text  # Modelo de embeddings para intents
```

### 3. Instala Ollama (si aún no lo tienes)

- Descarga desde https://ollama.com/download
- Ejecuta `ollama pull llama3`
- Verifica con `curl http://localhost:11434/api/version`

### 4. Start the Analytics Service

```bash
cd microservices/analytics
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### 5. Frontend Integration

The Chatbot component is automatically integrated into the Dashboard. No additional configuration needed.

## Usage Examples

### Basic Queries

1. **System Status**
   - "How many cabins are currently in alert status?"
   - "Show me all sensors that are offline"
   - "What's the current system health?"

2. **Data Queries**
   - "Show me recent measurements from sensor 1"
   - "Get the last 10 vibration readings"
   - "List all cabins with high RMS values"

3. **Temporal Analysis**
   - "What's the average RMS value today?"
   - "Compare vibration levels this week vs last week"
   - "Show me measurements from the last 24 hours"

4. **Predictive Insights**
   - "Which cabins need maintenance?"
   - "Predict which sensors might fail soon"
   - "What's the maintenance risk level?"

5. **Reports**
   - "Generate a system health report"
   - "Create a summary of today's operations"
   - "Show me a report on sensor performance"

### Advanced Features

#### Conversation Context
The chatbot maintains conversation history, allowing follow-up questions:
```
User: "Show me sensor 1 data"
Bot: [displays data]
User: "What about sensor 2?"
Bot: [displays sensor 2 data, understanding the context]
```

#### Data Visualization
When queries return tabular data, the chatbot displays it in an interactive table with:
- Column headers
- Sortable rows
- SQL query view (expandable)
- Row count indicators
- Query type badges

#### Query Type Detection
The chatbot automatically detects query intent:
- `data_query` - Direct database queries
- `analysis` - Analytical insights
- `prediction` - ML-based predictions
- `report` - Comprehensive reports

## RAG (Retrieval-Augmented Generation) Approach

The chatbot uses RAG instead of fine-tuning:

1. **Schema Context** - Database structure is provided to LLM
2. **Few-Shot Learning** - Example queries guide the LLM
3. **Domain Knowledge** - Glossary and KPIs are included
4. **Real-Time Data** - Queries fetch live data from PostgreSQL

This approach:
- Requires no model training
- Provides up-to-date responses
- Is more cost-effective
- Can be quickly updated with new context

## Security Features

1. **Query Validation**
   - Only SELECT queries allowed
   - Dangerous keywords blocked (DROP, DELETE, etc.)
   - Prevents SQL injection
   - Row limits enforced
   - Bloqueo de tablas sensibles (`usuarios`, `audit_log`, `roles`) según políticas ISO/IEC 27001

2. **Session Management**
   - Isolated conversation contexts
   - Automatic session cleanup
   - No data persistence between sessions

3. **Error Handling**
   - Graceful fallbacks for LLM failures
   - User-friendly error messages
   - Service availability checks

4. **Role-aware Access Control**
   - Cabecera `X-User-Role` define el perfil (ciudadano vs staff)
   - Catálogo estático (`role_catalog.py`) evita consultar datos personales
   - Ciudadanos reciben respuestas públicas; personal autorizado mantiene analítica avanzada

5. **Intent Router con Caché**
   - FAQ resueltas mediante embeddings (`CHATBOT_INTENT_EMBED_MODEL`)
   - Caché LRU configurable (`CHATBOT_INTENT_CACHE_SIZE`)
   - Registra coincidencias (`intent_id`, `intent_confidence`) para auditoría ISO 9001 e ISO/IEC 25010

## Performance Optimization

1. **Query Limits**
   - Default 100 rows max
   - Configurable via `CHATBOT_SQL_ROW_LIMIT`

2. **Context Management**
   - Limited message history (default 10)
   - Automatic old session cleanup

3. **Connection Pooling**
   - Reuses SQLAlchemy session
   - No additional database connections

## Troubleshooting

### LLM Not Responding

1. Verifica que Ollama esté activo: `curl http://localhost:11434/api/version`
2. Asegúrate de haber ejecutado `ollama pull llama3`
3. Revisa los logs del servicio (terminal donde corre Ollama)
4. Reinicia Ollama si es necesario (`ollama serve`)

### SQL Queries Failing

1. Verify database connection
2. Check schema matches `schema_info.py`
3. Review query validation logs
4. Test direct SQL in database client

### Frontend Not Connecting

1. Verify analytics service is running on port 8001
2. Check CORS configuration
3. Inspect browser console for errors
4. Verify API proxy settings in frontend

## Future Enhancements

1. **Multi-Language Support**
   - Spanish interface
   - Localized responses

2. **Voice Input**
   - Speech-to-text integration
   - Voice responses

3. **Advanced Visualizations**
   - Charts and graphs in chat
   - Real-time data updates
   - Interactive plots

4. **Proactive Alerts**
   - Chatbot-initiated notifications
   - Anomaly detection alerts
   - Maintenance reminders

5. **Learning from Feedback**
   - User rating system
   - Query refinement
   - Custom shortcuts

## API Reference

### Request Format

```typescript
// Simple query
POST /api/chatbot/query
{
  "question": "How many cabins are in alert?",
  "include_ml_analysis": true
}

// With session
POST /api/chatbot/conversation
{
  "question": "Show me sensor 1 data",
  "session_id": "uuid-here"
}
```

### Response Format

```typescript
{
  "ok": true,
  "data": {
    "success": true,
    "response": "There are currently 3 cabins in alert status...",
    "query_type": "data_query",
    "sql_query": "SELECT COUNT(*) FROM cabinas WHERE estado_actual = 'alerta'",
    "data": [...],
    "row_count": 3,
    "columns": ["count"]
  }
}
```

## Contributing

When extending the chatbot:

1. **Add new query types** in `chatbot.py`
2. **Update prompts** in `prompts.py`
3. **Add schema info** in `schema_info.py`
4. **Document capabilities** in `get_capabilities()`
5. **Update this README**

## License

Same as parent project (see root LICENSE.md)


