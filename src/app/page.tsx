import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#1C1917] relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="fixed top-[-50%] right-[-50%] w-full h-full bg-gradient-radial from-[#E6A65D]/15 via-transparent to-transparent pointer-events-none z-0" />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#E6A65D] to-[#F4B76D] rounded-lg flex items-center justify-center">
            <span className="text-[#1C1917] font-bold text-sm font-space-grotesk">F</span>
          </div>
          <span className="text-white/90 font-space-grotesk font-semibold text-lg">Forma</span>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/auth/login" 
            className="text-white/60 hover:text-white/90 text-sm font-medium transition-colors"
          >
            Log in
          </Link>
          <Link 
            href="/auth/signup" 
            className="bg-gradient-to-r from-[#E6A65D] to-[#F4B76D] text-[#1C1917] px-6 py-2 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-[#E6A65D]/20 transition-all duration-300"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 text-center py-24 px-8">
        <h1 className="font-space-grotesk text-5xl md:text-7xl font-bold text-white/90 mb-6 leading-tight">
          Family Finance,
          <br />
          <span className="text-transparent bg-gradient-to-r from-[#E6A65D] to-[#F4B76D] bg-clip-text">
            Structured & Disciplined
          </span>
        </h1>
        <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          Replace spreadsheets and scattered bank apps with a unified, premium experience 
          that brings structure to your family's money management.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/auth/signup"
            className="bg-gradient-to-r from-[#E6A65D] to-[#F4B76D] text-[#1C1917] px-8 py-4 rounded-full text-base font-medium hover:shadow-xl hover:shadow-[#E6A65D]/30 transition-all duration-300 transform hover:scale-105"
          >
            Start Your Financial Journey
          </Link>
          <Link 
            href="/auth/login"
            className="border border-white/10 text-white/90 px-8 py-4 rounded-full text-base font-medium hover:bg-white/5 transition-all duration-300"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features Preview */}
      <div className="relative z-10 px-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-3xl p-8 hover:bg-white/8 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#E6A65D]/20 to-[#F4B76D]/20 rounded-2xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 bg-[#E6A65D] rounded-lg" />
              </div>
              <h3 className="font-space-grotesk text-xl font-semibold text-white/90 mb-4">
                Checkpoint-Based Tracking
              </h3>
              <p className="text-white/60 leading-relaxed">
                Define financial snapshots and measure progress to your next milestone with precision.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-3xl p-8 hover:bg-white/8 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4E7A58]/20 to-[#4E7A58]/20 rounded-2xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 bg-[#4E7A58] rounded-lg" />
              </div>
              <h3 className="font-space-grotesk text-xl font-semibold text-white/90 mb-4">
                Intelligent Forecasting
              </h3>
              <p className="text-white/60 leading-relaxed">
                Pattern-learning algorithms predict your daily balances based on family spending behavior.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-3xl p-8 hover:bg-white/8 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#5C3A21]/20 to-[#5C3A21]/20 rounded-2xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 bg-[#5C3A21] rounded-lg" />
              </div>
              <h3 className="font-space-grotesk text-xl font-semibold text-white/90 mb-4">
                Privacy-First Approach
              </h3>
              <p className="text-white/60 leading-relaxed">
                Manual transaction entry and statement import - no invasive bank connections required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}