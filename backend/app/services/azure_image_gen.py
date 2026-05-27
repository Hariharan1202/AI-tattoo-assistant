import base64
import uuid
from pathlib import Path

from app.core.config import settings
from app.services.azure_openai import get_client

UPLOAD_DIR = Path(__file__).parent.parent.parent / 'uploads'

STYLE_HINTS = {
    'japanese': 'Japanese irezumi style, bold outlines, traditional motifs, vibrant colour fills',
    'geometric': 'geometric dotwork style, precise linework, sacred geometry, black ink',
    'watercolor': 'watercolor tattoo style, flowing colour washes, no hard outlines, artistic',
    'fine line': 'fine line single-needle style, delicate minimal linework, elegant',
    'blackwork': 'blackwork tattoo style, solid black fills, bold contrast, graphic',
    'realism': 'photorealistic tattoo style, detailed shading, high contrast',
    'tribal': 'tribal tattoo style, bold black patterns, cultural motifs',
    'neo-traditional': 'neo-traditional tattoo style, thick outlines, flat vivid colours',
    'mandala': 'mandala tattoo style, intricate symmetrical dotwork patterns',
}


def _enrich_prompt(prompt: str) -> str:
    lower = prompt.lower()
    for keyword, hint in STYLE_HINTS.items():
        if keyword in lower:
            return f'{prompt}. Style: {hint}. High quality tattoo design on white background.'
    return f'{prompt}. Professional tattoo design concept, clean presentation on white background.'


async def generate_tattoo_image(prompt: str) -> tuple[str, str]:
    """Generate a tattoo concept image using gpt-image-1.

    Returns (local_file_url, enriched_prompt).
    """
    client = get_client()
    enriched = _enrich_prompt(prompt)

    response = await client.images.generate(
        model=settings.AZURE_OPENAI_IMAGE_DEPLOYMENT,
        prompt=enriched,
        n=1,
        size='1024x1024',
        response_format='b64_json',
    )

    b64_data = response.data[0].b64_json
    image_bytes = base64.b64decode(b64_data)

    filename = f'gen-{uuid.uuid4()}.png'
    dest = UPLOAD_DIR / filename
    dest.write_bytes(image_bytes)

    return f'/uploads/{filename}', enriched
