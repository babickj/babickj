"""Agent CRUD endpoints."""
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

from models.agent import (
    AgentConfig, save_agent, load_agent,
    list_agents, delete_agent,
)
from services.document_processor import (
    index_corpus, delete_collection,
    discover_documents,
)

router = APIRouter(prefix="/agents", tags=["agents"])


class CreateAgentRequest(BaseModel):
    name: str
    description: str = ""
    model_path: str
    corpus_path: str
    system_prompt: str = ""
    color: str = "#6366f1"


class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    model_path: Optional[str] = None
    corpus_path: Optional[str] = None
    system_prompt: Optional[str] = None
    color: Optional[str] = None


@router.get("/")
def get_agents():
    return [a.model_dump() for a in list_agents()]


@router.post("/")
def create_agent(req: CreateAgentRequest):
    agent = AgentConfig(
        name=req.name,
        description=req.description,
        model_path=req.model_path,
        corpus_path=req.corpus_path,
        system_prompt=req.system_prompt or "",
        color=req.color,
    )
    if not agent.system_prompt:
        agent.system_prompt = agent.get_default_system_prompt()
    save_agent(agent)
    return agent.model_dump()


@router.get("/{agent_id}")
def get_agent(agent_id: str):
    agent = load_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    return agent.model_dump()


@router.put("/{agent_id}")
def update_agent(agent_id: str, req: UpdateAgentRequest):
    agent = load_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    for field, val in req.model_dump(exclude_none=True).items():
        setattr(agent, field, val)
    save_agent(agent)
    return agent.model_dump()


@router.delete("/{agent_id}")
def remove_agent(agent_id: str):
    agent = load_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    delete_collection(agent_id)
    delete_agent(agent_id)
    return {"ok": True}


@router.get("/{agent_id}/documents")
def list_documents(agent_id: str):
    agent = load_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    docs = discover_documents(agent.corpus_path)
    return [{"name": d.name, "path": str(d), "size": d.stat().st_size} for d in docs]


@router.post("/{agent_id}/index")
def index_agent(agent_id: str):
    """Trigger corpus indexing with SSE progress stream."""
    agent = load_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    def event_stream():
        progress_events = []

        def collect_progress(event: dict):
            progress_events.append(event)

        # Run indexing in-process (blocking but streamed via SSE)
        import threading

        result = {"doc_count": 0, "chunk_count": 0, "error": None}

        def run():
            try:
                d, c = index_corpus(agent_id, agent.corpus_path, collect_progress)
                result["doc_count"] = d
                result["chunk_count"] = c
            except Exception as e:
                result["error"] = str(e)

        thread = threading.Thread(target=run)
        thread.start()

        sent = 0
        import time
        while thread.is_alive() or sent < len(progress_events):
            while sent < len(progress_events):
                evt = progress_events[sent]
                yield f"data: {json.dumps(evt)}\n\n"
                sent += 1
            time.sleep(0.05)

        # Final result
        if result["error"]:
            yield f"data: {json.dumps({'stage': 'error', 'error': result['error']})}\n\n"
        else:
            # Update agent metadata
            agent.doc_count = result["doc_count"]
            agent.chunk_count = result["chunk_count"]
            agent.indexed = True
            save_agent(agent)
            yield f"data: {json.dumps({'stage': 'complete', 'doc_count': result['doc_count'], 'chunk_count': result['chunk_count']})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
