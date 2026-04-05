import { useState, useEffect } from 'react'
import { tasksApi, type DailyTaskResponse, type TaskItem } from '@/api/tasks'
import { wordsApi, type WordResponse } from '@/api/words'
import TaskCard from '@/components/TaskCard'
import TaskDialog from '@/components/TaskDialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Badge } from '@/components/ui/badge'

export default function TodaysTasks() {
  const [tasks, setTasks] = useState<DailyTaskResponse | null>(null)
  const [words, setWords] = useState<Map<string, WordResponse>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchTasks()
    fetchWords()
  }, [])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const data = await tasksApi.getTodayTasks()
      setTasks(data)
    } catch (error: any) {
      console.error('Error fetching tasks:', error)
      toast.error(error.response?.data?.detail || 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchWords = async () => {
    try {
      const wordsList = await wordsApi.getAllWords()
      const wordsMap = new Map<string, WordResponse>()
      wordsList.forEach((word) => {
        wordsMap.set(word.id, word)
      })
      setWords(wordsMap)
    } catch (error: any) {
      console.error('Error fetching words:', error)
    }
  }

  const handleTaskClick = (task: TaskItem) => {
    setSelectedTask(task)
    setIsDialogOpen(true)
  }

  const handleTaskComplete = () => {
    fetchTasks() // Refresh tasks after completion
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedTask(null)
  }

  const getWordForTask = (task: TaskItem) => {
    if (task.wordIds.length === 0) return undefined
    const wordId = task.wordIds[0]
    const word = words.get(wordId)
    return word
      ? {
          word: word.word,
          meaning: word.meaning,
          example: word.example,
        }
      : undefined
  }

  const completedCount = tasks?.tasks.filter((t) => t.status === 'COMPLETED').length || 0
  const totalCount = tasks?.tasks.length || 0
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    )
  }

  if (!tasks || tasks.tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">Today's Tasks</h1>
          <p className="text-muted-foreground mb-4">
            No tasks available for today. Add more words to get daily tasks!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Today's Tasks</h1>
          <p className="text-muted-foreground mb-4">
            Complete your daily vocabulary learning tasks
          </p>
          
          {/* Progress */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {completedCount} / {totalCount} completed
              </Badge>
            </div>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tasks.tasks.map((task) => {
            const word = getWordForTask(task)
            return (
              <TaskCard
                key={task.taskId}
                task={task}
                word={word}
                onClick={() => handleTaskClick(task)}
              />
            )
          })}
        </div>

        {/* Task Dialog */}
        {selectedTask && (
          <TaskDialog
            task={selectedTask}
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            onTaskComplete={handleTaskComplete}
          />
        )}
      </div>
    </div>
  )
}
