import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type TaskItem } from '@/api/tasks'
import { CheckCircle2, Circle, XCircle, BookOpen, FileText, List, HelpCircle } from 'lucide-react'

interface TaskCardProps {
  task: TaskItem
  word?: {
    word: string
    meaning: string
    example: string
  }
  onClick: () => void
}

const getTaskTypeIcon = (type: TaskItem['type']) => {
  switch (type) {
    case 'MEANING':
      return <BookOpen className="h-4 w-4" />
    case 'SENTENCE':
      return <FileText className="h-4 w-4" />
    case 'MCQ':
      return <HelpCircle className="h-4 w-4" />
    case 'PARAGRAPH':
      return <List className="h-4 w-4" />
    default:
      return <Circle className="h-4 w-4" />
  }
}

const getTaskTypeColor = (type: TaskItem['type']) => {
  switch (type) {
    case 'MEANING':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 'SENTENCE':
      return 'bg-green-500/10 text-green-500 border-green-500/20'
    case 'MCQ':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    case 'PARAGRAPH':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }
}

export default function TaskCard({ task, word, onClick }: TaskCardProps) {
  const isCompleted = task.status === 'COMPLETED'
  const isPass = task.result === 'PASS'

  return (
    <div
      className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
        isCompleted
          ? isPass
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-red-500/50 bg-red-500/5'
          : 'border-border bg-card'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${getTaskTypeColor(task.type)} flex items-center gap-1`}
          >
            {getTaskTypeIcon(task.type)}
            <span>{task.type}</span>
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            isPass ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {word && (
        <div className="mb-3">
          <h3 className="font-semibold text-lg">{word.word}</h3>
          {/* Don't show meaning - it's a task to be completed! */}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Badge
          variant={isCompleted ? (isPass ? 'success' : 'destructive') : 'secondary'}
        >
          {task.status}
          {isCompleted && ` - ${task.result}`}
        </Badge>
        <Button variant="outline" size="sm" onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}>
          {isCompleted ? 'View' : 'Start'}
        </Button>
      </div>
    </div>
  )
}
