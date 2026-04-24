"""SQLAlchemy models backing the per-user free-tier limits.

We record one ``UsageEvent`` row per billable action (currently:
``transcribe`` and ``photos``). The enforcement layer
(``services/usage.py``) sums today's rows for the caller and rejects the
request when the configured daily quota is reached.

The ``user_id`` column is a free-form string so the same table can hold:
- authenticated users (value = ``users.id`` = OIDC ``sub``)
- anonymous trials (value = ``"anon:<uuid>"`` from a signed cookie)
"""

from models.base import Base
from sqlalchemy import Column, DateTime, Index, Integer, String
from sqlalchemy.sql import func


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("ix_usage_events_user_created", "user_id", "created_at"),
    )
