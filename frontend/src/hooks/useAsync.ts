'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  isSuccess: boolean
}

interface UseAsyncOptions {
  immediate?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
  retryCount?: number
  retryDelay?: number
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const { immediate = false, onSuccess, onError, retryCount = 0, retryDelay = 1000 } = options
  
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
    isSuccess: false
  })
  
  const retriesRef = useRef(0)
  const mountedRef = useRef(true)

  const execute = useCallback(async () => {
    if (!mountedRef.current) return
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await asyncFunction()
      
      if (mountedRef.current) {
        setState({ data: result, isLoading: false, error: null, isSuccess: true })
        retriesRef.current = 0
        onSuccess?.(result)
      }
      
      return result
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred'
      
      if (mountedRef.current) {
        // Retry logic
        if (retriesRef.current < retryCount) {
          retriesRef.current++
          setTimeout(() => {
            execute()
          }, retryDelay * retriesRef.current)
          return
        }
        
        setState({ data: null, isLoading: false, error: errorMessage, isSuccess: false })
        onError?.(errorMessage)
      }
      
      throw err
    }
  }, [asyncFunction, onSuccess, onError, retryCount, retryDelay])

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null, isSuccess: false })
    retriesRef.current = 0
  }, [])

  useEffect(() => {
    mountedRef.current = true
    
    if (immediate) {
      execute()
    }
    
    return () => {
      mountedRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    execute,
    reset,
    retry: execute
  }
}

// Hook for mutations (POST, PUT, DELETE)
export function useMutation<T, P = any>(
  mutationFn: (params: P) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void
    onError?: (error: string) => void
  } = {}
) {
  const [state, setState] = useState({
    data: null as T | null,
    isLoading: false,
    error: null as string | null,
    isSuccess: false
  })

  const mountedRef = useRef(true)

  const mutate = useCallback(async (params: P) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, isSuccess: false }))
    
    try {
      const result = await mutationFn(params)
      
      if (mountedRef.current) {
        setState({ data: result, isLoading: false, error: null, isSuccess: true })
        options.onSuccess?.(result)
      }
      
      return result
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred'
      
      if (mountedRef.current) {
        setState({ data: null, isLoading: false, error: errorMessage, isSuccess: false })
        options.onError?.(errorMessage)
      }
      
      throw err
    }
  }, [mutationFn, options])

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null, isSuccess: false })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    ...state,
    mutate,
    reset
  }
}

// Debounced value hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
