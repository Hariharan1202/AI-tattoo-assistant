import base64
from pathlib import Path

from app.services.azure_openai import get_client
from app.core.config import settings


async def analyze_image(image_path: str) -> dict:
    """Analyse a tattoo reference image using GPT-4o vision."""
    client = get_client()

    # Read file and encode as base64 data URL
    path = Path(image_path)
    suffix = path.suffix.lower().lstrip('.')
    mime = 'image/jpeg' if suffix in ('jpg', 'jpeg') else f'image/{suffix}'
    data = base64.b64encode(path.read_bytes()).decode()
    data_url = f'data:{mime};base64,{data}'

    response = await client.chat.completions.create(
        model=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
        messages=[
            {
                'role': 'user',
                'content': [
                    {
                        'type': 'text',
                        'text': (
                            'You are an expert tattoo artist. Analyse this reference image and return ONLY valid JSON '
                            'with these keys: style (string, the tattoo style name), '
                            'elements (list of strings, key visual elements), '
                            'recommendations (list of strings, 3 placement/sizing suggestions). '
                            'Do not include markdown or explanation.'
                        ),
                    },
                    {'type': 'image_url', 'image_url': {'url': data_url}},
                ],
            }
        ],
        max_tokens=512,
        response_format={'type': 'json_object'},
    )

    import json
    raw = response.choices[0].message.content or '{}'
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {'style': 'Unknown', 'elements': [], 'recommendations': []}
