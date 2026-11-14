"""Job or internship application model."""

from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class Application(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company: Mapped[str] = mapped_column(String(160), nullable=False)
    position: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="saved")
    location: Mapped[str | None] = mapped_column(String(160))
    url: Mapped[str | None] = mapped_column(String(2048))
    notes: Mapped[str | None] = mapped_column(Text)
    applied_on: Mapped[date | None] = mapped_column(Date)

    user: Mapped["User"] = relationship(back_populates="applications")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "company": self.company,
            "position": self.position,
            "status": self.status,
            "location": self.location,
            "url": self.url,
            "notes": self.notes,
            "applied_on": self.applied_on.isoformat() if self.applied_on else None,
        }
