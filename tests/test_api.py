from datetime import timedelta

import pytest
from flask_jwt_extended import create_access_token

from app.api.application_validation import APPLICATION_STATUSES


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.get_json() == {
        "application": "ApplyTrack",
        "message": "Internship and Job Application Tracker API",
        "status": "running",
    }


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_register_and_login(client):
    registration = client.post(
        "/api/auth/register",
        json={"email": "Person@Example.com", "password": "secure-password"},
    )
    assert registration.status_code == 201
    assert registration.get_json()["user"]["email"] == "person@example.com"

    login = client.post(
        "/api/auth/login",
        json={"email": "person@example.com", "password": "secure-password"},
    )
    assert login.status_code == 200
    assert "access_token" in login.get_json()


@pytest.mark.parametrize("password", ["", "short", "p" * 129, None])
def test_registration_rejects_invalid_password(client, password):
    response = client.post(
        "/api/auth/register",
        json={"email": "invalid-password@example.com", "password": password},
    )
    assert response.status_code == 400
    assert response.is_json


def test_login_rejects_incorrect_password_and_unknown_email(client):
    registration = client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "secure-password"},
    )
    assert registration.status_code == 201

    for credentials in (
        {"email": "login@example.com", "password": "incorrect-password"},
        {"email": "missing@example.com", "password": "secure-password"},
    ):
        response = client.post("/api/auth/login", json=credentials)
        assert response.status_code == 401
        assert response.is_json
        assert response.get_json()["message"] == "Invalid email or password"


def test_invalid_and_expired_jwts_are_rejected_as_json(client, app):
    with app.app_context():
        expired_token = create_access_token(
            identity="1", expires_delta=timedelta(seconds=-60)
        )

    for token in ("not-a-jwt", expired_token):
        response = client.get(
            "/api/applications",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401
        assert response.is_json
        assert response.get_json()["error"] == "Unauthorized"


def test_registration_rejects_oversized_email(client):
    response = client.post(
        "/api/auth/register",
        json={"email": f"{'a' * 250}@example.com", "password": "secure-password"},
    )
    assert response.status_code == 400


def test_duplicate_registration_is_conflict(client):
    payload = {"email": "person@example.com", "password": "secure-password"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    duplicate = client.post("/api/auth/register", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.is_json
    assert duplicate.get_json()["error"] == "Conflict"


def test_applications_require_authentication_and_validate_input(client, auth_headers):
    invalid = client.post(
        "/api/applications",
        headers=auth_headers,
        json={"company": "Example Inc", "position": "Intern", "status": "unknown"},
    )
    assert invalid.status_code == 400

    invalid_date = client.post(
        "/api/applications",
        headers=auth_headers,
        json={
            "company": "Example Inc",
            "position": "Intern",
            "applied_on": "20261114",
        },
    )
    assert invalid_date.status_code == 400
    invalid_calendar_date = client.post(
        "/api/applications",
        headers=auth_headers,
        json={
            "company": "Example Inc",
            "position": "Intern",
            "applied_on": "2026-02-30",
        },
    )
    assert invalid_calendar_date.status_code == 400


@pytest.mark.parametrize(
    "payload",
    [
        {"company": "Example Inc"},
        {"position": "Intern"},
        {"company": "", "position": "Intern"},
        {"company": "Example Inc", "position": ""},
        {"company": " ", "position": "Intern"},
        {"company": "Example Inc", "position": " "},
    ],
)
def test_create_rejects_missing_or_empty_required_fields(client, auth_headers, payload):
    response = client.post(
        "/api/applications", headers=auth_headers, json=payload
    )
    assert response.status_code == 400
    assert response.is_json


@pytest.mark.parametrize(
    "payload",
    [
        {"company": "C" * 161, "position": "Intern"},
        {"company": "Example Inc", "position": "P" * 161},
    ],
)
def test_create_rejects_overlong_company_and_position(client, auth_headers, payload):
    response = client.post(
        "/api/applications", headers=auth_headers, json=payload
    )
    assert response.status_code == 400
    assert response.is_json


def test_application_accepts_notes_and_empty_optional_values(client, auth_headers):
    response = client.post(
        "/api/applications",
        headers=auth_headers,
        json={
            "company": "Example Inc",
            "position": "Intern",
            "location": "",
            "url": "",
            "notes": "Follow up next week",
            "applied_on": None,
        },
    )
    assert response.status_code == 201
    assert response.get_json()["application"] == {
        "id": response.get_json()["application"]["id"],
        "company": "Example Inc",
        "position": "Intern",
        "status": "saved",
        "location": "",
        "url": "",
        "notes": "Follow up next week",
        "applied_on": None,
    }


def test_unauthenticated_requests_cannot_access_application_endpoints(
    client, auth_headers
):
    created = client.post(
        "/api/applications",
        headers=auth_headers,
        json={"company": "Example Inc", "position": "Intern"},
    )
    application_id = created.get_json()["application"]["id"]
    requests = (
        client.get("/api/applications"),
        client.post(
            "/api/applications",
            json={"company": "Other Inc", "position": "Intern"},
        ),
        client.get(f"/api/applications/{application_id}"),
        client.patch(
            f"/api/applications/{application_id}", json={"status": "offer"}
        ),
        client.delete(f"/api/applications/{application_id}"),
    )
    for response in requests:
        assert response.status_code == 401
        assert response.is_json
        assert response.get_json()["error"] == "Unauthorized"

    unchanged = client.get(
        f"/api/applications/{application_id}", headers=auth_headers
    )
    assert unchanged.status_code == 200
    assert unchanged.get_json()["application"]["status"] == "saved"


def test_nonexistent_application_ids_return_json_404(client, auth_headers):
    missing_id = 987654321
    requests = (
        client.get(f"/api/applications/{missing_id}", headers=auth_headers),
        client.patch(
            f"/api/applications/{missing_id}",
            headers=auth_headers,
            json={"status": "offer"},
        ),
        client.delete(
            f"/api/applications/{missing_id}", headers=auth_headers
        ),
    )
    for response in requests:
        assert response.status_code == 404
        assert response.is_json
        assert response.get_json()["error"] == "Not Found"

    assert client.get("/api/applications", headers=auth_headers).get_json()[
        "applications"
    ] == []


def test_applications_reject_numeric_only_company_and_position(client, auth_headers):
    numeric_company = client.post(
        "/api/applications",
        headers=auth_headers,
        json={"company": "123", "position": "Software Intern"},
    )
    assert numeric_company.status_code == 400
    assert numeric_company.get_json()["message"] == (
        "Company cannot contain only numbers"
    )

    numeric_position = client.post(
        "/api/applications",
        headers=auth_headers,
        json={"company": "Example Inc", "position": "456"},
    )
    assert numeric_position.status_code == 400
    assert numeric_position.get_json()["message"] == (
        "Position cannot contain only numbers"
    )


def test_all_six_application_statuses_are_supported(client, auth_headers):
    assert APPLICATION_STATUSES == (
        "saved",
        "applied",
        "interviewing",
        "offer",
        "rejected",
        "withdrawn",
    )

    for index, status in enumerate(APPLICATION_STATUSES):
        response = client.post(
            "/api/applications",
            headers=auth_headers,
            json={
                "company": f"Example Company {index}",
                "position": f"Role {index}",
                "status": status,
            },
        )
        assert response.status_code == 201
        assert response.get_json()["application"]["status"] == status

    other_user = client.post(
        "/api/auth/register",
        json={"email": "status-owner@example.com", "password": "secure-password"},
    )
    other_headers = {
        "Authorization": f"Bearer {other_user.get_json()['access_token']}"
    }
    other_application = client.post(
        "/api/applications",
        headers=other_headers,
        json={
            "company": "Other Company",
            "position": "Other Role",
            "status": "withdrawn",
        },
    )
    assert other_application.status_code == 201

    listed = client.get("/api/applications", headers=auth_headers)
    owner_applications = listed.get_json()["applications"]
    assert len(owner_applications) == len(APPLICATION_STATUSES)
    assert {item["status"] for item in owner_applications} == set(APPLICATION_STATUSES)

    other_listed = client.get("/api/applications", headers=other_headers)
    assert [
        item["status"] for item in other_listed.get_json()["applications"]
    ] == ["withdrawn"]


def test_application_crud_is_scoped_to_user(client, auth_headers):
    created = client.post(
        "/api/applications",
        headers=auth_headers,
        json={"company": "Example Inc", "position": "Intern"},
    )
    assert created.status_code == 201
    application_id = created.get_json()["application"]["id"]
    assert created.get_json()["application"]["status"] == "saved"

    updated = client.patch(
        f"/api/applications/{application_id}",
        headers=auth_headers,
        json={"status": "applied", "applied_on": "2026-11-14"},
    )
    assert updated.status_code == 200
    assert updated.get_json()["application"]["status"] == "applied"
    assert updated.get_json()["application"]["applied_on"] == "2026-11-14"
    assert (
        client.get(
            f"/api/applications/{application_id}", headers=auth_headers
        ).get_json()["application"]["status"]
        == "applied"
    )

    invalid_update = client.patch(
        f"/api/applications/{application_id}",
        headers=auth_headers,
        json={"status": "not-a-status"},
    )
    assert invalid_update.status_code == 400
    unchanged = client.get(
        f"/api/applications/{application_id}", headers=auth_headers
    ).get_json()["application"]
    assert unchanged["status"] == "applied"
    assert unchanged["applied_on"] == "2026-11-14"

    other_user = client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "password": "secure-password"},
    )
    other_headers = {
        "Authorization": f"Bearer {other_user.get_json()['access_token']}"
    }
    assert (
        client.get(
            f"/api/applications/{application_id}", headers=other_headers
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/applications/{application_id}",
            headers=other_headers,
            json={"status": "withdrawn"},
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/applications/{application_id}", headers=other_headers
        ).status_code
        == 404
    )
    unchanged = client.get(
        f"/api/applications/{application_id}", headers=auth_headers
    ).get_json()["application"]
    assert unchanged["status"] == "applied"
    assert unchanged["applied_on"] == "2026-11-14"
    assert (
        client.delete(f"/api/applications/{application_id}", headers=auth_headers).status_code
        == 204
    )
