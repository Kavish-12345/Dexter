import { useEffect, useState } from 'react'
import { ApiError, getWorkspace, type Config, type Design, type WorkspaceResult } from '../../api/client'

// Fetches /workspace for one design with the config it was optimized with.
export function useWorkspace(config: Config, design: Design) {
  const [data, setData] = useState<WorkspaceResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getWorkspace(config, design.l1, design.l2)
      .then((w) => !cancelled && setData(w))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.messages.join('; ') : String(e)))
    return () => {
      cancelled = true
    }
  }, [config, design.l1, design.l2])

  return { data, error }
}
