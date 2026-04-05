import api from './axios'

export interface SignupData {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginData {
  email: string
  password: string
}

export interface SignupResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  isAdmin: boolean
  isRevoked: boolean
  is_verified: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
  email: string
  firstName: string
  lastName: string
  isAdmin?: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
  email: string
  firstName: string
  lastName: string
  isAdmin?: boolean
}

export interface ProfileUpdateData {
  firstName: string
  lastName: string
}

export interface PasswordChangeData {
  currentPassword: string
  newPassword: string
}

export interface VerifyOtpData {
  email: string
  otp: string
}

export interface VerifyOtpResponse {
  message: string
  email: string
}

export interface ResendVerificationData {
  email: string
}

export interface ResendVerificationResponse {
  message: string
  email: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
  email: string
}

export interface VerifyPasswordResetOtpData {
  email: string
  otp: string
}

export interface VerifyPasswordResetOtpResponse {
  message: string
  email: string
}

export interface ResetPasswordData {
  email: string
  new_password: string
}

export interface ResetPasswordResponse {
  message: string
  email: string
}

export interface RequestEmailChangeResponse {
  message: string
  email: string
}

export interface VerifyEmailChangeOtpData {
  otp: string
}

export interface VerifyEmailChangeOtpResponse {
  message: string
  email: string
}

export interface RequestNewEmailData {
  new_email: string
}

export interface RequestNewEmailResponse {
  message: string
  email: string
}

export interface VerifyNewEmailOtpData {
  new_email: string
  otp: string
}

export interface VerifyNewEmailOtpResponse {
  message: string
  email: string
}

export const authApi = {
  signup: async (data: SignupData): Promise<SignupResponse> => {
    const response = await api.post<SignupResponse>('/api/auth/register', data)
    return response.data
  },

  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', data)
    return response.data
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/api/auth/logout')
    return response.data
  },

  updateProfile: async (data: ProfileUpdateData): Promise<SignupResponse> => {
    const response = await api.put<SignupResponse>('/api/auth/profile', data)
    return response.data
  },

  changePassword: async (data: PasswordChangeData): Promise<{ message: string }> => {
    const response = await api.put<{ message: string }>('/api/auth/password', data)
    return response.data
  },

  verifyOtp: async (data: VerifyOtpData): Promise<VerifyOtpResponse> => {
    const response = await api.post<VerifyOtpResponse>('/api/auth/verify-otp', data)
    return response.data
  },

  resendVerification: async (data: ResendVerificationData): Promise<ResendVerificationResponse> => {
    const response = await api.post<ResendVerificationResponse>('/api/auth/resend-verification', data)
    return response.data
  },

  forgotPassword: async (data: ForgotPasswordData): Promise<ForgotPasswordResponse> => {
    const response = await api.post<ForgotPasswordResponse>('/api/auth/forgot-password', data)
    return response.data
  },

  verifyPasswordResetOtp: async (data: VerifyPasswordResetOtpData): Promise<VerifyPasswordResetOtpResponse> => {
    const response = await api.post<VerifyPasswordResetOtpResponse>('/api/auth/verify-password-reset-otp', data)
    return response.data
  },

  resetPassword: async (data: ResetPasswordData): Promise<ResetPasswordResponse> => {
    const response = await api.post<ResetPasswordResponse>('/api/auth/reset-password', data)
    return response.data
  },

  requestEmailChange: async (): Promise<RequestEmailChangeResponse> => {
    const response = await api.post<RequestEmailChangeResponse>('/api/auth/request-email-change')
    return response.data
  },

  verifyEmailChangeOtp: async (data: VerifyEmailChangeOtpData): Promise<VerifyEmailChangeOtpResponse> => {
    const response = await api.post<VerifyEmailChangeOtpResponse>('/api/auth/verify-email-change-otp', data)
    return response.data
  },

  requestNewEmail: async (data: RequestNewEmailData): Promise<RequestNewEmailResponse> => {
    const response = await api.post<RequestNewEmailResponse>('/api/auth/request-new-email', data)
    return response.data
  },

  verifyNewEmailOtp: async (data: VerifyNewEmailOtpData): Promise<VerifyNewEmailOtpResponse> => {
    const response = await api.post<VerifyNewEmailOtpResponse>('/api/auth/verify-new-email-otp', data)
    return response.data
  },
}
