export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white mb-2">
          Executive Settings
        </h1>
        <p className="text-white/60 font-inter text-lg">
          Manage your account and personalize your executive experience.
        </p>
      </div>
      
      <div className="glass-card p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="p-6 rounded-full bg-single-malt/20 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <span className="text-2xl font-space-grotesk font-bold text-single-malt">⚙️</span>
          </div>
          <h3 className="text-xl font-space-grotesk font-semibold text-white mb-4">
            Premium Configuration
          </h3>
          <p className="text-white/60 font-inter leading-relaxed">
            Advanced settings and customization options are being crafted to match your executive preferences.
          </p>
        </div>
      </div>
    </div>
  );
}