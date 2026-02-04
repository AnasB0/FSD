# LLM Assistant Service

A production-ready RAG (Retrieval Augmented Generation) service for the Najah Delivery OS platform, combining vector search with LLM-powered responses.

## Architecture

The service implements RAG using:

- **Vector Store**: ChromaDB with persistent storage
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)
- **LLM**: OpenRouter GPT-4o mini
- **Framework**: FastAPI with async/await

### RAG Pipeline

```
User Query → Vector Search → Context Retrieval → LLM Prompt → Generated Answer
                ↓                    ↓                ↓
            ChromaDB          Top K Documents    OpenRouter API
```

## Features

- 🔍 **Semantic Search**: Find relevant documents using vector embeddings
- 🤖 **LLM Integration**: Generate contextual answers using GPT-4o mini
- 📚 **Knowledge Base**: Markdown-based document storage
- 🌐 **Bilingual Support**: English and Arabic content
- ⚡ **Fast Performance**: Async operations throughout
- 🔒 **Production Ready**: Type hints, error handling, logging

## Installation

### Prerequisites

- Python 3.11+
- OpenRouter API key

### Local Setup

```bash
# Navigate to service directory
cd najah-delivery-os/services/llm-assistant

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY

# Run the service
python main.py
```

### Docker Setup

```bash
# Build image
docker build -t llm-assistant:latest .

# Run container
docker run -d \
  -p 5003:5003 \
  -e OPENROUTER_API_KEY=your_key_here \
  -v $(pwd)/data:/app/data \
  --name llm-assistant \
  llm-assistant:latest
```

## API Documentation

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "llm-assistant",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Query Assistant

```http
POST /assistant/query
Content-Type: application/json

{
  "query": "What are the working hours?",
  "max_sources": 3
}
```

**Response:**
```json
{
  "answer": "Najah Delivery operates from Saturday to Thursday, 8:00 AM to 8:00 PM Saudi Arabia Time. The service is closed on Friday for the weekend.",
  "sources": [
    {
      "content": "**Operating Days**: Saturday to Thursday...",
      "metadata": {
        "source": "policies.md",
        "title": "Najah Delivery Policies"
      }
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Configuration

All configuration is managed through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_ASSISTANT_PORT` | Service port | 5003 |
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `LLM_MODEL` | Model identifier | openai/gpt-4o-mini |
| `LLM_TEMPERATURE` | Generation temperature | 0.7 |
| `LLM_MAX_TOKENS` | Max tokens per response | 500 |
| `CHROMA_PERSIST_DIR` | ChromaDB storage path | ./data/chroma |
| `EMBEDDING_MODEL` | Sentence transformer model | all-MiniLM-L6-v2 |
| `KB_DIR` | Knowledge base directory | ./data/kb |

## Knowledge Base

Add documents to the knowledge base by placing markdown files in `data/kb/`:

```markdown
# Document Title

Your content here...
```

The service automatically:
1. Loads all `.md` files on startup
2. Generates embeddings
3. Stores in ChromaDB
4. Makes available for retrieval

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html
```

### Code Quality

```bash
# Format code
black .

# Lint
flake8 .

# Type checking
mypy .
```

## API Examples

### Using cURL

```bash
# Health check
curl http://localhost:5003/health

# Query assistant
curl -X POST http://localhost:5003/assistant/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the COD limit?",
    "max_sources": 3
  }'
```

### Using Python

```python
import httpx

async def query_assistant(question: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:5003/assistant/query",
            json={"query": question, "max_sources": 3}
        )
        return response.json()

# Usage
result = await query_assistant("What are the delivery areas?")
print(result["answer"])
```

### Using JavaScript

```javascript
async function queryAssistant(question) {
  const response = await fetch('http://localhost:5003/assistant/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: question,
      max_sources: 3
    })
  });
  return await response.json();
}

// Usage
const result = await queryAssistant('What are the working hours?');
console.log(result.answer);
```

## Performance

- **Startup Time**: ~10-15 seconds (includes model loading)
- **Query Latency**: 
  - Vector search: ~50-100ms
  - LLM generation: ~1-3 seconds
  - Total: ~1.5-3.5 seconds
- **Memory Usage**: ~500MB-1GB (depends on KB size)

## Troubleshooting

### Service won't start

1. Check OPENROUTER_API_KEY is set
2. Verify ChromaDB can write to persist directory
3. Check port 5003 is available

### Slow responses

1. Reduce `max_sources` parameter
2. Lower `LLM_MAX_TOKENS`
3. Use faster embedding model

### No relevant documents found

1. Verify KB directory has .md files
2. Check logs for document loading errors
3. Try rephrasing query

## License

Copyright © 2024 Najah Delivery. All rights reserved.

## Support

For issues and questions:
- Technical Support: dev@najahdelivery.sa
- Documentation: https://docs.najahdelivery.sa
