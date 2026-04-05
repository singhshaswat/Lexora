from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum
from app.models.daily_task import TaskType, TaskResult

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class EvaluationResult(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"

class ChatStatus(str, Enum):
    PENDING = "PENDING"
    PASS = "PASS"
    FAIL = "FAIL"

# Request Models
class TutorEvaluationRequest(BaseModel):
    wordId: str
    taskType: TaskType
    userResponse: str
    chatId: Optional[str] = None  # Optional chatId for continuation

class ChatContinueRequest(BaseModel):
    message: str

# Response Models
class TutorEvaluationResponse(BaseModel):
    result: EvaluationResult
    feedback: str
    hint: Optional[str] = None
    answerRevealed: bool = False
    chatId: Optional[str] = None
    expectedAnswer: Optional[str] = None
    reason: Optional[str] = None

class TutorChatResponse(BaseModel):
    id: str
    userId: str
    wordId: str
    taskType: TaskType
    messages: List[ChatMessage]
    finalResult: ChatStatus
    createdAt: datetime
    
    class Config:
        from_attributes = True

class ChatListItem(BaseModel):
    id: str
    wordId: str
    word: str
    meaning: str
    taskType: TaskType
    finalResult: ChatStatus
    createdAt: datetime
    messageCount: int
    
    class Config:
        from_attributes = True