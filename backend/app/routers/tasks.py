from fastapi import APIRouter, Depends, Query
from typing import List
from app.models.daily_task import DailyTaskResponse, CompleteTaskRequest, TaskResult
from app.middleware.auth_middleware import get_current_user
from app.services.task_service import get_today_tasks, complete_task, get_task_history

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

@router.get("/today", response_model=DailyTaskResponse)
async def get_today_tasks_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Get today's tasks"""
    return await get_today_tasks(current_user["user_id"])

@router.get("/history", response_model=List[DailyTaskResponse])
async def get_task_history_endpoint(
    limit: int = Query(30, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get task history"""
    return await get_task_history(current_user["user_id"], limit)

@router.post("/{task_id}/complete", response_model=DailyTaskResponse)
async def complete_task_endpoint(
    task_id: str,
    request: CompleteTaskRequest,
    current_user: dict = Depends(get_current_user)
):
    """Complete a task"""
    return await complete_task(
        current_user["user_id"],
        task_id,
        request.result
    )
