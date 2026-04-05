from datetime import datetime, date
from bson import ObjectId
from fastapi import HTTPException, status
from app.database import get_daily_tasks_collection, get_words_collection, get_tutor_chats_collection
from app.models.daily_task import DailyTaskResponse, TaskItem, TaskStatus, TaskResult
from app.models.tutor_chat import ChatStatus
from typing import List, Optional
from app.services.cron_service import generate_daily_tasks_for_user

async def get_today_tasks(user_id: str) -> dict:
    """Get today's tasks for a user, creating them if they don't exist"""
    daily_tasks_collection = get_daily_tasks_collection()
    today = date.today().isoformat()
    
    # Try to fetch today's tasks
    daily_task = await daily_tasks_collection.find_one({
        "userId": ObjectId(user_id),
        "date": today
    })
    
    # If tasks don't exist, generate them (this should normally be done by cron)
    if not daily_task:
        # Generate tasks for today
        await generate_daily_tasks_for_user(user_id, today)
        # Fetch again
        daily_task = await daily_tasks_collection.find_one({
            "userId": ObjectId(user_id),
            "date": today
        })
    
    if not daily_task:
        # Still no tasks - user might not have any words
        return {
            "id": None,
            "userId": user_id,
            "date": today,
            "tasks": [],
            "createdAt": datetime.utcnow()
        }
    
    return _task_doc_to_response(daily_task)

async def complete_task(
    user_id: str,
    task_id: str,
    result: TaskResult
) -> dict:
    """Mark a task as completed and update word statistics and chat status"""
    daily_tasks_collection = get_daily_tasks_collection()
    words_collection = get_words_collection()
    tutor_chats_collection = get_tutor_chats_collection()
    today = date.today().isoformat()
    
    # Find the daily task document
    daily_task = await daily_tasks_collection.find_one({
        "userId": ObjectId(user_id),
        "date": today
    })
    
    if not daily_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily tasks not found for today"
        )
    
    # Find the specific task
    task_found = False
    chat_id_to_update = None
    for task in daily_task.get("tasks", []):
        if task["taskId"] == task_id:
            task_found = True
            # Update task status
            task["status"] = TaskStatus.COMPLETED.value
            task["result"] = result.value
            
            # Get chatId to update chat status
            chat_id_to_update = task.get("chatId")
            
            # Update word statistics and priority
            word_ids = task.get("wordIds", [])
            task_type = task.get("type")
            
            for word_id_str in word_ids:
                word_id = ObjectId(word_id_str)
                word = await words_collection.find_one({"_id": word_id})
                
                if word:
                    update_doc = {
                        "lastReviewedAt": datetime.utcnow(),
                        "updatedAt": datetime.utcnow()
                    }
                    
                    if result == TaskResult.FAIL:
                        # FAIL: Set priority to 2 and increment failure stats
                        failure_field = f"failureStats.{task_type.lower()}"
                        await words_collection.update_one(
                            {"_id": word_id},
                            {
                                "$set": {
                                    **update_doc,
                                    "priority": 2
                                },
                                "$inc": {failure_field: 1}
                            }
                        )
                    else:
                        # PASS: Set priority to 1
                        update_doc["priority"] = 1
                        
                        # For P4 words, also increment mastery count
                        if word.get("priority") == 4:
                            new_mastery_count = word.get("masteryCount", 0) + 1
                            update_doc["masteryCount"] = new_mastery_count
                            
                            await words_collection.update_one(
                                {"_id": word_id},
                                {"$set": update_doc}
                            )
                            
                            # Check if word should be marked as mastered
                            if new_mastery_count >= 3:
                                await words_collection.update_one(
                                    {"_id": word_id},
                                    {"$set": {"state": "MASTERED"}}
                                )
                        else:
                            await words_collection.update_one(
                                {"_id": word_id},
                                {"$set": update_doc}
                            )
            
            break
    
    if not task_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Update chat status from PENDING to PASS/FAIL when task is completed
    if chat_id_to_update:
        try:
            chat_id_obj = ObjectId(chat_id_to_update) if isinstance(chat_id_to_update, str) else chat_id_to_update
            chat_status = ChatStatus.PASS.value if result == TaskResult.PASS else ChatStatus.FAIL.value
            await tutor_chats_collection.update_one(
                {"_id": chat_id_obj, "userId": ObjectId(user_id)},
                {"$set": {"finalResult": chat_status}}
            )
        except Exception as e:
            # Log error but don't fail the task completion
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to update chat status: {e}")
    
    # Update the daily task document
    await daily_tasks_collection.update_one(
        {"_id": daily_task["_id"]},
        {"$set": {"tasks": daily_task["tasks"]}}
    )
    
    # Fetch updated document
    updated_task = await daily_tasks_collection.find_one({"_id": daily_task["_id"]})
    return _task_doc_to_response(updated_task)

async def get_task_history(
    user_id: str,
    limit: int = 30
) -> List[dict]:
    """Get task history for a user"""
    daily_tasks_collection = get_daily_tasks_collection()
    
    tasks = await daily_tasks_collection.find({
        "userId": ObjectId(user_id)
    }).sort("date", -1).limit(limit).to_list(length=limit)
    
    return [_task_doc_to_response(task) for task in tasks]

def _task_doc_to_response(task_doc: dict) -> dict:
    """Convert task document to response model"""
    return {
        "id": str(task_doc["_id"]),
        "userId": str(task_doc["userId"]),
        "date": task_doc["date"],
        "tasks": [
            {
                "taskId": task["taskId"],
                "type": task["type"],
                "wordIds": task["wordIds"],
                "status": task["status"],
                "result": task.get("result"),
                "chatId": str(task.get("chatId")) if task.get("chatId") else None,  # Convert ObjectId to string
                "question": task.get("question"),
                "options": task.get("options"),
                "correctOption": task.get("correctOption"),
                "optionReasons": task.get("optionReasons")
            }
            for task in task_doc.get("tasks", [])
        ],
        "createdAt": task_doc["createdAt"]
    }
