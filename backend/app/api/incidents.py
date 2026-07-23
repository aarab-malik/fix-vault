from fastapi import APIRouter, HTTPException, Query, status

from app.dependencies import ChatUser, CredentialsUser, CurrentUser, DbSession, SemanticUser
from app.schemas import (
    AskRequest,
    AskResponse,
    IncidentCreateRequest,
    IncidentDetail,
    IncidentDraftRequest,
    IncidentDraftResponse,
    IncidentListResponse,
    IncidentSummary,
    IncidentUpdateRequest,
    SimilarIncidentsResponse,
    AttemptResponse,
)
from app.services.credentials import get_user_credentials
from app.services.incidents import (
    create_incident,
    delete_incident,
    get_dashboard_stats,
    get_incident,
    list_incidents,
    update_incident,
)
from app.services.openai_service import extract_incident_draft
from app.services.pinecone_service import delete_incident_vectors, index_incident
from app.services.rag import ask_question, find_similar_incidents

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _to_summary(incident) -> IncidentSummary:
    return IncidentSummary(
        id=incident.id,
        title=incident.title,
        status=incident.status,
        stop_code=incident.stop_code,
        tags=[t.name for t in incident.tags],
        created_at=incident.created_at,
        updated_at=incident.updated_at,
    )


def _to_detail(incident) -> IncidentDetail:
    return IncidentDetail(
        **_to_summary(incident).model_dump(),
        problem=incident.problem,
        environment=incident.environment,
        error_messages=incident.error_messages,
        root_cause=incident.root_cause,
        final_fix=incident.final_fix,
        original_notes=incident.original_notes,
        attempts=[
            AttemptResponse(id=a.id, action=a.action, result=a.result, outcome=a.outcome)
            for a in incident.attempts
        ],
    )


@router.get("/dashboard")
async def dashboard(user: CurrentUser, db: DbSession):
    stats = await get_dashboard_stats(db, user.id)
    return {
        "total": stats["total"],
        "unresolved": stats["unresolved"],
        "recent": [_to_summary(i) for i in stats["recent"]],
        "recurring_tags": stats["recurring_tags"],
    }


@router.get("", response_model=IncidentListResponse)
async def get_incidents(
    user: CurrentUser,
    db: DbSession,
    status: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
):
    items, total = await list_incidents(db, user.id, status=status, tag=tag, search=search, limit=limit, offset=offset)
    return IncidentListResponse(items=[_to_summary(i) for i in items], total=total)


@router.post("/draft", response_model=IncidentDraftResponse)
async def draft_incident(body: IncidentDraftRequest, user: ChatUser):
    from app.services.credentials import get_chat_client, get_chat_credentials
    from app.services.openai_service import extract_incident_draft

    chat = get_chat_credentials(user)
    client = get_chat_client(chat)
    return extract_incident_draft(client, chat, body.notes)


@router.post("/similar", response_model=SimilarIncidentsResponse)
async def similar_incidents(
    body: IncidentDraftRequest,
    user: SemanticUser,
):
    results = await find_similar_incidents(user, body.notes)
    return SimilarIncidentsResponse(incidents=results)


@router.post("", response_model=IncidentDetail, status_code=status.HTTP_201_CREATED)
async def create(body: IncidentCreateRequest, user: SemanticUser, db: DbSession):
    incident = await create_incident(db, user.id, body.model_dump())
    creds = get_user_credentials(user)
    index_incident(creds, user.id, incident)
    return _to_detail(incident)


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_one(incident_id: str, user: CurrentUser, db: DbSession):
    incident = await get_incident(db, user.id, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _to_detail(incident)


@router.patch("/{incident_id}", response_model=IncidentDetail)
async def update(incident_id: str, body: IncidentUpdateRequest, user: SemanticUser, db: DbSession):
    incident = await update_incident(db, user.id, incident_id, body.model_dump(exclude_unset=True))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    creds = get_user_credentials(user)
    delete_incident_vectors(creds, user.id, incident_id)
    index_incident(creds, user.id, incident)
    return _to_detail(incident)


@router.delete("/{incident_id}")
async def remove(incident_id: str, user: SemanticUser, db: DbSession):
    creds = get_user_credentials(user)
    deleted = await delete_incident(db, user.id, incident_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Incident not found")
    delete_incident_vectors(creds, user.id, incident_id)
    return {"ok": True}


@router.post("/reindex-all")
async def reindex_all(user: SemanticUser, db: DbSession):
    from app.services.incidents import list_incidents

    items, _ = await list_incidents(db, user.id, limit=500)
    creds = get_user_credentials(user)
    count = 0
    for incident in items:
        delete_incident_vectors(creds, user.id, incident.id)
        index_incident(creds, user.id, incident)
        count += 1
    return {"ok": True, "reindexed": count}


@router.post("/{incident_id}/reindex", response_model=IncidentDetail)
async def reindex(incident_id: str, user: SemanticUser, db: DbSession):
    incident = await get_incident(db, user.id, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    creds = get_user_credentials(user)
    delete_incident_vectors(creds, user.id, incident_id)
    index_incident(creds, user.id, incident)
    return _to_detail(incident)
