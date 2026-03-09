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

    # nomic-embed-text num_ctx=8192; 4000 chars ≈ 1000 tokens, well within limit
    _MAX_CHARS = 4000

    def _embed(self, text: str) -> List[float]:
        text = (text or "").strip()
        if not text:
            raise ValueError("Cannot embed empty text")
        text = text[: self._MAX_CHARS]
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                f"{self.base_url}/api/embed",
                json={"model": self.model, "input": text},
            )
            if not resp.is_success:
                raise httpx.HTTPStatusError(
                    f"{resp.status_code} from /api/embed: {resp.text[:300]}",
                    request=resp.request,
                    response=resp,
                )
            data = resp.json()
            # Ollama >= 0.1.26 returns {"embeddings": [[...float...]]}
            raw = data.get("embeddings") or data.get("embedding")
            if not raw:
                raise ValueError(f"Ollama returned empty embeddings for text: {text[:80]!r}")
            # Handle both nested [[...]] and flat [...] formats
            if isinstance(raw[0], list):
                return raw[0]
            return raw
