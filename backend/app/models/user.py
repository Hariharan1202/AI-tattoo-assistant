import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    conversations: Mapped[list['Conversation']] = relationship(back_populates='user', cascade='all, delete-orphan')
    preferences: Mapped['UserPreferences | None'] = relationship(back_populates='user', uselist=False, cascade='all, delete-orphan')
    generated_images: Mapped[list['GeneratedImage']] = relationship(back_populates='user', cascade='all, delete-orphan')


from app.models.conversation import Conversation  # noqa: E402
from app.models.preferences import UserPreferences  # noqa: E402
from app.models.generated_image import GeneratedImage  # noqa: E402
