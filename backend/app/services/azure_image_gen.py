import base64
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx
from openai import AsyncAzureOpenAI

from app.core.config import settings

UPLOAD_DIR = Path(__file__).parent.parent.parent / 'uploads'

# Separate client for image generation — gpt-image-1.5 requires its own API
# version and may live in a different Azure OpenAI resource than GPT-4o.
_image_client: AsyncAzureOpenAI | None = None

# Image generation can legitimately take 30–60 seconds; give it 120s read timeout.
_IMAGE_TIMEOUT = httpx.Timeout(connect=10.0, read=120.0, write=15.0, pool=5.0)


def _base_url(url: str) -> str:
    """Return only scheme + host from a URL.

    Azure Portal's "Get Started" tab shows the *full* endpoint path
    (e.g. .../deployments/gpt-image-1.5/images/generations?api-version=...)
    but AsyncAzureOpenAI needs just the base URL — it constructs the path
    itself.  If the caller already passes a clean base URL this is a no-op.
    """
    parsed = urlparse(url.strip())
    if not parsed.scheme or not parsed.netloc:
        return url  # can't parse — pass through as-is
    return f'{parsed.scheme}://{parsed.netloc}/'


def get_image_client() -> AsyncAzureOpenAI:
    global _image_client
    if _image_client is None:
        raw_endpoint = (
            settings.AZURE_OPENAI_IMAGE_ENDPOINT.strip()
            or settings.AZURE_OPENAI_ENDPOINT.strip()
        )
        api_key = (
            settings.AZURE_OPENAI_IMAGE_API_KEY.strip()
            or settings.AZURE_OPENAI_API_KEY.strip()
        )
        _image_client = AsyncAzureOpenAI(
            azure_endpoint=_base_url(raw_endpoint),
            api_key=api_key,
            api_version=settings.AZURE_OPENAI_IMAGE_API_VERSION,
            timeout=_IMAGE_TIMEOUT,
            max_retries=0,
        )
    return _image_client


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
    """Generate a tattoo concept image using gpt-image-1.5.

    Returns (local_file_url, enriched_prompt).

    gpt-image-1.5 with api-version=2024-02-01 does NOT accept
    response_format — it always returns a URL.  We download the image
    and save it locally so the frontend can serve it from /uploads/.
    """
    client = get_image_client()
    enriched = _enrich_prompt(prompt)

    # Do NOT pass response_format — gpt-image-1.5 rejects it as an unknown
    # parameter.  The API returns either a URL or b64_json depending on the
    # model / API version; we handle both.
    response = await client.images.generate(
        model=settings.AZURE_OPENAI_IMAGE_DEPLOYMENT,
        prompt=enriched,
        n=1,
        size='1024x1024',
    )

    item = response.data[0]
    filename = f'gen-{uuid.uuid4()}.png'
    dest = UPLOAD_DIR / filename

    if item.b64_json:
        # Some API versions return base64 directly
        dest.write_bytes(base64.b64decode(item.b64_json))
    elif item.url:
        # gpt-image-1.5 / api-version=2024-02-01 returns a signed URL —
        # download and save locally so the image persists past expiry.
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as http:
            r = await http.get(item.url)
            r.raise_for_status()
            dest.write_bytes(r.content)
    else:
        raise ValueError('Image generation API returned neither b64_json nor a URL')

    return f'/uploads/{filename}', enriched
