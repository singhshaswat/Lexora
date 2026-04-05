from pydantic import BaseModel, EmailStr

# Request Models
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetOTPVerification(BaseModel):
    email: EmailStr
    otp: str

class ResetPassword(BaseModel):
    email: EmailStr
    new_password: str

# Response Models
class PasswordResetResponse(BaseModel):
    message: str
    email: str
