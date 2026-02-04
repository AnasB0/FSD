"""LLM Assistant service with RAG implementation."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import config
from models import QueryRequest, QueryResponse, HealthResponse, SourceDocument
from vector_store import ChromaVectorStore
from llm_client import OpenRouterClient
from rag import RAGAssistant
from document_loader import load_knowledge_base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global instances
vector_store: ChromaVectorStore = None
llm_client: OpenRouterClient = None
rag_assistant: RAGAssistant = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("Starting LLM Assistant service...")
    
    try:
        # Validate configuration
        config.validate()
        
        # Initialize vector store
        logger.info("Initializing vector store...")
        global vector_store, llm_client, rag_assistant
        vector_store = ChromaVectorStore(
            persist_dir=config.CHROMA_PERSIST_DIR,
            embedding_model=config.EMBEDDING_MODEL
        )
        
        # Load knowledge base documents
        logger.info("Loading knowledge base documents...")
        documents = load_knowledge_base(config.KB_DIR)
        
        if documents:
            # Clear existing and add new documents
            vector_store.clear()
            await vector_store.add_documents(documents)
            logger.info(f"Loaded {len(documents)} documents into vector store")
        else:
            logger.warning("No documents found in knowledge base")
        
        # Initialize LLM client
        logger.info("Initializing LLM client...")
        llm_client = OpenRouterClient(
            api_key=config.OPENROUTER_API_KEY,
            model=config.LLM_MODEL
        )
        
        # Initialize RAG assistant
        logger.info("Initializing RAG assistant...")
        rag_assistant = RAGAssistant(
            vector_store=vector_store,
            llm_client=llm_client
        )
        
        logger.info("Service started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start service: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down LLM Assistant service...")


# Initialize FastAPI app
app = FastAPI(
    title="LLM Assistant Service",
    description="RAG-based assistant using ChromaDB and OpenRouter",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="healthy")


@app.post("/assistant/query", response_model=QueryResponse)
async def query_assistant(request: QueryRequest) -> QueryResponse:
    """
    Query the RAG assistant.
    
    Args:
        request: Query request with question and max_sources
        
    Returns:
        Query response with answer and sources
    """
    if not rag_assistant:
        raise HTTPException(status_code=503, detail="RAG assistant not initialized")
    
    try:
        logger.info(f"Received query: {request.query}")
        
        # Process query
        result = await rag_assistant.query(
            question=request.query,
            max_sources=request.max_sources
        )
        
        # Format response
        response = QueryResponse(
            answer=result["answer"],
            sources=[
                SourceDocument(
                    content=source["content"],
                    metadata=source["metadata"]
                )
                for source in result["sources"]
            ]
        )
        
        return response
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=config.LLM_ASSISTANT_PORT,
        log_level="info"
    )
