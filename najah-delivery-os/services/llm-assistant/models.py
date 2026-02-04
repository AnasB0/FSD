"""Pydantic models for request/response validation."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request model for assistant query."""
    
    query: str = Field(..., description="User question or query", min_length=1)
    max_sources: int = Field(default=3, description="Maximum number of source documents to retrieve", ge=1, le=10)


class SourceDocument(BaseModel):
    """Source document included in response."""
    
    content: str = Field(..., description="Document content")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")


class QueryResponse(BaseModel):
    """Response model for assistant query."""
    
    answer: str = Field(..., description="Generated answer")
    sources: List[SourceDocument] = Field(default_factory=list, description="Source documents used")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")


class HealthResponse(BaseModel):
    """Health check response."""
    
    status: str = Field(..., description="Service status")
    service: str = Field(default="llm-assistant", description="Service name")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Check timestamp")
