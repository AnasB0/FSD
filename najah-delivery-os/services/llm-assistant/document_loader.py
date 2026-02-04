"""Knowledge base document loader."""
import os
import logging
from typing import List, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)


def load_knowledge_base(kb_dir: str) -> List[Dict[str, Any]]:
    """
    Load knowledge base documents from markdown files.
    
    Args:
        kb_dir: Directory containing markdown files
        
    Returns:
        List of documents with content and metadata
    """
    logger.info(f"Loading knowledge base from: {kb_dir}")
    
    documents = []
    kb_path = Path(kb_dir)
    
    if not kb_path.exists():
        logger.warning(f"Knowledge base directory not found: {kb_dir}")
        return documents
    
    # Find all markdown files
    md_files = list(kb_path.glob("**/*.md"))
    logger.info(f"Found {len(md_files)} markdown files")
    
    for md_file in md_files:
        try:
            # Read file content
            with open(md_file, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Extract title from first heading if available
            title = md_file.stem
            lines = content.split("\n")
            for line in lines:
                if line.startswith("# "):
                    title = line.replace("# ", "").strip()
                    break
            
            # Create document
            doc = {
                "content": content,
                "metadata": {
                    "source": str(md_file.relative_to(kb_path)),
                    "title": title,
                    "file_path": str(md_file)
                }
            }
            
            documents.append(doc)
            logger.info(f"Loaded: {doc['metadata']['source']} ({len(content)} chars)")
            
        except Exception as e:
            logger.error(f"Error loading {md_file}: {str(e)}")
            continue
    
    logger.info(f"Successfully loaded {len(documents)} documents")
    return documents
