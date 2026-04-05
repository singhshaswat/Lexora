import random
import logging
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException, status
from app.database import get_otps_collection
from app.utils.password_handler import hash_otp, verify_otp as verify_otp_hash

logger = logging.getLogger(__name__)

OTP_EXPIRATION_MINUTES = 15

def generate_otp() -> str:
    """Generate a random 6-digit OTP"""
    return str(random.randint(100000, 999999))

async def create_otp(user_id: ObjectId) -> str:
    """
    Create an OTP document for a user
    
    Args:
        user_id: User's ObjectId
        
    Returns:
        The generated OTP code
    """
    otps_collection = get_otps_collection()
    
    # Delete any existing OTPs for this user
    await delete_user_otps(user_id)
    
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
    logger.info(f"OTP created for user {user_id}")
    
    return otp_code

async def verify_otp(user_id: ObjectId, otp: str) -> bool:
    """
    Verify an OTP for a user
    
    Args:
        user_id: User's ObjectId
        otp: OTP code to verify
        
    Returns:
        True if OTP is valid, False otherwise
    """
    otps_collection = get_otps_collection()
    
    # Find all OTP documents for this user (can't query by hash)
    cursor = otps_collection.find({"user_id": user_id})
    otp_docs = await cursor.to_list(length=None)
    
    if not otp_docs:
        logger.warning(f"OTP not found for user {user_id}")
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
            logger.info(f"OTP verified successfully for user {user_id}")
            return True
    
    logger.warning(f"Invalid OTP attempted for user {user_id}")
    return False

async def delete_user_otps(user_id: ObjectId) -> None:
    """
    Delete all OTPs for a user (used when resending verification)
    
    Args:
        user_id: User's ObjectId
    """
    otps_collection = get_otps_collection()
    result = await otps_collection.delete_many({"user_id": user_id})
    if result.deleted_count > 0:
        logger.info(f"Deleted {result.deleted_count} OTP(s) for user {user_id}")
