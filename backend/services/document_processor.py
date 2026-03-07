"""Document ingestion: parse, chunk, and index into ChromaDB."""
import os
import re
from pathlib import Path
from typing import List, Tuple, Optional, Generator
import chromadb
from chromadb.config import Settings

from config import app_config, CHROMA_DIR
from services.embeddings import OllamaEmbeddings


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".markdown"}


def get_chroma_client() -> chromadb.Client:
    return chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False),
    )


def get_collection(agent_id: str):
    client = get_chroma_client()
    collection_name = f"agent_{agent_id.replace('-', '_')}"
    try:
        return client.get_collection(name=collection_name)
    except Exception:
        return client.create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )


def delete_collection(agent_id: str) -> None:
    client = get_chroma_client()
    collection_name = f"agent_{agent_id.replace('-', '_')}"
    try:
        client.delete_collection(name=collection_name)
    except Exception:
        pass


def extract_text_pdf(file_path: Path) -> List[Tuple[str, int]]:
    """Returns list of (text, page_number) tuples."""
    from pypdf import PdfReader
    reader = PdfReader(str(file_path))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            pages.append((text, i))
    return pages


def extract_text_docx(file_path: Path) -> List[Tuple[str, int]]:
    from docx import Document
    doc = Document(str(file_path))
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    # Simulate pages by splitting on form feed or every ~3000 chars
    chunks = [full_text[i:i+3000] for i in range(0, len(full_text), 3000)]
    return [(chunk, i+1) for i, chunk in enumerate(chunks)]


def extract_text_plain(file_path: Path) -> List[Tuple[str, int]]:
    text = file_path.read_text(encoding="utf-8", errors="replace")
    chunks = [text[i:i+3000] for i in range(0, len(text), 3000)]
    return [(chunk, i+1) for i, chunk in enumerate(chunks)]


def extract_text(file_path: Path) -> List[Tuple[str, int]]:
    ext = file_path.suffix.lower()
    if ext == ".pdf":
        return extract_text_pdf(file_path)
    elif ext == ".docx":
        return extract_text_docx(file_path)
    elif ext in {".txt", ".md", ".markdown"}:
        return extract_text_plain(file_path)
    return []


def chunk_text(text: str, chunk_size: int = None, overlap: int = None) -> List[str]:
    chunk_size = chunk_size or app_config.chunk_size
    overlap = overlap or app_config.chunk_overlap
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap
    return [c for c in chunks if len(c.strip()) > 50]


def discover_documents(corpus_path: str) -> List[Path]:
    root = Path(corpus_path)
    if not root.exists():
        return []
    docs = []
    for ext in SUPPORTED_EXTENSIONS:
        docs.extend(root.rglob(f"*{ext}"))
    return sorted(docs)


def index_corpus(
    agent_id: str,
    corpus_path: str,
    progress_callback=None,
) -> Tuple[int, int]:
    """Index all documents in corpus. Returns (doc_count, chunk_count)."""
    embedder = OllamaEmbeddings()
    collection = get_collection(agent_id)

    # Clear existing documents
    try:
        existing = collection.get()
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    documents = discover_documents(corpus_path)
    total_docs = len(documents)
    total_chunks = 0

    for doc_idx, doc_path in enumerate(documents):
        filename = doc_path.name
        rel_path = str(doc_path.relative_to(Path(corpus_path)))

        if progress_callback:
            progress_callback({
                "stage": "extracting",
                "file": filename,
                "doc_index": doc_idx,
                "total_docs": total_docs,
                "chunks_so_far": total_chunks,
            })

        try:
            pages = extract_text(doc_path)
        except Exception as e:
            if progress_callback:
                progress_callback({"stage": "error", "file": filename, "error": str(e)})
            continue

        for page_text, page_num in pages:
            chunks = chunk_text(page_text)
            for chunk_idx, chunk in enumerate(chunks):
                chunk_id = f"{agent_id}::{rel_path}::p{page_num}::c{chunk_idx}"

                if progress_callback:
                    progress_callback({
                        "stage": "embedding",
                        "file": filename,
                        "page": page_num,
                        "doc_index": doc_idx,
                        "total_docs": total_docs,
                        "chunks_so_far": total_chunks,
                    })

                try:
                    embedding = embedder.embed_query(chunk)
                    collection.add(
                        ids=[chunk_id],
                        embeddings=[embedding],
                        documents=[chunk],
                        metadatas=[{
                            "filename": filename,
                            "rel_path": rel_path,
                            "page": page_num,
                            "chunk_index": chunk_idx,
                        }],
                    )
                    total_chunks += 1
                except Exception as e:
                    if progress_callback:
                        progress_callback({"stage": "error", "file": filename, "error": str(e)})

    return total_docs, total_chunks


def retrieve(agent_id: str, query: str, k: int = None) -> List[dict]:
    """Retrieve top-k relevant chunks for a query."""
    k = k or app_config.retrieval_k
    embedder = OllamaEmbeddings()
    collection = get_collection(agent_id)

    try:
        query_embedding = embedder.embed_query(query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        return []

    chunks = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append({
            "text": doc,
            "filename": meta.get("filename", "Unknown"),
            "page": meta.get("page", 1),
            "rel_path": meta.get("rel_path", ""),
            "score": 1 - dist,  # cosine similarity
        })

    return chunks
