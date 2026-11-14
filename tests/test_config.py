import pytest

from app import create_app
from app.config import normalize_database_url, parse_cors_allowed_origins


def test_postgresql_urls_use_psycopg_three():
    for scheme in (
        "postgres://user:password@db.example:5432/applytrack",
        "postgresql://user:password@db.example:5432/applytrack",
        "postgresql+psycopg2://user:password@db.example:5432/applytrack",
    ):
        url = normalize_database_url(scheme)
        assert url.drivername == "postgresql+psycopg"
        assert url.database == "applytrack"


def test_non_postgresql_database_urls_are_preserved():
    url = normalize_database_url("sqlite://")
    assert url.drivername == "sqlite"


def test_development_does_not_require_a_cors_allowlist():
    app = create_app(
        {
            "TESTING": True,
            "APP_ENV": "development",
            "SECRET_KEY": "test-secret-key-that-is-at-least-32-bytes",
            "JWT_SECRET_KEY": "test-jwt-secret-that-is-at-least-32-bytes",
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "CORS_ALLOWED_ORIGINS": (),
        }
    )
    assert app.config["CORS_ALLOWED_ORIGINS"] == ()


def test_jwt_secret_is_required_without_falling_back_to_flask_secret():
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        create_app(
            {
                "TESTING": True,
                "APP_ENV": "development",
                "SECRET_KEY": "test-secret-key-that-is-at-least-32-bytes",
                "JWT_SECRET_KEY": None,
                "SQLALCHEMY_DATABASE_URI": "sqlite://",
            }
        )


def test_cors_origins_are_exact_and_normalized():
    assert parse_cors_allowed_origins(
        " https://apply.example/ ,http://localhost:5173,https://apply.example"
    ) == ("https://apply.example", "http://localhost:5173")


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "https://*.apply.example",
        "https://apply.example/dashboard",
        "javascript://apply.example",
    ],
)
def test_cors_rejects_wildcards_paths_and_non_http_schemes(origin):
    with pytest.raises(RuntimeError):
        parse_cors_allowed_origins(origin)


def production_config(**overrides):
    config = {
        "TESTING": True,
        "APP_ENV": "production",
        "DEBUG": True,
        "SECRET_KEY": "test-secret-key-that-is-at-least-32-bytes",
        "JWT_SECRET_KEY": "test-jwt-secret-that-is-at-least-32-bytes",
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "CORS_ALLOWED_ORIGINS": ("https://apply.example",),
    }
    config.update(overrides)
    return config


def test_production_requires_explicit_cors_origins():
    with pytest.raises(RuntimeError, match="CORS_ALLOWED_ORIGINS"):
        create_app(production_config(CORS_ALLOWED_ORIGINS=()))


def test_production_requires_distinct_signing_keys():
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        create_app(
            production_config(
                JWT_SECRET_KEY="test-secret-key-that-is-at-least-32-bytes"
            )
        )


def test_production_disables_debug_and_only_allows_configured_origin():
    app = create_app(production_config())
    assert app.config["DEBUG"] is False

    client = app.test_client()
    preflight = client.options(
        "/api/applications",
        headers={
            "Origin": "https://apply.example",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert (
        preflight.headers["Access-Control-Allow-Origin"] == "https://apply.example"
    )

    unauthorized = client.get(
        "/api/applications", headers={"Origin": "https://unlisted.example"}
    )
    assert unauthorized.status_code == 401
    assert "Access-Control-Allow-Origin" not in unauthorized.headers
