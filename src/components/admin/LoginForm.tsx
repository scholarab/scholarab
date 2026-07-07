import { useState } from 'react'

export default function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.href = next
      } else {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error || 'Invalid credentials')
        setLoading(false)
      }
    } catch {
      setError('Network error — try again')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="text-2xl font-bold text-white">Scholar<span style={{color:'#22d3a5'}}>AB</span></span>
          <span className="text-xs text-white/40 border border-white/10 rounded-sm px-2 py-0.5">Admin</span>
        </div>
        <p className="text-white/50 text-sm">Sign in to manage scholarships and programs</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-white/70 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-hidden focus:border-[#22d3a5]/50 focus:ring-1 focus:ring-[#22d3a5]/50 transition"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-medium transition text-[#0a0a0f] disabled:opacity-50"
          style={{background: loading ? '#22d3a560' : '#22d3a5'}}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
