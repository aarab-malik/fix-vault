import pytest

from app.services.provider_presets import (
    resolve_chat_config,
    resolve_embedding_config,
    validate_custom_base_url,
)


def test_resolve_gemini_chat_preset():
    cfg = resolve_chat_config("gemini", "a" * 12, None, None)
    assert cfg["provider"] == "gemini"
    assert cfg["model"] == "gemini-flash-latest"
    assert "generativelanguage.googleapis.com" in cfg["base_url"]


def test_resolve_openai_embedding_preset():
    cfg = resolve_embedding_config("openai", "sk-" + "a" * 20, None, None, None)
    assert cfg["provider"] == "openai"
    assert cfg["model"] == "text-embedding-3-small"
    assert cfg["dimensions"] == 1536


def test_custom_provider_requires_model_and_url():
    with pytest.raises(ValueError):
        resolve_chat_config("custom", "a" * 12, None, "my-model")
    with pytest.raises(ValueError):
        resolve_embedding_config("custom", "a" * 12, "https://example.com/v1", None, 1536)


def test_custom_url_blocks_localhost():
    with pytest.raises(ValueError):
        validate_custom_base_url("http://localhost:11434/v1")
    with pytest.raises(ValueError):
        validate_custom_base_url("https://127.0.0.1/v1")


def test_custom_url_requires_https():
    with pytest.raises(ValueError):
        validate_custom_base_url("http://api.example.com/v1")


def test_embedding_fingerprint_format():
    from app.services.provider_presets import embedding_fingerprint

    assert embedding_fingerprint("gemini", "gemini-embedding-001", 1536) == "gemini:gemini-embedding-001:1536"


def test_xai_chat_preset_has_no_embeddings():
    from app.services.provider_presets import CHAT_PROVIDER_PRESETS

    assert CHAT_PROVIDER_PRESETS["xai"].supports_embeddings is False
