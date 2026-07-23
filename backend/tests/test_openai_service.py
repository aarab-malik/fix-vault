from unittest.mock import MagicMock

from app.services.credentials import ChatCredentials
from app.services.openai_service import extract_incident_draft


def test_extract_incident_draft_falls_back_without_response_format():
    client = MagicMock()
    second = MagicMock()
    second.choices = [MagicMock(message=MagicMock(content='{"title":"SSH down","problem":"VM unreachable","status":"unresolved","tags":[],"attempts":[]}'))]
    client.chat.completions.create.side_effect = [
        Exception("response_format not supported"),
        second,
    ]

    creds = ChatCredentials(
        provider="custom",
        api_key="sk-test",
        base_url="https://api.example.com/v1",
        model="gpt-test",
    )
    draft = extract_incident_draft(client, creds, "SSH stopped working after Docker install")
    assert draft.title == "SSH down"
    assert client.chat.completions.create.call_count == 2
