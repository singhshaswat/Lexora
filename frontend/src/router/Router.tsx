import { Route, Routes } from 'react-router-dom'
import Login from '@/pages/Auth/Login'
import Signup from '@/pages/Auth/Signup'
import VerifyEmail from '@/pages/Auth/VerifyEmail'
import ForgotPassword from '@/pages/Auth/ForgotPassword'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import DashboardLayout from '@/layouts/DashboardLayout'
import Dashboard from '@/pages/Dashboard'
import AddWords from '@/pages/AddWords'
import TodaysTasks from '@/pages/TodaysTasks'
import ChatHistory from '@/pages/ChatHistory'
import MyProfile from '@/pages/MyProfile'
import Admin from '@/pages/Admin'
import Landing from '@/pages/Landing'

// 404 page
const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-8">Page not found</p>
        <a href="/" className="text-primary hover:underline">Go home</a>
      </div>
    </div>
  )
}

const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/today-tasks" element={<TodaysTasks />} />
        <Route path="/add-words" element={<AddWords />} />
        <Route path="/chat-history" element={<ChatHistory />} />
        <Route path="/my-profile" element={<MyProfile />} />
      </Route>
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default Router
