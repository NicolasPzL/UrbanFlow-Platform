# UrbanFlow AI Chatbot - Quick Reference

## 🚀 Quick Start

```bash
# 1. Install (solo dependencias necesarias)
pip install langchain langchain-community

# 2. Configure (.env) para Llama 3 con Ollama
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=llama3

# 3. Run
uvicorn app.main:app --reload --port 8000

# 4. Test (opcional)
python test_chatbot.py
```

## 📡 API Endpoints

```bash
# Query without context
POST /api/chatbot/query
Body: { "question": "your question here" }

# Query with conversation context
POST /api/chatbot/conversation
Body: { "question": "your question", "session_id": "uuid" }

# Get capabilities
GET /api/chatbot/capabilities

# Session management
POST /api/chatbot/session/new
GET /api/chatbot/session/{session_id}
DELETE /api/chatbot/session/{session_id}
```

## 💬 Example Questions

### System Status
```
"How many cabins are in alert status?"
"Show me all sensors"
"What's the current system health?"
```

### Data Queries
```
"Show me recent measurements from sensor 1"
"Get the last 10 vibration readings"
"List cabins with high RMS values"
```

### Temporal Analysis
```
"What's the average RMS value today?"
"Compare this week vs last week"
"Show measurements from the last 24 hours"
```

### Predictions
```
"Which cabins need maintenance?"
"Predict sensor failures"
"Show me maintenance risk levels"
```

### Reports
```
"Generate a system health report"
"Create a summary of today's operations"
"Show sensor performance report"
```

## ⚙️ Configuration

### Configuración (Ollama/Llama 3)
```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=llama3
```

### Chatbot Parameters
```bash
CHATBOT_MAX_CONTEXT_MESSAGES=10
CHATBOT_SQL_ROW_LIMIT=100
CHATBOT_ENABLE_ML_ANALYSIS=true
```

## 🧪 Testing

```bash
# Run test suite
python test_chatbot.py

# Manual API test
curl http://localhost:8000/api/chatbot/capabilities

# Query test
curl -X POST http://localhost:8000/api/chatbot/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How many cabins are there?"}'
```

## 📁 File Structure

```
microservices/analytics/app/
├── services/
│   ├── chatbot.py          # Main service
│   ├── query_builder.py    # SQL generation
│   └── context_manager.py  # Session management
├── core/
│   ├── config.py           # Configuration
│   └── prompts.py          # LLM prompts
├── db/
│   └── schema_info.py      # Database metadata
└── api/
    └── routes.py           # Endpoints

views/src/components/
└── Chatbot.tsx             # React component
```

## 🔧 Troubleshooting

### Service not starting?
```bash
# Check port 8000 is free
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Linux/Mac

# Check logs
tail -f logs/analytics.log
```

### LLM not responding?
```bash
# Verifica el servicio de Ollama
curl http://localhost:11434/api/version
```

### Database connection failed?
```bash
# Check PostgreSQL
psql -U postgres -d Urbanflow_db

# Verify connection string in .env
DATABASE_URL=postgresql://...
```

## 💰 Cost Estimates

| Provider | Model | Cost per Query | 1000 Queries |
|----------|-------|----------------|--------------|
| Ollama | Llama3 | Free | Free |

## 🎯 Response Format

```json
{
  "ok": true,
  "data": {
    "success": true,
    "response": "Answer text...",
    "query_type": "data_query",
    "sql_query": "SELECT ...",
    "data": [...],
    "row_count": 10,
    "columns": ["col1", "col2"]
  }
}
```

## 🔐 Security Checklist

- [x] SQL injection prevention
- [x] Query validation (SELECT only)
- [x] Row limits enforced
- [x] Session isolation
- [x] No credential storage
- [x] CORS configured

## 📚 Documentation

- **CHATBOT_SETUP.md** - Installation guide
- **CHATBOT_README.md** - Full documentation
- **test_chatbot.py** - Test suite
- **CHATBOT_IMPLEMENTATION_SUMMARY.md** - Overview

## 🆘 Common Errors

### "Connection refused to localhost:11434"
→ Start Ollama: `ollama serve`

### "Module 'langchain' not found"
→ Run: `pip install langchain langchain-community`

### "Chatbot not visible in UI"
→ Check Dashboard.tsx imports Chatbot component

### "Service not available"
→ Verify analytics service running on port 8000

## 🎨 UI Components Used

- Card, CardContent, CardHeader (shadcn/ui)
- Button, Input (shadcn/ui)
- ScrollArea, Separator (shadcn/ui)
- Table (shadcn/ui)
- Badge (shadcn/ui)
- Lucide icons

## 🔄 Development Workflow

```bash
# 1. Make changes to chatbot service
vim microservices/analytics/app/services/chatbot.py

# 2. Restart service
# (auto-reload enabled with --reload flag)

# 3. Test changes
python test_chatbot.py

# 4. Update frontend if needed
vim views/src/components/Chatbot.tsx

# 5. Rebuild frontend
cd views && npm run dev
```

## 📊 Key Metrics

- Response time: 2-5s (GPT-4), 0.5-2s (GPT-3.5)
- Query limit: 100 rows default
- Context limit: 10 messages
- Session timeout: 24 hours

## 🎓 Learn More

1. Read full docs: `CHATBOT_README.md`
2. Setup guide: `CHATBOT_SETUP.md`
3. Run tests: `python test_chatbot.py`
4. Check implementation: `CHATBOT_IMPLEMENTATION_SUMMARY.md`

## 🚦 Status Indicators

| Indicator | Meaning |
|-----------|---------|
| ✓ Green checkmark | Success |
| ✗ Red X | Error/failure |
| ⚠ Yellow warning | Warning/limitation |
| 🔄 Spinning icon | Loading |
| 💬 Message bubble | Chat active |

## 🎯 Best Practices

1. Mantén `CHATBOT_MAX_CONTEXT_MESSAGES` alrededor de 10
2. Limita resultados a < 100 filas (valor por defecto)
3. Limpia sesiones viejas periódicamente
4. Revisa los logs de Ollama si notas lentitud
5. Considera cachear consultas frecuentes (futuro)

## 📞 Support Resources

- GitHub Issues
- Documentation files
- Test suite output
- Service logs
- Browser console

---

**Quick Links:**
- [Setup Guide](./CHATBOT_SETUP.md)
- [Full Documentation](./CHATBOT_README.md)
- [Test Suite](./test_chatbot.py)
- [Implementation Summary](../CHATBOT_IMPLEMENTATION_SUMMARY.md)


