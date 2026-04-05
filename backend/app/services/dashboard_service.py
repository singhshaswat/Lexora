from bson import ObjectId
from app.database import get_daily_tasks_collection, get_words_collection
from app.models.dashboard import DashboardResponse
from app.models.daily_task import TaskStatus, TaskResult
from app.models.word import State
from app.services.word_service import _word_doc_to_response

async def get_dashboard_data(user_id: str) -> dict:
    """Get dashboard data for a user"""
    daily_tasks_collection = get_daily_tasks_collection()
    words_collection = get_words_collection()
    
    # Initialize counters
    pass_count = 0
    fail_count = 0
    
    # Query all daily tasks for the user
    all_daily_tasks = await daily_tasks_collection.find({
        "userId": ObjectId(user_id)
    }).to_list(length=None)
    
    # Count pass and fail tasks across all daily task documents
    for daily_task in all_daily_tasks:
        tasks = daily_task.get("tasks", [])
        for task in tasks:
            if task.get("status") == TaskStatus.COMPLETED.value:
                result = task.get("result")
                if result == TaskResult.PASS.value:
                    pass_count += 1
                elif result == TaskResult.FAIL.value:
                    fail_count += 1
    
    # Count words with MASTERED state
    words_mastered_count = await words_collection.count_documents({
        "userId": ObjectId(user_id),
        "state": State.MASTERED.value
    })
    
    # Get last 5 words ordered by createdAt descending
    recent_words = await words_collection.find({
        "userId": ObjectId(user_id)
    }).sort("createdAt", -1).limit(5).to_list(length=5)
    
    # Convert word documents to response format
    recently_added_words = [
        _word_doc_to_response(word) for word in recent_words
    ]
    
    return {
        "passCount": pass_count,
        "failCount": fail_count,
        "wordsMasteredCount": words_mastered_count,
        "recentlyAddedWords": recently_added_words
    }
