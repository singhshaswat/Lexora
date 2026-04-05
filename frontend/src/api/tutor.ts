import api from './axios'
import { type TaskType } from './tasks'

export type EvaluationResult = 'PASS' | 'FAIL'
export type ChatStatus = 'PENDING' | 'PASS' | 'FAIL'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TutorEvaluationRequest {
  wordId: string
  taskType: TaskType
  userResponse: string
  chatId?: string | null
}

export interface TutorEvaluationResponse {
  result: EvaluationResult
  feedback: string
  hint: string | null
  answerRevealed: boolean
  chatId: string | null
  expectedAnswer: string | null
  reason: string | null
}

export interface ChatContinueRequest {
  message: string
}

export interface TutorChatResponse {
  id: string
  userId: string
  wordId: string
  taskType: TaskType
  messages: ChatMessage[]
  finalResult: ChatStatus
  createdAt: string
}

export interface ChatListItem {
  id: string
  wordId: string
  word: string
  meaning: string
  taskType: TaskType
  finalResult: ChatStatus
  createdAt: string
  messageCount: number
}

export const tutorApi = {
  evaluateResponse: async (data: TutorEvaluationRequest): Promise<TutorEvaluationResponse> => {
    const response = await api.post<TutorEvaluationResponse>('/api/tutor/evaluate', data)
    return response.data
  },

  continueChat: async (chatId: string, message: string): Promise<TutorEvaluationResponse> => {
    const response = await api.post<TutorEvaluationResponse>(`/api/tutor/chat/${chatId}`, {
      message
    })
    return response.data
  },

  getChatHistory: async (chatId: string): Promise<TutorChatResponse> => {
    const response = await api.get<TutorChatResponse>(`/api/tutor/chat/${chatId}`)
    return response.data
  },

  listChats: async (limit: number = 50, offset: number = 0): Promise<ChatListItem[]> => {
    const response = await api.get<ChatListItem[]>('/api/tutor/chats', {
      params: { limit, offset }
    })
    return response.data
  },
}
