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
        import logging
        log = logging.getLogger(__name__)
        with httpx.Client(timeout=60.0) as client:
            # Try new /api/embed endpoint first (Ollama >= 0.1.26)
            resp = client.post(
                f"{self.base_url}/api/embed",
                json={"model": self.model, "input": text},
            )
            log.warning("EMBED /api/embed status=%s body=%s", resp.status_code, resp.text[:300])
            if resp.status_code == 200:
                data = resp.json()
                # New API returns {"embeddings": [[...float...]]}
                # Some versions return flat list, others return nested list
                raw = data.get("embeddings") or data.get("embedding")
                if raw:
                    # Handle both [[...]] and [...] formats
                    if isinstance(raw[0], list):
                        return raw[0]
                    return raw
            # Fall back to legacy /api/embeddings endpoint
            resp2 = client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.model, "prompt": text},
            )
            log.warning("EMBED /api/embeddings status=%s body=%s", resp2.status_code, resp2.text[:300])
            resp2.raise_for_status()
            return resp2.json()["embedding"]
