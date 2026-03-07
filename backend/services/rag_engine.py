"""RAG query engine: retrieve context, build prompt, stream response."""
from typing import Generator, List, Tuple
from services.document_processor import retrieve
from services.llm_client import llm_client
from models.agent import AgentConfig
from config import app_config


CORPUS_RELEVANCE_THRESHOLD = 0.35


def build_rag_prompt(
    agent: AgentConfig,
    query: str,
    chunks: List[dict],
) -> Tuple[List[dict], bool]:
    """Build messages list for LLM. Returns (messages, is_in_corpus)."""

    system_prompt = agent.system_prompt or agent.get_default_system_prompt()

    in_corpus = any(c["score"] >= CORPUS_RELEVANCE_THRESHOLD for c in chunks)

    if chunks and in_corpus:
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            excerpt = chunk["text"][:400].replace("\n", " ").strip()
            context_parts.append(
                f"[{i}] Source: {chunk['filename']}, Page {chunk['page']}\n"
                f"Excerpt: {excerpt}"
            )
        context_block = "\n\n".join(context_parts)

        user_message = (
            f"Using the following retrieved context from your knowledge base, "
            f"answer the question. Cite each source you use in the format: "
            f"[Source: <filename>, Page <N>, Excerpt: <brief quote>]\n\n"
            f"CONTEXT:\n{context_block}\n\n"
            f"QUESTION: {query}"
        )
    else:
        user_message = (
            f"QUESTION: {query}\n\n"
            f"Note: No relevant context was found in your knowledge base for this question. "
            f"Answer using your general knowledge but include the standard out-of-corpus caveat."
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    return messages, in_corpus


def query_agent(
    agent: AgentConfig,
    query: str,
    conversation_history: List[dict] = None,
) -> Generator[dict, None, None]:
    """
    Stream a RAG response. Yields dicts:
      {"type": "citations", "data": [...]}
      {"type": "token", "data": "..."}
      {"type": "done", "in_corpus": bool}
      {"type": "error", "data": "..."}
    """
    try:
        chunks = retrieve(agent.id, query, k=app_config.retrieval_k)
        messages, in_corpus = build_rag_prompt(agent, query, chunks)

        # Inject conversation history (last 6 turns to stay within context)
        if conversation_history:
            history_slice = conversation_history[-6:]
            messages = [messages[0]] + history_slice + [messages[-1]]

        # Yield citations first so UI can render them immediately
        if chunks and in_corpus:
            citations = [
                {
                    "filename": c["filename"],
                    "page": c["page"],
                    "excerpt": c["text"][:200].strip(),
                    "score": round(c["score"], 3),
                    "rel_path": c["rel_path"],
                }
                for c in chunks
                if c["score"] >= CORPUS_RELEVANCE_THRESHOLD
            ]
            yield {"type": "citations", "data": citations}
        else:
            yield {"type": "citations", "data": []}

        # Stream LLM tokens
        for token in llm_client.chat_stream(
            model=agent.model_path,
            messages=messages,
            temperature=app_config.temperature,
            max_tokens=app_config.max_tokens,
        ):
            yield {"type": "token", "data": token}

        yield {"type": "done", "in_corpus": in_corpus}

    except Exception as e:
        yield {"type": "error", "data": str(e)}
