'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { getInvitationByToken, acceptInvitation, type InvitationData } from '@/actions/invitation'

/**
 * InviteAcceptanceForm component for accepting workspace invitations
 * Requirements: 5.3, 5.5
 */
export function InviteAcceptanceForm() {
  console.log('InviteAcceptanceForm component mounted')
  
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { user, session } = useAuth()
  const { refreshWorkspaces } = useWorkspace()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  console.log('Component state:', { token, user: !!user, session: !!session })
  console.log('searchParams object:', searchParams)
  console.log('All search params:', Object.fromEntries(searchParams.entries()))

  // Load invitation data on mount
  useEffect(() => {
    console.log('useEffect triggered!')
    console.log('useEffect - token:', token)
    console.log('useEffect - typeof token:', typeof token)
    
    if (token && token.trim() !== '') {
      console.log('Token is valid, calling loadInvitationData with:', token)
      loadInvitationData(token)
    } else {
      console.log('No valid token found, setting error. Token value:', token)
      setError('Invalid invitation link')
      setIsLoading(false)
    }
  }, [token]) // token is stable from useSearchParams

  // Also try a second useEffect that runs on mount regardless
  useEffect(() => {
    console.log('Mount effect - checking URL directly')
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('token')
    console.log('URL token from direct check:', urlToken)
    
    if (urlToken && !token) {
      console.log('Found token in URL but not in searchParams, using URL token')
      loadInvitationData(urlToken)
    }
  }, [])

  /**
   * Load invitation data from the token
   */
  const loadInvitationData = async (invitationToken: string) => {
    console.log('loadInvitationData called with:', invitationToken)
    try {
      setIsLoading(true)
      setError(null)

      console.log('About to call getInvitationByToken...')
      const result = await getInvitationByToken(invitationToken)
      
      console.log('getInvitationByToken result:', result)

      if (result.error || !result.data) {
        console.log('Setting error:', result.error)
        setError(result.error || 'Failed to load invitation')
        return
      }

      console.log('Setting invitation data:', result.data)
      setInvitationData(result.data)
      console.log('Invitation data set successfully')
    } catch (error) {
      console.error('Error in loadInvitationData:', error)
      setError('Failed to load invitation details')
    } finally {
      console.log('Setting loading to false')
      setIsLoading(false)
    }
  }

  /**
   * Accept the workspace invitation
   */
  const acceptInvitationHandler = async () => {
    if (!user || !token) return

    try {
      setIsAccepting(true)
      setError(null)

      const result = await acceptInvitation(token)
      
      if (result.error) {
        setError(result.error)
        return
      }

      // Refresh workspaces to include the newly joined workspace
      await refreshWorkspaces()

      // Redirect to dashboard (workspace context will refresh there)
      router.push('/dashboard')
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsAccepting(false)
    }
  }

  /**
   * Decline the invitation
   */
  const declineInvitation = () => {
    router.push('/')
  }

  if (isLoading) {
    console.log('Rendering loading state')
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-[#E6A65D] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white/60">Loading invitation...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    console.log('Rendering error state:', error)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-400">Invalid Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 mb-6">{error}</p>
          <Button 
            onClick={() => router.push('/')}
            variant="secondary"
            className="w-full"
          >
            Go to Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!invitationData) {
    console.log('No invitation data, rendering null')
    return null
  }

  console.log('Rendering invitation form with data:', invitationData)

  // If user is not logged in, show login prompt
  if (!user || !session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join {invitationData.workspace.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 mb-6">
            {invitationData.inviterName} has invited you to join <strong>{invitationData.workspace.name}</strong>.
            Please log in or create an account to accept this invitation.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(`/auth/invite?token=${token}`)}`)}
              className="w-full"
            >
              Log In
            </Button>
            <Button 
              onClick={() => router.push(`/auth/signup?redirect=${encodeURIComponent(`/auth/invite?token=${token}`)}`)}
              variant="secondary"
              className="w-full"
            >
              Create Account
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Invitation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-white/60 mb-2">
              <strong className="text-white/90">{invitationData.inviterName}</strong> has invited you to join
            </p>
            <h2 className="text-xl font-semibold text-[#E6A65D] mb-4">
              {invitationData.workspace.name}
            </h2>
            <p className="text-sm text-white/50">
              Currency: {invitationData.workspace.currency}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={acceptInvitationHandler}
              disabled={isAccepting}
              className="flex-1"
            >
              {isAccepting ? 'Joining...' : 'Accept Invitation'}
            </Button>
            <Button
              onClick={declineInvitation}
              variant="secondary"
              disabled={isAccepting}
              className="flex-1"
            >
              Decline
            </Button>
          </div>

          <p className="text-xs text-white/40 text-center">
            By accepting, you'll be able to view and manage finances in this workspace
          </p>
        </div>
      </CardContent>
    </Card>
  )
}