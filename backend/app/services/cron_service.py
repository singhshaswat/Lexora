from datetime import datetime, date, timezone
from bson import ObjectId
import random
import logging
from app.database import (
    get_users_collection,
    get_words_collection,
    get_daily_tasks_collection,
    get_cron_runs_collection,
    get_tutor_chats_collection
)
from app.models.daily_task import TaskType, TaskStatus, TaskResult
from app.models.tutor_chat import ChatStatus
from app.services.openai_service import generate_mcq_question
from typing import List

logger = logging.getLogger(__name__)

async def generate_daily_tasks():
    """Generate daily tasks for all active users"""
    users_collection = get_users_collection()
    cron_runs_collection = get_cron_runs_collection()
    
    run_at = datetime.now(timezone.utc)
    stats = {
        "usersProcessed": 0,
        "tasksCreated": 0,
        "wordsMoved": 0,
        "errors": []
    }
    
    try:
        # Get all active users
        active_users = await users_collection.find({"isRevoked": False}).to_list(length=None)
        
        for user in active_users:
            try:
                user_id = str(user["_id"])
                today = date.today().isoformat()
                
                # Generate tasks for this user
                result = await generate_daily_tasks_for_user(user_id, today)
                
                stats["usersProcessed"] += 1
                stats["tasksCreated"] += result.get("tasksCreated", 0)
                
            except Exception as e:
                error_msg = f"Error processing user {user.get('email', 'unknown')}: {str(e)}"
                logger.error(error_msg)
                stats["errors"].append(error_msg)
        
        # Log successful run
        await cron_runs_collection.insert_one({
            "runAt": run_at,
            "status": "SUCCESS",
            "stats": stats,
            "errorLog": None
        })
        
        logger.info(f"Daily task generation completed. Stats: {stats}")
        
    except Exception as e:
        error_msg = f"Critical error in daily task generation: {str(e)}"
        logger.error(error_msg)
        
        # Log failed run
        await cron_runs_collection.insert_one({
            "runAt": run_at,
            "status": "FAILED",
            "stats": stats,
            "errorLog": error_msg
        })
        
        raise

async def generate_daily_tasks_for_user(user_id: str, task_date: str) -> dict:
    """Generate daily tasks for a specific user"""
    words_collection = get_words_collection()
    daily_tasks_collection = get_daily_tasks_collection()
    
    # Check if tasks already exist for this date
    existing = await daily_tasks_collection.find_one({
        "userId": ObjectId(user_id),
        "date": task_date
    })
    
    if existing:
        logger.info(f"Tasks already exist for user {user_id} on {task_date}")
        return {"tasksCreated": 0}
    
    # Get ACTIVE words grouped by priority
    words_by_priority = {
        1: [],
        2: [],
        3: [],
        4: []
    }
    
    active_words = await words_collection.find({
        "userId": ObjectId(user_id),
        "state": "ACTIVE"
    }).to_list(length=None)
    
    for word in active_words:
        priority = word.get("priority", 1)
        if priority in words_by_priority:
            words_by_priority[priority].append(word)
    
    # Select words per priority
    # P1 → 1 word (MEANING)
    # P2 → 2 words (SENTENCE) - 2 separate tasks
    # P3 → 3 words (MCQ) - 3 separate tasks
    # P4 → 2 words (PARAGRAPH) - 2 separate tasks
    
    selected_words = {
        1: _select_words(words_by_priority[1], 1),
        2: _select_words(words_by_priority[2], 2),
        3: _select_words(words_by_priority[3], 3),
        4: _select_words(words_by_priority[4], 2)
    }
    
    # Collect all selected word IDs for priority update
    all_selected_word_ids = []
    for priority_words in selected_words.values():
        for word in priority_words:
            all_selected_word_ids.append(word["_id"])
    
    # Update priority for non-selected words: priority + 1 (max 4)
    all_active_word_ids = [word["_id"] for word in active_words]
    non_selected_word_ids = [
        word_id for word_id in all_active_word_ids 
        if word_id not in all_selected_word_ids
    ]
    
    if non_selected_word_ids:
        # Get current priorities for non-selected words
        non_selected_words = await words_collection.find({
            "_id": {"$in": non_selected_word_ids}
        }).to_list(length=None)
        
        # Update each non-selected word's priority
        for word in non_selected_words:
            current_priority = word.get("priority", 1)
            new_priority = min(current_priority + 1, 4)
            if new_priority != current_priority:
                await words_collection.update_one(
                    {"_id": word["_id"]},
                    {"$set": {"priority": new_priority, "updatedAt": datetime.now(timezone.utc)}}
                )
    
    # Create tasks
    tasks = []
    task_id_counter = 1
    tutor_chats_collection = get_tutor_chats_collection()
    
    # Helper function to create a tutor chat and return its ObjectId
    async def create_tutor_chat(word_id: ObjectId, task_type: TaskType) -> ObjectId:
        """Create a tutor chat document and return its ObjectId"""
        chat_doc = {
            "userId": ObjectId(user_id),
            "wordId": word_id,
            "taskType": task_type.value,
            "messages": [],
            "finalResult": ChatStatus.PENDING.value,  # Start as PENDING until task is completed
            "createdAt": datetime.now(timezone.utc)
        }
        result = await tutor_chats_collection.insert_one(chat_doc)
        return result.inserted_id
    
    # P1 - MEANING task (1 word, 1 task)
    if selected_words[1]:
        word = selected_words[1][0]
        chat_id = await create_tutor_chat(word["_id"], TaskType.MEANING)
        tasks.append({
            "taskId": f"task_{task_id_counter}",
            "type": TaskType.MEANING.value,
            "wordIds": [str(word["_id"])],
            "status": TaskStatus.PENDING.value,
            "result": None,
            "chatId": chat_id  # Store as ObjectId, not string
        })
        task_id_counter += 1
    
    # P2 - SENTENCE tasks (2 words, 2 separate tasks)
    if selected_words[2]:
        for word in selected_words[2]:
            chat_id = await create_tutor_chat(word["_id"], TaskType.SENTENCE)
            tasks.append({
                "taskId": f"task_{task_id_counter}",
                "type": TaskType.SENTENCE.value,
                "wordIds": [str(word["_id"])],
                "status": TaskStatus.PENDING.value,
                "result": None,
                "chatId": chat_id  # Store as ObjectId, not string
            })
            task_id_counter += 1
    
    # P3 - MCQ tasks (3 words, 3 separate tasks with AI-generated questions)
    if selected_words[3]:
        for word in selected_words[3]:
            try:
                # Generate MCQ question using OpenAI
                mcq_data = await generate_mcq_question(word)
                chat_id = await create_tutor_chat(word["_id"], TaskType.MCQ)
                tasks.append({
                    "taskId": f"task_{task_id_counter}",
                    "type": TaskType.MCQ.value,
                    "wordIds": [str(word["_id"])],
                    "status": TaskStatus.PENDING.value,
                    "result": None,
                    "chatId": chat_id,  # Store as ObjectId, not string
                    "question": mcq_data.get("question"),
                    "options": mcq_data.get("options"),
                    "correctOption": mcq_data.get("correctOption"),
                    "optionReasons": mcq_data.get("optionReasons")
                })
                task_id_counter += 1
            except Exception as e:
                logger.error(f"Failed to generate MCQ for word {word.get('word')}: {e}")
                # Skip this word if MCQ generation fails
                continue
    
    # P4 - PARAGRAPH tasks (2 words, 2 separate tasks)
    if selected_words[4]:
        for word in selected_words[4]:
            chat_id = await create_tutor_chat(word["_id"], TaskType.PARAGRAPH)
            tasks.append({
                "taskId": f"task_{task_id_counter}",
                "type": TaskType.PARAGRAPH.value,
                "wordIds": [str(word["_id"])],
                "status": TaskStatus.PENDING.value,
                "result": None,
                "chatId": chat_id  # Store as ObjectId, not string
            })
            task_id_counter += 1
    
    # Update lastReviewedAt for selected words
    if all_selected_word_ids:
        await words_collection.update_many(
            {"_id": {"$in": all_selected_word_ids}},
            {"$set": {"lastReviewedAt": datetime.now(timezone.utc)}}
        )
    
    # Create daily_tasks document
    if tasks:
        await daily_tasks_collection.insert_one({
            "userId": ObjectId(user_id),
            "date": task_date,
            "tasks": tasks,
            "createdAt": datetime.now(timezone.utc)
        })
    
    return {"tasksCreated": len(tasks)}

def _select_words(words: List[dict], count: int) -> List[dict]:
    """Select random words from list, up to count"""
    if len(words) <= count:
        return words
    return random.sample(words, count)
