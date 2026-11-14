"""REST API blueprint."""

from flask import Blueprint

api_bp = Blueprint("api", __name__)
from app.api.root import root_bp

from app.api import applications, auth, health  # noqa: E402,F401
