from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import azure_speech

router = APIRouter(prefix='/api/voice', tags=['voice'])

ALLOWED_AUDIO = {'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg'}
MAX_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


@router.post('/transcribe')
async def transcribe(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_AUDIO:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f'Unsupported audio type: {file.content_type}',
        )

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail='Audio too large (max 25 MB)')

    try:
        text = await azure_speech.transcribe_audio(data, file.content_type or 'audio/wav')
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f'Transcription failed: {exc}')

    return {'text': text}
