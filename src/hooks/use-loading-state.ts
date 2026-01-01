'use client'

import { useState, useCallback } from 'react'

export interface LoadingState {
  isLoading: boolean
  error: string | null
  data: any
}

export function useLoadingState<T = any>(initialData?: T) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    data: initialData || null
  })

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }))
  }, [])

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, error: null, isLoading: false }))
  }, [])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: initialData || null
    })
  }, [initialData])

  const execute = useCallback(async <R>(
    asyncFn: () => Promise<R>,
    options?: {
      onSuccess?: (data: R) => void
      onError?: (error: Error) => void
      optimisticData?: T
    }
  ): Promise<R | null> => {
    try {
      setLoading(true)
      
      // Set optimistic data if provided
      if (options?.optimisticData) {
        setState(prev => ({ 
          ...prev, 
          data: options.optimisticData, 
          isLoading: true 
        }))
      }

      const result = await asyncFn()
      
      setData(result as T)
      options?.onSuccess?.(result)
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setError(errorMessage)
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage))
      return null
    }
  }, [setLoading, setData, setError])

  return {
    ...state,
    setLoading,
    setError,
    setData,
    reset,
    execute
  }
}

/**
 * Hook for managing multiple loading states
 */
export function useMultipleLoadingStates<T extends Record<string, any>>(
  initialStates: T
) {
  const [states, setStates] = useState<Record<keyof T, LoadingState>>(
    Object.keys(initialStates).reduce((acc, key) => {
      acc[key as keyof T] = {
        isLoading: false,
        error: null,
        data: initialStates[key]
      }
      return acc
    }, {} as Record<keyof T, LoadingState>)
  )

  const setLoading = useCallback((key: keyof T, loading: boolean) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: loading }
    }))
  }, [])

  const setError = useCallback((key: keyof T, error: string | null) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], error, isLoading: false }
    }))
  }, [])

  const setData = useCallback((key: keyof T, data: any) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], data, error: null, isLoading: false }
    }))
  }, [])

  const execute = useCallback(async <R>(
    key: keyof T,
    asyncFn: () => Promise<R>,
    options?: {
      onSuccess?: (data: R) => void
      onError?: (error: Error) => void
      optimisticData?: any
    }
  ): Promise<R | null> => {
    try {
      setLoading(key, true)
      
      // Set optimistic data if provided
      if (options?.optimisticData) {
        setStates(prev => ({
          ...prev,
          [key]: { 
            ...prev[key], 
            data: options.optimisticData, 
            isLoading: true 
          }
        }))
      }

      const result = await asyncFn()
      
      setData(key, result)
      options?.onSuccess?.(result)
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setError(key, errorMessage)
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage))
      return null
    }
  }, [setLoading, setData, setError])

  return {
    states,
    setLoading,
    setError,
    setData,
    execute
  }
}