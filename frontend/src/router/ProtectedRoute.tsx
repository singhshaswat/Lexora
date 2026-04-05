import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { Navigate } from 'react-router-dom'
import type { JSX } from 'react'

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = useSelector((state: RootState) => state.auth.accessToken)
  const isInitialized = useSelector((state: RootState) => state.auth.isInitialized)
  const isAdmin = useSelector((state: RootState) => state.auth.isAdmin)

  // Wait for auth initialization before checking token
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

  // If not authenticated, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // If admin, redirect to admin dashboard (admins shouldn't access user routes)
  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return children
}

export default ProtectedRoute
