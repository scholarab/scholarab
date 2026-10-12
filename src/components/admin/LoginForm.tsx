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
      setError('Network error. Try again')
      setLoading(false)
    }
  }

  return (
    <div className="adm adm-login">
      <form onSubmit={handleSubmit}>
        <img src="/brand/scholarab-logo-on-dark.svg" alt="ScholarAB" width="160" height="36" />
        <h1>Admin</h1>
        <p>Sign in to edit listings and publish.</p>
        <div className="adm-field">
          <label htmlFor="admin-login-password">Password</label>
          <input id="admin-login-password"
            type="password"
            className="adm-input"
            aria-describedby={error ? 'admin-login-error' : undefined}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
          />
        </div>
        {error && <p id="admin-login-error" role="alert" className="adm-alert">{error}</p>}
        <button type="submit" disabled={loading} className="adm-btn adm-btn-primary">
          {loading ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
