from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Request Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    firstName: str
    lastName: str

class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str

# Response Models
class UserResponse(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    isAdmin: bool = False
    isRevoked: bool = False
    is_verified: bool = False
    createdAt: datetime
    lastLoginAt: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Token Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    firstName: str
    lastName: str
    isAdmin: bool = False