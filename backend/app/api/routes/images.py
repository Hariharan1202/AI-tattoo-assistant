import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.generated_image import GeneratedImage
from app.models.user import User
from app.schemas.images import GeneratedImageResponse, ImageAnalysisResponse, ImageGenerateRequest
from app.services import azure_image_gen, azure_vision

router = APIRouter(prefix='/api/images', tags=['images'])

UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / 'uploads'
ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post('/upload')
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail='Unsupported image type')

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail='Image too large (max 10 MB)')

    suffix = Path(file.filename or 'upload.jpg').suffix or '.jpg'
    filename = f'{uuid.uuid4()}{suffix}'
    (UPLOAD_DIR / filename).write_bytes(data)

    return {'url': f'/uploads/{filename}', 'filename': filename}


@router.post('/analyze', response_model=ImageAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail='Unsupported image type')

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail='Image too large (max 10 MB)')

    suffix = Path(file.filename or 'upload.jpg').suffix or '.jpg'
    tmp_path = UPLOAD_DIR / f'tmp-{uuid.uuid4()}{suffix}'
    tmp_path.write_bytes(data)

    try:
        result = await azure_vision.analyze_image(str(tmp_path))
    finally:
        tmp_path.unlink(missing_ok=True)

    return ImageAnalysisResponse(
        style=result.get('style', 'Unknown'),
        elements=result.get('elements', []),
        recommendations=result.get('recommendations', []),
    )


@router.post('/generate', response_model=GeneratedImageResponse, status_code=status.HTTP_201_CREATED)
async def generate_image(
    body: ImageGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        image_url, enriched_prompt = await azure_image_gen.generate_tattoo_image(body.prompt)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f'Image generation failed: {exc}')

    from app.services.azure_image_gen import _enrich_prompt, STYLE_HINTS
    style = next(
        (hint.split(',')[0] for kw, hint in STYLE_HINTS.items() if kw in body.prompt.lower()),
        'Custom',
    )

    record = GeneratedImage(
        user_id=current_user.id,
        conversation_id=body.conversation_id,
        prompt=body.prompt,
        image_url=image_url,
        style=style,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get('/history', response_model=list[GeneratedImageResponse])
async def get_history(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * page_size
    result = await db.execute(
        select(GeneratedImage)
        .where(GeneratedImage.user_id == current_user.id)
        .order_by(GeneratedImage.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all()
