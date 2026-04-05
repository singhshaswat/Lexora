import { useState, useEffect } from 'react'
import { dashboardApi, type DashboardResponse } from '@/api/dashboard'
import { Loader2, CheckCircle2, XCircle, BookOpen, Calendar } from 'lucide-react'
import { toast } from 'react-toastify'

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const data = await dashboardApi.getDashboardData()
      setDashboardData(data)
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error)
      toast.error(error.response?.data?.detail || 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const data = dashboardData || {
    passCount: 0,
    failCount: 0,
    wordsMasteredCount: 0,
    recentlyAddedWords: [],
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your vocabulary app!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pass Count Card */}
          <div className="bg-card border rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Passed</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {data.passCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Fail Count Card */}
          <div className="bg-card border rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Failed</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {data.failCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Words Mastered Card */}
          <div className="bg-card border rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Words Mastered</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {data.wordsMasteredCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Recently Added Words Section */}
        <div className="bg-card border rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-1">Recently Added Words</h2>
            <p className="text-sm text-muted-foreground">
              Your last 5 words added to your vocabulary
            </p>
          </div>

          {data.recentlyAddedWords.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No words added yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start building your vocabulary by adding your first word!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentlyAddedWords.map((word) => (
                <div
                  key={word.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{word.word}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          Priority {word.priority}
                        </span>
                        {word.state === 'MASTERED' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                            Mastered
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{word.meaning}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Added {formatDate(word.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
