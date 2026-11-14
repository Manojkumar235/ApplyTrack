"""Public OpenAPI specification and Swagger UI routes."""

from pathlib import Path

from flask import Blueprint, send_file
from flask_swagger_ui import get_swaggerui_blueprint

docs_bp = Blueprint("api_docs", __name__)
OPENAPI_SPEC_PATH = (
    Path(__file__).resolve().parents[2] / "docs" / "openapi.yaml"
)


@docs_bp.get("/openapi.yaml")
def openapi_spec():
    return send_file(OPENAPI_SPEC_PATH, mimetype="application/yaml")


swagger_ui_bp = get_swaggerui_blueprint(
    "/api/docs",
    "/api/openapi.yaml",
    config={"app_name": "ApplyTrack API"},
)
