from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.models.admin import (
    AdminUsersResponse,
    CreateAdminRequest,
    CreateAdminResponse,
    DeleteUserResponse,
    RevokeUserResponse,
    UnrevokeUserResponse,
)
from app.models.user import UserResponse
from app.middleware.auth_middleware import get_current_admin_user
from app.database import get_users_collection
from app.services.admin_service import (
    create_admin,
    delete_user,
    revoke_user,
    unrevoke_user,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/users", response_model=AdminUsersResponse)
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_admin_user)
):
    """Get all users with pagination"""
    users_collection = get_users_collection()
    
    cursor = users_collection.find().skip(skip).limit(limit)
    users = []
    
    async for user in cursor:
        users.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            firstName=user.get("firstName", ""),
            lastName=user.get("lastName", ""),
            isAdmin=user.get("isAdmin", False),
            isRevoked=user.get("isRevoked", False),
            is_verified=user.get("is_verified", False),
            createdAt=user.get("createdAt", user.get("created_at")),
            lastLoginAt=user.get("lastLoginAt", user.get("last_login_at"))
        ))
    
    total = await users_collection.count_documents({})
    
    return AdminUsersResponse(users=users, total=total)

@router.post("/create-admin", response_model=CreateAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    request: CreateAdminRequest,
    current_user: dict = Depends(get_current_admin_user)
):
    """Create a new admin user. Only existing admins can create new admins."""
    result = await create_admin(request.email)
    return CreateAdminResponse(
        message=result["message"],
        userId=result["user_id"],
        email=result["email"],
        isAdmin=result["is_admin"]
    )

@router.delete("/users/{user_id}", response_model=DeleteUserResponse)
async def delete_user_route(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete a user. Only admins can delete users."""
    # Prevent admin from deleting themselves
    if user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    result = await delete_user(user_id)
    return DeleteUserResponse(
        message=result["message"],
        userId=result["user_id"]
    )

@router.post("/users/{user_id}/revoke", response_model=RevokeUserResponse)
async def revoke_user_route(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Revoke user access. Revoked users cannot login or refresh tokens, but their data remains in the database. Only admins can revoke users."""
    # Prevent admin from revoking themselves
    if user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot revoke your own account"
        )
    
    result = await revoke_user(user_id)
    return RevokeUserResponse(
        message=result["message"],
        userId=result["user_id"],
        isRevoked=result["is_revoked"]
    )

@router.post("/users/{user_id}/unrevoke", response_model=UnrevokeUserResponse)
async def unrevoke_user_route(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Unrevoke user access. This restores the user's ability to login and refresh tokens. Only admins can unrevoke users."""
    result = await unrevoke_user(user_id)
    return UnrevokeUserResponse(
        message=result["message"],
        userId=result["user_id"],
        isRevoked=result["is_revoked"]
    )
