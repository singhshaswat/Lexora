from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from app.models.tutor_chat import (
    TutorEvaluationRequest, 
    TutorEvaluationResponse,
    ChatContinueRequest,
    TutorChatResponse,
    ChatListItem
)
from app.middleware.auth_middleware import get_current_user
from app.services.tutor_service import evaluate_response, continue_chat, get_chat_history, list_user_chats

router = APIRouter(prefix="/api/tutor", tags=["Tutor"])

@router.post("/evaluate", response_model=TutorEvaluationResponse)
async def evaluate_endpoint(
    request: TutorEvaluationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Evaluate user response using AI tutor"""
    try:
        return await evaluate_response(
            current_user["user_id"], 
            request,
            chat_id=request.chatId
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/chat/{chat_id}", response_model=TutorEvaluationResponse)
async def continue_chat_endpoint(
    chat_id: str,
    request: ChatContinueRequest,
    current_user: dict = Depends(get_current_user)
):
    """Continue a chat conversation"""
    try:
        return await continue_chat(
            current_user["user_id"],
            chat_id,
            request.message
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/chat/{chat_id}", response_model=TutorChatResponse)
async def get_chat_endpoint(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat history"""
    try:
        return await get_chat_history(
            current_user["user_id"],
            chat_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/chats", response_model=List[ChatListItem])
async def list_chats_endpoint(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """List all chats for the current user"""
    try:
        return await list_user_chats(
            current_user["user_id"],
            limit,
            offset
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
