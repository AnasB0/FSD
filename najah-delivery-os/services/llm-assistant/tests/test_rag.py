"""Unit tests for RAG components."""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from vector_store import ChromaVectorStore
from llm_client import OpenRouterClient
from rag import RAGAssistant


@pytest.fixture
def mock_embedding_model():
    """Mock sentence transformer model."""
    mock_model = Mock()
    mock_model.encode.return_value = [[0.1, 0.2, 0.3] for _ in range(3)]
    return mock_model


@pytest.fixture
def mock_chroma_client():
    """Mock ChromaDB client."""
    mock_client = Mock()
    mock_collection = Mock()
    mock_collection.count.return_value = 0
    mock_collection.add = Mock()
    mock_collection.query.return_value = {
        "documents": [["Test document content"]],
        "metadatas": [[{"source": "test.md", "title": "Test"}]]
    }
    mock_client.get_or_create_collection.return_value = mock_collection
    return mock_client, mock_collection


@pytest.mark.asyncio
async def test_vector_store_add_documents(mock_embedding_model, mock_chroma_client):
    """Test adding documents to vector store."""
    mock_client, mock_collection = mock_chroma_client
    
    with patch('vector_store.SentenceTransformer', return_value=mock_embedding_model), \
         patch('vector_store.chromadb.Client', return_value=mock_client):
        
        vector_store = ChromaVectorStore()
        
        documents = [
            {
                "content": "Test content 1",
                "metadata": {"source": "test1.md", "title": "Test 1"}
            },
            {
                "content": "Test content 2",
                "metadata": {"source": "test2.md", "title": "Test 2"}
            }
        ]
        
        await vector_store.add_documents(documents)
        
        # Verify add was called
        mock_collection.add.assert_called_once()
        call_kwargs = mock_collection.add.call_args[1]
        assert len(call_kwargs["documents"]) == 2
        assert len(call_kwargs["embeddings"]) == 2


@pytest.mark.asyncio
async def test_vector_store_search(mock_embedding_model, mock_chroma_client):
    """Test searching in vector store."""
    mock_client, mock_collection = mock_chroma_client
    
    with patch('vector_store.SentenceTransformer', return_value=mock_embedding_model), \
         patch('vector_store.chromadb.Client', return_value=mock_client):
        
        vector_store = ChromaVectorStore()
        
        results = await vector_store.search("test query", k=1)
        
        # Verify query was called
        mock_collection.query.assert_called_once()
        assert len(results) == 1
        assert results[0]["content"] == "Test document content"
        assert results[0]["metadata"]["source"] == "test.md"


@pytest.mark.asyncio
async def test_llm_client_generate():
    """Test LLM client text generation."""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": "Test response from LLM"
                }
            }
        ]
    }
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client_class.return_value = mock_client
        
        llm_client = OpenRouterClient(api_key="test_key", model="test-model")
        
        result = await llm_client.generate(
            prompt="Test prompt",
            temperature=0.7,
            max_tokens=100
        )
        
        assert result == "Test response from LLM"
        mock_client.post.assert_called_once()


@pytest.mark.asyncio
async def test_llm_client_rate_limit_error():
    """Test LLM client handles rate limit errors."""
    mock_response = Mock()
    mock_response.status_code = 429
    mock_response.text = "Rate limit exceeded"
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_client.post.side_effect = Exception("Rate limit")
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client_class.return_value = mock_client
        
        llm_client = OpenRouterClient(api_key="test_key")
        
        with pytest.raises(Exception):
            await llm_client.generate("Test prompt")


@pytest.mark.asyncio
async def test_rag_query():
    """Test RAG assistant query."""
    mock_vector_store = Mock()
    mock_vector_store.search = AsyncMock(return_value=[
        {
            "content": "Najah Delivery operates Saturday to Thursday.",
            "metadata": {"source": "policies.md", "title": "Policies"}
        }
    ])
    
    mock_llm_client = Mock()
    mock_llm_client.generate = AsyncMock(
        return_value="Najah Delivery is open from Saturday to Thursday and closed on Friday."
    )
    
    rag = RAGAssistant(
        vector_store=mock_vector_store,
        llm_client=mock_llm_client
    )
    
    result = await rag.query("What are the working hours?", max_sources=3)
    
    assert "answer" in result
    assert "sources" in result
    assert len(result["sources"]) == 1
    assert "Saturday to Thursday" in result["sources"][0]["content"]


@pytest.mark.asyncio
async def test_query_endpoint():
    """Test FastAPI query endpoint."""
    # Mock dependencies
    with patch('main.rag_assistant') as mock_rag:
        mock_rag.query = AsyncMock(return_value={
            "answer": "Test answer",
            "sources": [
                {
                    "content": "Test source",
                    "metadata": {"source": "test.md"}
                }
            ]
        })
        
        from main import app
        client = TestClient(app)
        
        response = client.post(
            "/assistant/query",
            json={"query": "Test question", "max_sources": 3}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert data["answer"] == "Test answer"


def test_health_endpoint():
    """Test health check endpoint."""
    from main import app
    client = TestClient(app)
    
    response = client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "llm-assistant"
