from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.jwt_handler import verify_access_token
from app.database import get_users_collection
from bson import ObjectId
from typing import Optional

security = HTTPBearer(auto_error=False)

async def get_current_user(request: Request) -> dict:
    """Get current user from access token"""
    credentials: Optional[HTTPAuthorizationCredentials] = await security(request)
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token missing. Please authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    payload = verify_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Verify user exists
    users_collection = get_users_collection()
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if user.get("isRevoked", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account access has been revoked. Please contact support.",
        )
    
    return {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "isAdmin": user.get("isAdmin", False)
    }

async def get_current_admin_user(request: Request) -> dict:
    """Get current admin user from access token"""
    user = await get_current_user(request)
    if not user.get("isAdmin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return user
