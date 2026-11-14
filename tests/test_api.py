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


def test_registration_rejects_oversized_email(client):
    response = client.post(
        "/api/auth/register",
        json={"email": f"{'a' * 250}@example.com", "password": "secure-password"},
    )
    assert response.status_code == 400


def test_duplicate_registration_is_conflict(client):
    payload = {"email": "person@example.com", "password": "secure-password"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409


def test_applications_require_authentication_and_validate_input(client, auth_headers):
    assert client.get("/api/applications").status_code == 401

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
        client.delete(f"/api/applications/{application_id}", headers=auth_headers).status_code
        == 204
    )
