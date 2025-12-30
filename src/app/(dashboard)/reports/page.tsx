export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white mb-2">
          Financial Reports
        </h1>
        <p className="text-white/60 font-inter text-lg">
          Analyze your financial data with liquid-style visualizations.
        </p>
      </div>
      
      <div className="glass-card p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="p-6 rounded-full bg-growth-emerald/20 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <span className="text-2xl font-space-grotesk font-bold text-growth-emerald">📈</span>
          </div>
          <h3 className="text-xl font-space-grotesk font-semibold text-white mb-4">
            Analytics Dashboard
          </h3>
          <p className="text-white/60 font-inter leading-relaxed">
            Advanced reporting with bezier curve charts and executive-grade insights are in development.
          </p>
        </div>
      </div>
    </div>
  );
}