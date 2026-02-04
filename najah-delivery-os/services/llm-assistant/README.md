# Najah Delivery OS - LLM Assistant Service

RAG-powered intelligent assistant for Najah Delivery OS, providing context-aware responses using ChromaDB vector store and OpenRouter API.

## Features

- 🤖 RAG (Retrieval Augmented Generation) architecture
- 🔍 Semantic search using ChromaDB and sentence-transformers
- 🌐 Multilingual support (Arabic and English)
- 🚀 FastAPI with async support
- 📚 Knowledge base management
- 🔄 Real-time document retrieval
- 📊 Token usage tracking

## Tech Stack

- **Framework**: FastAPI
- **Vector Store**: ChromaDB
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2)
- **LLM**: OpenRouter API (GPT-4o mini)
- **Language**: Python 3.11

## Prerequisites

- Python 3.11+
- OpenRouter API key

## Installation

### Local Setup

1. **Clone and navigate to the service directory**:
```bash
cd najah-delivery-os/services/llm-assistant
```

2. **Create virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:
```env
OPENROUTER_API_KEY=your_actual_api_key_here
```

5. **Ingest knowledge base** (optional - done automatically on startup):
```bash
python scripts/ingest_kb.py
```

6. **Run the service**:
```bash
python app.py
# Or with uvicorn:
uvicorn app:app --host 0.0.0.0 --port 8003 --reload
```

### Docker Setup

1. **Build the image**:
```bash
docker build -t najah-llm-assistant .
```

2. **Run the container**:
```bash
docker run -d \
  -p 8003:8003 \
  -e OPENROUTER_API_KEY=your_api_key_here \
  -v $(pwd)/chroma_db:/app/chroma_db \
  -v $(pwd)/data:/app/data \
  --name llm-assistant \
  najah-llm-assistant
```

## API Endpoints

### Health Check
```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "llm-assistant",
  "version": "1.0.0",
  "rag_initialized": true,
  "documents_loaded": 24
}
```

### Query Assistant
```http
POST /assistant/query
```

**Request Body**:
```json
{
  "query": "What are the operating hours?",
  "language": "en"
}
```

**Parameters**:
- `query` (string, required): The user's question
- `language` (string, optional): Response language - "en" or "ar" (default: "en")

**Response**:
```json
{
  "answer": "Najah Delivery operates Saturday to Thursday from 8:00 AM to 10:00 PM, Friday from 2:00 PM to 10:00 PM, and on public holidays from 10:00 AM to 8:00 PM.",
  "sources": [
    {
      "content": "**Operating Hours**\n- Saturday to Thursday: 8:00 AM - 10:00 PM...",
      "metadata": {
        "source": "policies.md",
        "section": 2,
        "file_path": "./data/kb/policies.md"
      }
    }
  ],
  "tokens_used": 342
}
```

## Usage Examples

### cURL

**English Query**:
```bash
curl -X POST http://localhost:8003/assistant/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What payment methods do you accept?",
    "language": "en"
  }'
```

**Arabic Query**:
```bash
curl -X POST http://localhost:8003/assistant/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ما هي رسوم التوصيل؟",
    "language": "ar"
  }'
```

### Python

```python
import requests

response = requests.post(
    "http://localhost:8003/assistant/query",
    json={
        "query": "What cities do you deliver to?",
        "language": "en"
    }
)

result = response.json()
print(f"Answer: {result['answer']}")
print(f"Tokens used: {result['tokens_used']}")
print(f"Sources: {len(result['sources'])}")
```

### JavaScript

```javascript
const response = await fetch('http://localhost:8003/assistant/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'Can I cancel my order?',
    language: 'en'
  })
});

const data = await response.json();
console.log('Answer:', data.answer);
console.log('Sources:', data.sources.length);
```

## Knowledge Base Management

### Adding New Documents

1. Add markdown files to `data/kb/` directory
2. Run the ingestion script:
```bash
python scripts/ingest_kb.py
```

Or restart the service (auto-ingestion on startup if vector store is empty).

### Document Format

Knowledge base documents should be in Markdown format with clear section headers:

```markdown
# Main Topic

## Subtopic 1

Content here...

## Subtopic 2

More content...
```

## RAG Architecture

```
User Query
    ↓
Embedding Model (sentence-transformers)
    ↓
Vector Search (ChromaDB)
    ↓
Top 3 Relevant Docs
    ↓
Context + Query → OpenRouter (GPT-4o mini)
    ↓
Generated Answer + Sources
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `OPENROUTER_MODEL` | LLM model to use | `openai/gpt-4o-mini` |
| `EMBEDDING_MODEL` | Sentence transformer model | `all-MiniLM-L6-v2` |
| `CHROMA_PERSIST_DIR` | ChromaDB storage path | `./chroma_db` |
| `KB_DATA_DIR` | Knowledge base directory | `./data/kb` |
| `PORT` | Service port | `8003` |

## Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/
```

## Monitoring

The service logs important events:
- RAG initialization
- Query processing
- Document ingestion
- Errors and warnings

View logs:
```bash
# Docker
docker logs -f llm-assistant

# Local
# Logs printed to stdout
```

## Performance

- **Embedding**: ~50ms per query (local inference)
- **Vector Search**: ~10ms for top-3 retrieval
- **LLM Generation**: ~1-3s (depends on OpenRouter)
- **Total**: ~2-4s per query

## Troubleshooting

### Vector store is empty
```bash
python scripts/ingest_kb.py
```

### OpenRouter API errors
- Check API key in `.env`
- Verify API key is valid on OpenRouter dashboard
- Check rate limits and credits

### Port already in use
```bash
# Change PORT in .env or:
PORT=8004 python app.py
```

## Security

- API keys stored in environment variables only
- CORS enabled (configure for production)
- No sensitive data in logs
- Vector store persisted locally

## License

Part of Najah Delivery OS - Internal Use

## Support

For issues or questions:
- GitHub Issues
- Internal Slack: #najah-delivery-dev
- Email: dev@najah-delivery.com
