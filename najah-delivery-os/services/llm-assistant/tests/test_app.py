import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_health_check():
    """Test health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data


def test_query_valid_request():
    """Test valid query request."""
    response = client.post(
        "/assistant/query",
        json={
            "query": "What are the operating hours?",
            "language": "en"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert "tokens_used" in data


def test_query_arabic_language():
    """Test Arabic language query."""
    response = client.post(
        "/assistant/query",
        json={
            "query": "ما هي ساعات العمل؟",
            "language": "ar"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data


def test_query_empty_text():
    """Test empty query text."""
    response = client.post(
        "/assistant/query",
        json={
            "query": "",
            "language": "en"
        }
    )
    assert response.status_code == 400


def test_query_invalid_language():
    """Test invalid language code."""
    response = client.post(
        "/assistant/query",
        json={
            "query": "Test query",
            "language": "fr"
        }
    )
    assert response.status_code == 400


def test_query_missing_field():
    """Test missing required field."""
    response = client.post(
        "/assistant/query",
        json={
            "language": "en"
        }
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_rag_initialization():
    """Test RAG system initialization."""
    from rag import ChromaRAG
    
    rag = ChromaRAG(
        persist_directory="./test_chroma_db",
        embedding_model="all-MiniLM-L6-v2"
    )
    
    assert rag is not None
    assert rag.collection is not None


# Placeholder for additional tests
# TODO: Add integration tests with mocked OpenRouter API
# TODO: Add tests for document ingestion
# TODO: Add tests for vector search accuracy
