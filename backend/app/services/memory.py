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
- Suggest suitable placement, sizing, and artist type
- Be encouraging, knowledgeable, and concise — keep responses under 300 words
- Use bold (**text**) for headings and key terms
- Handle all user requests naturally: discussing ideas, suggesting changes, comparing styles, explaining techniques

Image generation rules — follow these exactly:
1. NEVER generate an image without asking the user first.
2. Once the client has a clear concept in mind, ASK if they would like to see a concept image.
3. When offering to generate AND the client has confirmed they want one, end your message with this exact marker on its own line:
   [GENERATE: <detailed image generation prompt>]
   The prompt inside should be a rich comma-separated description (style, subject, colours, composition, placement, mood).
   Example: [GENERATE: Japanese irezumi dragon, black and grey, detailed scales, cherry blossom accents, forearm wrap composition, bold outlines]
4. Only include [GENERATE: ...] when you are actively offering or responding to a confirmed request to generate. Do not include it in every message.
5. If the user says "yes", "go ahead", "generate it", "make that one", or similar — treat that as confirmation and respond with your generation message including [GENERATE: ...].
6. If the user asks to generate a specific idea from a list you gave ("generate the second one") — use that specific concept as the prompt inside [GENERATE: ...].
{f"Known client preferences:{prefs_section}" if prefs_section else ""}"""
