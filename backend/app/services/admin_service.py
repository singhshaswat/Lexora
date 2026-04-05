from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status
from app.database import get_users_collection

async def create_admin(email: str) -> dict:
    """
    Create a new admin user by setting isAdmin=True for an existing user.
    Only existing admins can call this function.
    
    Args:
        email: Email of the user to make admin
        
    Returns:
        Dictionary with admin creation details
    """
    users_collection = get_users_collection()
    
    # Find user by email
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is already an admin
    if user.get("isAdmin", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already an admin"
        )
    
    # Update user to admin
    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "isAdmin": True,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "User promoted to admin successfully",
        "user_id": str(user["_id"]),
        "email": user["email"],
        "is_admin": True
    }

async def delete_user(user_id: str) -> dict:
    """
    Delete a user from the database.
    Only admins can call this function.
    
    Args:
        user_id: ID of the user to delete
        
    Returns:
        Dictionary with deletion confirmation
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
    
    # Delete user
    await users_collection.delete_one({"_id": user_object_id})
    
    return {
        "message": "User deleted successfully",
        "user_id": user_id
    }

async def revoke_user(user_id: str) -> dict:
    """
    Revoke user access by setting isRevoked=True.
    Revoked users cannot login or refresh tokens, but their data remains in the database.
    Only admins can call this function.
    
    Args:
        user_id: ID of the user to revoke
        
    Returns:
        Dictionary with revocation confirmation
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
    
    # Check if already revoked
    if user.get("isRevoked", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already revoked"
        )
    
    # Revoke user
    await users_collection.update_one(
        {"_id": user_object_id},
        {
            "$set": {
                "isRevoked": True,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "User access revoked successfully",
        "user_id": user_id,
        "is_revoked": True
    }

async def unrevoke_user(user_id: str) -> dict:
    """
    Unrevoke user access by setting isRevoked=False.
    This restores the user's ability to login and refresh tokens.
    Only admins can call this function.
    
    Args:
        user_id: ID of the user to unrevoke
        
    Returns:
        Dictionary with unrevocation confirmation
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
    
    # Check if already unrevoked
    if not user.get("isRevoked", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not revoked"
        )
    
    # Unrevoke user
    await users_collection.update_one(
        {"_id": user_object_id},
        {
            "$set": {
                "isRevoked": False,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "User access restored successfully",
        "user_id": user_id,
        "is_revoked": False
    }
