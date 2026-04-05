from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError
from app.database import get_words_collection
from app.models.word import WordCreate, WordUpdate, WordResponse, Priority, State
from typing import List, Optional

def normalize_word(word: str) -> str:
    """Normalize word to lowercase for uniqueness check"""
    return word.lower().strip()

async def create_word(user_id: str, word_data: WordCreate) -> dict:
    """Create a new word for a user"""
    words_collection = get_words_collection()
    normalized = normalize_word(word_data.word)
    
    # Check if word already exists for this user
    existing = await words_collection.find_one({
        "userId": ObjectId(user_id),
        "normalizedWord": normalized
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Word already exists"
        )
    
    # Validate priority
    if word_data.priority not in [1, 2, 3, 4]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Priority must be between 1 and 4"
        )
    
    # Create word document
    word_doc = {
        "userId": ObjectId(user_id),
        "word": word_data.word,
        "normalizedWord": normalized,
        "meaning": word_data.meaning,
        "example": word_data.example,
        "priority": word_data.priority,
        "state": State.ACTIVE.value,
        "masteryCount": 0,
        "lastReviewedAt": None,
        "lastPromotedAt": None,
        "failureStats": {
            "meaning": 0,
            "sentence": 0,
            "paragraph": 0
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    try:
        result = await words_collection.insert_one(word_doc)
        word_doc["_id"] = result.inserted_id
    except DuplicateKeyError:
        # Handle race condition where word was inserted between check and insert
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Word already exists"
        )
    
    return _word_doc_to_response(word_doc)

async def create_words_batch(user_id: str, words_data: List[WordCreate]) -> dict:
    """Create multiple words for a user in a single batch operation"""
    words_collection = get_words_collection()
    user_object_id = ObjectId(user_id)
    now = datetime.utcnow()
    
    # Step 1: Validate all words before any database operations
    normalized_words = []
    seen_in_batch = set()
    
    for word_data in words_data:
        # Normalize word
        normalized = normalize_word(word_data.word)
        
        # Check for duplicates within the batch
        if normalized in seen_in_batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate word in batch: '{word_data.word}'"
            )
        seen_in_batch.add(normalized)
        normalized_words.append(normalized)
        
        # Validate priority
        if word_data.priority not in [1, 2, 3, 4]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority for word '{word_data.word}': Priority must be between 1 and 4"
            )
    
    # Step 2: Check for duplicates against existing user words in database
    existing_words = await words_collection.find({
        "userId": user_object_id,
        "normalizedWord": {"$in": normalized_words}
    }).to_list(length=None)
    
    if existing_words:
        existing_normalized = {word["normalizedWord"] for word in existing_words}
        duplicate_words = [
            words_data[i].word 
            for i, normalized in enumerate(normalized_words) 
            if normalized in existing_normalized
        ]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Words already exist: {', '.join(duplicate_words)}"
        )
    
    # Step 3: All validations passed, create all word documents
    word_docs = []
    for word_data in words_data:
        normalized = normalize_word(word_data.word)
        word_doc = {
            "userId": user_object_id,
            "word": word_data.word,
            "normalizedWord": normalized,
            "meaning": word_data.meaning,
            "example": word_data.example,
            "priority": word_data.priority,
            "state": State.ACTIVE.value,
            "masteryCount": 0,
            "lastReviewedAt": None,
            "lastPromotedAt": None,
            "failureStats": {
                "meaning": 0,
                "sentence": 0,
                "paragraph": 0
            },
            "createdAt": now,
            "updatedAt": now
        }
        word_docs.append(word_doc)
    
    # Step 4: Insert all words at once
    try:
        result = await words_collection.insert_many(word_docs)
    except DuplicateKeyError:
        # Handle race condition where word was inserted between check and insert
        # Re-check which words are duplicates
        existing_words = await words_collection.find({
            "userId": user_object_id,
            "normalizedWord": {"$in": normalized_words}
        }).to_list(length=None)
        existing_normalized = {word["normalizedWord"] for word in existing_words}
        duplicate_words = [
            words_data[i].word 
            for i, normalized in enumerate(normalized_words) 
            if normalized in existing_normalized
        ]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Words already exist: {', '.join(duplicate_words)}"
        )
    
    return {
        "message": "Words created successfully",
        "count": len(result.inserted_ids)
    }

async def get_words(
    user_id: str,
    priority: Optional[int] = None,
    state: Optional[str] = None
) -> List[dict]:
    """Get words for a user with optional filters"""
    words_collection = get_words_collection()
    query = {"userId": ObjectId(user_id)}
    
    if priority is not None:
        query["priority"] = priority
    if state is not None:
        query["state"] = state
    
    words = await words_collection.find(query).to_list(length=None)
    return [_word_doc_to_response(word) for word in words]

async def get_word(user_id: str, word_id: str) -> dict:
    """Get a single word by ID"""
    words_collection = get_words_collection()
    word = await words_collection.find_one({
        "_id": ObjectId(word_id),
        "userId": ObjectId(user_id)
    })
    
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found"
        )
    
    return _word_doc_to_response(word)

async def update_word(user_id: str, word_id: str, word_data: WordUpdate) -> dict:
    """Update a word"""
    words_collection = get_words_collection()
    
    # Check if word exists
    word = await words_collection.find_one({
        "_id": ObjectId(word_id),
        "userId": ObjectId(user_id)
    })
    
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found"
        )
    
    # Build update document
    update_doc = {"updatedAt": datetime.utcnow()}
    
    if word_data.meaning is not None:
        update_doc["meaning"] = word_data.meaning
    if word_data.example is not None:
        update_doc["example"] = word_data.example
    if word_data.priority is not None:
        if word_data.priority not in [1, 2, 3, 4]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Priority must be between 1 and 4"
            )
        update_doc["priority"] = word_data.priority
        update_doc["lastPromotedAt"] = datetime.utcnow()
    
    await words_collection.update_one(
        {"_id": ObjectId(word_id)},
        {"$set": update_doc}
    )
    
    # Fetch updated word
    updated_word = await words_collection.find_one({"_id": ObjectId(word_id)})
    return _word_doc_to_response(updated_word)

async def delete_word(user_id: str, word_id: str) -> dict:
    """Delete a word"""
    words_collection = get_words_collection()
    
    result = await words_collection.delete_one({
        "_id": ObjectId(word_id),
        "userId": ObjectId(user_id)
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found"
        )
    
    return {"message": "Word deleted successfully"}

async def promote_word(user_id: str, word_id: str) -> dict:
    """Promote word priority (1->2->3->4)"""
    words_collection = get_words_collection()
    
    word = await words_collection.find_one({
        "_id": ObjectId(word_id),
        "userId": ObjectId(user_id)
    })
    
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found"
        )
    
    current_priority = word["priority"]
    if current_priority >= 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Word is already at maximum priority"
        )
    
    new_priority = current_priority + 1
    
    await words_collection.update_one(
        {"_id": ObjectId(word_id)},
        {
            "$set": {
                "priority": new_priority,
                "lastPromotedAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    updated_word = await words_collection.find_one({"_id": ObjectId(word_id)})
    return _word_doc_to_response(updated_word)

async def demote_word(user_id: str, word_id: str) -> dict:
    """Demote word priority (4->3->2->1)"""
    words_collection = get_words_collection()
    
    word = await words_collection.find_one({
        "_id": ObjectId(word_id),
        "userId": ObjectId(user_id)
    })
    
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found"
        )
    
    current_priority = word["priority"]
    if current_priority <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Word is already at minimum priority"
        )
    
    new_priority = current_priority - 1
    
    await words_collection.update_one(
        {"_id": ObjectId(word_id)},
        {
            "$set": {
                "priority": new_priority,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    updated_word = await words_collection.find_one({"_id": ObjectId(word_id)})
    return _word_doc_to_response(updated_word)

async def mark_mastered(user_id: str, word_id: str) -> dict:
    """Mark word as mastered (when masteryCount >= 3)"""
    words_collection = get_words_collection()
    
    word = await words_collection.find_one({
        "_id": ObjectId(word_id),
        "userId": ObjectId(user_id)
    })
    
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found"
        )
    
    mastery_count = word.get("masteryCount", 0)
    if mastery_count < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Word needs 3 successful P4 completions before being marked as mastered"
        )
    
    await words_collection.update_one(
        {"_id": ObjectId(word_id)},
        {
            "$set": {
                "state": State.MASTERED.value,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    updated_word = await words_collection.find_one({"_id": ObjectId(word_id)})
    return _word_doc_to_response(updated_word)

async def reintroduce_word(user_id: str, word_id: str) -> dict:
    """Reintroduce a mastered word back to active learning"""
    words_collection = get_words_collection()
    
    word = await words_collection.find_one({
        "_id": ObjectId(word_id),
        "userId": ObjectId(user_id)
    })
    
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found"
        )
    
    if word.get("state") != State.MASTERED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Word is not in MASTERED state"
        )
    
    mastery_count = max(0, word.get("masteryCount", 0) - 1)
    
    await words_collection.update_one(
        {"_id": ObjectId(word_id)},
        {
            "$set": {
                "state": State.ACTIVE.value,
                "priority": 2,
                "masteryCount": mastery_count,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    updated_word = await words_collection.find_one({"_id": ObjectId(word_id)})
    return _word_doc_to_response(updated_word)

def _word_doc_to_response(word_doc: dict) -> dict:
    """Convert word document to response model"""
    return {
        "id": str(word_doc["_id"]),
        "userId": str(word_doc["userId"]),
        "word": word_doc["word"],
        "normalizedWord": word_doc["normalizedWord"],
        "meaning": word_doc["meaning"],
        "example": word_doc["example"],
        "priority": word_doc["priority"],
        "state": word_doc["state"],
        "masteryCount": word_doc.get("masteryCount", 0),
        "lastReviewedAt": word_doc.get("lastReviewedAt"),
        "lastPromotedAt": word_doc.get("lastPromotedAt"),
        "failureStats": word_doc.get("failureStats", {
            "meaning": 0,
            "sentence": 0,
            "paragraph": 0
        }),
        "createdAt": word_doc["createdAt"],
        "updatedAt": word_doc["updatedAt"]
    }
