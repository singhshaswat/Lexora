import api from './axios'
import { type WordResponse } from './words'

export interface DashboardResponse {
  passCount: number
  failCount: number
  wordsMasteredCount: number
  recentlyAddedWords: WordResponse[]
}

export const dashboardApi = {
  getDashboardData: async (): Promise<DashboardResponse> => {
    const response = await api.get<DashboardResponse>('/api/dashboard')
    return response.data
  },
}
