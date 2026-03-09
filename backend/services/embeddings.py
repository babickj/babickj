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
            resp = client.post(
                f"{self.base_url}/api/embed",
                json={"model": self.model, "input": text},
            )
            resp.raise_for_status()
            data = resp.json()
            # Ollama >= 0.1.26 returns {"embeddings": [[...float...]]}
            raw = data.get("embeddings") or data.get("embedding")
            if not raw:
                raise ValueError(f"Ollama returned empty embeddings for text: {text[:80]!r}")
            # Handle both nested [[...]] and flat [...] formats
            if isinstance(raw[0], list):
                return raw[0]
            return raw
