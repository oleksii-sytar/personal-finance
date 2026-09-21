import { createClient } from '@/lib/supabase/server'

export default async function StatusPage() {
  let supabaseStatus = "Невідомо"
  let databaseStatus = "Невідомо"
  let error = null

  try {
    const supabase = await createClient()

    // Test basic connectivity via the auth service (no app tables required)
    const { error: connectionError } = await supabase.auth.getSession()

    if (connectionError) {
      supabaseStatus = "Підключено, але перевірка входу не вдалася"
      databaseStatus = 'Помилка'
      error = connectionError.message
    } else {
      supabaseStatus = "Підключено"
      databaseStatus = "Працює"
    }
  } catch (err) {
    supabaseStatus = "Помилка з’єднання"
    databaseStatus = "Недоступно"
    error = err instanceof Error ? err.message : "Невідома помилка"
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8">Стан системи</h1>
        
        <div className="space-y-6">
          {/* Theme Infrastructure Demo */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Оформлення інтерфейсу</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
                <span className="text-secondary">Змінні CSS: активні</span>
              </div>
              <div className="text-sm text-muted">
                Тло: <code className="bg-glass px-2 py-1 rounded border-glass">var(--bg-primary)</code>
              </div>
              <div className="text-sm text-muted">
                Акцент: <code className="bg-glass px-2 py-1 rounded border-glass">var(--accent-primary)</code>
              </div>
              <div className="text-sm text-muted">
                Ефект прозорості: <code className="bg-glass px-2 py-1 rounded border-glass">backdrop-filter: blur(16px)</code>
              </div>
            </div>
          </div>

          {/* Supabase Status */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">З’єднання із Supabase</h2>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                supabaseStatus === "Підключено" ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-error)]'
              }`} />
              <span className="text-secondary">{supabaseStatus}</span>
            </div>
          </div>

          {/* Database Status */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Стан бази даних</h2>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                databaseStatus === "Працює" ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-error)]'
              }`} />
              <span className="text-secondary">{databaseStatus}</span>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Середовище</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">SUPABASE_URL:</span>
                <span className="text-secondary">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Налаштовано" : "Не налаштовано"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">SUPABASE_ANON_KEY:</span>
                <span className="text-secondary">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Налаштовано" : "Не налаштовано"}
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
            <div className="glass-card p-6 border-[var(--accent-error)]/20">
              <h2 className="text-xl font-semibold text-[var(--accent-error)] mb-4">Деталі помилки</h2>
              <pre className="text-red-300 text-sm whitespace-pre-wrap overflow-x-auto">
                {error}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="glass-card p-6 border-[var(--accent-info)]/20">
            <h2 className="text-xl font-semibold text-[var(--accent-info)] mb-4">Усунення несправностей</h2>
            <div className="text-blue-300 text-sm space-y-2">
              <p>Якщо Supabase не працює:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Перевірте стан сервісу в панелі Supabase</li>
                <li>Перевірте змінні середовища: <code className="bg-glass px-2 py-1 rounded border-glass">vercel env pull</code></li>
                <li>Перезапустіть сервер розробки Next.js: <code className="bg-glass px-2 py-1 rounded border-glass">npm run dev</code></li>
                <li>Перевірте змінні середовища у <code className="bg-glass px-2 py-1 rounded border-glass">.env.local</code></li>
              </ol>
            </div>
          </div>

          {/* Theme Demo Buttons */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Приклади оформлення</h2>
            <div className="flex gap-4">
              <button className="btn-primary px-6 py-3">Основна кнопка</button>
              <button className="btn-secondary px-6 py-3">Другорядна кнопка</button>
            </div>
            <div className="mt-4">
              <input 
                type="text" 
                placeholder="Поле введення з оформленням" 
                className="form-input w-full px-4 py-3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}