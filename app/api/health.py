"""Health check endpoint."""

from app.api import api_bp


@api_bp.get("/health")
def health():
    return {"status": "ok"}
