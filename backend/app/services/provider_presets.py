"""Provider presets and URL validation for OpenAI-compatible APIs."""

from __future__ import annotations

import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urlparse

CHAT_PRESETS = ("gemini", "openai", "xai", "custom")
EMBEDDING_PRESETS = ("gemini", "openai", "custom")

DEFAULT_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/"
DEFAULT_OPENAI_BASE = "https://api.openai.com/v1"
DEFAULT_XAI_BASE = "https://api.x.ai/v1"


@dataclass(frozen=True)
class ProviderPreset:
    id: str
    label: str
    base_url: str
    default_chat_model: str | None = None
    default_embedding_model: str | None = None
    default_dimensions: int = 1536
    supports_chat: bool = True
    supports_embeddings: bool = True
    key_hint: str = ""
    docs_url: str = ""


CHAT_PROVIDER_PRESETS: dict[str, ProviderPreset] = {
    "gemini": ProviderPreset(
        id="gemini",
        label="Google Gemini",
        base_url=DEFAULT_GEMINI_BASE,
        default_chat_model="gemini-flash-latest",
        key_hint="AIza…",
        docs_url="https://aistudio.google.com/apikey",
    ),
    "openai": ProviderPreset(
        id="openai",
        label="OpenAI",
        base_url=DEFAULT_OPENAI_BASE,
        default_chat_model="gpt-4o-mini",
        key_hint="sk-…",
        docs_url="https://platform.openai.com/api-keys",
    ),
    "xai": ProviderPreset(
        id="xai",
        label="xAI Grok",
        base_url=DEFAULT_XAI_BASE,
        default_chat_model="grok-2-latest",
        supports_embeddings=False,
        key_hint="xai-…",
        docs_url="https://console.x.ai/",
    ),
    "custom": ProviderPreset(
        id="custom",
        label="Custom OpenAI-compatible",
        base_url="",
        default_chat_model="",
        key_hint="",
        docs_url="",
    ),
}

EMBEDDING_PROVIDER_PRESETS: dict[str, ProviderPreset] = {
    "gemini": ProviderPreset(
        id="gemini",
        label="Google Gemini",
        base_url=DEFAULT_GEMINI_BASE,
        default_embedding_model="gemini-embedding-001",
        default_dimensions=1536,
        supports_chat=False,
        key_hint="AIza…",
        docs_url="https://aistudio.google.com/apikey",
    ),
    "openai": ProviderPreset(
        id="openai",
        label="OpenAI",
        base_url=DEFAULT_OPENAI_BASE,
        default_embedding_model="text-embedding-3-small",
        default_dimensions=1536,
        supports_chat=False,
        key_hint="sk-…",
        docs_url="https://platform.openai.com/api-keys",
    ),
    "custom": ProviderPreset(
        id="custom",
        label="Custom OpenAI-compatible",
        base_url="",
        default_embedding_model="",
        default_dimensions=1536,
        supports_chat=False,
        key_hint="",
        docs_url="",
    ),
}


def normalize_base_url(url: str) -> str:
    cleaned = url.strip().rstrip("/")
    if not cleaned.endswith("/v1"):
        if cleaned.endswith("/openai"):
            cleaned = f"{cleaned}/"
        elif not cleaned.endswith("/"):
            cleaned = f"{cleaned}/"
    return cleaned


def validate_provider_id(provider: str, allowed: tuple[str, ...]) -> str:
    pid = provider.strip().lower()
    if pid not in allowed:
        raise ValueError(f"Unknown provider '{provider}'. Choose one of: {', '.join(allowed)}")
    return pid


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or str(ip) == "169.254.169.254"
    )


def validate_custom_base_url(url: str) -> str:
    if not url or not url.strip():
        raise ValueError("Base URL is required for custom providers")
    parsed = urlparse(url.strip())
    if parsed.scheme != "https":
        raise ValueError("Base URL must use HTTPS")
    host = parsed.hostname
    if not host:
        raise ValueError("Base URL must include a hostname")
    if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"):
        raise ValueError("Base URL cannot point to localhost or metadata services")
    try:
        for info in socket.getaddrinfo(host, None):
            addr = info[4][0]
            ip = ipaddress.ip_address(addr)
            if _is_blocked_ip(ip):
                raise ValueError("Base URL cannot resolve to a private or local network address")
    except socket.gaierror:
        pass  # Allow DNS failures at save time; connection test will catch unreachable hosts
    return normalize_base_url(url)


def resolve_chat_config(
    provider: str,
    api_key: str,
    base_url: str | None,
    model: str | None,
) -> dict:
    pid = validate_provider_id(provider, CHAT_PRESETS)
    preset = CHAT_PROVIDER_PRESETS[pid]
    if pid == "custom":
        if not model or not model.strip():
            raise ValueError("Chat model is required for custom providers")
        resolved_url = validate_custom_base_url(base_url or "")
        resolved_model = model.strip()
    else:
        resolved_url = preset.base_url
        resolved_model = (model or preset.default_chat_model or "").strip()
    if not api_key or len(api_key.strip()) < 10:
        raise ValueError("API key is too short")
    return {
        "provider": pid,
        "api_key": api_key.strip(),
        "base_url": resolved_url,
        "model": resolved_model,
    }


def resolve_embedding_config(
    provider: str,
    api_key: str,
    base_url: str | None,
    model: str | None,
    dimensions: int | None,
) -> dict:
    pid = validate_provider_id(provider, EMBEDDING_PRESETS)
    preset = EMBEDDING_PROVIDER_PRESETS[pid]
    if pid == "custom":
        if not model or not model.strip():
            raise ValueError("Embedding model is required for custom providers")
        if not dimensions or dimensions < 64 or dimensions > 4096:
            raise ValueError("Embedding dimensions must be between 64 and 4096")
        resolved_url = validate_custom_base_url(base_url or "")
        resolved_model = model.strip()
        resolved_dims = dimensions
    else:
        resolved_url = preset.base_url
        resolved_model = (model or preset.default_embedding_model or "").strip()
        resolved_dims = dimensions or preset.default_dimensions
    if not api_key or len(api_key.strip()) < 10:
        raise ValueError("API key is too short")
    return {
        "provider": pid,
        "api_key": api_key.strip(),
        "base_url": resolved_url,
        "model": resolved_model,
        "dimensions": resolved_dims,
    }


def embedding_fingerprint(provider: str, model: str, dimensions: int) -> str:
    return f"{provider}:{model}:{dimensions}"


def resolve_model_name(base_url: str, model: str) -> str:
    """Map short model ids for gateways that need provider prefixes."""
    url = (base_url or "").lower()
    if "openrouter.ai" in url and "/" not in model:
        if model.startswith("gemini"):
            return f"google/{model}"
        if model.startswith("grok"):
            return f"x-ai/{model}"
        return f"openai/{model}"
    return model
