import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { ChatMessage } from '@/api/tutor'
import { tutorApi } from '@/api/tutor'
import { toast } from 'react-toastify'

interface TaskChatInterfaceProps {
  chatId: string | null
  word: string
  meaning: string
  example: string
  initialMessages?: ChatMessage[]
  onNewMessage?: (message: ChatMessage) => void
}

export default function TaskChatInterface({
  chatId,
  word,
  meaning,
  example,
  initialMessages = [],
  onNewMessage,
}: TaskChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isWordInfoExpanded, setIsWordInfoExpanded] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevChatIdRef = useRef<string | null>(chatId)
  const hasStartedChatting = useRef(false)

  // Only sync with initialMessages on mount or when chatId changes
  // Once user starts chatting, ignore initialMessages updates to prevent overwriting local messages
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      // Chat ID changed, reset everything
      setMessages(initialMessages)
      prevChatIdRef.current = chatId
      hasStartedChatting.current = false
    } else if (!hasStartedChatting.current && initialMessages.length > 0 && messages.length === 0) {
      // Initial load - only set if we don't have messages yet
      setMessages(initialMessages)
    }
  }, [chatId, initialMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim() || !chatId || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
    }

    // Mark that we've started chatting (so we don't overwrite with initialMessages)
    hasStartedChatting.current = true
    
    // Add user message locally
    setMessages((prev) => [...prev, userMessage])
    // Also notify parent so it's in sync
    onNewMessage?.(userMessage)
    
    const messageContent = input.trim()
    setInput('')
    setLoading(true)

    try {
      const response = await tutorApi.continueChat(chatId, messageContent)
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.feedback,
      }

      // Add assistant message locally
      setMessages((prev) => [...prev, assistantMessage])
      // Notify parent
      onNewMessage?.(assistantMessage)
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.response?.data?.detail || 'Failed to send message')
      // Remove the user message on error (both locally and from parent if possible)
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Word Context Header - Collapsible */}
      <div className="border-b bg-muted/50">
        <button
          onClick={() => setIsWordInfoExpanded(!isWordInfoExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/70 transition-colors"
        >
          <h3 className="font-semibold text-lg">{word}</h3>
          {isWordInfoExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        {isWordInfoExpanded && (
          <div className="px-4 pb-4 pt-0 space-y-1">
            <p className="text-sm text-muted-foreground">{meaning}</p>
            <p className="text-sm italic text-muted-foreground">
              Example: "{example}"
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Start a conversation about this word</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this word..."
            disabled={!chatId || loading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !chatId || loading}
            size="icon"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
