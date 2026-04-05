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
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { type TaskItem, type TaskResult, tasksApi } from '@/api/tasks'
import type { TutorEvaluationResponse, ChatMessage } from '@/api/tutor'
import { tutorApi } from '@/api/tutor'
import { wordsApi, type WordResponse } from '@/api/words'
import { toast } from 'react-toastify'
import TaskChatInterface from './TaskChatInterface'

interface TaskDialogProps {
  task: TaskItem
  isOpen: boolean
  onClose: () => void
  onTaskComplete: () => void
}

export default function TaskDialog({
  task,
  isOpen,
  onClose,
  onTaskComplete,
}: TaskDialogProps) {
  const [word, setWord] = useState<WordResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [userResponse, setUserResponse] = useState('')
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [evaluation, setEvaluation] = useState<TutorEvaluationResponse | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [wordCount, setWordCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (isOpen && task.wordIds.length > 0) {
      // Reset form state when dialog opens
      setUserResponse('')
      setSelectedOption(null)
      setEvaluation(null)
      setShowChat(false)
      setChatMessages([])
      setWordCount(0)
      
      fetchWord()
      if (task.status === 'COMPLETED' && task.chatId) {
        loadChatHistory()
      }
    }
  }, [isOpen, task])

  useEffect(() => {
    if (task.type === 'PARAGRAPH') {
      const count = userResponse.trim().split(/\s+/).filter(Boolean).length
      setWordCount(count)
    }
  }, [userResponse, task.type])

  const fetchWord = async () => {
    try {
      setLoading(true)
      // We need to get word info - for now, we'll fetch all words and find the one
      // In a real app, you might have a getWordById endpoint
      const words = await wordsApi.getAllWords()
      // Find word by matching wordIds - ensure we're using the first wordId
      const wordId = task.wordIds[0]
      if (!wordId) {
        toast.error('No word ID found in task')
        return
      }
      const foundWord = words.find((w) => w.id === wordId)
      if (foundWord) {
        setWord(foundWord)
      } else {
        console.error('Word not found for wordId:', wordId)
        toast.error('Word information not found')
      }
    } catch (error: any) {
      console.error('Error fetching word:', error)
      toast.error(error.response?.data?.detail || 'Failed to load word information')
    } finally {
      setLoading(false)
    }
  }

  const loadChatHistory = async () => {
    if (!task.chatId) return
    try {
      const chatHistory = await tutorApi.getChatHistory(task.chatId)
      setChatMessages(chatHistory.messages)
      setShowChat(true)
    } catch (error: any) {
      console.error('Error loading chat history:', error)
    }
  }

  const handleSubmit = async () => {
    if (!word) return

    if (task.type === 'MCQ') {
      if (selectedOption === null) {
        toast.error('Please select an option')
        return
      }
      handleMCQSubmit()
      return
    }

    if (task.type === 'PARAGRAPH' && wordCount < 50) {
      toast.error('Paragraph must be at least 50 words')
      return
    }

    if (!userResponse.trim()) {
      toast.error('Please enter your response')
      return
    }

    setSubmitting(true)
    try {
      const response = await tutorApi.evaluateResponse({
        wordId: word.id,
        taskType: task.type,
        userResponse: userResponse.trim(),
        chatId: task.chatId || undefined,
      })

      setEvaluation(response)
      if (response.chatId) {
        setChatMessages([
          { role: 'user', content: userResponse.trim() },
          { role: 'assistant', content: response.feedback },
        ])
      }
    } catch (error: any) {
      console.error('Error evaluating response:', error)
      toast.error(error.response?.data?.detail || 'Failed to evaluate response')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMCQSubmit = () => {
    if (selectedOption === null || task.correctOption === null) return

    const isCorrect = selectedOption === task.correctOption
    setEvaluation({
      result: isCorrect ? 'PASS' : 'FAIL',
      feedback: isCorrect
        ? 'Correct! Well done.'
        : 'Incorrect. Please review the explanation.',
      hint: null,
      answerRevealed: true,
      chatId: null,
      expectedAnswer: null,
      reason: task.optionReasons?.[task.correctOption - 1] || null,
    })
  }

  const handleCompleteTask = async () => {
    if (!evaluation) return

    setCompleting(true)
    try {
      await tasksApi.completeTask(task.taskId, evaluation.result as TaskResult)
      toast.success('Task completed!')
      onTaskComplete()
      onClose()
    } catch (error: any) {
      console.error('Error completing task:', error)
      toast.error(error.response?.data?.detail || 'Failed to complete task')
    } finally {
      setCompleting(false)
    }
  }

  const handleRetry = () => {
    setEvaluation(null)
    setUserResponse('')
    setSelectedOption(null)
    setShowChat(false)
  }

  const handleContinueChat = () => {
    setShowChat(true)
    if (evaluation?.chatId && chatMessages.length === 0) {
      loadChatHistory()
    }
  }

  const handleNewChatMessage = (message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message])
  }

  const canSubmit =
    task.type === 'MCQ'
      ? selectedOption !== null
      : userResponse.trim().length > 0 &&
        (task.type !== 'PARAGRAPH' || wordCount >= 50)

  const isCompleted = task.status === 'COMPLETED'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline">{task.type}</Badge>
            {isCompleted && (
              <Badge variant={task.result === 'PASS' ? 'success' : 'destructive'}>
                {task.result}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {task.type === 'MEANING' && 'Provide the meaning of the word'}
            {task.type === 'SENTENCE' && 'Create a sentence using the word'}
            {task.type === 'MCQ' && 'Select the correct answer'}
            {task.type === 'PARAGRAPH' && 'Write a paragraph (min 50 words) using the word'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : word ? (
          <div className="space-y-4">
            {/* Word Info - Hide when chat is shown (chat interface has its own header) */}
            {!showChat && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold text-lg mb-2">{word.word}</h3>
                {/* Only show meaning and example AFTER evaluation or if task is completed */}
                {/* Before evaluation, only show the word itself - no hints! */}
                {(evaluation || isCompleted) && (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">{word.meaning}</p>
                    <p className="text-sm italic text-muted-foreground">
                      Example: "{word.example}"
                    </p>
                  </>
                )}
              </div>
            )}

            {/* MCQ Task */}
            {task.type === 'MCQ' && task.question && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">{task.question}</h4>
                  <RadioGroup
                    value={selectedOption?.toString() || ''}
                    onValueChange={(value) => setSelectedOption(parseInt(value))}
                    disabled={isCompleted || !!evaluation}
                  >
                    {task.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={(index + 1).toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                {evaluation && (
                  <div className="space-y-2">
                    {task.optionReasons?.map((reason, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg text-sm ${
                          index + 1 === task.correctOption
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                            : 'bg-muted'
                        }`}
                      >
                        <strong>Option {index + 1}:</strong> {reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Text Input Tasks */}
            {task.type !== 'MCQ' && !showChat && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="response">
                    {task.type === 'MEANING' && 'Meaning'}
                    {task.type === 'SENTENCE' && 'Sentence'}
                    {task.type === 'PARAGRAPH' && 'Paragraph'}
                  </Label>
                  <Textarea
                    id="response"
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    placeholder={
                      task.type === 'MEANING'
                        ? 'Enter the meaning...'
                        : task.type === 'SENTENCE'
                          ? 'Enter your sentence...'
                          : 'Enter your paragraph (minimum 50 words)...'
                    }
                    rows={task.type === 'PARAGRAPH' ? 8 : 4}
                    disabled={isCompleted || !!evaluation}
                    className="mt-2"
                  />
                  {task.type === 'PARAGRAPH' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Word count: {wordCount} / 50
                      {wordCount < 50 && (
                        <span className="text-red-500 ml-2">
                          (Need {50 - wordCount} more words)
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Evaluation Result */}
            {evaluation && !showChat && (
              <div
                className={`p-4 rounded-lg border ${
                  evaluation.result === 'PASS'
                    ? 'bg-green-500/10 border-green-500/50'
                    : 'bg-red-500/10 border-red-500/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {evaluation.result === 'PASS' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold">
                      {evaluation.result === 'PASS' ? 'Correct!' : 'Incorrect'}
                    </p>
                    <p className="text-sm">{evaluation.feedback}</p>
                    {evaluation.hint && (
                      <div className="p-2 bg-yellow-500/10 rounded text-sm">
                        <strong>Hint:</strong> {evaluation.hint}
                      </div>
                    )}
                    {evaluation.expectedAnswer && (
                      <div className="p-2 bg-blue-500/10 rounded text-sm">
                        <strong>Expected Answer:</strong> {evaluation.expectedAnswer}
                      </div>
                    )}
                    {evaluation.reason && (
                      <div className="p-2 bg-muted rounded text-sm">
                        <strong>Explanation:</strong> {evaluation.reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Interface */}
            {showChat && task.chatId && (
              <div className="border rounded-lg h-[400px]">
                <TaskChatInterface
                  chatId={task.chatId}
                  word={word.word}
                  meaning={word.meaning}
                  example={word.example}
                  initialMessages={chatMessages}
                  onNewMessage={handleNewChatMessage}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Word information not available
          </div>
        )}

        <DialogFooter className="flex flex-wrap gap-2">
          {!evaluation && !isCompleted && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting || !word}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Evaluating...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          )}

          {evaluation && !showChat && (
            <>
              {evaluation.result === 'FAIL' && (
                <Button variant="outline" onClick={handleRetry}>
                  Try Again
                </Button>
              )}
              {task.type !== 'MCQ' && evaluation.chatId && (
                <Button variant="outline" onClick={handleContinueChat}>
                  Continue Chat
                </Button>
              )}
              {!isCompleted && (
                <Button
                  onClick={handleCompleteTask}
                  disabled={completing}
                  variant={evaluation.result === 'PASS' ? 'default' : 'destructive'}
                >
                  {completing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Completing...
                    </>
                  ) : (
                    'Complete Task'
                  )}
                </Button>
              )}
            </>
          )}

          {showChat && (
            <Button variant="outline" onClick={() => setShowChat(false)}>
              Back to Task
            </Button>
          )}

          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
