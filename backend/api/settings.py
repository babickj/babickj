"""Settings and health check endpoints."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from config import app_config, save_config, AppConfig
from services.llm_client import llm_client

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    ollama_host: Optional[str] = None
    llama_server_host: Optional[str] = None
    active_backend: Optional[str] = None
    embedding_model: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    retrieval_k: Optional[int] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


@router.get("/")
def get_settings():
    return app_config.model_dump()


@router.put("/")
def update_settings(req: SettingsUpdate):
    global app_config
    for field, val in req.model_dump(exclude_none=True).items():
        setattr(app_config, field, val)
    save_config(app_config)
    return app_config.model_dump()


@router.get("/health")
def health_check():
    ollama_ok = llm_client.check_ollama_health()
    llama_ok = llm_client.check_llama_server_health()
    models = []
    if ollama_ok:
        models = llm_client.list_ollama_models()
    return {
        "ollama": {"healthy": ollama_ok, "host": app_config.ollama_host},
        "llama_server": {"healthy": llama_ok, "host": app_config.llama_server_host},
        "active_backend": app_config.active_backend,
        "available_models": models,
    }
