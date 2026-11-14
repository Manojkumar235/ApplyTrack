"""Registration and login endpoints."""

import re

from flask import request
from flask_jwt_extended import create_access_token
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api import api_bp
from app.extensions import db
from app.models import User

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return None, (
            {"error": "Bad Request", "message": "A JSON object is required"},
            400,
        )
    return body, None


@api_bp.post("/auth/register")
def register():
    body, error = _json_body()
    if error:
        return error
    if set(body) != {"email", "password"}:
        return {
            "error": "Bad Request",
            "message": "Provide only email and password",
        }, 400

    email = body["email"]
    password = body["password"]
    if (
        not isinstance(email, str)
        or len(email.strip()) > 254
        or not EMAIL_PATTERN.fullmatch(email.strip())
    ):
        return {"error": "Bad Request", "message": "A valid email is required"}, 400
    if not isinstance(password, str) or not 8 <= len(password) <= 128:
        return {
            "error": "Bad Request",
            "message": "Password must be between 8 and 128 characters",
        }, 400

    user = User(email=email.strip().lower())
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {
            "error": "Conflict",
            "message": "An account with that email exists",
        }, 409

    token = create_access_token(identity=str(user.id))
    return {"access_token": token, "user": user.to_dict()}, 201


@api_bp.post("/auth/login")
def login():
    body, error = _json_body()
    if error:
        return error
    if set(body) != {"email", "password"}:
        return {
            "error": "Bad Request",
            "message": "Provide only email and password",
        }, 400

    email = body["email"]
    password = body["password"]
    if not isinstance(email, str) or not isinstance(password, str):
        return {
            "error": "Bad Request",
            "message": "Email and password are required",
        }, 400

    user = db.session.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None or not user.check_password(password):
        return {"error": "Unauthorized", "message": "Invalid email or password"}, 401

    token = create_access_token(identity=str(user.id))
    return {"access_token": token, "user": user.to_dict()}
