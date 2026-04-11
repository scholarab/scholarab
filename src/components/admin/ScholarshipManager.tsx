import { useState, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { EligibilityCriteria } from '../../lib/eligibility-types'
import { EMPTY_ELIGIBILITY } from '../../lib/eligibility-types'
import { EligibilityEditor } from './EligibilityEditor'
import { ADMIN_PAGE_SIZE as PAGE_SIZE } from '../../lib/constants'
const REFRESH_INTERVAL = 60_000 // 60 seconds

type Scholarship = {
  id: number
  title: string
  amount: string
  deadline: string | null
  openDate: string | null
  audience: string | null
  url: string
  category: string | null
  lastVerified: string | null
  region: string | null
  notes: string | null
  applyViaGuidance: boolean
  active: boolean
  eligibility: EligibilityCriteria | null
  updatedAt: string
}

const CATEGORIES = ['Arts', 'Business', 'Community', 'Engineering', 'General', 'Health', 'Indigenous', 'Science', 'Sports', 'Trades', 'Other']
const REGIONS = ['National', 'Alberta', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat', 'Red Deer']

interface Props {
  initialData: Scholarship[]
}

const emptyForm = (): Partial<Scholarship> => ({
  title: '', amount: '', deadline: '', openDate: '', audience: '', url: '',
  category: '', lastVerified: '', region: '', notes: '', applyViaGuidance: false, active: true,
  eligibility: null,
})

export default function ScholarshipManager({ initialData }: Props) {
  const [items, setItems] = useState<Scholarship[]>(initialData)
  const [search, setSearch] = useState('')
  const [regionTab, setRegionTab] = useState<string>('All')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState<{ type: 'edit' | 'add' | 'delete'; item?: Scholarship } | null>(null)
  const [form, setForm] = useState<Partial<Scholarship>>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showEligibility, setShowEligibility] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const modalOpenRef = useRef(false)

  // Auto-refresh every 60s — skip if a modal is open to avoid disrupting edits
  useEffect(() => {
    const interval = setInterval(async () => {
      if (modalOpenRef.current) return
      try {
        const res = await fetch('/admin/api/scholarships')
        if (!res.ok) return
        const fresh: Scholarship[] = await res.json()
        setItems(fresh)
      } catch {
        // silent — don't bother user if refresh fails
      }
    }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    modalOpenRef.current = modal !== null
  }, [modal])

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setModal(null); setFetching(false); setParsing(false) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal])

  // Duplicate detection: only active when adding, checks local state for instant feedback
  const localDuplicate = useMemo(() => {
    if (modal?.type !== 'add' || !form.title?.trim()) return null
    const needle = form.title.trim().toLowerCase()
    return items.find(s => s.title.trim().toLowerCase() === needle) ?? null
  }, [form.title, items, modal?.type])

  const filtered = useMemo(() => {
    let list = items.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
    if (regionTab !== 'All') {
      list = regionTab === 'No region'
        ? list.filter(s => !s.region)
        : list.filter(s => s.region === regionTab)
    }
    return list
  }, [items, search, regionTab])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length, 'No region': 0 }
    for (const r of REGIONS) counts[r] = 0
    for (const s of items) {
      if (s.region && counts[s.region] !== undefined) counts[s.region]++
      else if (!s.region) counts['No region']++
    }
    return counts
  }, [items])

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(0)
  }

  function handleRegionTab(r: string) {
    setRegionTab(r)
    setPage(0)
  }

  const openAdd = () => { setForm(emptyForm()); setShowAdvanced(false); setShowEligibility(false); setModal({ type: 'add' }) }

  // Re-fetch fresh data before opening edit modal
  const openEdit = async (item: Scholarship) => {
    setForm({ ...item })
    setShowAdvanced(false)
    setShowEligibility(false)
    setModal({ type: 'edit', item })
    setFetching(true)
    try {
      const res = await fetch(`/admin/api/scholarships/${item.id}`)
      if (res.ok) {
        const fresh: Scholarship = await res.json()
        setForm({ ...fresh })
        setModal({ type: 'edit', item: fresh })
      }
    } catch {
      // keep stale data if fetch fails — not ideal but still workable
    } finally {
      setFetching(false)
    }
  }

  const handleParseEligibility = async () => {
    if (!modal?.item?.id) return
    setParsing(true)
    try {
      const res = await fetch('/admin/api/scholarships/parse-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: modal.item.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error('Parse failed: ' + (err.error ?? 'Unknown error'))
        return
      }
      const { eligibility } = await res.json()
      setForm(f => ({ ...f, eligibility }))
      setShowEligibility(true)
      toast.success('Eligibility parsed. Review and save.')
    } catch (e) {
      toast.error('Parse failed: ' + String(e))
    } finally {
      setParsing(false)
    }
  }

  const openDelete = (item: Scholarship) => setModal({ type: 'delete', item })
  const closeModal = () => { setModal(null); setFetching(false); setParsing(false) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = modal?.type === 'edit'
      const url = isEdit ? `/admin/api/scholarships/${modal.item!.id}` : '/admin/api/scholarships'
      const method = isEdit ? 'PUT' : 'POST'
      // Include updatedAt for optimistic locking on edits
      const body = isEdit ? { ...form, updatedAt: modal.item!.updatedAt } : form
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        const err = await res.json()
        if (err.error === 'duplicate') {
          toast.error(`Already exists: "${err.existing}"`)
        } else if (err.error === 'conflict') {
          toast.error(err.message)
          // Refresh list so they see the latest state
          const fresh = await fetch('/admin/api/scholarships')
          if (fresh.ok) setItems(await fresh.json())
          closeModal()
        }
        return
      }

      if (!res.ok) throw new Error(await res.text())
      const saved: Scholarship = await res.json()
      setItems(prev => isEdit
        ? prev.map(s => s.id === saved.id ? saved : s)
        : [saved, ...prev]
      )
      toast.success(isEdit ? 'Scholarship updated' : 'Scholarship added')
      closeModal()
    } catch (e) {
      toast.error('Failed to save: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!modal?.item) return
    setSaving(true)
    try {
      const res = await fetch(`/admin/api/scholarships/${modal.item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(s => s.id !== modal.item!.id))
      toast.success('Scholarship deleted')
      closeModal()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const handleBulkParse = async () => {
    const untagged = items.filter(s => !s.eligibility && s.audience?.trim())
    if (untagged.length === 0) { toast.success('All scholarships are already tagged'); return }
    setBulkProgress({ done: 0, total: untagged.length })
    let done = 0
    let failed = 0
    for (let i = 0; i < untagged.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 500))
      const s = untagged[i]!
      try {
        const res = await fetch('/admin/api/scholarships/parse-eligibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: s.id }),
        })
        if (res.ok) {
          const { eligibility } = await res.json()
          // Save immediately
          await fetch(`/admin/api/scholarships/${s.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eligibility }),
          })
          setItems(prev => prev.map(x => x.id === s.id ? { ...x, eligibility } : x))
        } else {
          failed++
        }
      } catch {
        failed++
      }
      done++
      setBulkProgress({ done, total: untagged.length })
    }
    setBulkProgress(null)
    if (failed === 0) toast.success(`Tagged ${done} scholarship${done !== 1 ? 's' : ''}`)
    else toast.success(`Tagged ${done - failed}/${done}, ${failed} failed`)
  }

  const ALL_TABS = ['All', ...REGIONS, 'No region']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Scholarships</h1>
          <p className="text-sm text-white/40">
            {items.length} total · {items.filter(s => s.eligibility).length} tagged
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bulkProgress ? (
            <span className="text-xs text-white/40 animate-pulse">
              Parsing {bulkProgress.done}/{bulkProgress.total}…
            </span>
          ) : (
            <button
              onClick={handleBulkParse}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition"
            >
              ✦ Parse all untagged
            </button>
          )}
          <button onClick={openAdd} className="px-4 py-2 rounded-lg text-sm font-medium text-[#0a0a0f]" style={{background:'#22d3a5'}}>
            + Add scholarship
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="search"
        aria-label="Search scholarships"
        placeholder="Search scholarships…"
        value={search}
        onChange={handleSearch}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white mb-4 focus:outline-none focus:border-[#22d3a5]/50 transition"
      />

      {/* Region tabs */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {ALL_TABS.map(r => {
          const count = regionCounts[r] ?? 0
          const active = regionTab === r
          return (
            <button
              key={r}
              onClick={() => handleRegionTab(r)}
              className="px-3 py-1 rounded-full text-xs font-medium transition"
              style={{
                background: active ? 'rgba(34,211,165,0.15)' : 'rgba(255,255,255,0.05)',
                border: active ? '1px solid rgba(34,211,165,0.35)' : '1px solid rgba(255,255,255,0.08)',
                color: active ? '#22d3a5' : 'rgba(255,255,255,0.4)',
              }}
            >
              {r}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase">
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Deadline</th>
              <th className="text-left px-4 py-3 font-medium">Region</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Eligibility</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((s, i) => (
              <tr key={s.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                <td className="px-4 py-3 font-medium max-w-xs truncate">{s.title}</td>
                <td className="px-4 py-3 text-white/60">{s.amount}</td>
                <td className="px-4 py-3 text-white/60">{s.deadline || ''}</td>
                <td className="px-4 py-3 text-white/60">{s.region || ''}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.active ? 'bg-[#22d3a5]/15 text-[#22d3a5]' : 'bg-white/10 text-white/40'}`}>
                    {s.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.eligibility ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-white/25'}`}>
                    {s.eligibility ? 'Tagged' : 'Untagged'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(s)} className="text-white/30 hover:text-white mr-3 transition">Edit</button>
                  <button onClick={() => openDelete(s)} className="text-red-400/50 hover:text-red-400 transition">Delete</button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No scholarships found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-white/40">
          <span>{filtered.length} results · page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:border-white/20 transition">
              ← Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:border-white/20 transition">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {(modal?.type === 'edit' || modal?.type === 'add') && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div role="dialog" aria-modal="true" aria-labelledby="sm-dialog-title" className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 id="sm-dialog-title" className="text-lg font-semibold">{modal.type === 'edit' ? 'Edit Scholarship' : 'Add Scholarship'}</h2>
              {fetching && <span className="text-xs text-white/30 animate-pulse">Loading latest…</span>}
            </div>
            <p className="text-xs text-white/30 mb-5">Fields marked * are required</p>

            {/* Duplicate warning */}
            {localDuplicate && (
              <div className="mb-4 px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-sm">
                ⚠️ A scholarship with this name already exists: <span className="font-semibold">"{localDuplicate.title}"</span>
              </div>
            )}

            {/* Essential fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1.5">Scholarship name *</label>
                <input
                  type="text"
                  value={form.title ?? ''}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Alexander Rutherford Scholarship"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">Amount *</label>
                <input
                  type="text"
                  value={form.amount ?? ''}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. $2,500 or Varies"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">Application deadline</label>
                <input
                  type="date"
                  value={form.deadline ?? ''}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">Official website *</label>
                <input
                  type="url"
                  value={form.url ?? ''}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">Category</label>
                  <select value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50">
                    <option value="">Select</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">Region</label>
                  <select value={form.region ?? ''} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                    className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50">
                    <option value="">Select</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.active ?? true} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-[#22d3a5] w-4 h-4" />
                <span className="text-sm text-white/70">Show on public site (active)</span>
              </label>
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="mt-5 text-xs text-white/30 hover:text-white/60 transition flex items-center gap-1"
            >
              <span>{showAdvanced ? '▾' : '▸'}</span>
              {showAdvanced ? 'Hide advanced fields' : 'Show advanced fields'}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Who can apply? (Audience)</label>
                  <input type="text" value={form.audience ?? ''} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                    placeholder="e.g. Grade 12 students, First Nations youth"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Notes</label>
                  <input type="text" value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50 transition" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Applications open date</label>
                  <input type="date" value={form.openDate ?? ''} onChange={e => setForm(f => ({ ...f, openDate: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50 transition" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.applyViaGuidance ?? false} onChange={e => setForm(f => ({ ...f, applyViaGuidance: e.target.checked }))} className="accent-[#22d3a5]" />
                  <span className="text-white/50">Students apply through school guidance office</span>
                </label>
              </div>
            )}

            {/* ── Eligibility toggle ── */}
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowEligibility(v => !v)}
                  className="text-xs text-white/30 hover:text-white/60 transition flex items-center gap-1"
                >
                  <span>{showEligibility ? '▾' : '▸'}</span>
                  {showEligibility ? 'Hide eligibility criteria' : 'Show eligibility criteria'}
                  {form.eligibility && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">Tagged</span>}
                </button>
                {modal?.type === 'edit' && modal.item?.audience && (
                  <button
                    type="button"
                    onClick={handleParseEligibility}
                    disabled={parsing}
                    className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition disabled:opacity-40"
                  >
                    {parsing ? 'Parsing…' : '✦ Parse with AI'}
                  </button>
                )}
              </div>

              {showEligibility && (
                <div className="mt-3 space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <EligibilityEditor
                    value={form.eligibility ?? EMPTY_ELIGIBILITY}
                    onChange={e => setForm(f => ({ ...f, eligibility: e }))}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white border border-white/10 transition disabled:opacity-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || fetching || !!localDuplicate} className="px-4 py-2 rounded-lg text-sm font-medium text-[#0a0a0f] disabled:opacity-50" style={{background:'#22d3a5'}}>
                {saving ? 'Saving…' : 'Save scholarship'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal?.type === 'delete' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeModal}>
          <div role="dialog" aria-modal="true" aria-labelledby="sm-delete-title" className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 id="sm-delete-title" className="text-lg font-semibold mb-2">Delete scholarship?</h2>
            <p className="text-white/50 text-sm mb-6">"{modal.item?.title}" will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white border border-white/10 transition disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

