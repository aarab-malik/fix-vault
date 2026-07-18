from fastapi import APIRouter

from app.dependencies import CredentialsUser
from app.schemas import AskRequest, AskResponse
from app.services.rag import ask_question

router = APIRouter(prefix="/ask", tags=["ask"])


@router.post("", response_model=AskResponse)
async def ask(body: AskRequest, user: CredentialsUser):
    return await ask_question(user, body.question)
