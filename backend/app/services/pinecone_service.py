from app.config import get_settings
from app.models import Incident
from app.services.credentials import UserCredentials, get_pinecone_index
from app.services.openai_service import create_embedding
from app.services.credentials import get_openai_client


SECTIONS = ("summary", "root_cause", "attempt", "final_fix")


def _section_text(incident: Incident, section: str, attempt_idx: int = 0) -> str | None:
    if section == "summary":
        parts = [incident.title, incident.problem, incident.environment or "", incident.error_messages or ""]
        text = "\n".join(p for p in parts if p)
        return text or None
    if section == "root_cause":
        return incident.root_cause
    if section == "final_fix":
        return incident.final_fix
    if section == "attempt" and incident.attempts:
        if attempt_idx < len(incident.attempts):
            a = incident.attempts[attempt_idx]
            return f"{a.action}\n{a.result or ''}\nOutcome: {a.outcome}"
    return None


def vector_id(incident_id: str, section: str, attempt_idx: int = 0) -> str:
    if section == "attempt":
        return f"{incident_id}:attempt:{attempt_idx}"
    return f"{incident_id}:{section}"


def index_incident(creds: UserCredentials, user_id: str, incident: Incident) -> None:
    client = get_openai_client(creds)
    index = get_pinecone_index(creds)
    settings = get_settings()
    tags = [t.name for t in incident.tags]
    vectors = []

    for section in ("summary", "root_cause", "final_fix"):
        text = _section_text(incident, section)
        if not text:
            continue
        embedding = create_embedding(client, text)
        vectors.append({
            "id": vector_id(incident.id, section),
            "values": embedding,
            "metadata": {
                "user_id": user_id,
                "incident_id": incident.id,
                "section": section,
                "title": incident.title,
                "status": incident.status,
                "tags": tags,
                "excerpt": text[:500],
            },
        })

    for i, _ in enumerate(incident.attempts):
        text = _section_text(incident, "attempt", i)
        if not text:
            continue
        a = incident.attempts[i]
        embedding = create_embedding(client, text)
        vectors.append({
            "id": vector_id(incident.id, "attempt", i),
            "values": embedding,
            "metadata": {
                "user_id": user_id,
                "incident_id": incident.id,
                "section": "attempt",
                "title": incident.title,
                "status": incident.status,
                "tags": tags,
                "excerpt": text[:500],
                "outcome": a.outcome,
            },
        })

    if vectors:
        index.upsert(vectors=vectors, namespace=user_id)


def delete_incident_vectors(creds: UserCredentials, user_id: str, incident_id: str) -> None:
    index = get_pinecone_index(creds)
    ids = [vector_id(incident_id, s) for s in ("summary", "root_cause", "final_fix")]
    for i in range(20):
        ids.append(vector_id(incident_id, "attempt", i))
    try:
        index.delete(ids=ids, namespace=user_id)
    except Exception:
        pass


def search_similar(
    creds: UserCredentials,
    user_id: str,
    query: str,
    top_k: int = 8,
    status_filter: str | None = None,
    tag_filter: str | None = None,
) -> list[dict]:
    client = get_openai_client(creds)
    index = get_pinecone_index(creds)
    embedding = create_embedding(client, query)

    pinecone_filter: dict = {"user_id": {"$eq": user_id}}
    if status_filter:
        pinecone_filter["status"] = {"$eq": status_filter}
    if tag_filter:
        pinecone_filter["tags"] = {"$in": [tag_filter]}

    results = index.query(
        vector=embedding,
        top_k=top_k,
        namespace=user_id,
        include_metadata=True,
        filter=pinecone_filter,
    )
    matches = []
    for match in results.matches or []:
        meta = match.metadata or {}
        matches.append({
            "incident_id": meta.get("incident_id"),
            "title": meta.get("title", "Unknown"),
            "section": meta.get("section", "summary"),
            "excerpt": meta.get("excerpt", ""),
            "score": float(match.score or 0),
            "status": meta.get("status"),
            "outcome": meta.get("outcome"),
        })
    return matches
