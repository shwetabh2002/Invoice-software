'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'
import { Toaster } from '@/components/ui/toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,      // Data fresh for 30 seconds
        gcTime: 5 * 60 * 1000,     // Cache garbage collected after 5 minutes (renamed from cacheTime)
        retry: (failureCount, error: any) => {
          // Don't retry on 401/403 errors
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            return false
          }
          // Retry up to 2 times for other errors
          return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        refetchOnWindowFocus: false,  // Disable auto-refetch on window focus
        refetchOnReconnect: true,     // Refetch on network reconnect
      },
      mutations: {
        retry: false,  // Don't auto-retry mutations
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
