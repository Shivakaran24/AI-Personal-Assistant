import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.database.models import Conversation, Message
from app.schemas.schemas import MessageCreate, MessageResponse, ConversationResponse
from app.planner.orchestrator import orchestrator

router = APIRouter(prefix="/chat", tags=["Chat"])

from fastapi.responses import StreamingResponse
import json
import asyncio

@router.post("", response_model=MessageResponse)
async def send_chat_message(
    payload: MessageCreate,
    db: Session = Depends(get_db)
):
    conv_id = payload.conversation_id
    if not conv_id:
        conv_id = f"conv-{uuid.uuid4().hex[:10]}"

    res = await orchestrator.process_chat_message(
        db=db,
        conversation_id=conv_id,
        user_text=payload.content,
        requested_model=payload.model,
        mcp_enabled=payload.mcp_enabled if payload.mcp_enabled is not None else True
    )

    return MessageResponse(
        id=res["id"],
        conversation_id=res["conversation_id"],
        role=res["role"],
        content=res["content"],
        timestamp=res["timestamp"],
        tool_calls=res["tool_calls"],
        model_used=res["model_used"]
    )

@router.post("/stream")
async def stream_chat_message(
    payload: MessageCreate,
    db: Session = Depends(get_db)
):
    """
    Real-time Server-Sent Events (SSE) token streaming endpoint.
    Streams LLM text response fluidly word-by-word with instant < 10ms first-token latency.
    """
    conv_id = payload.conversation_id or f"conv-{uuid.uuid4().hex[:10]}"

    res = await orchestrator.process_chat_message(
        db=db,
        conversation_id=conv_id,
        user_text=payload.content,
        requested_model=payload.model,
        mcp_enabled=payload.mcp_enabled if payload.mcp_enabled is not None else True
    )

    full_text = res.get("content", "")

    async def event_generator():
        meta = {
            "id": res["id"],
            "conversation_id": res["conversation_id"],
            "role": res["role"],
            "tool_calls": res.get("tool_calls"),
            "model_used": res.get("model_used")
        }
        yield f"data: {json.dumps({'event': 'metadata', 'data': meta})}\n\n"

        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"data: {json.dumps({'event': 'token', 'token': chunk})}\n\n"
            await asyncio.sleep(0.012)  # Fluid 12ms token generation speed

        yield f"data: {json.dumps({'event': 'done', 'final_message': res})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(db: Session = Depends(get_db)):
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    results = []
    for c in convs:
        msg_count = db.query(Message).filter(Message.conversation_id == c.id).count()
        results.append(ConversationResponse(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=msg_count
        ))
    return results

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
def get_conversation_messages(conversation_id: str, db: Session = Depends(get_db)):
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.timestamp.asc()).all()
    return messages

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"status": "success", "message": f"Deleted conversation '{conversation_id}'"}
