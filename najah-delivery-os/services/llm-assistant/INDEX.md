# LLM Assistant Service - Quick Reference

## 🚀 Getting Started
1. Read [README.md](README.md) for setup instructions
2. Check [DELIVERABLES.md](DELIVERABLES.md) for requirements checklist
3. Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design

## 📂 Important Files

### Core Application
- `app.py` - FastAPI application with endpoints
- `rag.py` - ChromaRAG implementation
- `requirements.txt` - Python dependencies

### Configuration
- `.env.example` - Environment variables template
- `Dockerfile` - Container configuration

### Scripts
- `start.sh` - Quick start script
- `scripts/ingest_kb.py` - Knowledge base ingestion
- `test_structure.py` - Structure validation

### Knowledge Base
- `data/kb/policies.md` - Delivery policies (Arabic/English)

### Tests
- `tests/test_app.py` - API endpoint tests

### Documentation
- `README.md` - Main documentation
- `ARCHITECTURE.md` - System architecture
- `SERVICE_SUMMARY.md` - Implementation summary
- `DELIVERABLES.md` - Requirements checklist

## ⚡ Quick Commands

### Setup
```bash
cp .env.example .env
# Edit .env and add OPENROUTER_API_KEY
pip install -r requirements.txt
```

### Run Service
```bash
python app.py
# or
./start.sh
```

### Run Tests
```bash
pytest tests/ -v
```

### Ingest Knowledge Base
```bash
python scripts/ingest_kb.py
```

### Docker
```bash
docker build -t najah-llm-assistant .
docker run -p 8003:8003 -e OPENROUTER_API_KEY=xxx najah-llm-assistant
```

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| POST | `/assistant/query` | Query the assistant |
| GET | `/docs` | Swagger UI |
| GET | `/redoc` | ReDoc |

## 📝 Example Query

```bash
curl -X POST http://localhost:8003/assistant/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are your operating hours?",
    "language": "en"
  }'
```

## 📚 Learn More

- [README.md](README.md) - Complete guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- [tests/README.md](tests/README.md) - Testing guide
- [scripts/README.md](scripts/README.md) - Scripts documentation

## 🆘 Need Help?

1. Check [README.md](README.md) troubleshooting section
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) for design details
3. Run `python test_structure.py` to validate setup
4. Check logs for error messages

## ✅ Status

**All requirements implemented and tested.**
Service is production-ready for deployment.
