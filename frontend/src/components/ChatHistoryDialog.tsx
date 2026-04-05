import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { tutorApi, type TutorChatResponse, type ChatStatus } from '@/api/tutor'
import { type TaskType } from '@/api/tasks'
import { wordsApi, type WordResponse } from '@/api/words'
import { toast } from 'react-toastify'
import TaskChatInterface from './TaskChatInterface'

interface ChatHistoryDialogProps {
  chatId: string
  isOpen: boolean
  onClose: () => void
}

export default function ChatHistoryDialog({
  chatId,
  isOpen,
  onClose,
}: ChatHistoryDialogProps) {
  const [chat, setChat] = useState<TutorChatResponse | null>(null)
  const [word, setWord] = useState<WordResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && chatId) {
      fetchChatHistory()
    }
  }, [isOpen, chatId])

  const fetchChatHistory = async () => {
    try {
      setLoading(true)
      const chatData = await tutorApi.getChatHistory(chatId)
      setChat(chatData)

      // Fetch word information
      const words = await wordsApi.getAllWords()
      const foundWord = words.find((w) => w.id === chatData.wordId)
      if (foundWord) {
        setWord(foundWord)
      }
    } catch (error: any) {
      console.error('Error fetching chat history:', error)
      toast.error(error.response?.data?.detail || 'Failed to load chat history')
    } finally {
      setLoading(false)
    }
  }

  const getTaskTypeLabel = (type: TaskType) => {
    switch (type) {
      case 'MEANING':
        return 'Meaning'
      case 'SENTENCE':
        return 'Sentence'
      case 'MCQ':
        return 'MCQ'
      case 'PARAGRAPH':
        return 'Paragraph'
      default:
        return type
    }
  }

  const getResultColor = (result: ChatStatus) => {
    if (result === 'PASS') return 'success'
    if (result === 'FAIL') return 'destructive'
    return 'secondary'
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!chat || !word) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <div className="text-center py-8 text-muted-foreground">
            Chat not found
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Chat History
            <Badge variant="outline">{getTaskTypeLabel(chat.taskType)}</Badge>
            <Badge variant={getResultColor(chat.finalResult)}>
              {chat.finalResult}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Conversation about "{word.word}" - {getTaskTypeLabel(chat.taskType)} task
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg h-[500px]">
          <TaskChatInterface
            chatId={chatId}
            word={word.word}
            meaning={word.meaning}
            example={word.example}
            initialMessages={chat.messages}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
