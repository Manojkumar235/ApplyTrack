import pytest

from app import create_app
from app.extensions import db


@pytest.fixture()
def app():
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret-key-that-is-at-least-32-bytes",
            "JWT_SECRET_KEY": "test-jwt-secret-that-is-at-least-32-bytes",
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
        }
    )
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "person@example.com", "password": "secure-password"},
    )
    token = response.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
