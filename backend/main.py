"""Vercel / local ASGI entrypoint.

Vercel looks for a FastAPI instance named `app` in main.py at the project root
(Root Directory = backend).
"""

from app.main import app

__all__ = ["app"]
