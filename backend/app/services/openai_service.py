import json
import math
from typing import Any

from openai import OpenAI

from app.schemas import AttemptSchema, IncidentDraftResponse
from app.services.credentials import (
    ChatCredentials,
    EmbeddingCredentials,
    UserCredentials,
    get_chat_client,
    get_embedding_client,
    resolve_model_name,
)

EXTRACTION_PROMPT = """You are a technical incident parser. Convert rough troubleshooting notes into a structured incident record.

Return JSON with these fields:
- title: short problem title
- problem: clear problem description
- environment: OS, tools, cloud, hardware (or null)
- error_messages: any error text mentioned (or null)
- root_cause: identified cause if known (or null)
- final_fix: working fix if resolved (or null)
- status: "resolved" or "unresolved"
- tags: array of short tags (e.g. Windows, Docker, SSH)
- attempts: array of {action, result, outcome} where outcome is "successful", "failed", or "unknown"
"""


def _l2_normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vector))
    if norm == 0:
        return vector
    return [x / norm for x in vector]


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value or None
    if isinstance(value, list):
        parts = [_as_text(v) for v in value]
        joined = "\n".join(p for p in parts if p)
        return joined or None
    if isinstance(value, dict):
        joined = "\n".join(f"{k}: {_as_text(v)}" for k, v in value.items() if _as_text(v))
        return joined or None
    return str(value)


def _as_tags(value: Any) -> list[str]:
    if isinstance(value, str):
        return [t.strip() for t in value.split(",") if t.strip()]
    if isinstance(value, list):
        return [str(t).strip() for t in value if str(t).strip()]
    return []


def _as_attempts(value: Any) -> list[AttemptSchema]:
    if not isinstance(value, list):
        return []
    attempts: list[AttemptSchema] = []
    for a in value:
        if isinstance(a, str):
            attempts.append(AttemptSchema(action=a, outcome="unknown"))
            continue
        if isinstance(a, dict):
            outcome = str(a.get("outcome", "unknown")).lower()
            if outcome not in ("successful", "failed", "unknown"):
                outcome = "unknown"
            attempts.append(AttemptSchema(
                action=_as_text(a.get("action")) or "",
                result=_as_text(a.get("result")),
                outcome=outcome,
            ))
    return [a for a in attempts if a.action]


def _parse_draft_content(content: str) -> IncidentDraftResponse:
    try:
        data: dict[str, Any] = json.loads(content)
    except json.JSONDecodeError:
        data = {}
    status = str(data.get("status", "unresolved")).lower()
    if status not in ("resolved", "unresolved"):
        status = "unresolved"
    return IncidentDraftResponse(
        title=_as_text(data.get("title")) or "Untitled incident",
        problem=_as_text(data.get("problem")) or content[:500],
        environment=_as_text(data.get("environment")),
        error_messages=_as_text(data.get("error_messages")),
        root_cause=_as_text(data.get("root_cause")),
        final_fix=_as_text(data.get("final_fix")),
        status=status,
        tags=_as_tags(data.get("tags")),
        attempts=_as_attempts(data.get("attempts")),
    )


def extract_incident_draft(client: OpenAI, creds: ChatCredentials, notes: str) -> IncidentDraftResponse:
    model = resolve_model_name(creds.base_url, creds.model)
    messages = [
        {"role": "system", "content": EXTRACTION_PROMPT},
        {"role": "user", "content": notes},
    ]
    try:
        response = client.chat.completions.create(
            model=model,
            response_format={"type": "json_object"},
            messages=messages,
        )
    except Exception:
        response = client.chat.completions.create(
            model=model,
            messages=messages + [
                {"role": "system", "content": "Respond with valid JSON only, no markdown fences."},
            ],
        )
    content = response.choices[0].message.content or "{}"
    return _parse_draft_content(content)


def create_embedding(client: OpenAI, creds: EmbeddingCredentials, text: str) -> list[float]:
    model = resolve_model_name(creds.base_url, creds.model)
    kwargs: dict[str, Any] = {"input": text, "model": model}
    if creds.dimensions:
        kwargs["dimensions"] = creds.dimensions
    response = client.embeddings.create(**kwargs)
    vector = response.data[0].embedding
    if "gemini-embedding" in model and creds.dimensions != 3072:
        return _l2_normalize(vector)
    return vector


def generate_grounded_answer(
    client: OpenAI,
    creds: ChatCredentials,
    question: str,
    context_blocks: list[dict[str, str]],
) -> str:
    if not context_blocks:
        return (
            "I could not find any matching incidents in your archive. "
            "Try saving this problem first, or rephrase your question."
        )
    context = "\n\n---\n\n".join(
        f"[{b['title']} — {b['section']}]\n{b['text']}" for b in context_blocks
    )
    model = resolve_model_name(creds.base_url, creds.model)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You answer questions about the user's personal bug-fix archive. "
                    "Only use the provided incident excerpts. If the archive has no confirmed fix, say so. "
                    "Mention what was tried and whether it failed. Do not invent fixes."
                ),
            },
            {
                "role": "user",
                "content": f"Question: {question}\n\nArchive excerpts:\n{context}",
            },
        ],
    )
    return response.choices[0].message.content or "No answer generated."


def extract_incident_from_credentials(creds: UserCredentials, notes: str) -> IncidentDraftResponse:
    client = get_chat_client(creds.chat)
    return extract_incident_draft(client, creds.chat, notes)
