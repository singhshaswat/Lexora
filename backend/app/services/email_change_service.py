import random
import logging
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException, status
from app.database import get_email_change_otps_collection, get_email_change_eligibility_collection
from app.utils.password_handler import hash_otp, verify_otp as verify_otp_hash

logger = logging.getLogger(__name__)

OTP_EXPIRATION_MINUTES = 15
ELIGIBILITY_EXPIRATION_MINUTES = 30

def generate_otp() -> str:
    """Generate a random 6-digit OTP"""
    return str(random.randint(100000, 999999))

async def create_email_change_otp(user_id: ObjectId) -> str:
    """
    Create an email change OTP document for a user (for current email verification)
    
    Args:
        user_id: User's ObjectId
        
    Returns:
        The generated OTP code
    """
    otps_collection = get_email_change_otps_collection()
    
    # Delete any existing email change OTPs for this user
    await delete_user_email_change_otps(user_id)
    
    # Generate new OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRATION_MINUTES)
    
    # Hash OTP before storing
    hashed_otp = hash_otp(otp_code)
    
    # Create OTP document
    otp_doc = {
        "user_id": user_id,
        "otp": hashed_otp,
        "otp_type": "current_email",  # Distinguish from new email OTPs
        "created_at": datetime.utcnow(),
        "expires_at": expires_at
    }
    
    await otps_collection.insert_one(otp_doc)
    logger.info(f"Email change OTP created for user {user_id}")
    
    return otp_code

async def verify_email_change_otp(user_id: ObjectId, otp: str) -> bool:
    """
    Verify an email change OTP for current email verification
    
    Args:
        user_id: User's ObjectId
        otp: OTP code to verify
        
    Returns:
        True if OTP is valid, False otherwise
    """
    otps_collection = get_email_change_otps_collection()
    
    # Find all OTP documents for this user with type "current_email"
    cursor = otps_collection.find({"user_id": user_id, "otp_type": "current_email"})
    otp_docs = await cursor.to_list(length=None)
    
    if not otp_docs:
        logger.warning(f"Email change OTP not found for user {user_id}")
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
            logger.info(f"Email change OTP verified successfully for user {user_id}")
            return True
    
    logger.warning(f"Invalid email change OTP attempted for user {user_id}")
    return False

async def create_new_email_otp(user_id: ObjectId, new_email: str) -> str:
    """
    Create an email change OTP document for new email verification
    
    Args:
        user_id: User's ObjectId
        new_email: New email address to verify
        
    Returns:
        The generated OTP code
    """
    otps_collection = get_email_change_otps_collection()
    
    # Delete any existing new email OTPs for this user
    await otps_collection.delete_many({"user_id": user_id, "otp_type": "new_email"})
    
    # Generate new OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRATION_MINUTES)
    
    # Hash OTP before storing
    hashed_otp = hash_otp(otp_code)
    
    # Create OTP document
    otp_doc = {
        "user_id": user_id,
        "new_email": new_email,
        "otp": hashed_otp,
        "otp_type": "new_email",
        "created_at": datetime.utcnow(),
        "expires_at": expires_at
    }
    
    await otps_collection.insert_one(otp_doc)
    logger.info(f"New email OTP created for user {user_id} to {new_email}")
    
    return otp_code

async def verify_new_email_otp(user_id: ObjectId, new_email: str, otp: str) -> bool:
    """
    Verify a new email OTP for email change
    
    Args:
        user_id: User's ObjectId
        new_email: New email address
        otp: OTP code to verify
        
    Returns:
        True if OTP is valid, False otherwise
    """
    otps_collection = get_email_change_otps_collection()
    
    # Find all OTP documents for this user with type "new_email" and matching email
    cursor = otps_collection.find({
        "user_id": user_id,
        "otp_type": "new_email",
        "new_email": new_email
    })
    otp_docs = await cursor.to_list(length=None)
    
    if not otp_docs:
        logger.warning(f"New email OTP not found for user {user_id} and email {new_email}")
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
            logger.info(f"New email OTP verified successfully for user {user_id}")
            return True
    
    logger.warning(f"Invalid new email OTP attempted for user {user_id}")
    return False

async def delete_user_email_change_otps(user_id: ObjectId) -> None:
    """
    Delete all email change OTPs for a user
    
    Args:
        user_id: User's ObjectId
    """
    otps_collection = get_email_change_otps_collection()
    result = await otps_collection.delete_many({"user_id": user_id})
    if result.deleted_count > 0:
        logger.info(f"Deleted {result.deleted_count} email change OTP(s) for user {user_id}")

async def create_eligibility_entry(user_id: ObjectId) -> None:
    """
    Create an eligibility entry after current email OTP verification
    
    Args:
        user_id: User's ObjectId
    """
    eligibility_collection = get_email_change_eligibility_collection()
    
    # Delete any existing eligibility entries for this user
    await eligibility_collection.delete_many({"user_id": user_id})
    
    # Create eligibility document
    expires_at = datetime.utcnow() + timedelta(minutes=ELIGIBILITY_EXPIRATION_MINUTES)
    eligibility_doc = {
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at
    }
    
    await eligibility_collection.insert_one(eligibility_doc)
    logger.info(f"Email change eligibility created for user {user_id}")

async def check_eligibility(user_id: ObjectId) -> dict:
    """
    Check if user is eligible for email change
    
    Args:
        user_id: User's ObjectId
        
    Returns:
        Eligibility document if found and valid, None otherwise
    """
    eligibility_collection = get_email_change_eligibility_collection()
    
    # Find eligibility document
    eligibility_doc = await eligibility_collection.find_one({"user_id": user_id})
    
    if not eligibility_doc:
        return None
    
    # Check if eligibility is expired
    if eligibility_doc["expires_at"] < datetime.utcnow():
        # Delete expired eligibility
        await eligibility_collection.delete_one({"_id": eligibility_doc["_id"]})
        logger.warning(f"Expired email change eligibility for user {user_id}")
        return None
    
    return eligibility_doc

async def delete_eligibility(user_id: ObjectId) -> None:
    """
    Delete eligibility entry after email change completion
    
    Args:
        user_id: User's ObjectId
    """
    eligibility_collection = get_email_change_eligibility_collection()
    result = await eligibility_collection.delete_many({"user_id": user_id})
    if result.deleted_count > 0:
        logger.info(f"Deleted email change eligibility for user {user_id}")
