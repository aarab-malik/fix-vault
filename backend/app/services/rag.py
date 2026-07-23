from app.models import User
from app.schemas import AskResponse, Citation, RelatedIncident
from app.services.credentials import get_chat_client, get_user_credentials
from app.services.openai_service import generate_grounded_answer
from app.services.pinecone_service import search_similar


def relevance_label(score: float) -> str:
    if score >= 0.82:
        return "Very similar"
    if score >= 0.72:
        return "Possibly related"
    return "Partially related"


def build_failed_fix_warnings(matches: list[dict], question: str) -> list[str]:
    warnings: list[str] = []
    q_lower = question.lower()
    for m in matches:
        if m.get("section") != "attempt" or m.get("outcome") != "failed":
            continue
        excerpt = (m.get("excerpt") or "").lower()
        if any(word in q_lower for word in excerpt.split()[:20]):
            warnings.append(
                f"You previously tried something similar for '{m.get('title')}': "
                f"{m.get('excerpt', '')[:200]} — that attempt was marked failed."
            )
    return warnings[:3]


async def ask_question(user: User, question: str) -> AskResponse:
    creds = get_user_credentials(user)
    chat_client = get_chat_client(creds.chat)
    matches = search_similar(creds, user.id, question, top_k=8)

    seen_incidents: set[str] = set()
    context_blocks: list[dict[str, str]] = []
    citations: list[Citation] = []

    for m in matches:
        iid = m.get("incident_id")
        if not iid or iid in seen_incidents:
            continue
        seen_incidents.add(iid)
        context_blocks.append({
            "title": m.get("title", "Unknown"),
            "section": m.get("section", "summary"),
            "text": m.get("excerpt", ""),
        })
        citations.append(Citation(
            incident_id=iid,
            title=m.get("title", "Unknown"),
            match_score=round(m.get("score", 0) * 100, 1),
            section=m.get("section", "summary"),
            excerpt=m.get("excerpt", "")[:300],
        ))

    answer = generate_grounded_answer(chat_client, creds.chat, question, context_blocks)
    warnings = build_failed_fix_warnings(matches, question)

    return AskResponse(answer=answer, citations=citations, failed_fix_warnings=warnings)


async def find_similar_incidents(user: User, query: str, top_k: int = 5) -> list[RelatedIncident]:
    creds = get_user_credentials(user)
    matches = search_similar(creds, user.id, query, top_k=top_k)

    seen: set[str] = set()
    results: list[RelatedIncident] = []
    for m in matches:
        iid = m.get("incident_id")
        if not iid or iid in seen:
            continue
        seen.add(iid)
        results.append(RelatedIncident(
            id=iid,
            title=m.get("title", "Unknown"),
            status=m.get("status", "unresolved"),
            similarity=round(m.get("score", 0) * 100, 1),
            relevance=relevance_label(m.get("score", 0)),
        ))
    return results
