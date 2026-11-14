"""Authenticated application tracking endpoints."""

from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import select

from app.api import api_bp
from app.api.application_validation import validate_application_payload
from app.extensions import db
from app.models import Application


def _current_user_id() -> int:
    return int(get_jwt_identity())


@api_bp.get("/applications")
@jwt_required()
def list_applications():
    applications = db.session.scalars(
        select(Application)
        .where(Application.user_id == _current_user_id())
        .order_by(Application.id.desc())
    ).all()
    return {"applications": [application.to_dict() for application in applications]}


@api_bp.post("/applications")
@jwt_required()
def create_application():
    body = request.get_json(silent=True)
    payload, error = validate_application_payload(body)
    if error:
        return {"error": "Bad Request", "message": error}, 400

    application = Application(user_id=_current_user_id(), **payload)
    db.session.add(application)
    db.session.commit()
    return {"application": application.to_dict()}, 201


@api_bp.get("/applications/<int:application_id>")
@jwt_required()
def get_application(application_id: int):
    application = _owned_application(application_id)
    if application is None:
        return {"error": "Not Found", "message": "Application not found"}, 404
    return {"application": application.to_dict()}


@api_bp.patch("/applications/<int:application_id>")
@jwt_required()
def update_application(application_id: int):
    application = _owned_application(application_id)
    if application is None:
        return {"error": "Not Found", "message": "Application not found"}, 404

    payload, error = validate_application_payload(
        request.get_json(silent=True), partial=True
    )
    if error:
        return {"error": "Bad Request", "message": error}, 400

    for field, value in payload.items():
        setattr(application, field, value)
    db.session.commit()
    return {"application": application.to_dict()}


@api_bp.delete("/applications/<int:application_id>")
@jwt_required()
def delete_application(application_id: int):
    application = _owned_application(application_id)
    if application is None:
        return {"error": "Not Found", "message": "Application not found"}, 404
    db.session.delete(application)
    db.session.commit()
    return "", 204


def _owned_application(application_id: int):
    return db.session.scalar(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == _current_user_id(),
        )
    )
