import os
import glob
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ingest_knowledge_base(rag_instance, kb_dir: Optional[str] = None):
    """Ingest knowledge base documents into ChromaRAG."""
    
    if kb_dir is None:
        kb_dir = os.getenv("KB_DATA_DIR", "./data/kb")
    
    if not os.path.exists(kb_dir):
        logger.warning(f"Knowledge base directory not found: {kb_dir}")
        return
    
    # Find all markdown files
    md_files = glob.glob(os.path.join(kb_dir, "**/*.md"), recursive=True)
    
    if not md_files:
        logger.warning(f"No markdown files found in {kb_dir}")
        return
    
    logger.info(f"Found {len(md_files)} markdown files to ingest")
    
    for md_file in md_files:
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Split content into sections (by headers)
            sections = split_markdown_sections(content)
            
            # Prepare documents and metadata
            documents = []
            metadatas = []
            ids = []
            
            for i, section in enumerate(sections):
                if section.strip():
                    documents.append(section)
                    metadatas.append({
                        "source": os.path.basename(md_file),
                        "section": i,
                        "file_path": md_file
                    })
                    ids.append(f"{os.path.basename(md_file)}_section_{i}")
            
            # Add to vector store
            if documents:
                rag_instance.add_documents(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
                logger.info(f"Ingested {len(documents)} sections from {os.path.basename(md_file)}")
        
        except Exception as e:
            logger.error(f"Error ingesting {md_file}: {e}")


def split_markdown_sections(content: str, min_length: int = 100) -> list:
    """Split markdown content into sections by headers."""
    
    sections = []
    current_section = []
    
    lines = content.split('\n')
    
    for line in lines:
        # Check if line is a header (starts with #)
        if line.strip().startswith('#'):
            # Save previous section if it exists and meets minimum length
            if current_section:
                section_text = '\n'.join(current_section).strip()
                if len(section_text) >= min_length:
                    sections.append(section_text)
            # Start new section with the header
            current_section = [line]
        else:
            current_section.append(line)
    
    # Add the last section
    if current_section:
        section_text = '\n'.join(current_section).strip()
        if len(section_text) >= min_length:
            sections.append(section_text)
    
    return sections


if __name__ == "__main__":
    from rag import ChromaRAG
    from dotenv import load_dotenv
    
    load_dotenv()
    
    logger.info("Starting knowledge base ingestion...")
    
    persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    embedding_model = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    
    rag = ChromaRAG(
        persist_directory=persist_dir,
        embedding_model=embedding_model
    )
    
    ingest_knowledge_base(rag)
    
    doc_count = rag.get_collection_count()
    logger.info(f"Ingestion complete. Total documents in store: {doc_count}")
