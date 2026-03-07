"""LLM client supporting both Ollama and llama-server backends."""
import httpx
import json
from typing import Generator, Optional
from config import app_config


class LLMClient:
    """Unified client for Ollama and llama-server (llama.cpp HTTP server)."""

    def chat_stream(
        self,
        model: str,
        messages: list,
        temperature: float = None,
        max_tokens: int = None,
    ) -> Generator[str, None, None]:
        temperature = temperature if temperature is not None else app_config.temperature
        max_tokens = max_tokens or app_config.max_tokens
        backend = app_config.active_backend

        if backend == "ollama":
            yield from self._ollama_stream(model, messages, temperature, max_tokens)
        else:
            yield from self._llama_server_stream(model, messages, temperature, max_tokens)

    def _ollama_stream(
        self, model: str, messages: list, temperature: float, max_tokens: int
    ) -> Generator[str, None, None]:
        url = f"{app_config.ollama_host}/api/chat"
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        with httpx.Client(timeout=120.0) as client:
            with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            token = data.get("message", {}).get("content", "")
                            if token:
                                yield token
                            if data.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue

    def _llama_server_stream(
        self, model: str, messages: list, temperature: float, max_tokens: int
    ) -> Generator[str, None, None]:
        url = f"{app_config.llama_server_host}/v1/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        with httpx.Client(timeout=120.0) as client:
            with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except (json.JSONDecodeError, KeyError):
                            continue

    def list_ollama_models(self) -> list:
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(f"{app_config.ollama_host}/api/tags")
                resp.raise_for_status()
                return [m["name"] for m in resp.json().get("models", [])]
        except Exception:
            return []

    def check_ollama_health(self) -> bool:
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(f"{app_config.ollama_host}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    def check_llama_server_health(self) -> bool:
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(f"{app_config.llama_server_host}/health")
                return resp.status_code == 200
        except Exception:
            return False


llm_client = LLMClient()
