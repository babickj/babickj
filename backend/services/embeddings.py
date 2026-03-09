"""Embedding service using nomic-embed-text via Ollama."""
import httpx
import numpy as np
from typing import List
from config import app_config


class OllamaEmbeddings:
    """Generate embeddings using nomic-embed-text through Ollama."""

    def __init__(self, model: str = None):
        self.model = model or app_config.embedding_model
        self.base_url = app_config.ollama_host

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        for text in texts:
            emb = self._embed(text)
            embeddings.append(emb)
        return embeddings

    def embed_query(self, text: str) -> List[float]:
        return self._embed(text)

    def _embed(self, text: str) -> List[float]:
        with httpx.Client(timeout=60.0) as client:
            # Try new /api/embed endpoint first (Ollama >= 0.1.26)
            resp = client.post(
                f"{self.base_url}/api/embed",
                json={"model": self.model, "input": text},
            )
            if resp.status_code == 200:
                data = resp.json()
                # New API returns {"embeddings": [[...float...]]}
                embeddings = data.get("embeddings")
                if embeddings:
                    return embeddings[0]
            # Fall back to legacy /api/embeddings endpoint
            resp = client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.model, "prompt": text},
            )
            resp.raise_for_status()
            return resp.json()["embedding"]
