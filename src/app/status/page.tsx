import { createClient } from '@/lib/supabase/server'

export default async function StatusPage() {
  let supabaseStatus = 'Unknown'
  let databaseStatus = 'Unknown'
  let error = null

  try {
    const supabase = await createClient()
    
    // Test basic connection
    const { data, error: connectionError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      supabaseStatus = 'Connected but query failed'
      databaseStatus = 'Error'
      error = connectionError.message
    } else {
      supabaseStatus = 'Connected'
      databaseStatus = 'Working'
    }
  } catch (err) {
    supabaseStatus = 'Connection failed'
    databaseStatus = 'Unavailable'
    error = err instanceof Error ? err.message : 'Unknown error'
  }

  return (
    <div className="min-h-screen bg-[#1C1917] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">System Status</h1>
        
        <div className="space-y-6">
          {/* Supabase Status */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Supabase Connection</h2>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                supabaseStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-white/80">{supabaseStatus}</span>
            </div>
          </div>

          {/* Database Status */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Database Status</h2>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                databaseStatus === 'Working' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-white/80">{databaseStatus}</span>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Environment</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">SUPABASE_URL:</span>
                <span className="text-white/80">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">SUPABASE_ANON_KEY:</span>
                <span className="text-white/80">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">APP_ENV:</span>
                <span className="text-white/80">
                  {process.env.NEXT_PUBLIC_APP_ENV || 'development'}
                </span>
              </div>
            </div>
          </div>

          {/* Error Details */}
          {error && (
            <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/20">
              <h2 className="text-xl font-semibold text-red-400 mb-4">Error Details</h2>
              <pre className="text-red-300 text-sm whitespace-pre-wrap overflow-x-auto">
                {error}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/20">
            <h2 className="text-xl font-semibold text-blue-400 mb-4">Troubleshooting</h2>
            <div className="text-blue-300 text-sm space-y-2">
              <p>If Supabase is not working:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Check Supabase Dashboard for service status</li>
                <li>Verify environment variables: <code className="bg-black/30 px-2 py-1 rounded">vercel env pull</code></li>
                <li>Restart Next.js dev server: <code className="bg-black/30 px-2 py-1 rounded">npm run dev</code></li>
                <li>Check environment variables in <code className="bg-black/30 px-2 py-1 rounded">.env.local</code></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}