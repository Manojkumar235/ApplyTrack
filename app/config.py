"""Environment-backed application configuration."""

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


def normalize_database_url(database_url):
    if not database_url:
        return database_url

    url = make_url(database_url)
    if url.drivername.split("+", 1)[0] in {"postgres", "postgresql"}:
        return url.set(drivername="postgresql+psycopg")
    return url


def parse_cors_allowed_origins(value):
    if isinstance(value, str):
        candidates = value.split(",")
    elif value:
        candidates = value
    else:
        candidates = ()

    origins = []
    for candidate in candidates:
        origin = candidate.strip()
        if not origin:
            continue

        parsed = urlsplit(origin)
        try:
            parsed.port
        except ValueError as error:
            raise RuntimeError(
                "CORS_ALLOWED_ORIGINS must contain valid HTTP(S) origins"
            ) from error

        if (
            parsed.scheme.lower() not in {"http", "https"}
            or not parsed.netloc
            or parsed.username
            or parsed.password
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or "*" in origin
        ):
            raise RuntimeError(
                "CORS_ALLOWED_ORIGINS must contain HTTP(S) origins without paths"
            )

        normalized_origin = f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"
        if normalized_origin not in origins:
            origins.append(normalized_origin)

    return tuple(origins)


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = normalize_database_url(
        os.environ.get("DATABASE_URL")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
    DEBUG = False
    CORS_ALLOWED_ORIGINS = parse_cors_allowed_origins(
        os.environ.get("CORS_ALLOWED_ORIGINS")
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
