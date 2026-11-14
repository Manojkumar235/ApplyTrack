"""Request validation for application create and update operations."""

import re
from datetime import date
from urllib.parse import urlparse

APPLICATION_STATUSES = {
    "saved",
    "applied",
    "interviewing",
    "offer",
    "rejected",
    "withdrawn",
}
REQUIRED_FIELDS = {"company", "position"}
OPTIONAL_FIELDS = {"location", "url", "notes", "applied_on"}
ALLOWED_FIELDS = REQUIRED_FIELDS | OPTIONAL_FIELDS | {"status"}
FIELD_LIMITS = {"company": 160, "position": 160, "location": 160, "url": 2048}
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate_application_payload(body, partial=False):
    if not isinstance(body, dict):
        return None, "A JSON object is required"
    if not body:
        return None, "At least one field is required"
    unknown_fields = set(body) - ALLOWED_FIELDS
    if unknown_fields:
        return None, f"Unknown fields: {', '.join(sorted(unknown_fields))}"
    if not partial and not REQUIRED_FIELDS.issubset(body):
        return None, "Company and position are required"

    cleaned = {}
    for field, value in body.items():
        if field in REQUIRED_FIELDS:
            if not isinstance(value, str) or not value.strip():
                return None, f"{field.capitalize()} must be a non-empty string"
            cleaned[field] = value.strip()
        elif field == "status":
            if not isinstance(value, str) or value not in APPLICATION_STATUSES:
                return None, "Status is not supported"
            cleaned[field] = value
        elif field == "applied_on":
            if value is None:
                cleaned[field] = None
                continue
            if not isinstance(value, str) or not DATE_PATTERN.fullmatch(value):
                return None, "Applied_on must be a date in YYYY-MM-DD format"
            try:
                cleaned[field] = date.fromisoformat(value)
            except ValueError:
                return None, "Applied_on must be a date in YYYY-MM-DD format"
        else:
            if value is not None and not isinstance(value, str):
                return None, f"{field.capitalize()} must be a string or null"
            if (
                value is not None
                and field in FIELD_LIMITS
                and len(value) > FIELD_LIMITS[field]
            ):
                return (
                    None,
                    f"{field.capitalize()} must be at most "
                    f"{FIELD_LIMITS[field]} characters",
                )
            if field == "url" and value:
                parsed_url = urlparse(value)
                if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
                    return None, "URL must be an absolute HTTP or HTTPS URL"
            cleaned[field] = value.strip() if value else value

    if not partial:
        cleaned.setdefault("status", "saved")
    return cleaned, None
