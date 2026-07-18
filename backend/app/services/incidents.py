from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Attempt, Incident, IncidentTag, Tag
from app.schemas import AttemptSchema
from app.utils.text import slugify_stop_code


async def get_or_create_tags(db: AsyncSession, user_id: str, tag_names: list[str]) -> list[Tag]:
    tags: list[Tag] = []
    for name in tag_names:
        clean = name.strip()
        if not clean:
            continue
        result = await db.execute(
            select(Tag).where(Tag.user_id == user_id, Tag.name == clean)
        )
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(user_id=user_id, name=clean)
            db.add(tag)
            await db.flush()
        tags.append(tag)
    return tags


async def create_incident(
    db: AsyncSession,
    user_id: str,
    data: dict,
) -> Incident:
    incident = Incident(
        user_id=user_id,
        title=data["title"],
        problem=data["problem"],
        environment=data.get("environment"),
        error_messages=data.get("error_messages"),
        root_cause=data.get("root_cause"),
        final_fix=data.get("final_fix"),
        original_notes=data["original_notes"],
        status=data.get("status", "unresolved"),
        stop_code=slugify_stop_code(data["title"]),
    )
    db.add(incident)
    await db.flush()

    for i, att in enumerate(data.get("attempts", [])):
        attempt = Attempt(
            incident_id=incident.id,
            action=att.action if isinstance(att, AttemptSchema) else att["action"],
            result=att.result if isinstance(att, AttemptSchema) else att.get("result"),
            outcome=att.outcome if isinstance(att, AttemptSchema) else att.get("outcome", "unknown"),
            sort_order=i,
        )
        db.add(attempt)

    tags = await get_or_create_tags(db, user_id, data.get("tags", []))
    for tag in tags:
        db.add(IncidentTag(incident_id=incident.id, tag_id=tag.id))

    await db.commit()
    return await get_incident(db, user_id, incident.id)


async def get_incident(db: AsyncSession, user_id: str, incident_id: str) -> Incident | None:
    result = await db.execute(
        select(Incident)
        .where(Incident.id == incident_id, Incident.user_id == user_id)
        .options(selectinload(Incident.attempts), selectinload(Incident.tags))
    )
    return result.scalar_one_or_none()


async def list_incidents(
    db: AsyncSession,
    user_id: str,
    status: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Incident], int]:
    query = (
        select(Incident)
        .where(Incident.user_id == user_id)
        .options(selectinload(Incident.tags))
        .order_by(Incident.updated_at.desc())
    )
    count_query = select(func.count()).select_from(Incident).where(Incident.user_id == user_id)

    if status:
        query = query.where(Incident.status == status)
        count_query = count_query.where(Incident.status == status)
    if tag:
        query = query.join(Incident.tags).where(Tag.name == tag)
        count_query = count_query.join(Incident.tags).where(Tag.name == tag)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            Incident.title.ilike(pattern)
            | Incident.problem.ilike(pattern)
            | Incident.original_notes.ilike(pattern)
        )
        count_query = count_query.where(
            Incident.title.ilike(pattern)
            | Incident.problem.ilike(pattern)
            | Incident.original_notes.ilike(pattern)
        )

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.limit(limit).offset(offset))
    return list(result.scalars().unique().all()), total


async def update_incident(
    db: AsyncSession,
    user_id: str,
    incident_id: str,
    data: dict,
) -> Incident | None:
    incident = await get_incident(db, user_id, incident_id)
    if not incident:
        return None

    for field in ("title", "problem", "environment", "error_messages", "root_cause", "final_fix", "status"):
        if field in data and data[field] is not None:
            setattr(incident, field, data[field])
    if "title" in data and data["title"]:
        incident.stop_code = slugify_stop_code(data["title"])

    if "attempts" in data and data["attempts"] is not None:
        for old in list(incident.attempts):
            await db.delete(old)
        await db.flush()
        for i, att in enumerate(data["attempts"]):
            attempt = Attempt(
                incident_id=incident.id,
                action=att.action,
                result=att.result,
                outcome=att.outcome,
                sort_order=i,
            )
            db.add(attempt)

    if "tags" in data and data["tags"] is not None:
        await db.execute(
            IncidentTag.__table__.delete().where(IncidentTag.incident_id == incident.id)
        )
        tags = await get_or_create_tags(db, user_id, data["tags"])
        for tag in tags:
            db.add(IncidentTag(incident_id=incident.id, tag_id=tag.id))

    await db.commit()
    return await get_incident(db, user_id, incident.id)


async def delete_incident(db: AsyncSession, user_id: str, incident_id: str) -> bool:
    incident = await get_incident(db, user_id, incident_id)
    if not incident:
        return False
    await db.delete(incident)
    await db.commit()
    return True


async def get_dashboard_stats(db: AsyncSession, user_id: str) -> dict:
    total = (await db.execute(
        select(func.count()).select_from(Incident).where(Incident.user_id == user_id)
    )).scalar() or 0
    unresolved = (await db.execute(
        select(func.count()).select_from(Incident).where(
            Incident.user_id == user_id, Incident.status == "unresolved"
        )
    )).scalar() or 0
    recent = await list_incidents(db, user_id, limit=5)
    tag_result = await db.execute(
        select(Tag.name, func.count(IncidentTag.incident_id))
        .join(IncidentTag, IncidentTag.tag_id == Tag.id)
        .join(Incident, Incident.id == IncidentTag.incident_id)
        .where(Tag.user_id == user_id)
        .group_by(Tag.name)
        .order_by(func.count(IncidentTag.incident_id).desc())
        .limit(8)
    )
    recurring = [{"tag": row[0], "count": row[1]} for row in tag_result.all()]
    return {
        "total": total,
        "unresolved": unresolved,
        "recent": recent[0],
        "recurring_tags": recurring,
    }
