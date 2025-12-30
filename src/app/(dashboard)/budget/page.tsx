export default function BudgetPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white mb-2">
          Budget Planning
        </h1>
        <p className="text-white/60 font-inter text-lg">
          Plan and track your spending limits with intelligent insights.
        </p>
      </div>
      
      <div className="glass-card p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="p-6 rounded-full bg-aged-oak/40 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <span className="text-2xl font-space-grotesk font-bold text-aged-oak">📊</span>
          </div>
          <h3 className="text-xl font-space-grotesk font-semibold text-white mb-4">
            Executive Budget Suite
          </h3>
          <p className="text-white/60 font-inter leading-relaxed">
            Sophisticated budget management tools are being developed to match your executive standards.
          </p>
        </div>
      </div>
    </div>
  );
}