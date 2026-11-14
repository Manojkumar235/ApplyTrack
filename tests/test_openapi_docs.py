import re
from pathlib import Path

import yaml

OPENAPI_SPEC_PATH = (
    Path(__file__).resolve().parents[1] / "docs" / "openapi.yaml"
)


def test_openapi_spec_is_publicly_served(client):
    response = client.get("/api/openapi.yaml")
    assert response.status_code == 200
    assert "yaml" in response.mimetype
    assert response.data == OPENAPI_SPEC_PATH.read_bytes()


def test_swagger_ui_is_publicly_accessible(client):
    response = client.get("/api/docs")
    assert response.status_code == 200
    assert response.mimetype == "text/html"
    assert b'id="swagger-ui"' in response.data
    assert b"swagger-ui-bundle.js" in response.data
    assert b"/api/openapi.yaml" in response.data
    assert client.get("/api/docs/swagger-ui-bundle.js").status_code == 200


def test_openapi_yaml_is_valid_and_documents_all_api_routes(app):
    specification = yaml.safe_load(OPENAPI_SPEC_PATH.read_text(encoding="utf-8"))
    assert specification["openapi"].startswith("3.")

    documented = {
        (path, method.upper())
        for path, path_item in specification["paths"].items()
        for method in path_item
        if method.lower() in {"get", "post", "patch", "delete"}
    }
    actual = set()
    for rule in app.url_map.iter_rules():
        if not (rule.rule == "/" or rule.rule.startswith("/api/")):
            continue
        if rule.rule.startswith("/api/docs") or rule.rule == "/api/openapi.yaml":
            continue
        path = re.sub(r"<int:([^>]+)>", r"{\1}", rule.rule)
        actual.update(
            (path, method)
            for method in rule.methods
            if method in {"GET", "POST", "PATCH", "DELETE"}
        )

    assert documented == actual
    assert len(documented) == 9


def test_openapi_spec_reuses_required_schemas_and_documents_jwt():
    specification = yaml.safe_load(OPENAPI_SPEC_PATH.read_text(encoding="utf-8"))
    schemas = specification["components"]["schemas"]
    assert {"User", "Application", "AuthenticationResponse", "ApiError"} <= set(
        schemas
    )
    assert specification["components"]["securitySchemes"]["bearerAuth"] == {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": (
            "Access token returned by registration or login. Tokens expire after "
            "one hour."
        ),
    }


def test_openapi_documents_database_error_responses():
    specification = yaml.safe_load(OPENAPI_SPEC_PATH.read_text(encoding="utf-8"))
    operations = (
        ("/api/auth/register", "post"),
        ("/api/auth/login", "post"),
        ("/api/applications", "get"),
        ("/api/applications", "post"),
        ("/api/applications/{application_id}", "get"),
        ("/api/applications/{application_id}", "patch"),
        ("/api/applications/{application_id}", "delete"),
    )

    for path, method in operations:
        assert specification["paths"][path][method]["responses"]["500"] == {
            "$ref": "#/components/responses/InternalServerError"
        }

    response = specification["components"]["responses"]["InternalServerError"]
    assert response["content"]["application/json"]["example"] == {
        "error": "Internal Server Error",
        "message": "An unexpected server error occurred.",
    }


def test_registration_email_schema_allows_valid_trimmed_value_over_254_raw(client):
    specification = yaml.safe_load(OPENAPI_SPEC_PATH.read_text(encoding="utf-8"))
    email_schema = specification["components"]["schemas"]["RegistrationRequest"][
        "properties"
    ]["email"]
    email = f"  {'a' * 250}@x.y  "

    assert len(email) > 254
    assert re.fullmatch(email_schema["pattern"], email)
    assert "maxLength" not in email_schema

    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "secure-password"},
    )
    assert response.status_code == 201
