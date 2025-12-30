export default function TransactionsPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white mb-2">
          Transactions
        </h1>
        <p className="text-white/60 font-inter text-lg">
          Manage your income and expenses with precision.
        </p>
      </div>
      
      <div className="glass-card p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="p-6 rounded-full bg-single-malt/20 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <span className="text-2xl font-space-grotesk font-bold text-single-malt">₹</span>
          </div>
          <h3 className="text-xl font-space-grotesk font-semibold text-white mb-4">
            Transaction Management
          </h3>
          <p className="text-white/60 font-inter leading-relaxed">
            Advanced transaction tracking and categorization features are being crafted for the executive experience.
          </p>
        </div>
      </div>
    </div>
  );
}