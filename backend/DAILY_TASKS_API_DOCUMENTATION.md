# Daily Tasks API Documentation

## Overview

The Daily Tasks system automatically generates AI-powered vocabulary learning tasks for users every day at 1 AM (timezone configurable). Each user receives a set of tasks based on their word collection, with different task types designed to test various aspects of vocabulary understanding.

## Task Generation Logic

### Word Selection
- **Priority 1**: 1 word → MEANING task
- **Priority 2**: 2 words → SENTENCE tasks (2 separate tasks)
- **Priority 3**: 3 words → MCQ tasks (3 separate tasks with pre-generated questions)
- **Priority 4**: 2 words → PARAGRAPH tasks (2 separate tasks)

**Total**: Up to 8 tasks per day (1 + 2 + 3 + 2)

### Priority Management
- **Non-selected words**: Priority increases by 1 (max 4)
- **After task completion**:
  - **PASS**: Priority set to 1
  - **FAIL**: Priority set to 2, failure stats incremented

## API Endpoints

### 1. Get Today's Tasks

**Endpoint**: `GET /api/tasks/today`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "id": "daily_task_id",
  "userId": "user_id",
  "date": "2024-01-15",
  "tasks": [
    {
      "taskId": "task_1",
      "type": "MEANING",
      "wordIds": ["word_id_1"],
      "status": "PENDING",
      "result": null,
      "chatId": "uuid-chat-id",
      "question": null,
      "options": null,
      "correctOption": null,
      "optionReasons": null
    },
    {
      "taskId": "task_2",
      "type": "SENTENCE",
      "wordIds": ["word_id_2"],
      "status": "PENDING",
      "result": null,
      "chatId": "uuid-chat-id-2",
      "question": null,
      "options": null,
      "correctOption": null,
      "optionReasons": null
    },
    {
      "taskId": "task_3",
      "type": "MCQ",
      "wordIds": ["word_id_3"],
      "status": "PENDING",
      "result": null,
      "chatId": "uuid-chat-id-3",
      "question": "Which sentence uses the word 'ephemeral' correctly?",
      "options": [
        "The ephemeral building stood for centuries.",
        "Her ephemeral beauty lasted only a moment.",
        "The ephemeral mountain was impossible to climb.",
        "His ephemeral strength helped him lift the car."
      ],
      "correctOption": 2,
      "optionReasons": [
        "Incorrect: Ephemeral means short-lived, not permanent",
        "Correct: Ephemeral means lasting for a very short time",
        "Incorrect: Mountains are permanent, not ephemeral",
        "Incorrect: Strength that helps lift a car is not ephemeral"
      ]
    },
    {
      "taskId": "task_4",
      "type": "PARAGRAPH",
      "wordIds": ["word_id_4"],
      "status": "PENDING",
      "result": null,
      "chatId": "uuid-chat-id-4",
      "question": null,
      "options": null,
      "correctOption": null,
      "optionReasons": null
    }
  ],
  "createdAt": "2024-01-15T01:00:00Z"
}
```

### 2. Complete a Task

**Endpoint**: `POST /api/tasks/{task_id}/complete`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "result": "PASS"
}
```

**Response**: Updated daily task object (same structure as GET /api/tasks/today)

**Note**: For MCQ tasks, the frontend should determine PASS/FAIL by comparing the user's selected option with `correctOption` (1-4).

### 3. Evaluate Response (MEANING, SENTENCE, PARAGRAPH)

**Endpoint**: `POST /api/tutor/evaluate`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "wordId": "word_id",
  "taskType": "MEANING",
  "userResponse": "User's answer here",
  "chatId": "optional-chat-id-for-continuation"
}
```

**Response**:
```json
{
  "result": "PASS",
  "feedback": "Excellent! Your answer correctly captures the meaning...",
  "hint": null,
  "answerRevealed": false,
  "chatId": "uuid-chat-id",
  "expectedAnswer": "The actual meaning of the word",
  "reason": "Your answer accurately conveys the meaning because..."
}
```

**Task Types**:
- `MEANING`: User provides the meaning of the word
- `SENTENCE`: User creates a sentence using the word
- `PARAGRAPH`: User writes a paragraph (min 50 words) using the word

**Evaluation Flow**:
1. First attempt: If FAIL, returns hint (no answer revealed)
2. Second attempt: If FAIL, reveals expected answer
3. User can continue chatting after evaluation using `chatId`

### 4. Continue Chat Conversation

**Endpoint**: `POST /api/tutor/chat/{chat_id}`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "message": "Can you give me more examples of how to use this word?"
}
```

**Response**:
```json
{
  "result": "PASS",
  "feedback": "Certainly! Here are some additional examples...",
  "hint": null,
  "answerRevealed": false,
  "chatId": "uuid-chat-id",
  "expectedAnswer": null,
  "reason": null
}
```

**Note**: This endpoint allows unlimited conversation about the word after initial evaluation.

### 5. Get Chat History

**Endpoint**: `GET /api/tutor/chat/{chat_id}`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "id": "chat_id",
  "userId": "user_id",
  "wordId": "word_id",
  "taskType": "MEANING",
  "messages": [
    {
      "role": "user",
      "content": "The meaning is..."
    },
    {
      "role": "assistant",
      "content": "Excellent! Your answer correctly captures..."
    },
    {
      "role": "user",
      "content": "Can you give me more examples?"
    },
    {
      "role": "assistant",
      "content": "Certainly! Here are some examples..."
    }
  ],
  "finalResult": "PASS",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Task Types

### 1. MEANING Task
- **Description**: User must provide the meaning of the word
- **Evaluation**: AI evaluates if the meaning is correct
- **Response Format**: JSON with result, feedback, expectedAnswer, reason
- **Chat Support**: Yes, unlimited after evaluation

### 2. SENTENCE Task
- **Description**: User must create a sentence using the word correctly
- **Evaluation**: AI evaluates sentence correctness and word usage
- **Response Format**: JSON with result, feedback, expectedAnswer, reason
- **Chat Support**: Yes, unlimited after evaluation
- **Note**: Each word from Priority 2 gets its own separate task

### 3. MCQ Task
- **Description**: User selects the correct option from 4 choices
- **Evaluation**: Frontend compares user's selection with `correctOption` (1-4)
- **Response Format**: No AI evaluation needed - task is pre-generated
- **Chat Support**: No chat continuation
- **Structure**:
  - `question`: The MCQ question text
  - `options`: Array of 4 option strings
  - `correctOption`: Integer (1-4) indicating correct option
  - `optionReasons`: Array of 4 strings explaining each option
- **Note**: Each word from Priority 3 gets its own separate task with pre-generated question

### 4. PARAGRAPH Task
- **Description**: User must write a meaningful paragraph (minimum 50 words) using the word
- **Evaluation**: AI evaluates paragraph length, word usage, and coherence
- **Response Format**: JSON with result, feedback, expectedAnswer, reason
- **Chat Support**: Yes, unlimited after evaluation
- **Note**: Each word from Priority 4 gets its own separate task

## Task Status Flow

```
PENDING → (User submits response) → (AI evaluates / User selects MCQ) → COMPLETED
```

**Status Values**:
- `PENDING`: Task not yet completed
- `COMPLETED`: Task finished (result is PASS or FAIL)

**Result Values**:
- `PASS`: User passed the task
- `FAIL`: User failed the task
- `null`: Task not yet completed

## Frontend Implementation Guide

### 1. Displaying Tasks

```typescript
interface TaskItem {
  taskId: string;
  type: "MEANING" | "SENTENCE" | "MCQ" | "PARAGRAPH";
  wordIds: string[];
  status: "PENDING" | "COMPLETED";
  result: "PASS" | "FAIL" | null;
  chatId: string | null;
  // MCQ-specific fields
  question: string | null;
  options: string[] | null;
  correctOption: number | null; // 1-4
  optionReasons: string[] | null;
}

// Group tasks by type for better UI organization
const tasksByType = {
  MEANING: tasks.filter(t => t.type === "MEANING"),
  SENTENCE: tasks.filter(t => t.type === "SENTENCE"),
  MCQ: tasks.filter(t => t.type === "MCQ"),
  PARAGRAPH: tasks.filter(t => t.type === "PARAGRAPH")
};
```

### 2. Handling MEANING Task

```typescript
// Step 1: User enters meaning
const userResponse = "The meaning of the word...";

// Step 2: Submit for evaluation
const response = await fetch("/api/tutor/evaluate", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    wordId: task.wordIds[0],
    taskType: "MEANING",
    userResponse: userResponse,
    chatId: task.chatId // Optional, for continuation
  })
});

const evaluation = await response.json();

// Step 3: Display result
if (evaluation.result === "PASS") {
  // Show success message
  // Allow user to complete task or continue chatting
} else {
  // Show feedback and hint
  // Allow retry or chat continuation
}

// Step 4: Complete task (after user confirms)
await fetch(`/api/tasks/${task.taskId}/complete`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    result: evaluation.result === "PASS" ? "PASS" : "FAIL"
  })
});
```

### 3. Handling SENTENCE Task

Same flow as MEANING task, but `taskType` is `"SENTENCE"`.

### 4. Handling MCQ Task

```typescript
// Step 1: Display question and options
const mcqTask = tasks.find(t => t.type === "MCQ" && t.taskId === taskId);
// Display: mcqTask.question
// Display: mcqTask.options with radio buttons (1-4)

// Step 2: User selects option
const selectedOption = 2; // User selected option 2

// Step 3: Check answer (frontend logic)
const isCorrect = selectedOption === mcqTask.correctOption;

// Step 4: Display result
if (isCorrect) {
  // Show success with optionReasons[mcqTask.correctOption - 1]
} else {
  // Show failure with explanations from optionReasons
}

// Step 5: Complete task
await fetch(`/api/tasks/${task.taskId}/complete`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    result: isCorrect ? "PASS" : "FAIL"
  })
});
```

### 5. Handling PARAGRAPH Task

Same flow as MEANING task, but:
- `taskType` is `"PARAGRAPH"`
- Validate minimum 50 words before submission
- Show word count to user

### 6. Chat Continuation

```typescript
// After initial evaluation, user can continue chatting
const chatMessage = "Can you give me more examples?";

const response = await fetch(`/api/tutor/chat/${task.chatId}`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: chatMessage
  })
});

const chatResponse = await response.json();
// Display chatResponse.feedback as assistant message
// Add to chat history UI
```

### 7. Loading Chat History

```typescript
const response = await fetch(`/api/tutor/chat/${chatId}`, {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${token}`
  }
});

const chatHistory = await response.json();
// Display chatHistory.messages in chat UI
```

## UI Recommendations

### Task Card Design
- Show task type badge (MEANING, SENTENCE, MCQ, PARAGRAPH)
- Display word(s) being tested
- Show status (PENDING/COMPLETED) with visual indicator
- For MCQ: Display question and options clearly
- For completed tasks: Show result (PASS/FAIL) with color coding

### Evaluation Flow
1. **Input Area**: Text input for MEANING/SENTENCE/PARAGRAPH, radio buttons for MCQ
2. **Submit Button**: Disabled until valid input
3. **Loading State**: Show spinner during AI evaluation
4. **Result Display**:
   - Success: Green checkmark, positive feedback
   - Failure: Red X, feedback with hint, expected answer (on 2nd attempt)
5. **Action Buttons**: "Continue Chat", "Complete Task", "Try Again"

### Chat Interface
- Message bubbles (user left, assistant right)
- Show word meaning and example in chat header
- Input field at bottom
- Auto-scroll to latest message

## Error Handling

### Common Errors

1. **No tasks available**: User might not have enough words
   - Response: `{ "tasks": [] }`
   - UI: Show message "No tasks available. Add more words to get daily tasks."

2. **Task already completed**: User tries to complete same task twice
   - Response: 400 Bad Request
   - UI: Disable complete button, show "Already completed"

3. **Chat not found**: Invalid chatId
   - Response: 500 with "Chat not found"
   - UI: Show error, allow user to start new evaluation

4. **OpenAI API failure**: During evaluation or MCQ generation
   - Response: 500 with error message
   - UI: Show retry button, log error

## Best Practices

1. **Caching**: Cache today's tasks to avoid repeated API calls
2. **Optimistic Updates**: Update UI immediately, sync with server
3. **Offline Support**: Store task state locally, sync when online
4. **Progress Tracking**: Show completion percentage (X/8 tasks)
5. **Word Context**: Always show word, meaning, and example when displaying tasks
6. **Validation**: 
   - Paragraph: Minimum 50 words
   - MCQ: Ensure option selected before submit
7. **Accessibility**: Proper labels, keyboard navigation, screen reader support

## Example Complete Flow

```typescript
// 1. Load today's tasks
const tasks = await getTodayTasks();

// 2. User selects a MEANING task
const task = tasks.find(t => t.type === "MEANING" && t.status === "PENDING");

// 3. Display task
// Show: "What is the meaning of [word]?"
// Input: Text field

// 4. User submits
const evaluation = await evaluateResponse({
  wordId: task.wordIds[0],
  taskType: "MEANING",
  userResponse: userInput
});

// 5. Show result
if (evaluation.result === "PASS") {
  showSuccess(evaluation.feedback);
  showButton("Complete Task");
  showButton("Continue Chat");
} else {
  showFailure(evaluation.feedback);
  if (evaluation.hint) showHint(evaluation.hint);
  if (evaluation.answerRevealed) showExpectedAnswer(evaluation.expectedAnswer);
  showButton("Try Again");
  showButton("Continue Chat");
}

// 6. User chooses to continue chat
const chatResponse = await continueChat(task.chatId, "More examples please");
// Display in chat interface

// 7. User completes task
await completeTask(task.taskId, evaluation.result);
// Update task status to COMPLETED
```

## Notes

- All timestamps are in UTC
- Task generation happens automatically at 1 AM (timezone from server config)
- Tasks are created per user, per day
- Each task has a unique `chatId` for conversation tracking
- MCQ questions are pre-generated during task creation (no AI call on user response)
- Other task types require AI evaluation on user submission
- Chat continuation is unlimited after initial evaluation
- Word priorities update automatically based on task completion
