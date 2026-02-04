# Scripts Directory

## ingest_kb.py

Ingests knowledge base documents from `data/kb/` directory into ChromaDB vector store.

### Usage

```bash
python scripts/ingest_kb.py
```

### Features

- Automatically finds all markdown files in KB directory
- Splits documents into sections by headers
- Generates embeddings using sentence-transformers
- Stores in ChromaDB with metadata
- Logs progress and errors

### Environment Variables

- `KB_DATA_DIR`: Path to knowledge base directory (default: `./data/kb`)
- `CHROMA_PERSIST_DIR`: Path to ChromaDB storage (default: `./chroma_db`)
- `EMBEDDING_MODEL`: Embedding model name (default: `all-MiniLM-L6-v2`)
