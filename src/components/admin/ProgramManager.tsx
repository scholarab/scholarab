import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { ADMIN_PAGE_SIZE as PAGE_SIZE } from '../../lib/constants'

type Program = {
  id: number
  name: string
  emoji: string | null
  category: string | null
  provider: string | null
  grades: string | null
  duration: string | null
  paid: boolean
  stipend: string | null
  location: string | null
  eligibility: string | null
  deadline: string | null
  url: string
  description: string | null
  lastVerified: string | null
  active: boolean
}

const CATEGORIES = ['Biology', 'Chemistry', 'Computer Science', 'Engineering', 'Environmental', 'Math', 'Medicine', 'Physics', 'Social Science', 'Multidisciplinary', 'Other']

interface Props {
  initialData: Program[]
}

const emptyForm = (): Partial<Program> => ({
  name: '', emoji: '', category: '', provider: '', grades: '', duration: '',
  paid: false, stipend: '', location: '', eligibility: '', deadline: '',
  url: '', description: '', lastVerified: '', active: true
})

export default function ProgramManager({ initialData }: Props) {
  const [items, setItems] = useState<Program[]>(initialData)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState<{ type: 'edit' | 'add' | 'delete'; item?: Program } | null>(null)
  const [form, setForm] = useState<Partial<Program>>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const filtered = useMemo(() =>
    items.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(0)
  }

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal])

  const openAdd = () => { setForm(emptyForm()); setShowAdvanced(false); setModal({ type: 'add' }) }
  const openEdit = (item: Program) => { setForm({ ...item }); setShowAdvanced(false); setModal({ type: 'edit', item }) }
  const openDelete = (item: Program) => setModal({ type: 'delete', item })
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = modal?.type === 'edit'
      const url = isEdit ? `/admin/api/programs/${modal.item!.id}` : '/admin/api/programs'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const saved: Program = await res.json()
      setItems(prev => isEdit
        ? prev.map(p => p.id === saved.id ? saved : p)
        : [saved, ...prev]
      )
      toast.success(isEdit ? 'Program updated' : 'Program added')
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
      const res = await fetch(`/admin/api/programs/${modal.item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(p => p.id !== modal.item!.id))
      toast.success('Program deleted')
      closeModal()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const textarea = (key: keyof Program, label: string) => (
    <div key={key}>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      <textarea
        value={(form[key] as string) ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50 transition resize-none"
      />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Research Programs</h1>
          <p className="text-sm text-white/40">{items.length} total</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-lg text-sm font-medium text-[#0a0a0f]" style={{background:'#22d3a5'}}>
          + Add program
        </button>
      </div>

      <input
        type="search"
        aria-label="Search programs"
        placeholder="Search programs…"
        value={search}
        onChange={handleSearch}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white mb-4 focus:outline-none focus:border-[#22d3a5]/50 transition"
      />

      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Provider</th>
              <th className="text-left px-4 py-3 font-medium">Grades</th>
              <th className="text-left px-4 py-3 font-medium">Location</th>
              <th className="text-left px-4 py-3 font-medium">Paid</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((p, i) => (
              <tr key={p.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                <td className="px-4 py-3 font-medium max-w-xs truncate">
                  {p.emoji && <span className="mr-1.5">{p.emoji}</span>}
                  {p.name}
                </td>
                <td className="px-4 py-3 text-white/60">{p.provider || ''}</td>
                <td className="px-4 py-3 text-white/60">{p.grades || ''}</td>
                <td className="px-4 py-3 text-white/60">{p.location || ''}</td>
                <td className="px-4 py-3">
                  {p.paid ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#22d3a5]/15 text-[#22d3a5]">Paid</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40">Unpaid</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-[#22d3a5]/15 text-[#22d3a5]' : 'bg-white/10 text-white/40'}`}>
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(p)} className="text-white/30 hover:text-white mr-3 transition">Edit</button>
                  <button onClick={() => openDelete(p)} className="text-red-400/50 hover:text-red-400 transition">Delete</button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No programs found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-white/40">
          <span>{filtered.length} total · page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:border-white/20 transition"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:border-white/20 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {(modal?.type === 'edit' || modal?.type === 'add') && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div role="dialog" aria-modal="true" aria-labelledby="pm-dialog-title" className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 id="pm-dialog-title" className="text-lg font-semibold mb-1">{modal.type === 'edit' ? 'Edit Program' : 'Add Program'}</h2>
            <p className="text-xs text-white/30 mb-5">Fields marked * are required</p>

            {/* ── Essential fields ── */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1.5">Program name *</label>
                <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. SHAD Canada"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition" />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">Organization / Institution</label>
                <input type="text" value={form.provider ?? ''} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                  placeholder="e.g. University of Alberta"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition" />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">Official website *</label>
                <input type="url" value={form.url ?? ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">Application deadline</label>
                  <input type="date" value={form.deadline ?? ''} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50 transition" />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">Grade levels</label>
                  <input type="text" value={form.grades ?? ''} onChange={e => setForm(f => ({ ...f, grades: e.target.value }))}
                    placeholder="e.g. Grade 10–12"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">Location</label>
                <input type="text" value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Edmonton, AB or Online"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.paid ?? false} onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))} className="accent-[#22d3a5] w-4 h-4" />
                <span className="text-sm text-white/70">Students receive a paid stipend</span>
              </label>
              {form.paid && (
                <input type="text" value={form.stipend ?? ''} onChange={e => setForm(f => ({ ...f, stipend: e.target.value }))}
                  placeholder="Stipend amount (e.g. $5,000)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition" />
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.active ?? true} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-[#22d3a5] w-4 h-4" />
                <span className="text-sm text-white/70">Show on public site (active)</span>
              </label>
            </div>

            {/* ── Advanced toggle ── */}
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
                  <label className="block text-xs text-white/50 mb-1">Category</label>
                  <select value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50">
                    <option value="">Select</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Duration</label>
                  <input type="text" value={form.duration ?? ''} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="e.g. 4 weeks"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#22d3a5]/50 transition" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Eligibility requirements</label>
                  <input type="text" value={form.eligibility ?? ''} onChange={e => setForm(f => ({ ...f, eligibility: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50 transition" />
                </div>
                {textarea('description', 'Description')}
                <div>
                  <label className="block text-xs text-white/50 mb-1">Emoji icon</label>
                  <input type="text" value={form.emoji ?? ''} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                    placeholder="e.g. 🔬"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50 transition" />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white border border-white/10 transition disabled:opacity-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-[#0a0a0f] disabled:opacity-50" style={{background:'#22d3a5'}}>
                {saving ? 'Saving…' : 'Save program'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal?.type === 'delete' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeModal}>
          <div role="dialog" aria-modal="true" aria-labelledby="pm-delete-title" className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 id="pm-delete-title" className="text-lg font-semibold mb-2">Delete program?</h2>
            <p className="text-white/50 text-sm mb-6">"{modal.item?.name}" will be permanently removed.</p>
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
