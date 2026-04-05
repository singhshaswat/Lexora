import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authApi } from '@/api/auth'
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

const verifyOtpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
})

type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>

const VerifyEmail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const emailFromQuery = searchParams.get('email') || ''
  
  // Get success message from navigation state (after signup)
  const signupMessage = location.state?.message
  
  const [email, setEmail] = useState(emailFromQuery)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const form = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      otp: '',
    },
  })

  useEffect(() => {
    if (!email && !emailFromQuery) {
      // If no email provided, redirect to login
      navigate('/login')
    }
  }, [email, emailFromQuery, navigate])

  const handleVerify = async (data: VerifyOtpFormValues) => {
    if (!email) {
      setError('Email is required')
      return
    }

    setIsVerifying(true)
    setError(null)
    setSuccess(null)

    try {
      await authApi.verifyOtp({
        email,
        otp: data.otp,
      })
      setSuccess('Email verified successfully! You can now login.')
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { state: { message: 'Email verified successfully! Please login.' } })
      }, 2000)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.response?.data?.message || 'Invalid OTP. Please try again.'
      )
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError('Email is required')
      return
    }

    setIsResending(true)
    setError(null)
    setResendSuccess(false)

    try {
      await authApi.resendVerification({ email })
      setResendSuccess(true)
      setSuccess('Verification email sent successfully! Please check your inbox.')
      // Clear success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false)
        setSuccess(null)
      }, 5000)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.response?.data?.message || 'Failed to resend verification email'
      )
    } finally {
      setIsResending(false)
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
            Verify Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-muted-foreground">
            Enter the 6-digit OTP sent to your email address
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleVerify)} className="mt-8 space-y-6">
            {signupMessage && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
                {signupMessage}
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {resendSuccess && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-4 py-3 rounded">
                Verification email sent! Please check your inbox.
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!emailFromQuery}
                />
                {emailFromQuery && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {signupMessage ? 'Email is set from signup' : 'Email is set from the login page'}
                  </p>
                )}
              </div>
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OTP Code</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        {...field}
                        onChange={(e) => {
                          // Only allow numbers
                          const value = e.target.value.replace(/\D/g, '')
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the 6-digit code sent to your email
                    </p>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-3">
              <Button type="submit" className="w-full" disabled={isVerifying || !email}>
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={isResending || !email}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            </div>
            
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default VerifyEmail
