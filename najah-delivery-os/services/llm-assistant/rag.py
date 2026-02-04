"""RAG (Retrieval Augmented Generation) implementation."""
import logging
from typing import Dict, Any, List
from vector_store import ChromaVectorStore
from llm_client import OpenRouterClient

logger = logging.getLogger(__name__)


class RAGAssistant:
    """RAG assistant combining vector search and LLM generation."""
    
    def __init__(
        self,
        vector_store: ChromaVectorStore,
        llm_client: OpenRouterClient
    ):
        """
        Initialize RAG assistant.
        
        Args:
            vector_store: Vector store for document retrieval
            llm_client: LLM client for text generation
        """
        self.vector_store = vector_store
        self.llm_client = llm_client
    
    def _build_prompt(
        self,
        question: str,
        context_docs: List[Dict[str, Any]]
    ) -> str:
        """
        Build prompt with retrieved context.
        
        Args:
            question: User question
            context_docs: Retrieved context documents
            
        Returns:
            Formatted prompt string
        """
        # Format context
        context_parts = []
        for i, doc in enumerate(context_docs, 1):
            source = doc.get("metadata", {}).get("source", "Unknown")
            content = doc["content"]
            context_parts.append(f"[Document {i} - {source}]\n{content}")
        
        context = "\n\n".join(context_parts)
        
        # Build prompt
        prompt = f"""Based on the following context documents, please answer the question.
If the answer cannot be found in the context, say so clearly.

Context:
{context}

Question: {question}

Answer:"""
        
        return prompt
    
    async def query(
        self,
        question: str,
        max_sources: int = 3
    ) -> Dict[str, Any]:
        """
        Process query using RAG pipeline.
        
        Args:
            question: User question
            max_sources: Maximum number of source documents to retrieve
            
        Returns:
            Dictionary with answer and sources
        """
        logger.info(f"Processing query: {question}")
        
        # Retrieve relevant documents
        logger.info(f"Retrieving top {max_sources} documents")
        source_docs = await self.vector_store.search(question, k=max_sources)
        
        if not source_docs:
            logger.warning("No relevant documents found")
            return {
                "answer": "I couldn't find any relevant information to answer your question. Please try rephrasing or ask about something else.",
                "sources": []
            }
        
        # Build prompt with context
        prompt = self._build_prompt(question, source_docs)
        
        # Generate answer
        logger.info("Generating answer using LLM")
        system_prompt = """You are a helpful assistant for Najah Delivery, a delivery service in Saudi Arabia.
Answer questions based on the provided context documents.
Be concise, accurate, and professional.
If you're not sure about something, say so.
You can answer in both English and Arabic as needed."""
        
        try:
            answer = await self.llm_client.generate(
                prompt=prompt,
                system_prompt=system_prompt
            )
        except Exception as e:
            logger.error(f"Error generating answer: {str(e)}")
            raise
        
        # Format sources for response
        sources = [
            {
                "content": doc["content"][:500] + "..." if len(doc["content"]) > 500 else doc["content"],
                "metadata": doc.get("metadata", {})
            }
            for doc in source_docs
        ]
        
        logger.info("Query processed successfully")
        return {
            "answer": answer,
            "sources": sources
        }
