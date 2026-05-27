import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.core.database import AsyncSessionLocal
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import ConversationCreate, ConversationResponse, MessageCreate, MessageResponse
from app.services import azure_openai, memory

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
    gpt_messages = [{'role': m.role, 'content': m.content} for m in history if m.role != 'system']

    # Build system prompt with user preferences
    prefs = await memory.get_preferences(db, current_user.id)
    system_prompt = memory.build_system_prompt(prefs)

    async def event_stream():
        full_response = []
        try:
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
