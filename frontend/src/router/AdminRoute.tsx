import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { Navigate } from 'react-router-dom'
import type { JSX } from 'react'

interface AdminRouteProps {
  children: JSX.Element
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const token = useSelector((state: RootState) => state.auth.accessToken)
  const isAdmin = useSelector((state: RootState) => state.auth.isAdmin)
  const isInitialized = useSelector((state: RootState) => state.auth.isInitialized)

  // Wait for auth initialization before checking
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

  // If not admin, redirect to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default AdminRoute
