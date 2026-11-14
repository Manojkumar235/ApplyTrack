import logging
import sqlite3

import pytest
from sqlalchemy import event, func, select
from sqlalchemy.exc import OperationalError

from app.extensions import db
from app.models import Application, User

ERROR_RESPONSE = {
    "error": "Internal Server Error",
    "message": "An unexpected server error occurred.",
}
SENSITIVE_BODY_VALUE = "BODY_SECRET_SENTINEL"
SENSITIVE_DB_ERROR = "DATABASE_ERROR_SECRET_SENTINEL"


@pytest.mark.parametrize("operation", ["create", "update", "delete"])
def test_application_write_database_errors_rollback_and_recover(
    app, client, auth_headers, caplog, operation
):
    application_id = None
    expected_count = 0
    if operation in {"update", "delete"}:
        created = client.post(
            "/api/applications",
            headers=auth_headers,
            json={
                "company": "Original Company",
                "position": "Engineer",
                "notes": SENSITIVE_BODY_VALUE,
            },
        )
        assert created.status_code == 201
        application_id = created.get_json()["application"]["id"]
        expected_count = 1

    statement_prefix = {
        "create": "INSERT INTO APPLICATION",
        "update": "UPDATE APPLICATION",
        "delete": "DELETE FROM APPLICATION",
    }[operation]

    def fail_after_write(
        _connection, _cursor, statement, parameters, _context, _executemany
    ):
        if statement.lstrip().upper().startswith(statement_prefix):
            raise OperationalError(
                statement,
                parameters,
                sqlite3.OperationalError(SENSITIVE_DB_ERROR),
            )

    with app.app_context():
        engine = db.engine
        event.listen(engine, "after_cursor_execute", fail_after_write)
        try:
            with caplog.at_level(logging.ERROR):
                if operation == "create":
                    response = client.post(
                        "/api/applications",
                        headers=auth_headers,
                        json={
                            "company": SENSITIVE_BODY_VALUE,
                            "position": "Engineer",
                        },
                    )
                elif operation == "update":
                    response = client.patch(
                        f"/api/applications/{application_id}",
                        headers=auth_headers,
                        json={
                            "company": "Changed Company",
                            "notes": SENSITIVE_BODY_VALUE,
                        },
                    )
                else:
                    response = client.delete(
                        f"/api/applications/{application_id}",
                        headers=auth_headers,
                    )
        finally:
            event.remove(engine, "after_cursor_execute", fail_after_write)

        assert response.status_code == 500
        assert response.get_json() == ERROR_RESPONSE

        log_output = caplog.text
        assert "OperationalError" in log_output
        assert "\n  File " in log_output
        assert statement_prefix not in log_output
        assert SENSITIVE_BODY_VALUE not in log_output
        assert SENSITIVE_DB_ERROR not in log_output
        assert auth_headers["Authorization"].split(" ", 1)[1] not in log_output

        user_id = db.session.scalar(
            select(User.id).where(User.email == "person@example.com")
        )
        applications = db.session.scalars(
            select(Application).where(Application.user_id == user_id)
        ).all()
        assert len(applications) == expected_count

        if operation == "update":
            assert applications[0].company == "Original Company"
            assert applications[0].notes == SENSITIVE_BODY_VALUE
        elif operation == "delete":
            assert applications[0].id == application_id

        recovered_application = Application(
            user_id=user_id,
            company="Recovery Company",
            position="Engineer",
        )
        db.session.add(recovered_application)
        db.session.commit()
        assert (
            db.session.scalar(
                select(func.count())
                .select_from(Application)
                .where(Application.user_id == user_id)
            )
            == expected_count + 1
        )
