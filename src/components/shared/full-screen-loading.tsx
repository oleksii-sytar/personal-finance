import { FullScreenFormaLoader } from './forma-logo-loader'

interface FullScreenLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Full-screen loading component with magical Forma logo
 * Use this for page-level loading states with premium Executive Lounge aesthetic
 */
export function FullScreenLoading({ 
  message = 'Loading...', 
  size = 'xl' 
}: FullScreenLoadingProps) {
  return <FullScreenFormaLoader message={message} size={size} />
}