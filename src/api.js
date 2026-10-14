const API_URL = import.meta.env.VITE_API_URL

// text/plain menghindari CORS preflight yang tidak didukung Apps Script
export async function call(action, idToken, payload = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, idToken, ...payload }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Terjadi kesalahan')
  return data
}
