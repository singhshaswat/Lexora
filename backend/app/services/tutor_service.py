from datetime import datetime
from bson import ObjectId
from openai import OpenAI
from typing import Optional, List
from app.database import get_tutor_chats_collection, get_words_collection
from app.models.tutor_chat import TutorEvaluationRequest, TutorEvaluationResponse, ChatMessage, EvaluationResult, ChatStatus
from app.models.daily_task import TaskType, TaskResult
from app.settings.get_env import OPENAI_API_KEY, OPENAI_MODEL
import json
import logging

logger = logging.getLogger(__name__)

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

async def evaluate_response(
    user_id: str,
    request: TutorEvaluationRequest,
    chat_id: Optional[str] = None
) -> dict:
    """Evaluate user response using AI tutor"""
    if not client:
        raise Exception("OpenAI API key not configured")
    
    words_collection = get_words_collection()
    tutor_chats_collection = get_tutor_chats_collection()
    
    # Get word information
    try:
        word_id_obj = ObjectId(request.wordId)
    except Exception:
        raise Exception(f"Invalid wordId format: {request.wordId}")
    
    word = await words_collection.find_one({
        "_id": word_id_obj,
        "userId": ObjectId(user_id)
    })
    
    if not word:
        raise Exception("Word not found")
    
    # Check for existing chat by chatId or by wordId + taskType
    existing_chat = None
    if chat_id:
        try:
            # chat_id might be a string (from frontend) or already an ObjectId
            chat_id_obj = ObjectId(chat_id) if isinstance(chat_id, str) else chat_id
            existing_chat = await tutor_chats_collection.find_one({
                "_id": chat_id_obj,
                "userId": ObjectId(user_id)
            })
        except Exception:
            # If chat_id is not a valid ObjectId, try to find by wordId + taskType instead
            existing_chat = None
    
    if not existing_chat:
        existing_chat = await tutor_chats_collection.find_one({
            "userId": ObjectId(user_id),
            "wordId": ObjectId(request.wordId),
            "taskType": request.taskType.value
        }, sort=[("createdAt", -1)])
    
    messages = []
    failure_count = 0
    
    if existing_chat:
        # Load existing conversation for context
        messages = existing_chat.get("messages", [])
        # Count failures in existing messages
        for msg in messages:
            if msg.get("role") == "assistant":
                content = msg.get("content", "")
                if "FAIL" in content or "incorrect" in content.lower() or "wrong" in content.lower():
                    failure_count += 1
    
    # Add user response
    messages.append({
        "role": "user",
        "content": request.userResponse
    })
    
    try:
        # Always do evaluation (initial or re-evaluation)
        system_prompt = _build_system_prompt(request.taskType, word)
        evaluation_prompt = _build_evaluation_prompt(
            word,
            request.taskType,
            request.userResponse,
            failure_count
        )
        
        # Call OpenAI for evaluation
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": evaluation_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2  # Lower temperature for stricter evaluation
        )
        
        content = response.choices[0].message.content
        evaluation = json.loads(content)
        
        result = evaluation.get("result", "FAIL")
        feedback = evaluation.get("feedback", "")
        hint = evaluation.get("hint")
        answer_revealed = evaluation.get("answerRevealed", False)
        expected_answer = evaluation.get("expectedAnswer", word.get("meaning"))
        reason = evaluation.get("reason", "")
        
        # Build assistant message with all information
        assistant_content = feedback
        if hint:
            assistant_content += f"\n\nHint: {hint}"
        if answer_revealed or result == "FAIL":
            assistant_content += f"\n\nExpected answer: {expected_answer}"
        if reason:
            assistant_content += f"\n\nReason: {reason}"
        
        assistant_message = {
            "role": "assistant",
            "content": assistant_content
        }
        messages.append(assistant_message)
        
        # Determine final result - but don't update chat status yet (wait for task completion)
        # Chat status will be updated when task is completed in task_service
        final_result = TaskResult.PASS if result == "PASS" else TaskResult.FAIL
        
        # Save or update chat (keep status as PENDING until task is completed)
        if existing_chat:
            await tutor_chats_collection.update_one(
                {"_id": existing_chat["_id"]},
                {
                    "$set": {
                        "messages": messages
                        # Don't update finalResult here - it will be updated when task is completed
                    }
                }
            )
            chat_id = str(existing_chat["_id"])
        else:
            chat_doc = {
                "userId": ObjectId(user_id),
                "wordId": ObjectId(request.wordId),
                "taskType": request.taskType.value,
                "messages": messages,
                "finalResult": ChatStatus.PENDING.value,  # Start as PENDING
                "createdAt": datetime.utcnow()
            }
            result = await tutor_chats_collection.insert_one(chat_doc)
            chat_id = str(result.inserted_id)
        
        return {
            "result": EvaluationResult.PASS if result == "PASS" else EvaluationResult.FAIL,
            "feedback": feedback,
            "hint": hint,
            "answerRevealed": answer_revealed,
            "chatId": chat_id,
            "expectedAnswer": expected_answer,
            "reason": reason
        }
        
    except Exception as e:
        logger.error(f"Error evaluating response: {e}")
        raise Exception(f"Failed to evaluate response: {str(e)}")

def _build_system_prompt(task_type: TaskType, word: dict) -> str:
    """Build system prompt for AI tutor - strict evaluation"""
    word_text = word.get('word', '')
    meaning = word.get('meaning', '')
    example = word.get('example', '')
    
    base_prompt = f"""You are a strict vocabulary tutor evaluating student responses. 
You must be accurate and precise in your assessments.

Word: {word_text}
Correct meaning: {meaning}
Example: {example}

Evaluation rules:
- Be STRICT in your judgment - only accept answers that demonstrate clear understanding
- Accept accurate paraphrases and synonyms that convey the same meaning
- Reject vague, circular, incorrect, or partially correct definitions
- For sentence/paragraph tasks, ensure the word is used correctly in context
- Be encouraging but maintain high standards"""
    
    if task_type == TaskType.MEANING:
        return f"""{base_prompt}

Task: The student must provide the meaning of "{word_text}".
Correct meaning: {meaning}

Evaluate strictly. The student's response must accurately convey the meaning."""
    
    elif task_type == TaskType.SENTENCE:
        return f"""{base_prompt}

Task: The student must create a sentence using "{word_text}" correctly.
Example sentence: {example}
Word meaning: {meaning}

Evaluate strictly. The sentence must use the word correctly in context."""
    
    elif task_type == TaskType.PARAGRAPH:
        return f"""{base_prompt}

Task: The student must write a meaningful paragraph (at least 50 words) using "{word_text}".
Word meaning: {meaning}
Example: {example}

Evaluate strictly. The paragraph must:
- Be at least 50 words
- Use the word correctly in context
- Be meaningful and coherent"""
    
    return base_prompt

def _build_chat_prompt(task_type: TaskType, word: dict) -> str:
    """Build system prompt for chat continuation"""
    word_text = word.get('word', '')
    meaning = word.get('meaning', '')
    example = word.get('example', '')
    
    return f"""You are a helpful vocabulary tutor helping a student learn the word "{word_text}".

Word details:
- Word: {word_text}
- Meaning: {meaning}
- Example: {example}

The student has already completed the initial evaluation. Now they can ask you questions about the word, its usage, examples, synonyms, or any related topics. Be helpful, encouraging, and educational. Provide clear explanations and examples when needed."""

def _build_evaluation_prompt(
    word: dict,
    task_type: TaskType,
    user_response: str,
    failure_count: int
) -> str:
    """Build evaluation prompt for OpenAI - strict evaluation"""
    word_text = word.get('word', '')
    meaning = word.get('meaning', '')
    example = word.get('example', '')
    
    prompt = f"""Evaluate this student response STRICTLY for the word "{word_text}".

Word details:
- Word: {word_text}
- Correct meaning: {meaning}
- Example: {example}
- Task type: {task_type.value}
- Student response: {user_response}

Evaluation criteria (BE STRICT):
- For MEANING: Response must accurately convey the meaning. Accept synonyms/paraphrases only if they are accurate.
- For SENTENCE: Sentence must use the word correctly in context. Grammar and coherence matter.
- For PARAGRAPH: Paragraph must be at least 50 words, use the word correctly, and be meaningful.

Return a JSON object with this EXACT structure:
{{
    "result": "PASS" or "FAIL",
    "feedback": "Detailed feedback explaining why PASS or FAIL. Be specific and constructive.",
    "hint": "Optional hint if FAIL (only on first failure, provide guidance without revealing answer)",
    "answerRevealed": true/false (true only on second failure),
    "expectedAnswer": "{meaning}",
    "reason": "Clear explanation of why the answer is correct or incorrect. Be specific about what was right or wrong."
}}

Failure count so far: {failure_count}
"""
    
    if failure_count == 0:
        prompt += "\nThis is the first attempt. If FAIL, provide a helpful hint but don't reveal the answer."
    elif failure_count == 1:
        prompt += "\nThis is the second attempt. If FAIL, reveal the correct answer and provide detailed explanation."
    
    if task_type == TaskType.PARAGRAPH:
        prompt += "\nIMPORTANT: Check that the paragraph is at least 50 words. If shorter, it should FAIL."
    
    return prompt

async def continue_chat(user_id: str, chat_id: str, message: str) -> dict:
    """Continue a chat conversation"""
    if not client:
        raise Exception("OpenAI API key not configured")
    
    tutor_chats_collection = get_tutor_chats_collection()
    words_collection = get_words_collection()
    
    # Get chat
    try:
        # chat_id might be a string (from frontend) or already an ObjectId
        chat_id_obj = ObjectId(chat_id) if isinstance(chat_id, str) else chat_id
    except Exception:
        raise Exception(f"Invalid chatId format: {chat_id}")
    
    chat = await tutor_chats_collection.find_one({
        "_id": chat_id_obj,
        "userId": ObjectId(user_id)
    })
    
    if not chat:
        raise Exception("Chat not found")
    
    # Don't allow continuing PENDING chats - task must be completed first
    if chat.get("finalResult") == ChatStatus.PENDING.value:
        raise Exception("Cannot continue chat for pending tasks. Please complete the task first.")
    
    # Get word information
    word = await words_collection.find_one({
        "_id": chat["wordId"],
        "userId": ObjectId(user_id)
    })
    
    if not word:
        raise Exception("Word not found")
    
    # Get existing messages
    messages = chat.get("messages", [])
    task_type = TaskType(chat.get("taskType"))
    
    # Add user message
    messages.append({
        "role": "user",
        "content": message
    })
    
    # Build chat prompt
    system_prompt = _build_chat_prompt(task_type, word)
    
    # Build messages for OpenAI
    chat_messages = [
        {"role": "system", "content": system_prompt}
    ] + messages[:-1]  # All messages except the last user message
    
    # Add the current user message
    chat_messages.append({
        "role": "user",
        "content": message
    })
    
    try:
        # Call OpenAI for chat continuation
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=chat_messages,
            temperature=0.7
        )
        
        assistant_content = response.choices[0].message.content
        assistant_message = {
            "role": "assistant",
            "content": assistant_content
        }
        messages.append(assistant_message)
        
        # Update chat (use chat_id_obj that was already converted)
        await tutor_chats_collection.update_one(
            {"_id": chat_id_obj},
            {
                "$set": {
                    "messages": messages
                }
            }
        )
        
        return {
            "result": EvaluationResult.PASS,
            "feedback": assistant_content,
            "hint": None,
            "answerRevealed": False,
            "chatId": chat_id,
            "expectedAnswer": None,
            "reason": None
        }
        
    except Exception as e:
        logger.error(f"Error continuing chat: {e}")
        raise Exception(f"Failed to continue chat: {str(e)}")

async def get_chat_history(user_id: str, chat_id: str) -> dict:
    """Get chat history by chatId"""
    tutor_chats_collection = get_tutor_chats_collection()
    
    try:
        # chat_id might be a string (from frontend) or already an ObjectId
        chat_id_obj = ObjectId(chat_id) if isinstance(chat_id, str) else chat_id
    except Exception:
        raise Exception(f"Invalid chatId format: {chat_id}")
    
    chat = await tutor_chats_collection.find_one({
        "_id": chat_id_obj,
        "userId": ObjectId(user_id)
    })
    
    if not chat:
        raise Exception("Chat not found")
    
    return {
        "id": str(chat["_id"]),
        "userId": str(chat["userId"]),
        "wordId": str(chat["wordId"]),
        "taskType": TaskType(chat.get("taskType")),
        "messages": chat.get("messages", []),
        "finalResult": ChatStatus(chat.get("finalResult", ChatStatus.PENDING.value)),
        "createdAt": chat.get("createdAt")
    }

async def list_user_chats(user_id: str, limit: int = 50, offset: int = 0) -> List[dict]:
    """List all chats for a user - only return completed chats (PASS/FAIL), exclude PENDING"""
    tutor_chats_collection = get_tutor_chats_collection()
    words_collection = get_words_collection()
    
    # Get chats sorted by createdAt descending - exclude PENDING chats
    chats = await tutor_chats_collection.find({
        "userId": ObjectId(user_id),
        "finalResult": {"$ne": ChatStatus.PENDING.value}  # Exclude PENDING chats
    }).sort("createdAt", -1).skip(offset).limit(limit).to_list(length=limit)
    
    # Get word information for each chat
    result = []
    for chat in chats:
        word_id = chat.get("wordId")
        word = None
        
        if word_id:
            word = await words_collection.find_one({"_id": word_id})
        
        messages = chat.get("messages", [])
        result.append({
            "id": str(chat["_id"]),
            "wordId": str(word_id) if word_id else "",
            "word": word.get("word", "") if word else "",
            "meaning": word.get("meaning", "") if word else "",
            "taskType": TaskType(chat.get("taskType")),
            "finalResult": ChatStatus(chat.get("finalResult", ChatStatus.FAIL.value)),
            "createdAt": chat.get("createdAt"),
            "messageCount": len(messages)
        })
    
    return result