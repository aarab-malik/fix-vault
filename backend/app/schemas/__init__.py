from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# Auth
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    credentials_configured: bool
    openai_configured: bool
    pinecone_configured: bool
    openai_validated_at: Optional[datetime] = None
    pinecone_validated_at: Optional[datetime] = None
    openai_key_hint: Optional[str] = None
    pinecone_key_hint: Optional[str] = None
    openai_base_url: Optional[str] = None
    pinecone_index_host: Optional[str] = None


# Settings
class OpenAISettingsRequest(BaseModel):
    openai_api_key: str = Field(min_length=10)
    openai_base_url: Optional[str] = None


class PineconeSettingsRequest(BaseModel):
    pinecone_api_key: str = Field(min_length=10)
    pinecone_index_host: str = Field(min_length=10)


class ConnectionTestResponse(BaseModel):
    ok: bool
    message: str


# Attempts
class AttemptSchema(BaseModel):
    action: str
    result: Optional[str] = None
    outcome: str = "unknown"


class AttemptResponse(AttemptSchema):
    id: str


# Incidents
class IncidentDraftRequest(BaseModel):
    notes: str = Field(min_length=10)


class IncidentDraftResponse(BaseModel):
    title: str
    problem: str
    environment: Optional[str] = None
    error_messages: Optional[str] = None
    root_cause: Optional[str] = None
    final_fix: Optional[str] = None
    status: str = "unresolved"
    tags: list[str] = []
    attempts: list[AttemptSchema] = []


class IncidentCreateRequest(BaseModel):
    title: str
    problem: str
    environment: Optional[str] = None
    error_messages: Optional[str] = None
    root_cause: Optional[str] = None
    final_fix: Optional[str] = None
    original_notes: str
    status: str = "unresolved"
    tags: list[str] = []
    attempts: list[AttemptSchema] = []


class IncidentUpdateRequest(BaseModel):
    title: Optional[str] = None
    problem: Optional[str] = None
    environment: Optional[str] = None
    error_messages: Optional[str] = None
    root_cause: Optional[str] = None
    final_fix: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[list[str]] = None
    attempts: Optional[list[AttemptSchema]] = None


class IncidentSummary(BaseModel):
    id: str
    title: str
    status: str
    stop_code: Optional[str] = None
    tags: list[str] = []
    created_at: datetime
    updated_at: datetime


class IncidentDetail(IncidentSummary):
    problem: str
    environment: Optional[str] = None
    error_messages: Optional[str] = None
    root_cause: Optional[str] = None
    final_fix: Optional[str] = None
    original_notes: str
    attempts: list[AttemptResponse] = []


class RelatedIncident(BaseModel):
    id: str
    title: str
    status: str
    similarity: float
    relevance: str


class SimilarIncidentsResponse(BaseModel):
    incidents: list[RelatedIncident]


# Ask
class AskRequest(BaseModel):
    question: str = Field(min_length=3)


class Citation(BaseModel):
    incident_id: str
    title: str
    match_score: float
    section: str
    excerpt: str


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation] = []
    failed_fix_warnings: list[str] = []


# Filters
class IncidentListResponse(BaseModel):
    items: list[IncidentSummary]
    total: int
