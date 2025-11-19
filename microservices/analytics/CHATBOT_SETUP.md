# Quick Setup Guide - UrbanFlow AI Chatbot

## Prerequisites

- Python 3.10+
- PostgreSQL database (already configured)
- Node.js 18+ (for frontend)
- Ollama instalado localmente con el modelo llama3

## Step-by-Step Setup

### 1. Install Python Dependencies

```bash
cd microservices/analytics
pip install langchain langchain-community
# o instala todo con:
pip install -r requirements.txt
```

### 2. Configure Environment

Create or update your `.env` file in the project root:

```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=llama3

# Chatbot Settings (Optional - these are defaults)
CHATBOT_MAX_CONTEXT_MESSAGES=10
CHATBOT_SQL_ROW_LIMIT=100
CHATBOT_ENABLE_ML_ANALYSIS=true
```

### 3. Instala Ollama (si aún no lo tienes)

**Windows:**
```bash
# Descarga desde https://ollama.com/download
# Instala y luego ejecuta
ollama pull llama3
```

**Linux/Mac:**
```bash
curl https://ollama.ai/install.sh | sh
ollama pull llama3
```

Verifica que Ollama está ejecutándose:
```bash
curl http://localhost:11434/api/version
```

### 4. Start the Analytics Service

```bash
cd microservices/analytics
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Verify the service is running:
```bash
curl http://localhost:8001/api/chatbot/capabilities
```

Expected response:
```json
{
  "ok": true,
  "data": {
    "capabilities": [...],
    "llm_provider": "ollama",
    "model_name": "llama3",
    "ml_analysis_enabled": true
  }
}
```

### 5. Frontend Integration

The chatbot is already integrated into the Dashboard component. Just start your frontend:

```bash
cd views
npm install  # if not already done
npm run dev
```

### 6. Test the Chatbot

1. Open http://localhost:5173 (or your frontend URL)
2. Log in to the dashboard
3. Look for the chatbot icon in the bottom-right corner
4. Click to open the chatbot
5. Try a sample question: "How many cabins are in the system?"

## Testing Without LLM (Limited Mode)

If you want to test without configuring an LLM:

1. Set an empty or invalid API key
2. The chatbot will run in "limited mode"
3. It uses template-based queries instead of AI
4. Basic queries like "show sensor data" will still work

## Common Issues

### Issue: "Connection refused to localhost:11434"

**Solution**: Ollama is not running. Start it:
```bash
# Windows: Run Ollama app
# Linux/Mac:
ollama serve
```

### Issue: "Module 'langchain' not found"

**Solution**: Install dependencies:
```bash
pip install langchain langchain-community
```

### Issue: Chatbot shows "Service not available"

**Solution**: 
1. Check analytics service is running on port 8001
2. Verify database connection
3. Check browser console for CORS errors
4. Try accessing http://localhost:8001/api/chatbot/capabilities directly

### Issue: Slow responses

**Solutions**:
- Usa `llama3` (o un modelo más liviano en Ollama) para menor consumo
- Reduce `CHATBOT_MAX_CONTEXT_MESSAGES`
- Verifica recursos locales (CPU/GPU/RAM) mientras se ejecuta Ollama

## Verification Checklist

- [ ] Python dependencies installed
- [ ] Environment variables configured
- [ ] LLM provider configurado (Ollama por defecto)
- [ ] Analytics service running (port 8001)
- [ ] Database connected
- [ ] Frontend running
- [ ] Chatbot visible in Dashboard
- [ ] Sample query works

## Next Steps

Once the chatbot is working:

1. Read [CHATBOT_README.md](./CHATBOT_README.md) for detailed documentation
2. Try different types of queries (data, analysis, predictions, reports)
3. Explore conversation context by asking follow-up questions
4. Customize prompts in `app/core/prompts.py`
5. Add domain-specific knowledge to schema_info.py

## Support

For issues or questions:
1. Check the logs: `microservices/analytics/app/main.py`
2. Review browser console for frontend errors
3. Verify API responses with curl/Postman
4. Check [CHATBOT_README.md](./CHATBOT_README.md) for troubleshooting

## Cost Considerations

**Ollama (local):**
- Free
- Requires 8-16GB RAM
- Slower than cloud APIs
- Privacy benefits

**Máxima precisión (si cuentas con GPU local potente):**
```bash
LLM_PROVIDER=ollama
MODEL_NAME=llama3
```


