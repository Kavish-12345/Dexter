import { useEffect, useState } from 'react'
import { getDefaults, type Config } from './api'

// Temporary page for step 8b-1: shows the API defaults to prove the proxy, api.ts and Tailwind work.
export default function App() {
  const [config, setConfig] = useState<Config | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDefaults().then(setConfig).catch((e: Error) => setError(e.message))
  }, [])

  return (
    <main className="p-6 font-mono text-sm">
      <h1 className="mb-4 text-xl font-bold">Dexter</h1>
      {error && <p className="whitespace-pre-line text-red-600">{error}</p>}
      {config ? <pre>{JSON.stringify(config, null, 2)}</pre> : !error && <p>Loading defaults...</p>}
    </main>
  )
}
