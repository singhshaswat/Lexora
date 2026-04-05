import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { authApi } from '@/api/auth'
import { setUserData, updateUserEmail } from '@/store/slices/authSlice'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-toastify'
import { Mail, Edit2 } from 'lucide-react'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
})

const newEmailSchema = z.object({
  new_email: z.string().email('Invalid email address'),
})

const newEmailOtpSchema = z.object({
  new_email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>
type OtpFormValues = z.infer<typeof otpSchema>
type NewEmailFormValues = z.infer<typeof newEmailSchema>
type NewEmailOtpFormValues = z.infer<typeof newEmailOtpSchema>

type EmailChangeStep = 1 | 2 | 3 | 4 | null

const MyProfile = () => {
  const dispatch = useDispatch()
  const firstName = useSelector((state: RootState) => state.auth.firstName)
  const lastName = useSelector((state: RootState) => state.auth.lastName)
  const email = useSelector((state: RootState) => state.auth.email)
  
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)

  // Email change flow state
  const [emailChangeStep, setEmailChangeStep] = useState<EmailChangeStep>(null)
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false)
  const [currentEmailForChange, setCurrentEmailForChange] = useState<string | null>(null)
  const [newEmailValue, setNewEmailValue] = useState<string>('')

  // Step 2: Current email OTP form
  const currentEmailOtpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  })

  // Step 3: New email form
  const newEmailForm = useForm<NewEmailFormValues>({
    resolver: zodResolver(newEmailSchema),
    defaultValues: {
      new_email: '',
    },
  })

  // Step 4: New email OTP form
  const newEmailOtpForm = useForm<NewEmailOtpFormValues>({
    resolver: zodResolver(newEmailOtpSchema),
    defaultValues: {
      new_email: '',
      otp: '',
    },
  })

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: firstName || '',
      lastName: lastName || '',
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  // Update form when Redux state changes
  useEffect(() => {
    const currentFirstName = profileForm.getValues('firstName')
    const currentLastName = profileForm.getValues('lastName')
    
    if ((firstName && firstName !== currentFirstName) || (lastName && lastName !== currentLastName)) {
      profileForm.reset({
        firstName: firstName || '',
        lastName: lastName || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName])

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsProfileLoading(true)
    try {
      const response = await authApi.updateProfile(data)
      dispatch(setUserData({
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
      }))
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update profile')
    } finally {
      setIsProfileLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsPasswordLoading(true)
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success('Password changed successfully!')
      passwordForm.reset()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to change password')
    } finally {
      setIsPasswordLoading(false)
    }
  }

  // Step 1: Request email change
  const handleRequestEmailChange = async () => {
    setIsRequestingEmailChange(true)
    try {
      const response = await authApi.requestEmailChange()
      setCurrentEmailForChange(response.email)
      setEmailChangeStep(2)
      toast.success('OTP sent to your current email address')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to request email change'
      toast.error(errorMessage)
    } finally {
      setIsRequestingEmailChange(false)
    }
  }

  // Step 2: Verify current email OTP
  const [isVerifyingCurrentOtp, setIsVerifyingCurrentOtp] = useState(false)
  const onCurrentEmailOtpSubmit = async (data: OtpFormValues) => {
    setIsVerifyingCurrentOtp(true)
    try {
      await authApi.verifyEmailChangeOtp({ otp: data.otp })
      setEmailChangeStep(3)
      toast.success('OTP verified. Please enter your new email address.')
      currentEmailOtpForm.reset()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Invalid or expired OTP'
      toast.error(errorMessage)
    } finally {
      setIsVerifyingCurrentOtp(false)
    }
  }

  // Step 3: Request new email
  const [isRequestingNewEmail, setIsRequestingNewEmail] = useState(false)
  const onNewEmailSubmit = async (data: NewEmailFormValues) => {
    if (data.new_email === email) {
      toast.error('New email must be different from your current email')
      return
    }
    setIsRequestingNewEmail(true)
    try {
      await authApi.requestNewEmail({ new_email: data.new_email })
      setNewEmailValue(data.new_email)
      newEmailOtpForm.reset({ new_email: data.new_email, otp: '' })
      setEmailChangeStep(4)
      toast.success('OTP sent to your new email address')
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error('Eligibility expired. Please start the email change process again.')
        setEmailChangeStep(null)
        setCurrentEmailForChange(null)
      } else {
        const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to request new email'
        toast.error(errorMessage)
      }
    } finally {
      setIsRequestingNewEmail(false)
    }
  }

  // Step 4: Verify new email OTP
  const [isVerifyingNewOtp, setIsVerifyingNewOtp] = useState(false)
  const onNewEmailOtpSubmit = async (data: NewEmailOtpFormValues) => {
    setIsVerifyingNewOtp(true)
    try {
      const response = await authApi.verifyNewEmailOtp({ new_email: data.new_email, otp: data.otp })
      dispatch(updateUserEmail({ email: response.email }))
      setEmailChangeStep(null)
      setCurrentEmailForChange(null)
      setNewEmailValue('')
      newEmailOtpForm.reset()
      toast.success('Email changed successfully! Please log in again with your new email address.')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Invalid or expired OTP'
      toast.error(errorMessage)
    } finally {
      setIsVerifyingNewOtp(false)
    }
  }

  // Ensure new_email is set in step 4 form
  useEffect(() => {
    if (emailChangeStep === 4 && newEmailValue) {
      newEmailOtpForm.reset({ new_email: newEmailValue, otp: '' })
    }
  }, [emailChangeStep, newEmailValue])

  // Close dialogs
  const closeEmailChangeDialog = () => {
    setEmailChangeStep(null)
    setCurrentEmailForChange(null)
    setNewEmailValue('')
    currentEmailOtpForm.reset()
    newEmailForm.reset()
    newEmailOtpForm.reset()
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your profile settings.</p>
        </div>

        {/* Profile Update Section */}
        <div className="bg-card border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Profile Information</h2>
            <p className="text-sm text-muted-foreground">
              Update your first and last name
            </p>
          </div>

          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button type="submit" disabled={isProfileLoading}>
                  {isProfileLoading ? 'Updating...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Password Change Section */}
        <div className="bg-card border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Change Password</h2>
            <p className="text-sm text-muted-foreground">
              Update your password to keep your account secure
            </p>
          </div>

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your current password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your new password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 6 characters long
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Email Change Section */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Email Address</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Your account email address
          </p>
          <div className="space-y-2 mb-4">
            <Label>Email</Label>
            <Input value={email || ''} disabled className="bg-muted" />
          </div>
          <Button
            variant="outline"
            onClick={handleRequestEmailChange}
            disabled={isRequestingEmailChange}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            {isRequestingEmailChange ? 'Sending OTP...' : 'Change Email'}
          </Button>

          {/* Step 2: Verify Current Email OTP Dialog */}
          <Dialog open={emailChangeStep === 2} onOpenChange={(open) => !open && closeEmailChangeDialog()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verify Current Email</DialogTitle>
                <DialogDescription>
                  Enter the OTP sent to {currentEmailForChange || email}
                </DialogDescription>
              </DialogHeader>
              <Form {...currentEmailOtpForm}>
                <form onSubmit={currentEmailOtpForm.handleSubmit(onCurrentEmailOtpSubmit)} className="space-y-4">
                  <FormField
                    control={currentEmailOtpForm.control}
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
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeEmailChangeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isVerifyingCurrentOtp}>
                      {isVerifyingCurrentOtp ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Step 3: Enter New Email Dialog */}
          <Dialog open={emailChangeStep === 3} onOpenChange={(open) => !open && closeEmailChangeDialog()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enter New Email</DialogTitle>
                <DialogDescription>
                  Enter your new email address. An OTP will be sent to verify it.
                </DialogDescription>
              </DialogHeader>
              <Form {...newEmailForm}>
                <form onSubmit={newEmailForm.handleSubmit(onNewEmailSubmit)} className="space-y-4">
                  <FormField
                    control={newEmailForm.control}
                    name="new_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="new@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeEmailChangeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isRequestingNewEmail}>
                      {isRequestingNewEmail ? 'Sending OTP...' : 'Continue'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Step 4: Verify New Email OTP Dialog */}
          <Dialog open={emailChangeStep === 4} onOpenChange={(open) => !open && closeEmailChangeDialog()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verify New Email</DialogTitle>
                <DialogDescription>
                  Enter the OTP sent to {newEmailValue}
                </DialogDescription>
              </DialogHeader>
              <Form {...newEmailOtpForm}>
                <form onSubmit={newEmailOtpForm.handleSubmit(onNewEmailOtpSubmit)} className="space-y-4">
                  <FormField
                    control={newEmailOtpForm.control}
                    name="new_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} disabled className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newEmailOtpForm.control}
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
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeEmailChangeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isVerifyingNewOtp}>
                      {isVerifyingNewOtp ? 'Verifying...' : 'Verify & Change Email'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}

export default MyProfile
