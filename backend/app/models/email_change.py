from pydantic import BaseModel, EmailStr

# Request Models
class EmailChangeOTPVerification(BaseModel):
    otp: str

class NewEmailRequest(BaseModel):
    new_email: EmailStr

class NewEmailOTPVerification(BaseModel):
    new_email: EmailStr
    otp: str

# Response Models
class EmailChangeResponse(BaseModel):
    message: str
    email: str = None
