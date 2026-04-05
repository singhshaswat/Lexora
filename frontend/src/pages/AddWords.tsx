import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { wordsApi, type WordResponse } from '@/api/words'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, ChevronLeft, ChevronRight, Info, X, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'

const wordSchema = z.object({
  word: z.string().min(1, 'Word is required'),
  meaning: z.string().min(1, 'Meaning is required'),
  example: z.string().min(1, 'Example is required'),
})

type WordFormValues = z.infer<typeof wordSchema>

const AddWords = () => {
  const [words, setWords] = useState<WordResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedWord, setSelectedWord] = useState<WordResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null)
  const [stateFilter, setStateFilter] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const wordsPerPage = 15

  const form = useForm<WordFormValues>({
    resolver: zodResolver(wordSchema),
    defaultValues: {
      word: '',
      meaning: '',
      example: '',
    },
  })

  // Fetch all words
  const fetchWords = async () => {
    try {
      setLoading(true)
      const data = await wordsApi.getAllWords()
      setWords(data)
    } catch (error: any) {
      console.error('Error fetching words:', error)
      toast.error(error.response?.data?.detail || 'Failed to fetch words')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWords()
  }, [])

  // Get today's word count
  const getTodayWordCount = (words: WordResponse[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return words.filter(word => {
      const wordDate = new Date(word.createdAt)
      wordDate.setHours(0, 0, 0, 0)
      return wordDate.getTime() === today.getTime()
    }).length
  }

  const todayWordCount = useMemo(() => getTodayWordCount(words), [words])
  const canAddMoreWords = todayWordCount < 3

  // Filter words
  const filteredWords = useMemo(() => {
    let filtered = [...words]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        w =>
          w.word.toLowerCase().includes(query) ||
          w.meaning.toLowerCase().includes(query)
      )
    }

    // Priority filter
    if (priorityFilter !== null) {
      filtered = filtered.filter(w => w.priority === priorityFilter)
    }

    // State filter
    if (stateFilter) {
      filtered = filtered.filter(w => w.state === stateFilter)
    }

    return filtered
  }, [words, searchQuery, priorityFilter, stateFilter])

  // Pagination
  const totalPages = Math.ceil(filteredWords.length / wordsPerPage)
  const paginatedWords = useMemo(() => {
    const startIndex = (currentPage - 1) * wordsPerPage
    return filteredWords.slice(startIndex, startIndex + wordsPerPage)
  }, [filteredWords, currentPage])

  // Handle form submission
  const onSubmit = async (data: WordFormValues) => {
    if (!canAddMoreWords) {
      toast.error('You have reached the daily limit of 3 words. Please try again tomorrow.')
      return
    }

    try {
      setIsSubmitting(true)
      const wordData = {
        ...data,
        priority: 1, // Always set to 1
      }
      await wordsApi.createWord(wordData)
      toast.success('Word added successfully!')
      setIsDialogOpen(false)
      form.reset()
      await fetchWords() // Refresh the list
    } catch (error: any) {
      console.error('Error creating word:', error)
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to create word'
      
      // Check for duplicate word error
      if (
        error.response?.status === 400 ||
        errorMessage.toLowerCase().includes('duplicate')
      ) {
        toast.error('This word already exists in your vocabulary.')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle word click
  const handleWordClick = (word: WordResponse) => {
    setSelectedWord(word)
    setIsDetailDialogOpen(true)
  }

  // Handle delete word
  const handleDeleteWord = async (wordId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering word detail dialog
    
    if (!confirm('Are you sure you want to delete this word?')) {
      return
    }

    try {
      setIsDeleting(wordId)
      await wordsApi.deleteWord(wordId)
      toast.success('Word deleted successfully!')
      await fetchWords() // Refresh the list
    } catch (error: any) {
      console.error('Error deleting word:', error)
      toast.error(error.response?.data?.detail || 'Failed to delete word')
    } finally {
      setIsDeleting(null)
    }
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return 'Invalid date'
    }
  }

  return (
    <div className="container mx-auto p-4 mt-8 sm:p-6 lg:p-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Add Words</h1>
            <p className="text-muted-foreground mt-1">
              Build your vocabulary one word at a time
            </p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            disabled={!canAddMoreWords}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Word
          </Button>
        </div>

        {/* Daily limit message */}
        {!canAddMoreWords && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Daily limit reached
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                You have already added 3 words today. You can add more words tomorrow.
              </p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search words or meanings..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // Reset to first page on search
              }}
              className="pl-10"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Priority filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground">Priority:</span>
              <Button
                variant={priorityFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setPriorityFilter(null)
                  setCurrentPage(1)
                }}
              >
                All
              </Button>
              {[1, 2, 3, 4].map(priority => (
                <Button
                  key={priority}
                  variant={priorityFilter === priority ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPriorityFilter(priority)
                    setCurrentPage(1)
                  }}
                >
                  {priority}
                </Button>
              ))}
            </div>

            {/* State filters */}
            <div className="flex flex-wrap gap-2 items-center ml-0 sm:ml-4">
              <span className="text-sm font-medium text-muted-foreground">State:</span>
              <Button
                variant={stateFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStateFilter(null)
                  setCurrentPage(1)
                }}
              >
                All
              </Button>
              {['ACTIVE', 'MASTERED'].map(state => (
                <Button
                  key={state}
                  variant={stateFilter === state ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStateFilter(state)
                    setCurrentPage(1)
                  }}
                >
                  {state}
                </Button>
              ))}
            </div>

            {/* Clear filters */}
            {(searchQuery || priorityFilter !== null || stateFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setPriorityFilter(null)
                  setStateFilter(null)
                  setCurrentPage(1)
                }}
                className="ml-auto"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Word List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : paginatedWords.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {filteredWords.length === 0 && words.length === 0
                ? 'No words yet. Start building your vocabulary!'
                : 'No words match your filters.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedWords.map(word => (
                <div
                  key={word.id}
                  onClick={() => handleWordClick(word)}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors relative"
                >
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={(e) => handleDeleteWord(word.id, e)}
                    disabled={isDeleting === word.id}
                  >
                    {isDeleting === word.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                  <h3 className="font-semibold text-lg mb-2 pr-8">{word.word}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {word.meaning}
                  </p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * wordsPerPage + 1} to{' '}
                  {Math.min(currentPage * wordsPerPage, filteredWords.length)} of{' '}
                  {filteredWords.length} words
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Word Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={open => {
          setIsDialogOpen(open)
          if (!open) {
            form.reset()
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Word</DialogTitle>
            <DialogDescription>
              Add a new word to your vocabulary. You can add up to 3 words per day.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!canAddMoreWords && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  You have reached today's limit of 3 words. Please try again tomorrow.
                </div>
              )}

              <FormField
                control={form.control}
                name="word"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Word</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., example"
                        {...field}
                        disabled={!canAddMoreWords}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meaning"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meaning</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the meaning of the word..."
                        {...field}
                        disabled={!canAddMoreWords}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="example"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Example</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter an example sentence..."
                        {...field}
                        disabled={!canAddMoreWords}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canAddMoreWords || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Word'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Word Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedWord?.word}</DialogTitle>
            <DialogDescription>Word details and statistics</DialogDescription>
          </DialogHeader>

          {selectedWord && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Meaning</h4>
                <p className="text-muted-foreground">{selectedWord.meaning}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example</h4>
                <p className="text-muted-foreground italic">
                  "{selectedWord.example}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Priority</h4>
                  <p className="text-muted-foreground">{selectedWord.priority}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">State</h4>
                  <p className="text-muted-foreground">{selectedWord.state}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Mastery Count</h4>
                  <p className="text-muted-foreground">
                    {selectedWord.masteryCount}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Normalized Word</h4>
                  <p className="text-muted-foreground">
                    {selectedWord.normalizedWord}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Failure Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Meaning</p>
                    <p className="font-medium">
                      {selectedWord.failureStats.meaning}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sentence</p>
                    <p className="font-medium">
                      {selectedWord.failureStats.sentence}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paragraph</p>
                    <p className="font-medium">
                      {selectedWord.failureStats.paragraph}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Created At</h4>
                  <p className="text-muted-foreground text-sm">
                    {formatDate(selectedWord.createdAt)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Updated At</h4>
                  <p className="text-muted-foreground text-sm">
                    {formatDate(selectedWord.updatedAt)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Last Reviewed</h4>
                  <p className="text-muted-foreground text-sm">
                    {formatDate(selectedWord.lastReviewedAt)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Last Promoted</h4>
                  <p className="text-muted-foreground text-sm">
                    {formatDate(selectedWord.lastPromotedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AddWords
