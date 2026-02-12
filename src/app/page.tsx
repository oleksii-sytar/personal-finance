import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="fixed top-[-50%] right-[-50%] w-full h-full bg-gradient-radial from-[var(--accent-primary)]/15 via-transparent to-transparent pointer-events-none z-0" />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[#F4B76D] rounded-lg flex items-center justify-center">
            <span className="text-[#1C1917] font-bold text-sm font-space-grotesk">F</span>
          </div>
          <span className="text-[var(--text-primary)] font-space-grotesk font-semibold text-lg">Forma</span>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/auth/login" 
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
          >
            Log in
          </Link>
          <Link 
            href="/auth/signup" 
            className="bg-gradient-to-r from-[var(--accent-primary)] to-[#F4B76D] text-[#1C1917] px-6 py-2 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-[var(--accent-primary)]/20 transition-all duration-300"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 text-center py-24 px-8">
        <h1 className="font-space-grotesk text-5xl md:text-7xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
          Family Finance,
          <br />
          <span className="text-transparent bg-gradient-to-r from-[var(--accent-primary)] to-[#F4B76D] bg-clip-text">
            Structured & Disciplined
          </span>
        </h1>
        <p className="text-[var(--text-secondary)] text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          Replace spreadsheets and scattered bank apps with a unified, premium experience 
          that brings structure to your family's money management.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/auth/signup"
            className="bg-gradient-to-r from-[var(--accent-primary)] to-[#F4B76D] text-[#1C1917] px-8 py-4 rounded-full text-base font-medium hover:shadow-xl hover:shadow-[var(--accent-primary)]/30 transition-all duration-300 transform hover:scale-105"
          >
            Start Your Financial Journey
          </Link>
          <Link 
            href="/auth/login"
            className="border border-[var(--glass-border)] text-[var(--text-primary)] px-8 py-4 rounded-full text-base font-medium hover:bg-[var(--bg-glass)] transition-all duration-300"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features Preview */}
      <div className="relative z-10 px-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--glass-border)] rounded-3xl p-8 hover:bg-[var(--bg-glass)] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent-primary)]/20 to-[#F4B76D]/20 rounded-2xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 bg-[var(--accent-primary)] rounded-lg" />
              </div>
              <h3 className="font-space-grotesk text-xl font-semibold text-[var(--text-primary)] mb-4">
                Real-Time Balance Tracking
              </h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Track your account balances in real-time and reconcile with actual bank statements instantly.
              </p>
            </div>

            <div className="bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--glass-border)] rounded-3xl p-8 hover:bg-[var(--bg-glass)] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4E7A58]/20 to-[#4E7A58]/20 rounded-2xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 bg-[var(--accent-success)] rounded-lg" />
              </div>
              <h3 className="font-space-grotesk text-xl font-semibold text-[var(--text-primary)] mb-4">
                Intelligent Forecasting
              </h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Pattern-learning algorithms predict your daily balances based on family spending behavior.
              </p>
            </div>

            <div className="bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--glass-border)] rounded-3xl p-8 hover:bg-[var(--bg-glass)] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#5C3A21]/20 to-[#5C3A21]/20 rounded-2xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 bg-[var(--accent-secondary)] rounded-lg" />
              </div>
              <h3 className="font-space-grotesk text-xl font-semibold text-[var(--text-primary)] mb-4">
                Privacy-First Approach
              </h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Manual transaction entry and statement import - no invasive bank connections required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}