from openai import OpenAI
from app.settings.get_env import OPENAI_API_KEY, OPENAI_MODEL
import json
import logging

logger = logging.getLogger(__name__)

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

async def generate_mcq_question(word: dict) -> dict:
    """
    Generate an MCQ question for a word using OpenAI.
    Returns a dict with question, options, correctOption (1-4), and optionReasons.
    """
    if not client:
        raise Exception("OpenAI API key not configured")
    
    word_text = word.get("word", "")
    meaning = word.get("meaning", "")
    example = word.get("example", "")
    
    prompt = f"""Generate a multiple-choice question (MCQ) for the word "{word_text}".

Word details:
- Word: {word_text}
- Meaning: {meaning}
- Example: {example}

Requirements:
1. Create a question that tests understanding of the word's meaning in context
2. Provide exactly 4 options (A, B, C, D)
3. Only ONE option should be correct - the one that matches the meaning: "{meaning}"
4. The other 3 options should be plausible but incorrect
5. Use the word in 4 different contexts/sentences, with only one being correct
6. Provide a clear reason for why each option is correct or incorrect

Return a JSON object with this exact structure:
{{
    "question": "The question text asking which sentence uses the word correctly",
    "options": [
        "Option 1 text (sentence using the word)",
        "Option 2 text (sentence using the word)",
        "Option 3 text (sentence using the word)",
        "Option 4 text (sentence using the word)"
    ],
    "correctOption": 1,
    "optionReasons": [
        "Reason why option 1 is correct/incorrect",
        "Reason why option 2 is correct/incorrect",
        "Reason why option 3 is correct/incorrect",
        "Reason why option 4 is correct/incorrect"
    ]
}}

Important:
- correctOption must be 1, 2, 3, or 4 (not 0-based)
- The correct option must match the meaning: "{meaning}"
- Each option should be a complete sentence using the word
- Reasons should clearly explain why each option is correct or incorrect
- Be strict and accurate - only accept the option that truly matches the given meaning
"""

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert vocabulary teacher creating high-quality multiple-choice questions. Be strict and accurate in your assessments."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        mcq_data = json.loads(content)
        
        # Validate the response
        if "question" not in mcq_data:
            raise ValueError("Missing 'question' in MCQ response")
        if "options" not in mcq_data or len(mcq_data["options"]) != 4:
            raise ValueError("Must have exactly 4 options")
        if "correctOption" not in mcq_data:
            raise ValueError("Missing 'correctOption' in MCQ response")
        if mcq_data["correctOption"] not in [1, 2, 3, 4]:
            raise ValueError("correctOption must be 1, 2, 3, or 4")
        if "optionReasons" not in mcq_data or len(mcq_data["optionReasons"]) != 4:
            raise ValueError("Must have exactly 4 optionReasons")
        
        return mcq_data
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse MCQ JSON response: {e}")
        raise Exception(f"Invalid JSON response from OpenAI: {str(e)}")
    except Exception as e:
        logger.error(f"Error generating MCQ question: {e}")
        raise Exception(f"Failed to generate MCQ question: {str(e)}")
