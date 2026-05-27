import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.preferences import UserPreferences


async def get_preferences(db: AsyncSession, user_id: str) -> dict:
    prefs = await db.scalar(select(UserPreferences).where(UserPreferences.user_id == user_id))
    if not prefs:
        return {'preferred_styles': [], 'themes': [], 'color_prefs': {}}
    return {
        'preferred_styles': prefs.preferred_styles,
        'themes': prefs.themes,
        'color_prefs': prefs.color_prefs,
    }


async def update_preferences(db: AsyncSession, user_id: str, extracted: dict) -> None:
    prefs = await db.scalar(select(UserPreferences).where(UserPreferences.user_id == user_id))
    if not prefs:
        prefs = UserPreferences(user_id=user_id, preferred_styles=[], themes=[], color_prefs={})
        db.add(prefs)

    new_styles = extracted.get('preferred_styles', [])
    new_themes = extracted.get('themes', [])
    new_color = extracted.get('color_prefs', {})

    # Merge: add new values without duplicates
    existing_styles: list = prefs.preferred_styles or []
    existing_themes: list = prefs.themes or []
    prefs.preferred_styles = list(dict.fromkeys(existing_styles + new_styles))
    prefs.themes = list(dict.fromkeys(existing_themes + new_themes))
    if new_color:
        existing_color: dict = prefs.color_prefs or {}
        prefs.color_prefs = {**existing_color, **new_color}

    await db.commit()


def build_system_prompt(preferences: dict) -> str:
    styles = preferences.get('preferred_styles', [])
    themes = preferences.get('themes', [])
    color_prefs = preferences.get('color_prefs', {})

    prefs_section = ''
    if styles:
        prefs_section += f"\n- Preferred styles: {', '.join(styles)}"
    if themes:
        prefs_section += f"\n- Themes they like: {', '.join(themes)}"
    if color_prefs:
        prefs_section += f"\n- Colour preferences: {json.dumps(color_prefs)}"

    return f"""You are an expert tattoo artist and consultant working for Ink AI, a premium AI tattoo studio.
Your role is to help clients develop their tattoo ideas through thoughtful conversation.

Guidelines:
- Ask clarifying questions about style, size, placement, colour preferences, and meaning
- Recommend specific tattoo styles (Japanese irezumi, fine line, geometric, watercolor, blackwork, neo-traditional, realism, tribal)
- Suggest suitable artists and placement
- When the client has a clear direction, offer to generate a concept image by ending your response with a question like "Would you like me to generate a concept image for this?"
- Be encouraging, knowledgeable, and concise — keep responses under 300 words
- Use bold (**text**) for headings and key terms
{f"Known client preferences:{prefs_section}" if prefs_section else ""}"""
