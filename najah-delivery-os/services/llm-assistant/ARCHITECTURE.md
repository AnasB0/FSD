# LLM Assistant Service Architecture

## Overview

The LLM Assistant service is a RAG (Retrieval Augmented Generation) system that provides intelligent, context-aware responses for Najah Delivery OS.

## Directory Structure

```
llm-assistant/
├── app.py                  # FastAPI application & endpoints
├── rag.py                  # ChromaRAG class (vector store & LLM)
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container configuration
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore rules
├── start.sh              # Quick start script
├── README.md             # Main documentation
│
├── data/
│   └── kb/
│       └── policies.md   # Knowledge base documents
│
├── scripts/
│   ├── ingest_kb.py     # KB ingestion script
│   └── README.md        # Scripts documentation
│
└── tests/
    ├── __init__.py
    ├── test_app.py      # API tests
    └── README.md        # Testing documentation
```

## Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Request                          │
│                  POST /assistant/query                      │
│              { query, language }                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI (app.py)                        │
│  • Request validation                                       │
│  • CORS handling                                           │
│  • Error management                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   ChromaRAG (rag.py)                        │
│                                                             │
│  1. Embedding Generation                                    │
│     ├─ sentence-transformers                               │
│     └─ all-MiniLM-L6-v2 model                             │
│                                                             │
│  2. Vector Search                                          │
│     ├─ ChromaDB collection                                 │
│     ├─ Cosine similarity                                   │
│     └─ Top-3 retrieval                                     │
│                                                             │
│  3. Context Formatting                                     │
│     └─ Combine retrieved docs                              │
│                                                             │
│  4. LLM Generation                                         │
│     ├─ OpenRouter API                                      │
│     ├─ GPT-4o mini model                                   │
│     └─ System prompt (language-aware)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Response                                 │
│  {                                                          │
│    answer: "...",                                          │
│    sources: [{content, metadata}],                         │
│    tokens_used: 342                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Initialization (Startup)

```
Service Start
    │
    ▼
Load Environment (.env)
    │
    ▼
Initialize ChromaRAG
    │
    ├─ Load sentence-transformers model
    ├─ Connect to ChromaDB
    └─ Get/Create collection
    │
    ▼
Check Vector Store
    │
    ├─ If empty: Run KB ingestion
    │   ├─ Read markdown files
    │   ├─ Split into sections
    │   ├─ Generate embeddings
    │   └─ Store in ChromaDB
    │
    └─ If populated: Ready
    │
    ▼
Service Ready (listen on port 8003)
```

### Query Processing

```
User Query
    │
    ▼
Validate Input
    │
    ├─ Check query not empty
    └─ Check language (ar/en)
    │
    ▼
Generate Query Embedding
    │
    └─ sentence-transformers.encode()
    │
    ▼
Vector Search
    │
    ├─ Query ChromaDB with embedding
    ├─ Retrieve top-3 similar docs
    └─ Extract content + metadata
    │
    ▼
Build Context
    │
    └─ Concatenate retrieved docs
    │
    ▼
Call OpenRouter API
    │
    ├─ System prompt (language-specific)
    ├─ Context + User query
    └─ GPT-4o mini generation
    │
    ▼
Return Response
    │
    ├─ Generated answer
    ├─ Source documents
    └─ Token count
```

## Key Technologies

### Vector Store: ChromaDB
- **Purpose**: Semantic search over knowledge base
- **Storage**: Local persistent directory
- **Similarity**: Cosine distance
- **Features**: Fast in-memory + disk persistence

### Embeddings: sentence-transformers
- **Model**: all-MiniLM-L6-v2
- **Dimensions**: 384
- **Speed**: ~50ms per query
- **Language**: Multilingual support

### LLM: OpenRouter (GPT-4o mini)
- **Provider**: OpenRouter API
- **Model**: openai/gpt-4o-mini
- **Context**: 128k tokens
- **Cost**: ~$0.15 per 1M tokens

### Framework: FastAPI
- **Async**: Full async/await support
- **Validation**: Pydantic models
- **Docs**: Auto-generated OpenAPI
- **CORS**: Enabled for web access

## API Endpoints

### GET /health
Health check and status information.

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

### POST /assistant/query
Query the RAG assistant.

**Request**:
```json
{
  "query": "What are the delivery fees?",
  "language": "en"
}
```

**Response**:
```json
{
  "answer": "The delivery fees are: Standard delivery within city: 15 SAR, Express delivery (2-hour): 30 SAR, and free delivery for orders above 200 SAR.",
  "sources": [
    {
      "content": "**Delivery Fees**\n- Standard delivery within city: 15 SAR...",
      "metadata": {
        "source": "policies.md",
        "section": 3
      }
    }
  ],
  "tokens_used": 245
}
```

## Environment Configuration

| Variable | Purpose | Default |
|----------|---------|---------|
| OPENROUTER_API_KEY | API authentication | Required |
| OPENROUTER_MODEL | LLM model selection | openai/gpt-4o-mini |
| EMBEDDING_MODEL | Embedding model | all-MiniLM-L6-v2 |
| CHROMA_PERSIST_DIR | Vector DB storage | ./chroma_db |
| KB_DATA_DIR | Knowledge base path | ./data/kb |
| PORT | Service port | 8003 |

## Deployment Options

### Option 1: Local Development
```bash
python app.py
```
- Best for: Development and testing
- Hot reload: Yes (with --reload flag)
- Persistence: Local filesystem

### Option 2: Docker Container
```bash
docker run -p 8003:8003 -e OPENROUTER_API_KEY=xxx najah-llm-assistant
```
- Best for: Production deployment
- Isolation: Full container isolation
- Persistence: Volume mounts

### Option 3: Kubernetes
- Use provided Dockerfile
- Mount secrets for API key
- Persistent volumes for ChromaDB

## Performance Characteristics

### Latency Breakdown
- Embedding generation: ~50ms
- Vector search: ~10ms
- LLM generation: 1-3s
- **Total**: ~2-4s per query

### Throughput
- Concurrent requests: 10+
- Bottleneck: OpenRouter API
- Optimization: Caching, async

### Resource Usage
- Memory: ~500MB (with model loaded)
- CPU: Low (inference on CPU)
- Disk: ~100MB (ChromaDB + models)

## Security Considerations

1. **API Keys**: Stored in environment only
2. **CORS**: Configure allowed origins in production
3. **Rate Limiting**: Implement on API gateway
4. **Input Validation**: Pydantic models
5. **Logging**: No sensitive data logged

## Monitoring

### Key Metrics
- Query latency (P50, P95, P99)
- Token usage per query
- Error rate
- Vector store size
- Model load time

### Health Indicators
- `/health` endpoint status
- Documents loaded count
- RAG initialization success

## Future Enhancements

1. **Caching**: Redis for frequent queries
2. **Fine-tuning**: Custom embeddings for Arabic
3. **Multi-tenancy**: Per-customer knowledge bases
4. **Analytics**: Query patterns and insights
5. **Feedback Loop**: User ratings for answers
6. **Streaming**: SSE for real-time responses

## Troubleshooting

### Issue: Vector store empty
**Solution**: Run `python scripts/ingest_kb.py`

### Issue: Slow responses
**Solution**: 
- Check OpenRouter API latency
- Verify model loaded in memory
- Monitor network connection

### Issue: Out of memory
**Solution**:
- Reduce embedding model size
- Clear ChromaDB cache
- Increase container memory

### Issue: Arabic text issues
**Solution**:
- Verify UTF-8 encoding
- Check sentence-transformers multilingual support
- Test with Arabic KB documents

## Support

- Documentation: `/docs` (FastAPI auto-docs)
- Logs: stdout/stderr
- Health: `GET /health`
- Tests: `pytest tests/`
