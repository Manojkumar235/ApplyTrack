"""ApplyTrack Flask application package."""

from flask import Flask
from werkzeug.exceptions import HTTPException

from app.api import api_bp, root_bp
from app.config import Config
from app.extensions import db, jwt, migrate
from app.models import Application, User


def create_app(test_config: dict | None = None) -> Flask:
    """Create and configure an ApplyTrack application instance."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    required_settings = (
        "SECRET_KEY",
        "JWT_SECRET_KEY",
        "SQLALCHEMY_DATABASE_URI",
    )
    missing_settings = [
        setting for setting in required_settings if not app.config.get(setting)
    ]
    if missing_settings:
        raise RuntimeError(
            "Missing required configuration: " + ", ".join(missing_settings)
        )

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    app.register_blueprint(root_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        return {"error": error.name, "message": error.description}, error.code

    @jwt.unauthorized_loader
    def handle_missing_token(reason: str):
        return {"error": "Unauthorized", "message": reason}, 401

    @jwt.invalid_token_loader
    def handle_invalid_token(reason: str):
        return {"error": "Unauthorized", "message": reason}, 401

    @jwt.expired_token_loader
    def handle_expired_token(_jwt_header, _jwt_payload):
        return {"error": "Unauthorized", "message": "Token has expired"}, 401

    return app
