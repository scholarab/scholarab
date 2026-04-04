import { useState, useMemo } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 25

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
}

const CATEGORIES = ['Arts', 'Business', 'Community', 'Engineering', 'General', 'Health', 'Indigenous', 'LGBTQ+', 'Science', 'Sports', 'Trades', 'Other']
const REGIONS = ['Province-wide', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Northern Alberta', 'Southern Alberta', 'Canada-wide']

interface Props {
  initialData: Scholarship[]
}

const emptyForm = (): Partial<Scholarship> => ({
  title: '', amount: '', deadline: '', openDate: '', audience: '', url: '',
  category: '', lastVerified: '', region: '', notes: '', applyViaGuidance: false, active: true
})

export default function ScholarshipManager({ initialData }: Props) {
  const [items, setItems] = useState<Scholarship[]>(initialData)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState<{ type: 'edit' | 'add' | 'delete'; item?: Scholarship } | null>(null)
  const [form, setForm] = useState<Partial<Scholarship>>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const filtered = useMemo(() =>
    items.filter(s => s.title.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(0)
  }

  const openAdd = () => { setForm(emptyForm()); setShowAdvanced(false); setModal({ type: 'add' }) }
  const openEdit = (item: Scholarship) => { setForm({ ...item }); setShowAdvanced(false); setModal({ type: 'edit', item }) }
  const openDelete = (item: Scholarship) => setModal({ type: 'delete', item })
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = modal?.type === 'edit'
      const url = isEdit ? `/admin/api/scholarships/${modal.item!.id}` : '/admin/api/scholarships'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
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

  const field = (key: keyof Scholarship, label: string, type = 'text') => (
    <div key={key}>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      <input
        type={type}
        value={(form[key] as string) ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50 transition"
      />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Scholarships</h1>
          <p className="text-sm text-white/40">{items.length} total</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-lg text-sm font-medium text-[#0a0a0f]" style={{background:'#22d3a5'}}>
          + Add scholarship
        </button>
      </div>

      <input
        type="search"
        placeholder="Search scholarships…"
        value={search}
        onChange={handleSearch}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white mb-4 focus:outline-none focus:border-[#22d3a5]/50 transition"
      />

      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase">
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Deadline</th>
              <th className="text-left px-4 py-3 font-medium">Region</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((s, i) => (
              <tr key={s.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                <td className="px-4 py-3 font-medium max-w-xs truncate">{s.title}</td>
                <td className="px-4 py-3 text-white/60">{s.amount}</td>
                <td className="px-4 py-3 text-white/60">{s.deadline || '—'}</td>
                <td className="px-4 py-3 text-white/60">{s.region || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.active ? 'bg-[#22d3a5]/15 text-[#22d3a5]' : 'bg-white/10 text-white/40'}`}>
                    {s.active ? 'Active' : 'Inactive'}
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
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1">{modal.type === 'edit' ? 'Edit Scholarship' : 'Add Scholarship'}</h2>
            <p className="text-xs text-white/30 mb-5">Fields marked * are required</p>

            {/* ── Essential fields ── */}
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
                    <option value="">— Select —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">Region</label>
                  <select value={form.region ?? ''} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                    className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22d3a5]/50">
                    <option value="">— Select —</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

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

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white border border-white/10 transition disabled:opacity-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-[#0a0a0f] disabled:opacity-50" style={{background:'#22d3a5'}}>
                {saving ? 'Saving…' : 'Save scholarship'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal?.type === 'delete' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Delete scholarship?</h2>
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
