from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.generated_image import GeneratedImage
from app.models.user import User
from app.schemas.images import GeneratedImageResponse

router = APIRouter(prefix='/api/user', tags=['user'])


@router.get('/preferences')
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select as sa_select
    from app.models.preferences import UserPreferences
    prefs = await db.scalar(sa_select(UserPreferences).where(UserPreferences.user_id == current_user.id))
    if not prefs:
        return {'preferred_styles': [], 'themes': [], 'color_prefs': {}}
    return {
        'preferred_styles': prefs.preferred_styles,
        'themes': prefs.themes,
        'color_prefs': prefs.color_prefs,
    }


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
