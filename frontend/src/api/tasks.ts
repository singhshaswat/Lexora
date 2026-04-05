import api from './axios'

export type TaskType = 'MEANING' | 'SENTENCE' | 'MCQ' | 'PARAGRAPH'
export type TaskStatus = 'PENDING' | 'COMPLETED'
export type TaskResult = 'PASS' | 'FAIL'

export interface TaskItem {
  taskId: string
  type: TaskType
  wordIds: string[]
  status: TaskStatus
  result: TaskResult | null
  chatId: string | null
  question: string | null
  options: string[] | null
  correctOption: number | null
  optionReasons: string[] | null
}

export interface DailyTaskResponse {
  id: string
  userId: string
  date: string
  tasks: TaskItem[]
  createdAt: string
}

export interface CompleteTaskRequest {
  result: TaskResult
}

export const tasksApi = {
  getTodayTasks: async (): Promise<DailyTaskResponse> => {
    const response = await api.get<DailyTaskResponse>('/api/tasks/today')
    return response.data
  },

  completeTask: async (taskId: string, result: TaskResult): Promise<DailyTaskResponse> => {
    const response = await api.post<DailyTaskResponse>(`/api/tasks/${taskId}/complete`, {
      result
    })
    return response.data
  },
}
