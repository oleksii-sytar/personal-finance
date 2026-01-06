import { FullScreenFormaLoader } from './forma-logo-loader'

interface FullScreenLoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Full-screen loading component with magical Forma logo
 * Use this for page-level loading states with premium Executive Lounge aesthetic
 */
export function FullScreenLoading({ 
  size = 'xl' 
}: FullScreenLoadingProps) {
  return <FullScreenFormaLoader size={size} />
}