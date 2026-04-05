import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { setAccessToken, clearAccessToken, setInitialized, setUserData } from '@/store/slices/authSlice'
import axios from 'axios'
import { getBackendUrl } from '@/utils/getBackendUrl'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * AuthProvider component that initializes authentication on app load
 * If no access token is present, attempts to refresh using the refresh token cookie
 */
const AuthProvider = ({ children }: AuthProviderProps) => {
  const dispatch = useDispatch()
  const accessToken = useSelector((state: RootState) => state.auth.accessToken)
  const isInitialized = useSelector((state: RootState) => state.auth.isInitialized)

  useEffect(() => {
    const initAuth = async () => {
      // If already initialized, skip
      if (isInitialized) {
        return
      }

      // If we already have an access token, mark as initialized
      if (accessToken) {
        dispatch(setInitialized())
        return
      }

      // No access token - try to refresh using the refresh token cookie
      try {
        const response = await axios.post(
          `${getBackendUrl()}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )

        if (response.data?.access_token) {
          // Store the new access token (this also sets isInitialized)
          dispatch(setAccessToken(response.data.access_token))
          dispatch(setUserData({ 
            email: response.data.email,
            firstName: response.data.firstName || null,
            lastName: response.data.lastName || null,
            isAdmin: response.data.isAdmin || false
          }))
        } else {
          // No token in response, clear and mark as initialized
          dispatch(clearAccessToken())
        }
      } catch (error: any) {
        // Refresh failed - refresh token is invalid/expired or missing
        // This is expected if user is not logged in, so we just clear and continue
        dispatch(clearAccessToken())
      }
    }

    initAuth()
  }, []) // Only run once on mount

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Once initialized, render children
  return <>{children}</>
}

export default AuthProvider
