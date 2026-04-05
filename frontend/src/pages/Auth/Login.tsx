import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { authApi } from '@/api/auth'
import { setAccessToken, setUserData } from '@/store/slices/authSlice'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import ThemeToggle from '@/components/ThemeToggle'

const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get success message from navigation state (after signup)
  const successMessage = location.state?.message

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.login(data)
      // Store access token in Redux
      dispatch(setAccessToken(response.access_token))
      dispatch(setUserData({ 
        email: response.email,
        firstName: response.firstName || null,
        lastName: response.lastName || null,
        isAdmin: response.isAdmin || false
      }))
      // Redirect based on admin status
      if (response.isAdmin) {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.response?.data?.message || 'Invalid email or password'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="fixed top-4 right-4 z-40">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-foreground">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-muted-foreground">
            Or{' '}
            <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="space-y-2">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
                {(error.toLowerCase().includes('email not verified') || error.toLowerCase().includes('verify your email')) && (
                  <div className="text-center">
                    <Link
                      to={`/verify-email?email=${encodeURIComponent(form.getValues('email'))}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline"
                    >
                      Verify your email
                    </Link>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        to="/forgot-password"
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default Login
