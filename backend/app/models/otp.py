from pydantic import BaseModel, EmailStr
from bson import ObjectId

# Request Models
class OTPVerification(BaseModel):
    email: EmailStr
    otp: str

class ResendVerification(BaseModel):
    email: EmailStr

# Response Models
class OTPResponse(BaseModel):
    message: str
    email: str
