from fastapi import APIRouter, Depends, Query, status
from typing import Optional, List
from app.models.word import WordCreate, WordUpdate, WordResponse, WordsBatchCreate
from app.middleware.auth_middleware import get_current_user
from app.services.word_service import (
    create_word, create_words_batch, get_words, get_word, update_word, delete_word,
    promote_word, reintroduce_word
)

router = APIRouter(prefix="/api/words", tags=["Words"])

@router.post("", response_model=WordResponse, status_code=201)
async def create_word_endpoint(
    word_data: WordCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new word"""
    return await create_word(current_user["user_id"], word_data)

@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def create_words_batch_endpoint(
    batch_data: WordsBatchCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create multiple words in a single batch operation"""
    return await create_words_batch(current_user["user_id"], batch_data.words)

@router.get("", response_model=List[WordResponse])
async def list_words(
    priority: Optional[int] = Query(None, ge=1, le=4),
    state: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """List words with optional filters"""
    return await get_words(current_user["user_id"], priority, state)

@router.get("/{word_id}", response_model=WordResponse)
async def get_word_endpoint(
    word_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single word by ID"""
    return await get_word(current_user["user_id"], word_id)

@router.put("/{word_id}", response_model=WordResponse)
async def update_word_endpoint(
    word_id: str,
    word_data: WordUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a word"""
    return await update_word(current_user["user_id"], word_id, word_data)

@router.delete("/{word_id}")
async def delete_word_endpoint(
    word_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a word"""
    return await delete_word(current_user["user_id"], word_id)

@router.post("/{word_id}/promote", response_model=WordResponse)
async def promote_word_endpoint(
    word_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Promote word priority"""
    return await promote_word(current_user["user_id"], word_id)

@router.post("/{word_id}/reintroduce", response_model=WordResponse)
async def reintroduce_word_endpoint(
    word_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reintroduce a mastered word back to active learning"""
    return await reintroduce_word(current_user["user_id"], word_id)
