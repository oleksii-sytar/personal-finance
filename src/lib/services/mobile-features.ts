/**
 * Mobile-specific features service
 * Requirements: 8.5, 8.6
 * 
 * Features:
 * - Haptic feedback for key interactions
 * - Offline capability with sync when connected
 * - Mobile-optimized success celebrations
 * - Device detection and optimization
 */

interface HapticFeedbackOptions {
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
  duration?: number
}

interface OfflineData {
  type: 'transaction' | 'gap_resolution'
  data: any
  timestamp: number
  id: string
}

interface CelebrationOptions {
  type: 'gap_resolved' | 'transaction_created'
  message?: string
  duration?: number
}

class MobileFeaturesService {
  private isOnline = navigator.onLine
  private offlineQueue: OfflineData[] = []
  private readonly OFFLINE_STORAGE_KEY = 'forma_offline_queue'

  constructor() {
    this.initializeOfflineHandling()
    this.loadOfflineQueue()
  }

  /**
   * Initialize offline handling
   */
  private initializeOfflineHandling() {
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }

  /**
   * Handle coming back online
   */
  private async handleOnline() {
    this.isOnline = true
    
    if (this.offlineQueue.length > 0) {
      await this.syncOfflineData()
      this.triggerHapticFeedback({ type: 'success' })
    }
  }

  /**
   * Handle going offline
   */
  private handleOffline() {
    this.isOnline = false
    this.triggerHapticFeedback({ type: 'warning' })
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline
  }

  /**
   * Trigger haptic feedback (Requirements 8.5)
   */
  triggerHapticFeedback(options: HapticFeedbackOptions): void {
    // Check if device supports haptic feedback
    if (!('vibrate' in navigator)) {
      return
    }

    let pattern: number | number[]

    switch (options.type) {
      case 'light':
        pattern = 10
        break
      case 'medium':
        pattern = 20
        break
      case 'heavy':
        pattern = 50
        break
      case 'success':
        pattern = [50, 50, 100] // Short-pause-long
        break
      case 'warning':
        pattern = [100, 100, 100] // Three medium pulses
        break
      case 'error':
        pattern = [200, 100, 200] // Long-pause-long
        break
      default:
        pattern = 20
    }

    try {
      navigator.vibrate(pattern)
    } catch (error) {
      console.warn('Haptic feedback not supported:', error)
    }
  }

  /**
   * Store data for offline sync (Requirements 8.5)
   */
  storeOfflineData(type: OfflineData['type'], data: any): string {
    const offlineItem: OfflineData = {
      type,
      data,
      timestamp: Date.now(),
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    this.offlineQueue.push(offlineItem)
    this.saveOfflineQueue()
    
    return offlineItem.id
  }

  /**
   * Sync offline data when connection is restored
   */
  private async syncOfflineData(): Promise<void> {
    if (this.offlineQueue.length === 0) return

    const syncPromises = this.offlineQueue.map(async (item) => {
      try {
        await this.syncSingleItem(item)
        return { success: true, id: item.id }
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error)
        return { success: false, id: item.id, error }
      }
    })

    const results = await Promise.allSettled(syncPromises)
    
    // Remove successfully synced items
    const successfulIds = results
      .filter((result): result is PromiseFulfilledResult<{ success: true; id: string }> => 
        result.status === 'fulfilled' && result.value.success
      )
      .map(result => result.value.id)

    this.offlineQueue = this.offlineQueue.filter(item => !successfulIds.includes(item.id))
    this.saveOfflineQueue()
  }

  /**
   * Sync a single offline item
   */
  private async syncSingleItem(item: OfflineData): Promise<void> {
    switch (item.type) {
      case 'transaction':
        await this.syncTransaction(item.data)
        break
      case 'gap_resolution':
        await this.syncGapResolution(item.data)
        break
      default:
        throw new Error(`Unknown offline data type: ${item.type}`)
    }
  }

  /**
   * Sync transaction data
   */
  private async syncTransaction(data: any): Promise<void> {
    // In a real implementation, this would call the transaction creation API
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  /**
   * Sync gap resolution data
   */
  private async syncGapResolution(data: any): Promise<void> {
    // In a real implementation, this would call the gap resolution API
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 750))
  }

  /**
   * Load offline queue from storage
   */
  private loadOfflineQueue(): void {
    try {
      const stored = localStorage.getItem(this.OFFLINE_STORAGE_KEY)
      if (stored) {
        this.offlineQueue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
      this.offlineQueue = []
    }
  }

  /**
   * Save offline queue to storage
   */
  private saveOfflineQueue(): void {
    try {
      localStorage.setItem(this.OFFLINE_STORAGE_KEY, JSON.stringify(this.offlineQueue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  /**
   * Get offline queue status
   */
  getOfflineStatus(): { isOnline: boolean; queueLength: number; lastSync?: number } {
    return {
      isOnline: this.isOnline,
      queueLength: this.offlineQueue.length,
      lastSync: this.offlineQueue.length > 0 
        ? Math.max(...this.offlineQueue.map(item => item.timestamp))
        : undefined
    }
  }

  /**
   * Trigger mobile-optimized success celebration (Requirements 8.6)
   */
  triggerSuccessCelebration(options: CelebrationOptions): void {
    const { type, message, duration = 3000 } = options

    // Haptic feedback for celebration
    this.triggerHapticFeedback({ type: 'success' })

    // Create celebration element
    const celebration = document.createElement('div')
    celebration.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm'
    celebration.style.animation = 'fadeIn 0.3s ease-out'

    const content = document.createElement('div')
    content.className = 'bg-white dark:bg-gray-800 rounded-2xl p-8 mx-4 text-center max-w-sm shadow-2xl'
    content.style.animation = 'scaleIn 0.5s ease-out'

    // Success icon with animation
    const icon = document.createElement('div')
    icon.className = 'w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center'
    icon.innerHTML = `
      <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
      </svg>
    `
    icon.style.animation = 'bounceIn 0.6s ease-out 0.2s both'

    // Success message
    const title = document.createElement('h3')
    title.className = 'text-xl font-bold text-gray-900 dark:text-white mb-2'
    title.textContent = this.getCelebrationTitle(type)

    const subtitle = document.createElement('p')
    subtitle.className = 'text-gray-600 dark:text-gray-300'
    subtitle.textContent = message || this.getCelebrationMessage(type)

    // Confetti effect for major celebrations
    if (type === 'gap_resolved') {
      this.createConfettiEffect()
    }

    content.appendChild(icon)
    content.appendChild(title)
    content.appendChild(subtitle)
    celebration.appendChild(content)
    document.body.appendChild(celebration)

    // Auto-remove after duration
    setTimeout(() => {
      celebration.style.animation = 'fadeOut 0.3s ease-out'
      setTimeout(() => {
        document.body.removeChild(celebration)
      }, 300)
    }, duration)

    // Add CSS animations if not already present
    this.addCelebrationStyles()
  }

  /**
   * Get celebration title based on type
   */
  private getCelebrationTitle(type: CelebrationOptions['type']): string {
    switch (type) {
      case 'transaction_created':
        return '✅ Transaction Created!'
      case 'gap_resolved':
        return '✨ Gap Resolved!'
      default:
        return '✅ Success!'
    }
  }

  /**
   * Get celebration message based on type
   */
  private getCelebrationMessage(type: CelebrationOptions['type']): string {
    switch (type) {
      case 'transaction_created':
        return 'Your transaction has been successfully recorded.'
      case 'gap_resolved':
        return 'Account balance discrepancy has been resolved.'
      default:
        return 'Operation completed successfully.'
    }
  }

  /**
   * Create confetti effect for major celebrations
   */
  private createConfettiEffect(): void {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
    const confettiCount = 50

    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div')
        confetti.className = 'fixed pointer-events-none z-[10000]'
        confetti.style.cssText = `
          width: 10px;
          height: 10px;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          left: ${Math.random() * 100}vw;
          top: -10px;
          border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
          animation: confettiFall ${2 + Math.random() * 3}s linear forwards;
          transform: rotate(${Math.random() * 360}deg);
        `
        
        document.body.appendChild(confetti)
        
        setTimeout(() => {
          if (document.body.contains(confetti)) {
            document.body.removeChild(confetti)
          }
        }, 5000)
      }, i * 50)
    }
  }

  /**
   * Add celebration CSS styles
   */
  private addCelebrationStyles(): void {
    if (document.getElementById('mobile-celebration-styles')) return

    const styles = document.createElement('style')
    styles.id = 'mobile-celebration-styles'
    styles.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes scaleIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes bounceIn {
        0% { transform: scale(0); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      @keyframes confettiFall {
        0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `
    
    document.head.appendChild(styles)
  }

  /**
   * Check if device is mobile
   */
  isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768
  }

  /**
   * Get device type
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth
    
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  /**
   * Optimize for mobile performance
   */
  optimizeForMobile(): void {
    if (!this.isMobileDevice()) return

    // Disable hover effects on mobile
    document.body.classList.add('mobile-device')
    
    // Add mobile-specific CSS
    const mobileStyles = document.createElement('style')
    mobileStyles.textContent = `
      .mobile-device *:hover {
        /* Disable hover effects on mobile */
      }
      
      .mobile-device {
        /* Optimize touch interactions */
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      
      .mobile-device input, .mobile-device textarea {
        /* Re-enable text selection for inputs */
        -webkit-user-select: text;
      }
    `
    
    document.head.appendChild(mobileStyles)
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))
  }
}

// Export singleton instance
export const mobileFeaturesService = new MobileFeaturesService()

// Export types for use in components
export type { HapticFeedbackOptions, OfflineData, CelebrationOptions }