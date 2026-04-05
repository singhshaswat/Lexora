import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
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

// Step 1: Email schema
const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// Step 2: OTP schema
const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
})

// Step 3: Password schema
const passwordSchema = z.object({
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

type EmailFormValues = z.infer<typeof emailSchema>
type OtpFormValues = z.infer<typeof otpSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  })

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  })

  // Step 1: Submit email
  const handleEmailSubmit = async (data: EmailFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await authApi.forgotPassword({ email: data.email })
      setEmail(data.email)
      setSuccess('Password reset email sent! Please check your inbox for the OTP.')
      setStep(2)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.response?.data?.message || 'Failed to send password reset email'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleOtpSubmit = async (data: OtpFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await authApi.verifyPasswordResetOtp({
        email,
        otp: data.otp,
      })
      setSuccess('OTP verified successfully! Please set your new password.')
      setStep(3)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.response?.data?.message || 'Invalid OTP. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Reset password
  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await authApi.resetPassword({
        email,
        new_password: data.new_password,
      })
      setSuccess('Password reset successfully! Redirecting to login...')
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successfully! Please login with your new password.' } })
      }, 2000)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.response?.data?.message || 'Failed to reset password'
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
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Verify OTP'}
            {step === 3 && 'Reset Password'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-muted-foreground">
            {step === 1 && 'Enter your email address to receive a password reset OTP'}
            {step === 2 && 'Enter the 6-digit OTP sent to your email'}
            {step === 3 && 'Enter your new password'}
          </p>
        </div>

        {/* Step 1: Email */}
        {step === 1 && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="mt-8 space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
                  {success}
                </div>
              )}
              <FormField
                control={emailForm.control}
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </Button>
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
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="mt-8 space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
                  {success}
                </div>
              )}
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  OTP sent to this email
                </p>
              </div>
              <FormField
                control={otpForm.control}
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  Change Email
                </button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="mt-8 space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
                  {success}
                </div>
              )}
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <FormField
                control={passwordForm.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
