import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { clearAccessToken } from '@/store/slices/authSlice'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, ChevronLeft, LayoutDashboard, LogOut, User, CheckSquare, Plus, MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ThemeToggle from '@/components/ThemeToggle'

const DashboardLayout = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const userEmail = useSelector((state: RootState) => state.auth.email)
  const firstName = useSelector((state: RootState) => state.auth.firstName)
  const lastName = useSelector((state: RootState) => state.auth.lastName)

  const getInitials = (firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    if (userEmail) {
      // Fallback to email if name is not available
      const prefix = userEmail.split('@')[0]
      if (prefix.length >= 2) {
        return prefix.substring(0, 2).toUpperCase()
      }
      return prefix.charAt(0).toUpperCase() + 'U'
    }
    return 'US'
  }

  const getUserName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    if (firstName) {
      return firstName
    }
    return userEmail || 'User'
  }

  const handleLogout = () => {
    dispatch(clearAccessToken())
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <Sidebar
        userEmail={userEmail}
        firstName={firstName}
        lastName={lastName}
        getUserName={getUserName}
        getInitials={getInitials}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <main className={`transition-all duration-300 ${isCollapsed ? 'lg:pl-[80px]' : 'lg:pl-[300px]'}`}>
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}

const Sidebar = ({
  userEmail,
  firstName,
  lastName,
  getUserName,
  getInitials,
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
}: {
  userEmail: string | null
  firstName: string | null
  lastName: string | null
  getUserName: () => string
  getInitials: (firstName: string | null, lastName: string | null) => string
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}) => {
  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="fixed top-4 left-4 z-50 lg:hidden">
          <Button
            variant="outline"
            className="p-2 h-10 sm:h-14 text-lg flex items-center justify-center gap-2 shadow-md"
          >
            <Menu size={20} />
            <p className="hidden sm:block">See Menu</p>
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-[300px] p-0">
          <SidebarContent
            userEmail={userEmail}
            firstName={firstName}
            lastName={lastName}
            getUserName={getUserName}
            getInitials={getInitials}
            onNavigate={() => setIsOpen(false)}
            isCollapsed={false}
            onToggleCollapse={() => {}}
          />
        </SheetContent>
      </Sheet>

      <div
        className={`hidden lg:block fixed left-0 top-0 h-full border-r bg-white dark:bg-card transition-all duration-300 ${
          isCollapsed ? 'w-[80px]' : 'w-[300px]'
        }`}
      >
        <SidebarContent
          userEmail={userEmail}
          firstName={firstName}
          lastName={lastName}
          getUserName={getUserName}
          getInitials={getInitials}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>
    </>
  )
}

const SidebarContent = ({
  userEmail,
  firstName,
  lastName,
  getUserName,
  getInitials,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}: {
  userEmail: string | null
  firstName: string | null
  lastName: string | null
  getUserName: () => string
  getInitials: (firstName: string | null, lastName: string | null) => string
  onNavigate?: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}) => {
  return (
    <div className="h-full flex flex-col justify-between">
      <div className={`border-b ${isCollapsed ? 'px-2 py-4' : 'px-6 py-4'}`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2">
            <SheetHeader>
              <h1 className="text-3xl text-blue-900 dark:text-blue-100 font-normal font-heading">
                Reverba
              </h1>
            </SheetHeader>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="shrink-0"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-5 w-5 sm:block hidden" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="shrink-0"
              aria-label="Expand sidebar"
            >
              <ChevronLeft className="h-5 w-5 rotate-180 sm:block hidden" />
            </Button>
            <h1 className="text-2xl text-blue-900 dark:text-blue-100 font-normal font-heading">
              RE
            </h1>
          </div>
        )}
      </div>

      <nav className={`flex-1 ${isCollapsed ? 'px-2 py-4' : 'px-6 py-4'}`}>
        <ul className="space-y-4">
          <li>
            <Button
              asChild
              variant="ghost"
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
              onClick={onNavigate}
              title={isCollapsed ? 'Dashboard' : undefined}
            >
              <Link to="/dashboard" className="flex items-center gap-3">
                <LayoutDashboard className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Dashboard</span>}
              </Link>
            </Button>
          </li>
          <li>
            <Button
              asChild
              variant="ghost"
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
              onClick={onNavigate}
              title={isCollapsed ? "Today's Tasks" : undefined}
            >
              <Link to="/today-tasks" className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Today's Tasks</span>}
              </Link>
            </Button>
          </li>
          <li>
            <Button
              asChild
              variant="ghost"
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
              onClick={onNavigate}
              title={isCollapsed ? 'Add Words' : undefined}
            >
              <Link to="/add-words" className="flex items-center gap-3">
                <Plus className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Add Words</span>}
              </Link>
            </Button>
          </li>
          <li>
            <Button
              asChild
              variant="ghost"
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
              onClick={onNavigate}
              title={isCollapsed ? 'Chat History' : undefined}
            >
              <Link to="/chat-history" className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Chat History</span>}
              </Link>
            </Button>
          </li>
          <li>
            <Button
              asChild
              variant="ghost"
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
              onClick={onNavigate}
              title={isCollapsed ? 'My Profile' : undefined}
            >
              <Link to="/my-profile" className="flex items-center gap-3">
                <User className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>My Profile</span>}
              </Link>
            </Button>
          </li>
        </ul>
      </nav>

      <SheetFooter
        className={`border-t ${
          isCollapsed ? 'px-2 py-4' : 'px-6 py-4'
        }`}
      >
        <div
          className={`flex items-center gap-3 w-full ${
            isCollapsed ? 'flex-col justify-center' : ''
          }`}
        >
          <Avatar className="shrink-0">
            <AvatarImage src="" />
            <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="font-medium truncate">{getUserName()}</p>
              {userEmail && (
                <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
              )}
            </div>
          )}
        </div>
      </SheetFooter>
    </div>
  )
}

export default DashboardLayout
