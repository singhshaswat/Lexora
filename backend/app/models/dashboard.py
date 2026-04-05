from pydantic import BaseModel
from typing import List
from app.models.word import WordResponse

class DashboardResponse(BaseModel):
    passCount: int
    failCount: int
    wordsMasteredCount: int
    recentlyAddedWords: List[WordResponse]
    
    class Config:
        from_attributes = True
