import api from './axios'

export interface CreateWordData {
  word: string
  meaning: string
  example: string
  priority: number
}

export interface FailureStats {
  meaning: number
  sentence: number
  paragraph: number
}

export interface WordResponse {
  id: string
  userId: string
  word: string
  normalizedWord: string
  meaning: string
  example: string
  priority: number
  state: string
  masteryCount: number
  lastReviewedAt: string | null
  lastPromotedAt: string | null
  failureStats: FailureStats
  createdAt: string
  updatedAt: string
}

export const wordsApi = {
  createWord: async (data: CreateWordData): Promise<WordResponse> => {
    const response = await api.post<WordResponse>('/api/words', data)
    return response.data
  },

  getAllWords: async (): Promise<WordResponse[]> => {
    const response = await api.get<WordResponse[]>('/api/words')
    return response.data
  },

  deleteWord: async (wordId: string): Promise<void> => {
    await api.delete(`/api/words/${wordId}`)
  },
}
