"""ApplyTrack Flask application package."""

import re
import traceback

from flask import Flask
from flask_cors import CORS
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.exceptions import HTTPException

from app.api import api_bp, root_bp
from app.api.docs import docs_bp, swagger_ui_bp
from app.config import Config, parse_cors_allowed_origins
from app.extensions import db, jwt, migrate
from app.models import Application, User


def _safe_database_traceback(error: SQLAlchemyError) -> str:
    # Frame locations preserve the traceback without formatting SQL or parameters.
    return "\n".join(
        f'  File "{frame.filename}", line {frame.lineno}, in {frame.name}'
        for frame in traceback.extract_tb(error.__traceback__)
    )


def create_app(test_config: dict | None = None) -> Flask:
    """Create and configure an ApplyTrack application instance."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    if app.config.get("APP_ENV") not in {"development", "production"}:
        raise RuntimeError("APP_ENV must be 'development' or 'production'")

    app.config["CORS_ALLOWED_ORIGINS"] = parse_cors_allowed_origins(
        app.config.get("CORS_ALLOWED_ORIGINS")
    )
    if app.config["APP_ENV"] == "production":
        app.config["DEBUG"] = False
        if not app.config["CORS_ALLOWED_ORIGINS"]:
            raise RuntimeError(
                "CORS_ALLOWED_ORIGINS must be set in production"
            )
        if app.config["JWT_SECRET_KEY"] == app.config["SECRET_KEY"]:
            raise RuntimeError(
                "JWT_SECRET_KEY must be different from SECRET_KEY in production"
            )

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
    if app.config["CORS_ALLOWED_ORIGINS"]:
        exact_origins = tuple(
            re.compile(rf"^{re.escape(origin)}$", re.IGNORECASE)
            for origin in app.config["CORS_ALLOWED_ORIGINS"]
        )
        CORS(
            app,
            resources={
                r"/api/*": {
                    "origins": exact_origins,
                }
            },
            allow_headers=("Authorization", "Content-Type"),
        )
    app.register_blueprint(root_bp)
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(docs_bp, url_prefix="/api")
    app.register_blueprint(swagger_ui_bp, url_prefix="/api/docs")
    app.add_url_rule(
        "/api/docs",
        endpoint="swagger_ui_no_trailing_slash",
        view_func=app.view_functions["swagger_ui.show"],
        defaults={"path": None},
    )

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        return {"error": error.name, "message": error.description}, error.code

    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error: SQLAlchemyError):
        try:
            db.session.rollback()
        except SQLAlchemyError as rollback_error:
            app.logger.error(
                "Database rollback failed (%s)\n%s",
                type(rollback_error).__name__,
                _safe_database_traceback(rollback_error),
            )

        app.logger.error(
            "Database operation failed (%s)\n%s",
            type(error).__name__,
            _safe_database_traceback(error),
        )
        return {
            "error": "Internal Server Error",
            "message": "An unexpected server error occurred.",
        }, 500

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
