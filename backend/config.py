"""Application configuration with defaults and persistence."""
import json
import os
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

CONFIG_DIR = Path.home() / ".edgerunner"
CONFIG_FILE = CONFIG_DIR / "config.json"
AGENTS_DIR = CONFIG_DIR / "agents"
CHROMA_DIR = CONFIG_DIR / "chromadb"

CONFIG_DIR.mkdir(parents=True, exist_ok=True)
AGENTS_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)


class AppConfig(BaseModel):
    ollama_host: str = "http://localhost:11434"
    llama_server_host: str = "http://localhost:8080"
    active_backend: str = "ollama"  # "ollama" | "llama_server"
    embedding_model: str = "nomic-embed-text"
    chunk_size: int = 1000
    chunk_overlap: int = 150
    retrieval_k: int = 6
    temperature: float = 0.1
    max_tokens: int = 2048


def load_config() -> AppConfig:
    if CONFIG_FILE.exists():
        try:
            data = json.loads(CONFIG_FILE.read_text())
            return AppConfig(**data)
        except Exception:
            pass
    return AppConfig()


def save_config(config: AppConfig) -> None:
    CONFIG_FILE.write_text(config.model_dump_json(indent=2))


app_config = load_config()
