import { useAdminList, type AdminPage, type AdminRecord } from '../../lib/use-admin-list'
import { useState } from 'react'
import { toast } from 'sonner'
import { ADMIN_PAGE_SIZE as PAGE_SIZE } from '../../lib/constants'
import { AdminTabBar, AdminPagination, AdminDeleteModal, AdminSearch, AdminSheet, AdminSection, DeadlineFigure, Icon, albertaToday } from './primitives'

import type { Program as BaseProgram } from '../../lib/data-loader'
import { PROGRAM_CATEGORIES } from '../../lib/facets'

type Program = AdminRecord<BaseProgram>

// The tabs and the dropdown read the one declared vocabulary. This list used to
// be written out here (Biology, Chemistry, Medicine...), none of which the data
// uses, so every tab but Engineering read 0 and the form offered categories
// validate-data would reject.
const CATEGORIES: readonly string[] = PROGRAM_CATEGORIES

interface Props {
  initialData: AdminPage<Program>
}

const emptyForm = (): Partial<Program> => ({
  name: '', emoji: '', category: '', provider: '', grades: '', duration: '',
  paid: false, stipend: '', cost: 'unconfirmed' as const, costNote: '', location: '', eligibility: '', deadline: '',
  url: '', description: '', lastVerified: '', active: true
})

export default function ProgramManager({ initialData }: Props) {
  const [search, setSearch] = useState('')
  const [categoryTab, setCategoryTab] = useState<string>('All')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState<{ type: 'edit' | 'add' | 'delete'; item?: Program } | null>(null)
  const [form, setForm] = useState<Partial<Program>>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const {items,setItems,total,counts:categoryCounts,refresh,error} = useAdminList(initialData, '/admin/api/programs', page, search, categoryTab, modal !== null, setPage)
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const paginated = items

  function handleSearch(value: string) {
    setSearch(value)
    setPage(0)
  }

  function handleCategoryTab(c: string) {
    setCategoryTab(c)
    setPage(0)
  }

  const openAdd = () => { setForm(emptyForm()); setShowAdvanced(false); setModal({ type: 'add' }) }
  const openEdit = (item: Program) => { setForm({ ...item }); setShowAdvanced(false); setModal({ type: 'edit', item }) }
  const openDelete = (item: Program) => setModal({ type: 'delete', item })
  const cancelDelete = () => setModal(m => (m?.item ? { type: 'edit', item: m.item } : null))
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
        body: JSON.stringify(isEdit ? {...form, revision:modal.item!.revision} : form),
      })
      if (res.status === 429) { toast.error('Too many requests. Wait a moment and try again.'); return }
      if (!res.ok) throw new Error(await res.text())
      const saved: Program = await res.json()
      setItems(prev => isEdit
        ? prev.map(p => p.id === saved.id ? saved : p)
        : [saved, ...prev]
      )
      toast.success(isEdit ? 'Program draft saved' : 'Program draft created')
      refresh()
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
      const res = await fetch(`/admin/api/programs/${modal.item.id}`, { method: 'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({revision:modal.item.revision}) })
      if (res.status === 429) { toast.error('Too many requests. Wait a moment and try again.'); return }
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(p => p.id !== modal.item!.id))
      toast.success('Program marked for removal at publication')
      refresh()
      closeModal()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const today = albertaToday()
  const set = (patch: Partial<Program>) => setForm(f => ({ ...f, ...patch }))
  const editing = modal?.type === 'edit' || modal?.type === 'add'
  const costWord: Record<string, string> = { free: 'Free', fee: 'Fee', varies: 'Cost varies', unconfirmed: 'Cost not checked' }

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Programs <small>{(categoryCounts.All ?? total).toLocaleString('en-CA')}</small></h1>
          <p className="adm-sub">Research programs, camps and competitions. Click a row to edit it.</p>
        </div>
        <div className="adm-actions">
          <button type="button" onClick={openAdd} className="adm-btn adm-btn-ghost">Add program</button>
        </div>
      </div>

      <div className="adm-tools">
        <AdminSearch label="Search programs" value={search} onChange={handleSearch} />
      </div>
      <AdminTabBar label="Category" tabs={['All', ...CATEGORIES, 'No category']} counts={categoryCounts} active={categoryTab} onSelect={handleCategoryTab} />

      <div className="adm-list">
        {paginated.map(p => (
          <button key={p.id} type="button" className="adm-row" onClick={() => openEdit(p)} aria-current={modal?.item?.id === p.id && editing ? 'true' : undefined}>
            <DeadlineFigure date={p.deadline} today={today} />
            <div className="adm-what">
              <div className="adm-name">
                <strong>{p.name}</strong>
                {p.paid && p.stipend && <span className="adm-money">{p.stipend}</span>}
              </div>
              <div className="adm-meta">
                {[p.provider, p.grades, p.location].filter(Boolean).join(', ')}
              </div>
            </div>
            <div className="adm-state">
              {p.active !== false
                ? <span className="adm-mark" data-tone="on">Listed</span>
                : <span className="adm-mark" data-tone="off">Unlisted</span>}
              {p.unpublished
                ? <span className="adm-mark" data-tone="draft">Draft, not published</span>
                : <span className="adm-mark" data-tone={p.paid ? 'on' : 'off'}>{p.paid ? 'Paid stipend' : costWord[p.cost ?? 'unconfirmed'] ?? 'Unpaid'}</span>}
            </div>
            <span className="adm-open">Edit<Icon name="open" size={14} /></span>
          </button>
        ))}
        {paginated.length === 0 && <p className="adm-empty">No programs match.</p>}
      </div>

      {error && <p role="alert" className="adm-alert">{error}</p>}
      <AdminPagination page={page} totalPages={totalPages} total={total} totalWord="total" onPage={setPage} />

      {editing && modal && (
        <AdminSheet
          id="pm-dialog"
          title={modal.type === 'edit' ? (form.name || 'Edit program') : 'Add a program'}
          sub="Saved as a draft until you publish."
          onClose={closeModal}
          footer={<>
            {modal.type === 'edit' && modal.item && (
              <button type="button" className="adm-btn adm-btn-danger" onClick={() => openDelete(modal.item!)} disabled={saving}>Delete</button>
            )}
            <span className="adm-spacer" />
            <button type="button" onClick={closeModal} disabled={saving} className="adm-btn adm-btn-ghost">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="adm-btn adm-btn-primary">{saving ? 'Saving' : 'Save draft'}</button>
          </>}
        >
          <div className="adm-field">
            <label htmlFor="pm-program-name">Name <em>required</em></label>
            <input id="pm-program-name" type="text" className="adm-input" value={form.name ?? ''}
              onChange={e => set({ name: e.target.value })} placeholder="SHAD Canada" />
          </div>
          <div className="adm-field">
            <label htmlFor="pm-organization-institution">Run by</label>
            <input id="pm-organization-institution" type="text" className="adm-input" value={form.provider ?? ''}
              onChange={e => set({ provider: e.target.value })} placeholder="University of Alberta" />
          </div>
          <div className="adm-field">
            <label htmlFor="pm-official-website">Official website <em>required</em></label>
            <input id="pm-official-website" type="url" className="adm-input" value={form.url ?? ''}
              onChange={e => set({ url: e.target.value })}
              onBlur={e => {
                const v = e.target.value.trim()
                if (v && !v.startsWith('http://') && !v.startsWith('https://')) set({ url: 'https://' + v })
              }}
              placeholder="https://" />
          </div>
          <div className="adm-grid-2">
            <div className="adm-field">
              <label htmlFor="pm-application-deadline">Deadline</label>
              <input id="pm-application-deadline" type="date" className="adm-input" value={form.deadline ?? ''}
                onChange={e => set({ deadline: e.target.value })} />
            </div>
            <div className="adm-field">
              <label htmlFor="pm-grade-levels">Grades</label>
              <input id="pm-grade-levels" type="text" className="adm-input" value={form.grades ?? ''}
                onChange={e => set({ grades: e.target.value })} placeholder="Grades 10 to 12" />
            </div>
          </div>
          <div className="adm-field">
            <label htmlFor="pm-location">Location</label>
            <input id="pm-location" type="text" className="adm-input" value={form.location ?? ''}
              onChange={e => set({ location: e.target.value })} placeholder="Edmonton, or Online" />
          </div>

          <label className="adm-check">
            <input type="checkbox" checked={form.paid ?? false} onChange={e => set({ paid: e.target.checked })} />
            <span>Students get a paid stipend</span>
          </label>
          {form.paid && (
            <input aria-label="Stipend amount" type="text" className="adm-input" value={form.stipend ?? ''}
              onChange={e => set({ stipend: e.target.value })} placeholder="Stipend amount, like $5,000" />
          )}

          {/* Separate from the stipend checkbox on purpose: not paying the
              student says nothing about whether the student pays. */}
          <div className="adm-field">
            <label htmlFor="pm-cost">What the student pays</label>
            <select id="pm-cost" className="adm-select" value={form.cost ?? 'unconfirmed'} onChange={e => set({ cost: e.target.value as Program['cost'] })}>
              <option value="unconfirmed">Not checked yet</option>
              <option value="free">Nothing, the program is free</option>
              <option value="fee">A fee</option>
              <option value="varies">Varies</option>
            </select>
            {(form.cost === 'fee' || form.cost === 'varies') && (
              <input aria-label="Program fee details" type="text" className="adm-input" value={form.costNote ?? ''}
                onChange={e => set({ costNote: e.target.value })} placeholder="The fee in the provider's words, like ~$1,700 per module" />
            )}
          </div>

          <label className="adm-check">
            <input type="checkbox" checked={form.active ?? true} onChange={e => set({ active: e.target.checked })} />
            <span>List it on the public site when published</span>
          </label>

          <AdminSection title="More details" open={showAdvanced} onToggle={() => setShowAdvanced(v => !v)}>
            <div className="adm-field">
              <label htmlFor="pm-category">Category</label>
              <select id="pm-category" className="adm-select" value={form.category ?? ''} onChange={e => set({ category: e.target.value })}>
                <option value="">Choose</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="pm-duration">Duration</label>
              <input id="pm-duration" type="text" className="adm-input" value={form.duration ?? ''}
                onChange={e => set({ duration: e.target.value })} placeholder="4 weeks" />
            </div>
            <div className="adm-field">
              <label htmlFor="pm-eligibility-requirements">Who can apply</label>
              <input id="pm-eligibility-requirements" type="text" className="adm-input" value={form.eligibility ?? ''}
                onChange={e => set({ eligibility: e.target.value })} />
            </div>
            <div className="adm-field">
              <label htmlFor="pm-description">Description</label>
              <textarea id="pm-description" className="adm-textarea" rows={4} value={form.description ?? ''}
                onChange={e => set({ description: e.target.value })} />
            </div>
            <div className="adm-field">
              <label htmlFor="pm-emoji-icon">Emoji</label>
              <input id="pm-emoji-icon" type="text" className="adm-input" value={form.emoji ?? ''}
                onChange={e => set({ emoji: e.target.value })} />
            </div>
          </AdminSection>
        </AdminSheet>
      )}

      {modal?.type === 'delete' && (
        <AdminDeleteModal idPrefix="pm" entityLabel="program" itemName={modal.item?.name} saving={saving} onCancel={cancelDelete} onConfirm={handleDelete} />
      )}
    </div>
  )
}
