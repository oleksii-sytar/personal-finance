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
    <div className="min-h-screen bg-primary p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8">System Status</h1>
        
        <div className="space-y-6">
          {/* Theme Infrastructure Demo */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Theme Infrastructure</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
                <span className="text-secondary">CSS Custom Properties: Active</span>
              </div>
              <div className="text-sm text-muted">
                Background: <code className="bg-glass px-2 py-1 rounded border-glass">var(--bg-primary)</code>
              </div>
              <div className="text-sm text-muted">
                Accent: <code className="bg-glass px-2 py-1 rounded border-glass">var(--accent-primary)</code>
              </div>
              <div className="text-sm text-muted">
                Glass Effect: <code className="bg-glass px-2 py-1 rounded border-glass">backdrop-filter: blur(16px)</code>
              </div>
            </div>
          </div>

          {/* Supabase Status */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Supabase Connection</h2>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                supabaseStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-secondary">{supabaseStatus}</span>
            </div>
          </div>

          {/* Database Status */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Database Status</h2>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                databaseStatus === 'Working' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-secondary">{databaseStatus}</span>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Environment</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">SUPABASE_URL:</span>
                <span className="text-secondary">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">SUPABASE_ANON_KEY:</span>
                <span className="text-secondary">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">APP_ENV:</span>
                <span className="text-secondary">
                  {process.env.NEXT_PUBLIC_APP_ENV || 'development'}
                </span>
              </div>
            </div>
          </div>

          {/* Error Details */}
          {error && (
            <div className="glass-card p-6 border-red-500/20">
              <h2 className="text-xl font-semibold text-red-400 mb-4">Error Details</h2>
              <pre className="text-red-300 text-sm whitespace-pre-wrap overflow-x-auto">
                {error}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="glass-card p-6 border-blue-500/20">
            <h2 className="text-xl font-semibold text-blue-400 mb-4">Troubleshooting</h2>
            <div className="text-blue-300 text-sm space-y-2">
              <p>If Supabase is not working:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Check Supabase Dashboard for service status</li>
                <li>Verify environment variables: <code className="bg-glass px-2 py-1 rounded border-glass">vercel env pull</code></li>
                <li>Restart Next.js dev server: <code className="bg-glass px-2 py-1 rounded border-glass">npm run dev</code></li>
                <li>Check environment variables in <code className="bg-glass px-2 py-1 rounded border-glass">.env.local</code></li>
              </ol>
            </div>
          </div>

          {/* Theme Demo Buttons */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Theme Demo</h2>
            <div className="flex gap-4">
              <button className="btn-primary px-6 py-3">Primary Button</button>
              <button className="btn-secondary px-6 py-3">Secondary Button</button>
            </div>
            <div className="mt-4">
              <input 
                type="text" 
                placeholder="Form input with theme styles" 
                className="form-input w-full px-4 py-3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}