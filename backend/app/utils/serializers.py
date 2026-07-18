from app.models import User
from app.schemas import UserResponse
from app.services.credentials import user_to_status


def build_user_response(user: User) -> UserResponse:
    status_data = user_to_status(user)
    return UserResponse(
        id=user.id,
        email=user.email,
        openai_validated_at=user.openai_validated_at,
        pinecone_validated_at=user.pinecone_validated_at,
        openai_base_url=user.openai_base_url,
        pinecone_index_host=user.pinecone_index_host,
        **status_data,
    )
