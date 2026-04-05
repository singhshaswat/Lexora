import { useState, useEffect } from 'react'
import { tutorApi, type ChatListItem } from '@/api/tutor'
import ChatHistoryDialog from '@/components/ChatHistoryDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, MessageSquare, Calendar } from 'lucide-react'
import { toast } from 'react-toastify'

export default function ChatHistory() {
  const [chats, setChats] = useState<ChatListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    try {
      setLoading(true)
      const data = await tutorApi.listChats(50, 0)
      setChats(data)
    } catch (error: any) {
      console.error('Error fetching chats:', error)
      toast.error(error.response?.data?.detail || 'Failed to fetch chat history')
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (chatId: string) => {
    setSelectedChatId(chatId)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedChatId(null)
  }

  const getTaskTypeLabel = (type: ChatListItem['taskType']) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading chat history...</p>
        </div>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4">Chat History</h1>
          <p className="text-muted-foreground mb-4">
            No chat history yet. Complete some tasks to see your conversations here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Chat History</h1>
          <p className="text-muted-foreground">
            View and continue your conversations with the AI tutor
          </p>
        </div>

        {/* Chats List */}
        <div className="space-y-4">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="border rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer bg-card"
              onClick={() => handleChatClick(chat.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Word and Badges - Wrap on mobile */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg sm:text-xl">{chat.word}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {getTaskTypeLabel(chat.taskType)}
                      </Badge>
                      <Badge
                        variant={chat.finalResult === 'PASS' ? 'success' : 'destructive'}
                        className="text-xs"
                      >
                        {chat.finalResult}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Meaning */}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {chat.meaning}
                  </p>
                  
                  {/* Metadata - Stack on mobile, row on larger screens */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span>{chat.messageCount} {chat.messageCount === 1 ? 'message' : 'messages'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{formatDate(chat.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Button - Full width on mobile, auto on larger screens */}
                <div className="shrink-0 sm:self-start">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChatClick(chat.id)
                    }}
                  >
                    View Chat
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Dialog */}
        {selectedChatId && (
          <ChatHistoryDialog
            chatId={selectedChatId}
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
          />
        )}
      </div>
    </div>
  )
}
