const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function getStatus() {
  try {
    const res = await fetch(`${API}/health`)
    if (!res.ok) return 'unreachable'
    const body = await res.json()
    return body.status || 'ok'
  } catch (e) {
    return 'error'
  }
}
