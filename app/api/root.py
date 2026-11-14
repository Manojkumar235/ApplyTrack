"""Root API information endpoint."""

from flask import Blueprint

root_bp = Blueprint("root", __name__)


@root_bp.get("/")
def root():
    return {
        "application": "ApplyTrack",
        "message": "Internship and Job Application Tracker API",
        "status": "running",
    }
