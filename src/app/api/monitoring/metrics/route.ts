/**
 * Monitoring Metrics API Endpoint
 * 
 * Provides system metrics for monitoring and debugging.
 * Should be protected in production environments.
 */

import { NextResponse } from 'next/server'
import { metricsCollector } from '@/lib/monitoring/metrics-collector'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/monitoring/metrics
 * 
 * Returns current system metrics including:
 * - Cache statistics
 * - Error counts and rates
 * - System health status
 * 
 * Note: In production, this endpoint should be protected with authentication
 * and only accessible to administrators.
 */
export async function GET() {
  try {
    // In production, verify user is authenticated and has admin role
    if (process.env.NODE_ENV === 'production') {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // TODO: Add admin role check when role system is implemented
      // For now, allow any authenticated user in production
    }

    // Collect metrics
    const metrics = metricsCollector.collectMetrics()

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Failed to collect metrics:', error)
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    )
  }
}
