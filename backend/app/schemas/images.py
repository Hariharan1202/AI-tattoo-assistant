from datetime import datetime

from pydantic import BaseModel


class ImageAnalysisResponse(BaseModel):
    style: str
    elements: list[str]
    recommendations: list[str]


class ImageGenerateRequest(BaseModel):
    prompt: str
    conversation_id: str | None = None


class GeneratedImageResponse(BaseModel):
    id: str
    prompt: str
    image_url: str
    style: str | None
    created_at: datetime

    model_config = {'from_attributes': True}
