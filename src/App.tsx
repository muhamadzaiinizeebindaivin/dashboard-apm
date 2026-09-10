import { StatCard } from './components/StatCard'
import { useSupabaseStatus } from './hooks/useSupabaseStatus'

function App() {
  const { status, message } = useSupabaseStatus()

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Supabase status:{' '}
          <span
            className={
              status === 'connected'
                ? 'text-green-600'
                : status === 'error'
                  ? 'text-red-600'
                  : 'text-neutral-400'
            }
          >
            {status}
          </span>
          {message && ` — ${message}`}
        </p>
      </header>

      <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active users" value="128" detail="Click to see the breakdown by role." />
        <StatCard label="Open tasks" value="42" detail="Tap a card like this to expand details in place." />
        <StatCard label="Uptime" value="99.9%" detail="Last 30 days, updated daily." />
      </div>
    </main>
  )
}

export default App
