from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from app.models.user import UserResponse

# Request Models
class CreateAdminRequest(BaseModel):
    email: EmailStr

class UpdateCreditsRequest(BaseModel):
    credits: int

# Response Models
class AdminUsersResponse(BaseModel):
    users: List[UserResponse]
    total: int

class DeleteUserResponse(BaseModel):
    message: str
    userId: str

class RevokeUserResponse(BaseModel):
    message: str
    userId: str
    isRevoked: bool

class UnrevokeUserResponse(BaseModel):
    message: str
    userId: str
    isRevoked: bool

class CreateAdminResponse(BaseModel):
    message: str
    userId: str
    email: str
    isAdmin: bool

class UpdateCreditsResponse(BaseModel):
    message: str
    userId: str
    credits: int
