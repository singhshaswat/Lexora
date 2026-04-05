import logging
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException, status, Response
from app.database import get_users_collection, get_refresh_tokens_collection
from app.models.user import UserRegister, UserLogin, ProfileUpdate, PasswordChange
from app.utils.password_handler import hash_password, verify_password, hash_token
from app.utils.jwt_handler import create_access_token, create_refresh_token, verify_refresh_token
from app.settings.get_env import REFRESH_TOKEN_EXPIRE_DAYS, APP_ENV
from app.services.email_service import send_verification_email, send_password_reset_email, send_email_change_otp
from app.services.otp_service import create_otp, verify_otp
from app.services.password_reset_service import (
    create_password_reset_otp,
    verify_password_reset_otp as verify_password_reset_otp_service,
    create_eligibility_entry as create_password_reset_eligibility,
    check_eligibility as check_password_reset_eligibility,
    delete_eligibility as delete_password_reset_eligibility,
    delete_user_password_reset_otps
)
from app.services.email_change_service import (
    create_email_change_otp,
    verify_email_change_otp as verify_email_change_otp_service,
    create_eligibility_entry as create_email_change_eligibility,
    check_eligibility as check_email_change_eligibility,
    delete_eligibility as delete_email_change_eligibility,
    create_new_email_otp,
    verify_new_email_otp as verify_new_email_otp_service,
    delete_user_email_change_otps
)

logger = logging.getLogger(__name__)

async def register_user(user_data: UserRegister) -> dict:
    """Register a new user"""
    users_collection = get_users_collection()
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    user_doc = {
        "email": user_data.email,
        "passwordHash": hash_password(user_data.password),
        "firstName": user_data.firstName,
        "lastName": user_data.lastName,
        "isAdmin": False,
        "isRevoked": False,
        "is_verified": False,
        "createdAt": datetime.utcnow(),
        "lastLoginAt": None
    }
    
    result = await users_collection.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    # Generate OTP and send verification email
    try:
        otp_code = await create_otp(user_doc["_id"])
        send_verification_email(
            user_email=user_data.email,
            user_name=user_data.firstName,
            otp=otp_code
        )
    except Exception as e:
        # Don't fail registration if email sending fails
        # User can request resend verification email later
        logger.error(f"Failed to send verification email during registration: {e}")
    
    return {
        "id": str(user_doc["_id"]),
        "email": user_doc["email"],
        "firstName": user_doc["firstName"],
        "lastName": user_doc["lastName"],
        "isAdmin": user_doc.get("isAdmin", False),
        "isRevoked": user_doc.get("isRevoked", False),
        "is_verified": user_doc["is_verified"],
        "createdAt": user_doc["createdAt"],
        "lastLoginAt": user_doc["lastLoginAt"]
    }

async def login_user(user_data: UserLogin, response: Response) -> dict:
    """Login user and get access token"""
    users_collection = get_users_collection()
    
    # Find user by email
    user = await users_collection.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(user_data.password, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is revoked
    if user.get("isRevoked", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account access has been revoked. Please contact support."
        )
    
    # Check if email is verified
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email to login."
        )
    
    # Update last login
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"lastLoginAt": datetime.utcnow()}}
    )
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user["_id"])})
    refresh_token = create_refresh_token(data={"sub": str(user["_id"])})
    
    # Hash and store refresh token
    refresh_tokens_collection = get_refresh_tokens_collection()
    token_hash = hash_token(refresh_token)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    await refresh_tokens_collection.insert_one({
        "userId": user["_id"],
        "tokenHash": token_hash,
        "expiresAt": expires_at,
        "revoked": False,
        "createdAt": datetime.utcnow()
    })
    
    # Set refresh token in HTTP-only cookie (cross-origin enabled)
    # For cross-origin cookies: samesite must be "none" and secure must be True
    is_production = APP_ENV == "production"
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,  # True in production (HTTPS required), False in development
        samesite="none" if is_production else "lax",  # "none" for cross-origin, "lax" for same-origin
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        domain=None  # No domain restriction for cross-origin cookies
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": user["email"],
        "firstName": user.get("firstName", ""),
        "lastName": user.get("lastName", ""),
        "isAdmin": user.get("isAdmin", False)
    }

async def refresh_access_token(refresh_token: str, response: Response) -> dict:
    """Refresh access token using refresh token"""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not provided"
        )
    
    # Verify refresh token
    payload = verify_refresh_token(refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Check if refresh token exists in database
    refresh_tokens_collection = get_refresh_tokens_collection()
    token_hash = hash_token(refresh_token)
    
    token_doc = await refresh_tokens_collection.find_one({
        "userId": ObjectId(user_id),
        "tokenHash": token_hash,
        "revoked": False
    })
    
    if not token_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked"
        )
    
    # Check if token is expired
    if token_doc["expiresAt"] < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired"
        )
    
    # Get user
    users_collection = get_users_collection()
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Check if user is revoked
    if user.get("isRevoked", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account access has been revoked. Please contact support."
        )
    
    # Create new access token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": user["email"],
        "firstName": user.get("firstName", ""),
        "lastName": user.get("lastName", ""),
        "isAdmin": user.get("isAdmin", False)
    }

async def logout_user(refresh_token: str, response: Response) -> dict:
    """Logout user and revoke refresh token"""
    if not refresh_token:
        return {"message": "Already logged out"}
    
    # Hash token and find it in database
    refresh_tokens_collection = get_refresh_tokens_collection()
    token_hash = hash_token(refresh_token)
    
    # Revoke token
    result = await refresh_tokens_collection.update_one(
        {"tokenHash": token_hash, "revoked": False},
        {"$set": {"revoked": True}}
    )
    
    # Clear cookie (with same settings as set_cookie for cross-origin)
    is_production = APP_ENV == "production"
    response.delete_cookie(
        key="refresh_token",
        domain=None,  # No domain restriction for cross-origin cookies
        samesite="none" if is_production else "lax",
        secure=is_production
    )
    
    return {"message": "Logged out successfully"}

async def update_profile(user_id: str, profile_data: ProfileUpdate) -> dict:
    """Update user profile (firstName and lastName)"""
    users_collection = get_users_collection()
    
    # Find user by ID
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user profile
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "firstName": profile_data.firstName,
            "lastName": profile_data.lastName
        }}
    )
    
    # Get updated user
    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    return {
        "id": str(updated_user["_id"]),
        "email": updated_user["email"],
        "firstName": updated_user["firstName"],
        "lastName": updated_user["lastName"],
        "isAdmin": updated_user.get("isAdmin", False),
        "isRevoked": updated_user.get("isRevoked", False),
        "is_verified": updated_user.get("is_verified", False),
        "createdAt": updated_user["createdAt"],
        "lastLoginAt": updated_user.get("lastLoginAt")
    }

async def change_password(user_id: str, password_data: PasswordChange) -> dict:
    """Change user password"""
    users_collection = get_users_collection()
    
    # Find user by ID
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify current password
    if not verify_password(password_data.currentPassword, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Update password
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"passwordHash": hash_password(password_data.newPassword)}}
    )
    
    return {"message": "Password changed successfully"}

async def verify_user_otp(email: str, otp: str) -> dict:
    """
    Verify OTP and mark user as verified
    
    Args:
        email: User's email address
        otp: OTP code to verify
        
    Returns:
        Success message
    """
    users_collection = get_users_collection()
    
    # Find user by email
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already verified
    if user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Verify OTP
    is_valid = await verify_otp(user["_id"], otp)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Mark user as verified
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True, "updated_at": datetime.utcnow()}}
    )
    
    return {
        "message": "Email verified successfully",
        "email": email
    }

async def resend_verification_email(email: str) -> dict:
    """
    Resend verification email to user
    
    Args:
        email: User's email address
        
    Returns:
        Success message
    """
    users_collection = get_users_collection()
    
    # Find user by email
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already verified
    if user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Send verification email
    try:
        otp_code = await create_otp(user["_id"])
        send_verification_email(
            user_email=user["email"],
            user_name=user.get("firstName", "User"),
            otp=otp_code
        )
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email"
        )
    
    return {
        "message": "Verification email sent successfully",
        "email": email
    }

async def request_password_reset(email: str) -> dict:
    """
    Request password reset by sending OTP to user's email
    
    Args:
        email: User's email address
        
    Returns:
        Success message
    """
    users_collection = get_users_collection()
    
    # Find user by email
    user = await users_collection.find_one({"email": email})
    if not user:
        # Don't reveal if user exists or not (security best practice)
        return {
            "message": "If an account with this email exists, a password reset OTP has been sent.",
            "email": email
        }
    
    # Generate password reset OTP and send email
    try:
        otp_code = await create_password_reset_otp(user["_id"])
        send_password_reset_email(
            user_email=user["email"],
            user_name=user.get("firstName", "User"),
            otp=otp_code
        )
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        # Don't reveal error to user (security best practice)
    
    return {
        "message": "If an account with this email exists, a password reset OTP has been sent.",
        "email": email
    }

async def verify_password_reset_otp(email: str, otp: str) -> dict:
    """
    Verify password reset OTP and create eligibility entry
    
    Args:
        email: User's email address
        otp: OTP code to verify
        
    Returns:
        Success message
    """
    users_collection = get_users_collection()
    
    # Find user by email
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify OTP
    is_valid = await verify_password_reset_otp_service(user["_id"], otp)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Create eligibility entry
    await create_password_reset_eligibility(user["_id"], email)
    
    return {
        "message": "OTP verified successfully. You can now reset your password.",
        "email": email
    }

async def reset_password(email: str, new_password: str) -> dict:
    """
    Reset password after OTP verification
    
    Args:
        email: User's email address
        new_password: New password
        
    Returns:
        Success message
    """
    users_collection = get_users_collection()
    
    # Check eligibility
    eligibility = await check_password_reset_eligibility(email)
    if not eligibility:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your email first before setting new password"
        )
    
    # Find user by email
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"passwordHash": hash_password(new_password)}}
    )
    
    # Delete eligibility after password reset
    await delete_password_reset_eligibility(email)
    
    # Delete any remaining password reset OTPs
    await delete_user_password_reset_otps(user["_id"])
    
    return {
        "message": "Password reset successfully",
        "email": email
    }

async def request_email_change(user_id: str) -> dict:
    """
    Request email change by sending OTP to user's current email
    
    Args:
        user_id: User's ID as string
        
    Returns:
        Success message
    """
    users_collection = get_users_collection()
    
    try:
        user_object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Find user
    user = await users_collection.find_one({"_id": user_object_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate email change OTP and send email
    try:
        otp_code = await create_email_change_otp(user_object_id)
        send_email_change_otp(
            user_email=user["email"],
            user_name=user.get("firstName", "User"),
            otp=otp_code
        )
    except Exception as e:
        logger.error(f"Failed to send email change OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email change OTP"
        )
    
    return {
        "message": "Email change OTP has been sent to your current email address.",
        "email": user["email"]
    }

async def verify_email_change_otp(user_id: str, otp: str) -> dict:
    """
    Verify email change OTP and create eligibility entry
    
    Args:
        user_id: User's ID as string
        otp: OTP code to verify
        
    Returns:
        Success message
    """
    users_collection = get_users_collection()
    
    try:
        user_object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Find user
    user = await users_collection.find_one({"_id": user_object_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify OTP
    is_valid = await verify_email_change_otp_service(user_object_id, otp)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Create eligibility entry
    await create_email_change_eligibility(user_object_id)
    
    return {
        "message": "OTP verified successfully. You can now provide your new email address.",
        "email": user["email"]
    }

async def request_new_email(user_id: str, new_email: str) -> dict:
    """
    Request new email by sending OTP to new email address
    
    Args:
        user_id: User's ID as string
        new_email: New email address
        
    Returns:
        Success message
    """
    users_collection = get_users_collection()
    
    try:
        user_object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Find user
    user = await users_collection.find_one({"_id": user_object_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check eligibility (user must have verified current email first)
    eligibility = await check_email_change_eligibility(user_object_id)
    if not eligibility:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your current email first before changing to a new email"
        )
    
    # Check if new email is already in use
    existing_user = await users_collection.find_one({"email": new_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate new email OTP and send email
    try:
        otp_code = await create_new_email_otp(user_object_id, new_email)
        send_email_change_otp(
            user_email=new_email,
            user_name=user.get("firstName", "User"),
            otp=otp_code
        )
    except Exception as e:
        logger.error(f"Failed to send new email OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send new email OTP"
        )
    
    return {
        "message": "OTP has been sent to your new email address.",
        "email": new_email
    }

async def verify_new_email_otp(user_id: str, new_email: str, otp: str) -> dict:
    """
    Verify new email OTP and update user's email
    
    Args:
        user_id: User's ID as string
        new_email: New email address
        otp: OTP code to verify
        
    Returns:
        Success message
    """
    users_collection = get_users_collection()
    
    try:
        user_object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Find user
    user = await users_collection.find_one({"_id": user_object_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check eligibility
    eligibility = await check_email_change_eligibility(user_object_id)
    if not eligibility:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your current email first before changing to a new email"
        )
    
    # Verify new email OTP
    is_valid = await verify_new_email_otp_service(user_object_id, new_email, otp)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Update user's email
    await users_collection.update_one(
        {"_id": user_object_id},
        {"$set": {"email": new_email, "updated_at": datetime.utcnow()}}
    )
    
    # Delete eligibility after email change
    await delete_email_change_eligibility(user_object_id)
    
    # Delete any remaining email change OTPs
    await delete_user_email_change_otps(user_object_id)
    
    return {
        "message": "Email changed successfully",
        "email": new_email
    }
