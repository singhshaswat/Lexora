from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class Priority(int, Enum):
    P1 = 1
    P2 = 2
    P3 = 3
    P4 = 4

class State(str, Enum):
    ACTIVE = "ACTIVE"
    MASTERED = "MASTERED"

# Request Models
class WordCreate(BaseModel):
    word: str
    meaning: str
    example: str
    priority: Optional[int] = 1

class WordUpdate(BaseModel):
    meaning: Optional[str] = None
    example: Optional[str] = None
    priority: Optional[int] = None

class WordsBatchCreate(BaseModel):
    words: List[WordCreate]

# Response Models
class FailureStats(BaseModel):
    meaning: int = 0
    sentence: int = 0
    mcq: int = 0
    paragraph: int = 0

class WordResponse(BaseModel):
    id: str
    userId: str
    word: str
    normalizedWord: str
    meaning: str
    example: str
    priority: int
    state: str
    masteryCount: int
    lastReviewedAt: Optional[datetime] = None
    lastPromotedAt: Optional[datetime] = None
    failureStats: FailureStats
    createdAt: datetime
    updatedAt: datetime
    
    class Config:
        from_attributes = True
