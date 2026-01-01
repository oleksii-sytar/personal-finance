'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Clock, Mail } from 'lucide-react'

/**
 * Email verification form component
 * Handles verification links and status checking
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createClient()
  
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'pending'>('loading')
  const [message, setMessage] = useState('')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const verifyEmail = async () => {
      // Check if we have verification parameters in URL
      const token = searchParams.get('token')
      const type = searchParams.get('type')
      
      if (token && type === 'email') {
        try {
          // Verify the email using the token
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
          })
          
          if (error) {
            console.error('Email verification error:', error)
            if (error.message.includes('expired')) {
              setVerificationStatus('expired')
              setMessage('This verification link has expired. Please request a new one.')
            } else {
              setVerificationStatus('error')
              setMessage('Invalid or expired verification link.')
            }
          } else {
            setVerificationStatus('success')
            setMessage('Your email has been successfully verified! You can now access all features.')
            
            // Redirect to dashboard after successful verification
            setTimeout(() => {
              router.push('/dashboard')
            }, 3000)
          }
        } catch (error) {
          console.error('Verification error:', error)
          setVerificationStatus('error')
          setMessage('An error occurred during verification. Please try again.')
        }
      } else if (user) {
        // Check if user's email is already verified
        if (user.email_confirmed_at) {
          setVerificationStatus('success')
          setMessage('Your email is already verified!')
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          setVerificationStatus('pending')
          setMessage('Please check your email and click the verification link.')
        }
      } else {
        setVerificationStatus('error')
        setMessage('No user found. Please sign up or sign in first.')
      }
    }

    verifyEmail()
  }, [searchParams, user, supabase.auth, router])

  /**
   * Resend verification email
   * Requirements: 8.1, 8.2
   */
  const handleResendVerification = async () => {
    if (!user?.email) {
      setMessage('No email address found. Please sign up again.')
      return
    }

    setIsResending(true)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      })

      if (error) {
        console.error('Resend verification error:', error)
        setMessage('Failed to resend verification email. Please try again.')
      } else {
        setMessage('Verification email sent! Please check your inbox.')
      }
    } catch (error) {
      console.error('Resend verification error:', error)
      setMessage('An error occurred. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  /**
   * Get status icon based on verification status
   */
  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-[#4E7A58] mx-auto mb-4" />
      case 'error':
      case 'expired':
        return <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      case 'pending':
        return <Mail className="w-16 h-16 text-[#E6A65D] mx-auto mb-4" />
      case 'loading':
      default:
        return <Clock className="w-16 h-16 text-white/60 mx-auto mb-4 animate-spin" />
    }
  }

  /**
   * Get status color for message
   */
  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'success':
        return 'text-[#4E7A58]'
      case 'error':
      case 'expired':
        return 'text-red-400'
      case 'pending':
        return 'text-[#E6A65D]'
      case 'loading':
      default:
        return 'text-white/80'
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle as="h1" className="text-center text-2xl">
          Email Verification
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="text-center">
          {getStatusIcon()}
          
          <p className={`text-center mb-6 ${getStatusColor()}`}>
            {message}
          </p>

          {/* Show resend button for pending or expired status */}
          {(verificationStatus === 'pending' || verificationStatus === 'expired') && user?.email && (
            <div className="space-y-4">
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full"
                variant="secondary"
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              
              <p className="text-xs text-white/50 text-center">
                Didn't receive the email? Check your spam folder or try resending.
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-6 space-y-3">
            {verificationStatus === 'success' && (
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            )}
            
            {(verificationStatus === 'error' || verificationStatus === 'expired') && (
              <div className="space-y-2">
                <Button
                  onClick={() => router.push('/auth/signup')}
                  className="w-full"
                  variant="secondary"
                >
                  Sign Up Again
                </Button>
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="w-full"
                  variant="outline"
                >
                  Back to Login
                </Button>
              </div>
            )}
            
            {verificationStatus === 'pending' && (
              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full"
                variant="outline"
              >
                Back to Login
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}