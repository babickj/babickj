"""Chat/query endpoint with SSE streaming."""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

from models.agent import load_agent
from services.rag_engine import query_agent

router = APIRouter(prefix="/chat", tags=["chat"])


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    agent_id: str
    query: str
    history: Optional[List[Message]] = []


@router.post("/stream")
def chat_stream(req: ChatRequest):
    agent = load_agent(req.agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    history = [m.model_dump() for m in (req.history or [])]

    def event_stream():
        for event in query_agent(agent, req.query, history):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
