// Keeps app state across page reloads in the browser's localStorage.
// Every read and write is wrapped in try/catch: storage can be full, blocked or
// disabled (private windows), and the app must still work without it.

const PREFIX = 'dexter:v1:' // bump the version if the saved shapes ever change

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // storage full or blocked: just don't persist
  }
}
