from typing import AsyncGenerator

from openai import AsyncAzureOpenAI

from app.core.config import settings

_client: AsyncAzureOpenAI | None = None


def get_client() -> AsyncAzureOpenAI:
    global _client
    if _client is None:
        _client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
    return _client


async def stream_chat(
    messages: list[dict],
    system_prompt: str,
) -> AsyncGenerator[str, None]:
    """Stream GPT-4o response tokens as they arrive."""
    client = get_client()
    full_messages = [{'role': 'system', 'content': system_prompt}, *messages]

    stream = await client.chat.completions.create(
        model=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
        messages=full_messages,
        stream=True,
        max_tokens=1024,
        temperature=0.7,
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def extract_preferences_from_conversation(messages: list[dict]) -> dict:
    """Ask GPT-4o to extract tattoo preferences as structured JSON."""
    client = get_client()
    conversation_text = '\n'.join(
        f"{m['role'].upper()}: {m['content']}" for m in messages if m['content']
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
