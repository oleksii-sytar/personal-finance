'use client'

import { useState, useCallback, useRef } from 'react'
import { useErrorHandler } from './use-error-handler'

export interface OptimisticUpdate<T> {
  id: string
  type: 'create' | 'update' | 'delete'
  data: T
  originalData?: T
  timestamp: number
}

export function useOptimisticUpdates<T extends { id: string }>(
  initialData: T[] = []
) {
  const [data, setData] = useState<T[]>(initialData)
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate<T>[]>([])
  const { handleError } = useErrorHandler()
  const updateIdCounter = useRef(0)

  const generateUpdateId = useCallback(() => {
    return `optimistic_${Date.now()}_${++updateIdCounter.current}`
  }, [])

  /**
   * Add an item optimistically
   */
  const optimisticCreate = useCallback(async (
    newItem: Omit<T, 'id'> & { id?: string },
    serverAction: () => Promise<T>
  ) => {
    const tempId = newItem.id || `temp_${Date.now()}`
    const optimisticItem = { ...newItem, id: tempId } as T
    const updateId = generateUpdateId()

    // Add optimistic update
    const update: OptimisticUpdate<T> = {
      id: updateId,
      type: 'create',
      data: optimisticItem,
      timestamp: Date.now()
    }

    setData(prev => [...prev, optimisticItem])
    setPendingUpdates(prev => [...prev, update])

    try {
      const serverResult = await serverAction()
      
      // Replace optimistic item with server result
      setData(prev => prev.map(item => 
        item.id === tempId ? serverResult : item
      ))
      
      // Remove pending update
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId))
      
      return serverResult
    } catch (error) {
      // Revert optimistic update
      setData(prev => prev.filter(item => item.id !== tempId))
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId))
      
      handleError(error instanceof Error ? error : new Error(String(error)), {
        category: 'system',
        context: { operation: 'optimistic_create' }
      })
      
      throw error
    }
  }, [generateUpdateId, handleError])

  /**
   * Update an item optimistically
   */
  const optimisticUpdate = useCallback(async (
    itemId: string,
    updates: Partial<T>,
    serverAction: () => Promise<T>
  ) => {
    const updateId = generateUpdateId()
    
    // Find original item
    const originalItem = data.find(item => item.id === itemId)
    if (!originalItem) {
      throw new Error('Item not found for optimistic update')
    }

    const optimisticItem = { ...originalItem, ...updates }
    
    const update: OptimisticUpdate<T> = {
      id: updateId,
      type: 'update',
      data: optimisticItem,
      originalData: originalItem,
      timestamp: Date.now()
    }

    // Apply optimistic update
    setData(prev => prev.map(item => 
      item.id === itemId ? optimisticItem : item
    ))
    setPendingUpdates(prev => [...prev, update])

    try {
      const serverResult = await serverAction()
      
      // Replace optimistic item with server result
      setData(prev => prev.map(item => 
        item.id === itemId ? serverResult : item
      ))
      
      // Remove pending update
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId))
      
      return serverResult
    } catch (error) {
      // Revert to original data
      setData(prev => prev.map(item => 
        item.id === itemId ? originalItem : item
      ))
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId))
      
      handleError(error instanceof Error ? error : new Error(String(error)), {
        category: 'system',
        context: { operation: 'optimistic_update', itemId }
      })
      
      throw error
    }
  }, [data, generateUpdateId, handleError])

  /**
   * Delete an item optimistically
   */
  const optimisticDelete = useCallback(async (
    itemId: string,
    serverAction: () => Promise<void>
  ) => {
    const updateId = generateUpdateId()
    
    // Find original item
    const originalItem = data.find(item => item.id === itemId)
    if (!originalItem) {
      throw new Error('Item not found for optimistic delete')
    }

    const update: OptimisticUpdate<T> = {
      id: updateId,
      type: 'delete',
      data: originalItem,
      originalData: originalItem,
      timestamp: Date.now()
    }

    // Remove item optimistically
    setData(prev => prev.filter(item => item.id !== itemId))
    setPendingUpdates(prev => [...prev, update])

    try {
      await serverAction()
      
      // Remove pending update (item stays deleted)
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId))
    } catch (error) {
      // Restore deleted item
      setData(prev => [...prev, originalItem])
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId))
      
      handleError(error instanceof Error ? error : new Error(String(error)), {
        category: 'system',
        context: { operation: 'optimistic_delete', itemId }
      })
      
      throw error
    }
  }, [data, generateUpdateId, handleError])

  /**
   * Check if an item has pending updates
   */
  const hasPendingUpdate = useCallback((itemId: string) => {
    return pendingUpdates.some(update => 
      update.data.id === itemId || update.originalData?.id === itemId
    )
  }, [pendingUpdates])

  /**
   * Get pending update for an item
   */
  const getPendingUpdate = useCallback((itemId: string) => {
    return pendingUpdates.find(update => 
      update.data.id === itemId || update.originalData?.id === itemId
    )
  }, [pendingUpdates])

  /**
   * Clear all pending updates (useful for data refresh)
   */
  const clearPendingUpdates = useCallback(() => {
    setPendingUpdates([])
  }, [])

  /**
   * Refresh data from server (clears optimistic updates)
   */
  const refreshData = useCallback((newData: T[]) => {
    setData(newData)
    clearPendingUpdates()
  }, [clearPendingUpdates])

  return {
    data,
    pendingUpdates,
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    hasPendingUpdate,
    getPendingUpdate,
    clearPendingUpdates,
    refreshData,
    setData
  }
}