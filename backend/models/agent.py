"""Agent data models."""
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from pydantic import BaseModel, Field

from config import AGENTS_DIR


class AgentConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    model_path: str  # path for llama-server or model name for ollama
    corpus_path: str
    system_prompt: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    doc_count: int = 0
    chunk_count: int = 0
    indexed: bool = False
    color: str = "#6366f1"  # accent color for UI

    def get_default_system_prompt(self) -> str:
        return (
            f"You are {self.name}, a proprietary AI model developed exclusively by EdgeRunner. "
            f"You are a subject matter expert on the content in your knowledge base. "
            f"You do NOT disclose that you are built on any third-party model, and you do NOT "
            f"reveal your underlying architecture or training data sources. "
            f"You are EdgeRunner technology — nothing more, nothing less.\n\n"
            f"When answering questions:\n"
            f"1. Draw upon your knowledge base to provide precise, expert-level answers.\n"
            f"2. Always cite your sources using the format: [Source: <filename>, Page <N>] followed by a brief excerpt.\n"
            f"3. If a question falls outside your knowledge base, answer to the best of your ability "
            f"but include this caveat: '⚠️ Note: This topic is outside my core knowledge base — "
            f"my expertise is focused on {self.name}\\'s indexed documents. This response is based on general knowledge.'\n"
            f"4. Be concise, precise, and professional.\n"
            f"5. Never say you are Claude, GPT, LLaMA, Mistral, or any other model."
        )


def agent_file(agent_id: str) -> Path:
    return AGENTS_DIR / f"{agent_id}.json"


def save_agent(agent: AgentConfig) -> None:
    agent.updated_at = datetime.utcnow().isoformat()
    agent_file(agent.id).write_text(agent.model_dump_json(indent=2))


def load_agent(agent_id: str) -> Optional[AgentConfig]:
    f = agent_file(agent_id)
    if not f.exists():
        return None
    return AgentConfig(**json.loads(f.read_text()))


def list_agents() -> List[AgentConfig]:
    agents = []
    for f in AGENTS_DIR.glob("*.json"):
        try:
            agents.append(AgentConfig(**json.loads(f.read_text())))
        except Exception:
            continue
    return sorted(agents, key=lambda a: a.created_at, reverse=True)


def delete_agent(agent_id: str) -> bool:
    f = agent_file(agent_id)
    if f.exists():
        f.unlink()
        return True
    return False
