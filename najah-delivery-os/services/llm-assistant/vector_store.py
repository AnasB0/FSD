"""Chroma vector store implementation."""
import logging
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class ChromaVectorStore:
    """Vector store using ChromaDB for document embeddings."""
    
    def __init__(
        self,
        persist_dir: str = "./data/chroma",
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    ):
        """
        Initialize Chroma vector store.
        
        Args:
            persist_dir: Directory to persist ChromaDB data
            embedding_model: Sentence transformer model name
        """
        self.persist_dir = persist_dir
        self.embedding_model_name = embedding_model
        
        # Initialize sentence transformer
        logger.info(f"Loading embedding model: {embedding_model}")
        self.embedding_model = SentenceTransformer(embedding_model)
        
        # Initialize ChromaDB client
        logger.info(f"Initializing ChromaDB at {persist_dir}")
        self.client = chromadb.Client(Settings(
            persist_directory=persist_dir,
            anonymized_telemetry=False
        ))
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="knowledge_base",
            metadata={"description": "Knowledge base documents for RAG"}
        )
        
        logger.info(f"Vector store initialized with {self.collection.count()} documents")
    
    def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for texts.
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embedding vectors
        """
        embeddings = self.embedding_model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
    
    async def add_documents(
        self,
        documents: List[Dict[str, Any]]
    ) -> None:
        """
        Add documents to vector store.
        
        Args:
            documents: List of documents with 'content' and 'metadata' keys
        """
        if not documents:
            logger.warning("No documents to add")
            return
        
        logger.info(f"Adding {len(documents)} documents to vector store")
        
        # Extract content and metadata
        contents = [doc["content"] for doc in documents]
        metadatas = [doc.get("metadata", {}) for doc in documents]
        
        # Generate embeddings
        embeddings = self._generate_embeddings(contents)
        
        # Generate IDs
        ids = [f"doc_{i}" for i in range(len(documents))]
        
        # Add to collection
        self.collection.add(
            embeddings=embeddings,
            documents=contents,
            metadatas=metadatas,
            ids=ids
        )
        
        logger.info(f"Successfully added {len(documents)} documents")
    
    async def search(
        self,
        query: str,
        k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents.
        
        Args:
            query: Search query
            k: Number of results to return
            
        Returns:
            List of documents with content and metadata
        """
        logger.info(f"Searching for: {query} (top {k})")
        
        # Generate query embedding
        query_embedding = self._generate_embeddings([query])[0]
        
        # Query collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k
        )
        
        # Format results
        documents = []
        if results["documents"] and results["documents"][0]:
            for i, content in enumerate(results["documents"][0]):
                doc = {
                    "content": content,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {}
                }
                documents.append(doc)
        
        logger.info(f"Found {len(documents)} relevant documents")
        return documents
    
    def clear(self) -> None:
        """Clear all documents from the vector store."""
        logger.warning("Clearing all documents from vector store")
        self.client.delete_collection(name="knowledge_base")
        self.collection = self.client.get_or_create_collection(
            name="knowledge_base",
            metadata={"description": "Knowledge base documents for RAG"}
        )
