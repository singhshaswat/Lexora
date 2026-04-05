import random
import logging
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException, status
from app.database import get_password_reset_otps_collection, get_password_reset_eligibility_collection
from app.utils.password_handler import hash_otp, verify_otp as verify_otp_hash

logger = logging.getLogger(__name__)

OTP_EXPIRATION_MINUTES = 15
ELIGIBILITY_EXPIRATION_MINUTES = 15

def generate_otp() -> str:
    """Generate a random 6-digit OTP"""
    return str(random.randint(100000, 999999))

async def create_password_reset_otp(user_id: ObjectId) -> str:
    """
    Create a password reset OTP document for a user
    
    Args:
        user_id: User's ObjectId
        
    Returns:
        The generated OTP code
    """
    otps_collection = get_password_reset_otps_collection()
    
    # Delete any existing password reset OTPs for this user
    await delete_user_password_reset_otps(user_id)
    
    # Generate new OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRATION_MINUTES)
    
    # Hash OTP before storing
    hashed_otp = hash_otp(otp_code)
    
    # Create OTP document
    otp_doc = {
        "user_id": user_id,
        "otp": hashed_otp,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at
    }
    
    await otps_collection.insert_one(otp_doc)
    logger.info(f"Password reset OTP created for user {user_id}")
    
    return otp_code

async def verify_password_reset_otp(user_id: ObjectId, otp: str) -> bool:
    """
    Verify a password reset OTP for a user
    
    Args:
        user_id: User's ObjectId
        otp: OTP code to verify
        
    Returns:
        True if OTP is valid, False otherwise
    """
    otps_collection = get_password_reset_otps_collection()
    
    # Find all OTP documents for this user (can't query by hash)
    cursor = otps_collection.find({"user_id": user_id})
    otp_docs = await cursor.to_list(length=None)
    
    if not otp_docs:
        logger.warning(f"Password reset OTP not found for user {user_id}")
        return False
    
    # Iterate through OTP documents and verify against each hash
    for otp_doc in otp_docs:
        # Check if OTP is expired first
        if otp_doc["expires_at"] < datetime.utcnow():
            # Delete expired OTP
            await otps_collection.delete_one({"_id": otp_doc["_id"]})
            continue
        
        # Verify the provided OTP against the stored hash
        if verify_otp_hash(otp, otp_doc["otp"]):
            # Delete OTP after successful verification
            await otps_collection.delete_one({"_id": otp_doc["_id"]})
            logger.info(f"Password reset OTP verified successfully for user {user_id}")
            return True
    
    logger.warning(f"Invalid password reset OTP attempted for user {user_id}")
    return False

async def delete_user_password_reset_otps(user_id: ObjectId) -> None:
    """
    Delete all password reset OTPs for a user
    
    Args:
        user_id: User's ObjectId
    """
    otps_collection = get_password_reset_otps_collection()
    result = await otps_collection.delete_many({"user_id": user_id})
    if result.deleted_count > 0:
        logger.info(f"Deleted {result.deleted_count} password reset OTP(s) for user {user_id}")

async def create_eligibility_entry(user_id: ObjectId, email: str) -> None:
    """
    Create an eligibility entry after OTP verification
    
    Args:
        user_id: User's ObjectId
        email: User's email address
    """
    eligibility_collection = get_password_reset_eligibility_collection()
    
    # Delete any existing eligibility entries for this user
    await eligibility_collection.delete_many({"user_id": user_id})
    
    # Create eligibility document
    expires_at = datetime.utcnow() + timedelta(minutes=ELIGIBILITY_EXPIRATION_MINUTES)
    eligibility_doc = {
        "user_id": user_id,
        "email": email,
        "password_reset": True,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at
    }
    
    await eligibility_collection.insert_one(eligibility_doc)
    logger.info(f"Password reset eligibility created for user {user_id}")

async def check_eligibility(email: str) -> dict:
    """
    Check if email is eligible for password reset
    
    Args:
        email: User's email address
        
    Returns:
        Eligibility document if found, None otherwise
    """
    eligibility_collection = get_password_reset_eligibility_collection()
    
    # Find eligibility document
    eligibility_doc = await eligibility_collection.find_one({"email": email})
    
    if not eligibility_doc:
        return None
    
    # Check if eligibility is expired
    if eligibility_doc["expires_at"] < datetime.utcnow():
        # Delete expired eligibility
        await eligibility_collection.delete_one({"_id": eligibility_doc["_id"]})
        logger.warning(f"Expired password reset eligibility for email {email}")
        return None
    
    return eligibility_doc

async def delete_eligibility(email: str) -> None:
    """
    Delete eligibility entry after password reset
    
    Args:
        email: User's email address
    """
    eligibility_collection = get_password_reset_eligibility_collection()
    result = await eligibility_collection.delete_many({"email": email})
    if result.deleted_count > 0:
        logger.info(f"Deleted password reset eligibility for email {email}")
