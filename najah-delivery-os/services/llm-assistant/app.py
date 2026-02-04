from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv
from rag import ChromaRAG
import logging

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Najah Delivery LLM Assistant",
    description="RAG-powered assistant for Najah Delivery OS",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RAG instance
rag: Optional[ChromaRAG] = None


class QueryRequest(BaseModel):
    query: str = Field(..., description="User query text")
    language: str = Field(default="en", description="Response language: 'ar' or 'en'")


class Source(BaseModel):
    content: str
    metadata: Dict[str, Any]


class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]
    tokens_used: int


@app.on_event("startup")
async def startup_event():
    """Initialize the RAG system on startup."""
    global rag
    
    try:
        logger.info("Initializing ChromaRAG...")
        
        persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
        embedding_model = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        
        rag = ChromaRAG(
            persist_directory=persist_dir,
            embedding_model=embedding_model
        )
        
        # Check if collection is empty and ingest KB if needed
        doc_count = rag.get_collection_count()
        logger.info(f"Vector store contains {doc_count} documents")
        
        if doc_count == 0:
            logger.info("Vector store is empty, ingesting knowledge base...")
            from scripts.ingest_kb import ingest_knowledge_base
            ingest_knowledge_base(rag)
            logger.info(f"Ingested {rag.get_collection_count()} documents")
        
        logger.info("RAG system initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        raise


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "llm-assistant",
        "version": "1.0.0",
        "rag_initialized": rag is not None,
        "documents_loaded": rag.get_collection_count() if rag else 0
    }


@app.post("/assistant/query", response_model=QueryResponse)
async def query_assistant(request: QueryRequest):
    """Query the RAG assistant."""
    
    if not rag:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    if request.language not in ["ar", "en"]:
        raise HTTPException(status_code=400, detail="Language must be 'ar' or 'en'")
    
    try:
        logger.info(f"Processing query: {request.query[:100]}... (language: {request.language})")
        
        result = rag.query(
            query_text=request.query,
            language=request.language,
            n_results=3
        )
        
        return QueryResponse(**result)
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)
