from datetime import datetime

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    title: str = 'New Conversation'


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class MessageCreate(BaseModel):
    content: str
    image_url: str | None = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    image_url: str | None
    created_at: datetime

    model_config = {'from_attributes': True}
