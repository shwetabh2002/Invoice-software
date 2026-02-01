'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  FilePlus, 
  CreditCard, 
  Package, 
  Settings, 
  LogOut,
  Menu,
  X,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Quotations', href: '/quotes', icon: FilePlus },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Get auth state - will rehydrate from localStorage after mount
  const user = useAuthStore((state) => state.user)
  const company = useAuthStore((state) => state.company)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const logout = useAuthStore((state) => state.logout)
  const fetchUser = useAuthStore((state) => state.fetchUser)

  // Set mounted after component mounts (client-side only)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check auth after mount - only run once when mounted changes
  useEffect(() => {
    if (!mounted) return

    // Create abort controller for cleanup
    const abortController = new AbortController()
    let redirectTimeout: NodeJS.Timeout | null = null

    if (!isAuthenticated) {
      // Small delay to prevent flash during hydration
      redirectTimeout = setTimeout(() => {
        if (!abortController.signal.aborted) {
          router.push('/login')
        }
      }, 100)
    } else if (!user) {
      // Only fetch user if we don't have user data yet
      fetchUser()
    }

    return () => {
      abortController.abort()
      if (redirectTimeout) clearTimeout(redirectTimeout)
    }
  }, [mounted, isAuthenticated]) // Removed router and fetchUser from deps - they're stable

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // Show loading while waiting for client-side mount and auth check
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect happening
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/" className="flex items-center space-x-2 min-w-0">
              <div 
                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: company?.branding?.primaryColor || '#2563eb' }}
              >
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {company?.name || 'Dashboard'}
              </span>
            </Link>
            <button 
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <item.icon className="mr-3 h-5 w-5 text-gray-400" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ 
                  background: `linear-gradient(135deg, ${company?.branding?.primaryColor || '#3b82f6'}, ${company?.branding?.accentColor || '#8b5cf6'})`
                }}
              >
                {user?.profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.profile?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Powered by footer */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 text-center">
              Powered by <span className="font-medium text-blue-600">Girjasoft</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          {/* Add header actions here */}
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
