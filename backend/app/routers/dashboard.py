from fastapi import APIRouter, Depends
from app.models.dashboard import DashboardResponse
from app.middleware.auth_middleware import get_current_user
from app.services.dashboard_service import get_dashboard_data

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardResponse)
async def get_dashboard_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard data for the current user"""
    return await get_dashboard_data(current_user["user_id"])
