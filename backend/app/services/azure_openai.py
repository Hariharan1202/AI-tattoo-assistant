from typing import AsyncGenerator

import httpx
from openai import AsyncAzureOpenAI

from app.core.config import settings

_client: AsyncAzureOpenAI | None = None

# Timeouts for the chat/vision client:
#   connect — fail fast if the Azure endpoint hostname is wrong or unreachable
#   read    — max gap between streaming tokens before giving up
#   write   — time allowed to send the request body
# max_retries=0 so errors surface immediately instead of retrying for minutes.
_CHAT_TIMEOUT = httpx.Timeout(connect=10.0, read=90.0, write=15.0, pool=5.0)


def get_client() -> AsyncAzureOpenAI:
    """Return the shared client for GPT-4o chat and vision calls."""
    global _client
    if _client is None:
        _client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_CHAT_API_VERSION,
            timeout=_CHAT_TIMEOUT,
            max_retries=0,
        )
    return _client


async def stream_chat(
    messages: list[dict],
    system_prompt: str,
    max_tokens: int | None = None,
) -> AsyncGenerator[str, None]:
    """Stream GPT-4o response tokens as they arrive.

    Args:
        messages: Full conversation history (role/content dicts).
        system_prompt: System instruction injected before the history.
        max_tokens: Override the default from settings (AZURE_OPENAI_MAX_TOKENS).
    """
    client = get_client()
    full_messages = [{'role': 'system', 'content': system_prompt}, *messages]

    stream = await client.chat.completions.create(
        model=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
        messages=full_messages,
        stream=True,
        max_tokens=max_tokens if max_tokens is not None else settings.AZURE_OPENAI_MAX_TOKENS,
        temperature=0.7,
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


def _text_from_content(content: str | list | None) -> str:
    """Extract plain text from a GPT content value (string or vision parts list)."""
    if not content:
        return ''
    if isinstance(content, list):
        # Vision message — pull out only the text parts, ignore image_url parts
        return ' '.join(
            part.get('text', '') for part in content if part.get('type') == 'text'
        )
    return content


async def extract_preferences_from_conversation(messages: list[dict]) -> dict:
    """Ask GPT-4o to extract tattoo preferences as structured JSON."""
    client = get_client()
    conversation_text = '\n'.join(
        f"{m['role'].upper()}: {_text_from_content(m['content'])}"
        for m in messages
        if _text_from_content(m['content'])
    )
    extraction_prompt = (
        'You are a tattoo preference extractor. Analyse the conversation below and return ONLY valid JSON '
        'with these keys: preferred_styles (list of strings), themes (list of strings), color_prefs (object '
        'with keys like "palette", "avoid"). If nothing is clear, return empty lists/objects. '
        'Do not include any explanation or markdown.\n\nConversation:\n' + conversation_text
    )

    response = await client.chat.completions.create(
        model=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
        messages=[{'role': 'user', 'content': extraction_prompt}],
        max_tokens=256,
        temperature=0,
        response_format={'type': 'json_object'},
    )
    import json
    raw = response.choices[0].message.content or '{}'
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}
