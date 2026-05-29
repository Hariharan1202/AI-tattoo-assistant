import base64
import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.core.database import AsyncSessionLocal
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import ConversationCreate, ConversationResponse, MessageCreate, MessageResponse
from app.services import azure_openai, memory

# Resolved path to the uploads directory on disk
_UPLOAD_DIR = Path(__file__).resolve().parents[3] / 'uploads'


def _build_message_content(content: str | None, image_url: str | None) -> str | list:
    """Return the correct GPT content format for a message.

    - Text-only → plain string (standard).
    - Image attached → list of content parts (GPT-4o vision format).
      Local /uploads/ files are base64-encoded so the Azure API can read them
      without needing public network access to the server.
    """
    if not image_url:
        return content or ''

    # Resolve local uploads to a base64 data URL
    if image_url.startswith('/uploads/'):
        file_path = _UPLOAD_DIR / Path(image_url).name
        try:
            suffix = file_path.suffix.lower().lstrip('.')
            mime = 'image/jpeg' if suffix in ('jpg', 'jpeg') else f'image/{suffix}'
            encoded = base64.b64encode(file_path.read_bytes()).decode()
            resolved_url = f'data:{mime};base64,{encoded}'
        except (FileNotFoundError, OSError):
            # File missing — degrade gracefully to text-only
            return content or ''
    else:
        # External/absolute URL — pass through as-is
        resolved_url = image_url

    parts: list = []
    if content:
        parts.append({'type': 'text', 'text': content})
    parts.append({'type': 'image_url', 'image_url': {'url': resolved_url}})
    return parts


router = APIRouter(prefix='/api/chat', tags=['chat'])


@router.post('/conversations', response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = Conversation(user_id=current_user.id, title=body.title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.get('/conversations', response_model=list[ConversationResponse])
async def list_conversations(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all()


@router.get('/conversations/{conversation_id}', response_model=list[MessageResponse])
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Conversation not found')

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return result.scalars().all()


@router.post('/conversations/{conversation_id}/messages')
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Conversation not found')

    # Persist user message
    user_msg = Message(
        conversation_id=conversation_id,
        role='user',
        content=body.content,
        image_url=body.image_url,
    )
    db.add(user_msg)
    await db.commit()

    # Fetch full conversation history for GPT context
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    history = result.scalars().all()
    gpt_messages = [
        {'role': m.role, 'content': _build_message_content(m.content, m.image_url)}
        for m in history if m.role != 'system'
    ]

    # Build system prompt with user preferences
    prefs = await memory.get_preferences(db, current_user.id)
    system_prompt = memory.build_system_prompt(prefs)

    async def event_stream():
        full_response = []
        try:
            # Fail fast if Azure credentials are not configured yet.
            # An empty or placeholder endpoint causes the SDK to hang for minutes.
            endpoint = settings.AZURE_OPENAI_ENDPOINT.strip()
            api_key = settings.AZURE_OPENAI_API_KEY.strip()
            if not endpoint or not api_key or '<' in endpoint or '<' in api_key:
                raise ValueError(
                    'Azure OpenAI credentials are not configured. '
                    'Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in your .env file.'
                )

            async for token in azure_openai.stream_chat(gpt_messages, system_prompt):
                full_response.append(token)
                yield f"data: {json.dumps({'choices': [{'delta': {'content': token}}]})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        finally:
            yield 'data: [DONE]\n\n'
            complete_text = ''.join(full_response)
            background_tasks.add_task(
                _save_assistant_message, conversation_id, complete_text, current_user.id, gpt_messages
            )

    return StreamingResponse(event_stream(), media_type='text/event-stream')


async def _save_assistant_message(
    conversation_id: str,
    content: str,
    user_id: str,
    gpt_messages: list[dict],
) -> None:
    async with AsyncSessionLocal() as db:
        # Save assistant reply
        assistant_msg = Message(conversation_id=conversation_id, role='assistant', content=content)
        db.add(assistant_msg)

        # Update conversation timestamp
        conv = await db.get(Conversation, conversation_id)
        if conv:
            from datetime import datetime, timezone
            conv.updated_at = datetime.now(timezone.utc)

        await db.commit()

        # Extract and merge preferences in background (best-effort, no crash on failure)
        try:
            all_messages = gpt_messages + [{'role': 'assistant', 'content': content}]
            extracted = await azure_openai.extract_preferences_from_conversation(all_messages)
            if extracted:
                await memory.update_preferences(db, user_id, extracted)
        except Exception:
            pass
