import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThemeToggle from '@/components/ThemeToggle'
import {
  BookOpen,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Zap,
  Brain,
  Target,
  MessageSquare,
  ListChecks,
  GraduationCap,
  TrendingUp,
  Clock,
} from 'lucide-react'

const Landing = () => {
  const navigate = useNavigate()
  const accessToken = useSelector((state: RootState) => state.auth.accessToken)

  const features = [
    {
      id: 'daily-tasks',
      title: 'Daily Tasks',
      description: 'Automatically generated tasks every day to keep your learning consistent and engaging',
      icon: ListChecks,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      id: 'priority-learning',
      title: 'Priority-Based Learning',
      description: 'Words progress through 4 priority levels based on your performance and mastery',
      icon: Target,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      id: 'ai-tutor',
      title: 'AI Tutor',
      description: 'Chat with an intelligent AI tutor for personalized learning assistance and explanations',
      icon: MessageSquare,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      id: 'word-management',
      title: 'Word Management',
      description: 'Add, organize, and track your vocabulary words with custom meanings and examples',
      icon: BookOpen,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    },
    {
      id: 'ai-evaluation',
      title: 'AI-Powered Evaluation',
      description: 'Get intelligent feedback on your responses with hints and detailed explanations',
      icon: Sparkles,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    },
    {
      id: 'task-types',
      title: 'Diverse Task Types',
      description: 'Practice with MEANING, SENTENCE, MCQ, and PARAGRAPH tasks for comprehensive learning',
      icon: GraduationCap,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
    },
    {
      id: 'progress-tracking',
      title: 'Progress Tracking',
      description: 'Monitor your learning journey with detailed statistics and mastery counts',
      icon: TrendingUp,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
    {
      id: 'mastery-system',
      title: 'Mastery System',
      description: 'Mark words as mastered after successful completion and track your achievements',
      icon: Brain,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
  ]

  const howItWorks = [
    {
      step: 1,
      title: 'Add Your Words',
      description: 'Start by adding vocabulary words to your collection with meanings and examples.',
      icon: BookOpen,
    },
    {
      step: 2,
      title: 'Get Daily Tasks',
      description: 'Receive up to 8 automatically generated tasks every day based on word priorities.',
      icon: ListChecks,
    },
    {
      step: 3,
      title: 'Complete Tasks',
      description: 'Practice with different task types: meaning, sentences, MCQs, and paragraphs.',
      icon: CheckCircle,
    },
    {
      step: 4,
      title: 'AI Evaluation & Learning',
      description: 'Get instant AI feedback, hints, and chat with your tutor for deeper understanding.',
      icon: Sparkles,
    },
  ]

  const benefits = [
    {
      icon: Zap,
      title: 'Save Time',
      description: 'Automated daily task generation means you always know what to study next',
      color: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      icon: Brain,
      title: 'Smart Learning',
      description: 'Priority-based system ensures you focus on words that need the most practice',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered',
      description: 'Get intelligent evaluation and personalized tutoring from advanced AI',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: Target,
      title: 'Comprehensive Practice',
      description: 'Multiple task types ensure you master words in different contexts',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: Clock,
      title: 'Daily Consistency',
      description: 'Build a learning habit with automatically scheduled daily tasks',
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Monitor your vocabulary growth with detailed statistics and mastery tracking',
      color: 'text-pink-600 dark:text-pink-400',
    },
  ]

  const handleGetStarted = () => {
    if (accessToken) {
      navigate('/dashboard')
    } else {
      navigate('/signup')
    }
  }

  const handleLogin = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                Reverba
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <Button
                variant="ghost"
                onClick={handleLogin}
                className="hidden sm:inline-flex"
              >
                Login
              </Button>
              <Button
                onClick={handleGetStarted}
                size="sm"
                className="text-xs sm:text-base w-28 sm:w-auto flex items-center justify-center"
              >
                <p className="w-full text-center">{accessToken ? 'Go to Dashboard' : 'Get Started'}</p>
                <ArrowRight className="ml-2 h-4 w-4 hidden sm:block" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block mb-4 px-4 py-1.5 bg-linear-to-br from-blue-500/10 to-purple-500/10 rounded-full border border-blue-500/20">
            <span className="text-sm font-semibold bg-linear-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI-Powered Vocabulary Learning
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-white dark:via-blue-200 dark:to-white bg-clip-text text-transparent leading-tight">
            Master New Words with AI
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Learn vocabulary through personalized daily tasks, AI-powered evaluation, and interactive tutoring. Build your vocabulary systematically with our priority-based learning system.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 justify-center items-center w-full sm:w-auto">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="w-full sm:w-auto min-w-[200px] sm:min-w-[220px] md:min-w-[240px] text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 h-auto"
            >
              {accessToken ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={handleLogin}
              size="lg"
              className="w-full sm:w-auto min-w-[200px] sm:min-w-[220px] md:min-w-[240px] text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 h-auto"
            >
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            Comprehensive Learning Features
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Everything you need to build and master your vocabulary systematically
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.id}
                className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-primary/50"
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-100/50 dark:bg-slate-900/50 py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Start mastering vocabulary in just a few simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {howItWorks.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.step} className="relative">
                  <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-xl font-bold text-primary">{step.step}</span>
                        </div>
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">
                        {step.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ArrowRight className="h-6 w-6 text-slate-400" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            Why Choose Reverba?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Everything you need for effective vocabulary learning
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${benefit.color}`} />
                    </div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-linear-to-br from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white">
              Ready to Build Your Vocabulary?
            </h2>
            <p className="text-lg sm:text-xl text-blue-100 mb-8 leading-relaxed">
              Join learners who use Reverba to master new words and expand their vocabulary systematically
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 justify-center items-center w-full sm:w-auto">
              <Button
                onClick={handleGetStarted}
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto min-w-[200px] sm:min-w-[220px] md:min-w-[240px] text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 h-auto bg-white text-blue-600 hover:bg-slate-100"
              >
                {accessToken ? 'Go to Dashboard' : 'Get Started Free'}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                onClick={handleLogin}
                size="lg"
                variant="outline"
                className="w-full sm:w-auto min-w-[200px] sm:min-w-[220px] md:min-w-[240px] text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 h-auto border-white text-white bg-transparent hover:bg-white/10 dark:bg-transparent dark:hover:bg-white/10"
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Reverba</h3>
              </div>
              <p className="text-sm text-slate-400">
                AI-powered vocabulary learning platform for systematic word mastery.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Features</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => accessToken && navigate('/today-tasks')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Today's Tasks
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => accessToken && navigate('/add-words')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Add Words
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => accessToken && navigate('/chat-history')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Chat History
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Account</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={handleLogin}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Login
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleGetStarted}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Sign Up
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Dashboard</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => accessToken && navigate('/dashboard')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    View Dashboard
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => accessToken && navigate('/my-profile')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    My Profile
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>&copy; {new Date().getFullYear()} Reverba. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
