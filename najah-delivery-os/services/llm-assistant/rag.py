import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import requests
from dotenv import load_dotenv

load_dotenv()


class ChromaRAG:
    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        collection_name: str = "najah_kb",
        embedding_model: str = "all-MiniLM-L6-v2"
    ):
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self.embedding_model_name = embedding_model
        
        # Initialize embedding model
        self.embedding_model = SentenceTransformer(embedding_model)
        
        # Initialize Chroma client
        self.client = chromadb.Client(Settings(
            persist_directory=persist_directory,
            anonymized_telemetry=False
        ))
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
        
    def add_documents(
        self,
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None
    ) -> None:
        """Add documents to the vector store."""
        if not documents:
            return
            
        # Generate embeddings
        embeddings = self.embedding_model.encode(documents).tolist()
        
        # Generate IDs if not provided
        if ids is None:
            ids = [f"doc_{i}" for i in range(len(documents))]
        
        # Add to collection
        self.collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        
    def query(
        self,
        query_text: str,
        language: str = "en",
        n_results: int = 3
    ) -> Dict[str, Any]:
        """Query the vector store and generate answer using OpenRouter."""
        
        # Generate query embedding
        query_embedding = self.embedding_model.encode([query_text]).tolist()[0]
        
        # Search in Chroma
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        
        # Extract relevant documents
        sources = []
        context_parts = []
        
        if results['documents'] and results['documents'][0]:
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                sources.append({
                    "content": doc,
                    "metadata": metadata
                })
                context_parts.append(doc)
        
        # Format context
        context = "\n\n".join(context_parts)
        
        # Generate answer using OpenRouter
        answer, tokens_used = self._generate_answer(query_text, context, language)
        
        return {
            "answer": answer,
            "sources": sources,
            "tokens_used": tokens_used
        }
    
    def _generate_answer(
        self,
        query: str,
        context: str,
        language: str
    ) -> tuple[str, int]:
        """Generate answer using OpenRouter API."""
        
        system_prompt = self._get_system_prompt(language)
        
        user_prompt = f"""Context from knowledge base:
{context}

Question: {query}

Please provide a helpful answer based on the context above."""
        
        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://najah-delivery-os.com",
            "X-Title": "Najah Delivery OS Assistant"
        }
        
        payload = {
            "model": self.openrouter_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            answer = data['choices'][0]['message']['content']
            tokens_used = data.get('usage', {}).get('total_tokens', 0)
            
            return answer, tokens_used
            
        except Exception as e:
            return f"Error generating answer: {str(e)}", 0
    
    def _get_system_prompt(self, language: str) -> str:
        """Get system prompt based on language."""
        if language == "ar":
            return """أنت مساعد ذكي لخدمة نجاح للتوصيل. مهمتك مساعدة العملاء بالإجابة على أسئلتهم حول خدمات التوصيل، السياسات، ساعات العمل، والمناطق المخدومة.

استخدم المعلومات المقدمة من قاعدة المعرفة للإجابة بدقة واحترافية. إذا لم تكن المعلومة متوفرة، أخبر العميل بأدب.

أجب باللغة العربية بأسلوب واضح ومهني."""
        else:
            return """You are an intelligent assistant for Najah Delivery Service. Your role is to help customers by answering questions about delivery services, policies, operating hours, and service areas.

Use the information provided from the knowledge base to answer accurately and professionally. If information is not available, politely inform the customer.

Respond in English with a clear and professional tone."""
    
    def get_collection_count(self) -> int:
        """Get the number of documents in the collection."""
        return self.collection.count()
