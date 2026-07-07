import { useState, type ComponentProps } from 'react'
import { Toaster, toast } from 'sonner'
import ScholarshipManager from './ScholarshipManager'
import ProgramManager from './ProgramManager'
import AnalyticsPanel, { type AnalyticsData } from './AnalyticsPanel'

interface User {
  id: string
  email: string
  name?: string | null
}

interface Props {
  user: User
  page: 'scholarships' | 'programs' | 'analytics'
  data: string
}

export default function AdminShell({ user, page, data }: Props) {
  const [deploying, setDeploying] = useState(false)
  const [lastDeployed, setLastDeployed] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('lastDeployed') : null
  )

  const handleDeploy = async () => {
    setDeploying(true)
    try {
      const res = await fetch('/admin/api/deploy', { method: 'POST' })
      if (res.ok) {
        const now = new Date().toLocaleTimeString()
        setLastDeployed(now)
        localStorage.setItem('lastDeployed', now)
        toast.success('Deploy triggered. Site will be live in ~90 seconds.')
      } else {
        toast.error('Deploy failed. Check Cloudflare settings.')
      }
    } catch {
      toast.error('Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/admin/api/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  let parsedData: unknown
  try {
    parsedData = JSON.parse(data)
  } catch {
    parsedData = page === 'analytics' ? { error: true } : []
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex" style={{fontFamily: 'Inter, system-ui, sans-serif'}}>
      <Toaster richColors position="top-right" />

      {/* Sidebar */}
      <aside className="w-56 bg-[#0a0a0f] border-r border-white/6 flex flex-col p-4 gap-2 fixed h-full z-10">
        <div className="mb-4 px-2">
          <span className="text-lg font-bold">Scholar<span style={{color:'#22d3a5'}}>AB</span></span>
          <span className="ml-2 text-xs text-white/30 border border-white/10 rounded-sm px-1.5 py-0.5">Admin</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <a
            href="/admin/scholarships"
            className={`px-3 py-2 rounded-lg text-sm transition ${page === 'scholarships' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Scholarships
          </a>
          <a
            href="/admin/programs"
            className={`px-3 py-2 rounded-lg text-sm transition ${page === 'programs' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Research Programs
          </a>
          <a
            href="/admin/analytics"
            className={`px-3 py-2 rounded-lg text-sm transition ${page === 'analytics' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Analytics
          </a>
        </nav>

        <div className="border-t border-white/6 pt-4 space-y-3">
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition disabled:opacity-50 text-[#0a0a0f]"
            style={{background: deploying ? '#22d3a560' : '#22d3a5'}}
          >
            {deploying ? 'Publishing…' : 'Publish to site'}
          </button>
          {lastDeployed && (
            <p className="text-xs text-white/30 text-center">Last: {lastDeployed}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 truncate">{user.email}</span>
            <button onClick={handleLogout} className="text-xs text-white/30 hover:text-white/70 transition">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 p-8">
        {page === 'scholarships' ? (
          <ScholarshipManager initialData={parsedData as ComponentProps<typeof ScholarshipManager>['initialData']} />
        ) : page === 'programs' ? (
          <ProgramManager initialData={parsedData as ComponentProps<typeof ProgramManager>['initialData']} />
        ) : (
          <AnalyticsPanel data={parsedData as AnalyticsData} />
        )}
      </main>
    </div>
  )
}
