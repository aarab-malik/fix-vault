from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IncidentStatus(str, Enum):
    UNRESOLVED = "unresolved"
    RESOLVED = "resolved"


class AttemptOutcome(str, Enum):
    SUCCESSFUL = "successful"
    FAILED = "failed"
    UNKNOWN = "unknown"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Legacy encrypted credentials (kept for backward compatibility)
    openai_api_key_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    openai_base_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    openai_validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Chat provider (OpenAI-compatible)
    chat_provider: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    chat_api_key_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    chat_base_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    chat_model: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    chat_validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Embedding provider (OpenAI-compatible)
    embedding_provider: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    embedding_api_key_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding_base_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    embedding_model: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    embedding_dimensions: Mapped[Optional[int]] = mapped_column(nullable=True)
    embedding_validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    embedding_profile_fingerprint: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # Vector store
    pinecone_api_key_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pinecone_index_host: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    pinecone_validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    incidents: Mapped[list["Incident"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(500))
    problem: Mapped[str] = mapped_column(Text)
    environment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_messages: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    final_fix: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    original_notes: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default=IncidentStatus.UNRESOLVED.value, index=True)
    stop_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="incidents")
    attempts: Mapped[list["Attempt"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="Attempt.sort_order"
    )
    tags: Mapped[list["Tag"]] = relationship(
        secondary="incident_tags", back_populates="incidents"
    )


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), index=True)
    action: Mapped[str] = mapped_column(Text)
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outcome: Mapped[str] = mapped_column(String(20), default=AttemptOutcome.UNKNOWN.value)
    sort_order: Mapped[int] = mapped_column(default=0)

    incident: Mapped["Incident"] = relationship(back_populates="attempts")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))

    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_user_tag"),)

    incidents: Mapped[list["Incident"]] = relationship(
        secondary="incident_tags", back_populates="tags"
    )


class IncidentTag(Base):
    __tablename__ = "incident_tags"

    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[str] = mapped_column(String(36), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class AskMessage(Base):
    __tablename__ = "ask_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
