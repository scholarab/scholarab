import { useAdminList, type AdminPage, type AdminRecord } from '../../lib/use-admin-list'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { EMPTY_ELIGIBILITY } from '../../lib/eligibility-types'
import { EligibilityEditor } from './EligibilityEditor'
import { AdminFacetSelect, AdminPagination, AdminDeleteModal, AdminSearch, AdminSheet, AdminSection, DeadlineFigure, albertaToday } from './primitives'
import { ADMIN_PAGE_SIZE as PAGE_SIZE } from '../../lib/constants'

import type { Scholarship as BaseScholarship } from '../../lib/data-loader'

// Admin rows carry updatedAt for optimistic locking; the public type doesn't.
type Scholarship = AdminRecord<BaseScholarship>

const CATEGORIES = ['Academic', 'Arts', 'Community', 'Environmental', 'General', 'Indigenous', 'STEM', 'Sports', 'Trades']
const KNOWN_REGIONS = ['National', 'Alberta', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat', 'Red Deer']

interface Props {
  initialData: AdminPage<Scholarship>
}

const emptyForm = (): Partial<Scholarship> => ({
  title: '', amount: '', deadline: '', openDate: '', audience: '', url: '',
  category: '', lastVerified: '', region: '', notes: '', applyViaGuidance: false, active: true,
  eligibility: null,
})

export default function ScholarshipManager({ initialData }: Props) {
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

  const { items, setItems, total, counts: regionCounts, refresh, error } = useAdminList(initialData, '/admin/api/scholarships', page, search, regionTab, modal !== null, setPage)

  // Duplicate detection: only active when adding, checks local state for instant feedback
  const localDuplicate = useMemo(() => {
    if (modal?.type !== 'add' || !form.title?.trim()) return null
    const needle = form.title.trim().toLowerCase()
    return items.find(s => s.title.trim().toLowerCase() === needle) ?? null
  }, [form.title, items, modal?.type])

  const REGIONS = [...new Set([...KNOWN_REGIONS, ...Object.keys(regionCounts).filter(k => k !== 'All' && k !== 'No region')])]
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const paginated = items

  function handleSearch(value: string) {
    setSearch(value)
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
      // keep stale data if fetch fails, not ideal but still workable
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
  // Keep it goes back to the editor, with the form as it was left.
  const cancelDelete = () => setModal(m => (m?.item ? { type: 'edit', item: m.item } : null))
  const closeModal = () => { setModal(null); setFetching(false); setParsing(false) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = modal?.type === 'edit'
      const url = isEdit ? `/admin/api/scholarships/${modal.item!.id}` : '/admin/api/scholarships'
      const method = isEdit ? 'PUT' : 'POST'
      // Include updatedAt for optimistic locking on edits
      const body = isEdit ? { ...form, revision: modal.item!.revision } : form
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 429) {
        toast.error('Too many requests. Wait a moment and try again.')
        return
      }

      if (res.status === 409) {
        const err = await res.json()
        toast.error(err.message ?? err.error ?? 'This record changed. Refresh and try again.')
        refresh()
        return // Keep the unsaved form visible so the editor can recover it.
      }

      if (!res.ok) throw new Error(await res.text())
      const saved: Scholarship = await res.json()
      setItems(prev => isEdit
        ? prev.map(s => s.id === saved.id ? saved : s)
        : [saved, ...prev]
      )
      toast.success(isEdit ? 'Scholarship draft saved' : 'Scholarship draft created')
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
      const res = await fetch(`/admin/api/scholarships/${modal.item.id}`, { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({revision: modal.item.revision}) })
      if (res.status === 429) { toast.error('Too many requests. Wait a moment and try again.'); return }
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(s => s.id !== modal.item!.id))
      toast.success('Scholarship marked for removal at publication')
      refresh()
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
        if (res.status === 429) {
          toast.error('Rate limit hit. Parse this page stopped. Try again in an hour.')
          setBulkProgress(null)
          return
        }
        if (res.ok) {
          const { eligibility } = await res.json()
          // Save immediately
          const savedResponse = await fetch(`/admin/api/scholarships/${s.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eligibility, revision: s.revision }),
          })
          if (!savedResponse.ok) throw new Error(`Save failed (${savedResponse.status})`)
          const saved = await savedResponse.json() as Scholarship
          setItems(prev => prev.map(x => x.id === s.id ? saved : x))
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
    else toast.error(`Tagged ${done - failed}/${done}, ${failed} failed`)
  }

  const ALL_TABS = ['All', ...REGIONS, 'No region']

  const today = albertaToday()
  const untagged = items.filter(s => !s.eligibility && s.audience?.trim()).length
  const set = (patch: Partial<Scholarship>) => setForm(f => ({ ...f, ...patch }))
  const editing = modal?.type === 'edit' || modal?.type === 'add'

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Scholarships <small>{(regionCounts.All ?? total).toLocaleString('en-CA')}</small></h1>
        </div>
        <div className="adm-actions">
          {bulkProgress ? (
            <span className="adm-progress" role="status">Parsing {bulkProgress.done} of {bulkProgress.total}</span>
          ) : untagged > 0 && (
            <button type="button" onClick={handleBulkParse} className="adm-btn adm-btn-ghost">Tag {untagged} untagged with AI</button>
          )}
          <button type="button" onClick={openAdd} className="adm-btn adm-btn-ghost">Add scholarship</button>
        </div>
      </div>

      <div className="adm-tools">
        <AdminSearch label="Search scholarships" value={search} onChange={handleSearch} />
        <AdminFacetSelect label="Region" all="All regions" tabs={ALL_TABS} counts={regionCounts} active={regionTab} onSelect={handleRegionTab} />
      </div>

      <div className="adm-list">
        {paginated.map(s => (
          <button key={s.id} type="button" className="adm-row" onClick={() => openEdit(s)} aria-current={modal?.item?.id === s.id && editing ? 'true' : undefined}>
            <DeadlineFigure date={s.deadline} today={today} />
            <div className="adm-what">
              <div className="adm-name">
                <strong>{s.title}</strong>
                {s.amount && <span className="adm-money">{s.amount}</span>}
              </div>
              <div className="adm-meta">
                {[s.region || 'No region', s.category || null].filter(Boolean).join(', ')}
                {!s.eligibility && <>. <b className="adm-flag">Not tagged</b></>}
                {s.audience ? <>. <i>{s.audience}</i></> : null}
              </div>
            </div>
            <div className="adm-state">
              {s.unpublished
                ? <span className="adm-mark" data-tone="draft">Draft</span>
                : s.active
                  ? <span className="adm-mark" data-tone="on">Active cycle</span>
                  : <span className="adm-mark" data-tone="off">Between cycles</span>}
            </div>
          </button>
        ))}
        {paginated.length === 0 && <p className="adm-empty">No scholarships match.</p>}
      </div>

      {error && <p role="alert" className="adm-alert">{error}</p>}
      <AdminPagination page={page} totalPages={totalPages} total={total} totalWord="results" onPage={setPage} />

      {editing && modal && (
        <AdminSheet
          id="sm-dialog"
          title={modal.type === 'edit' ? (form.title || 'Edit scholarship') : 'Add a scholarship'}
          sub={fetching ? <span className="adm-loading">Loading the latest version</span> : 'Saved as a draft until you publish.'}
          onClose={closeModal}
          footer={<>
            {modal.type === 'edit' && modal.item && (
              <button type="button" className="adm-btn adm-btn-danger" onClick={() => openDelete(modal.item!)} disabled={saving}>Delete</button>
            )}
            <span className="adm-spacer" />
            <button type="button" onClick={closeModal} disabled={saving} className="adm-btn adm-btn-ghost">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving || fetching || !!localDuplicate} className="adm-btn adm-btn-primary">
              {saving ? 'Saving' : 'Save draft'}
            </button>
          </>}
        >
          {localDuplicate && (
            <p className="adm-warn" role="alert">A scholarship called {localDuplicate.title} already exists.</p>
          )}

          <div className="adm-field">
            <label htmlFor="sm-scholarship-name">Name <em>required</em></label>
            <input id="sm-scholarship-name" type="text" className="adm-input" value={form.title ?? ''}
              onChange={e => set({ title: e.target.value })} placeholder="Alexander Rutherford Scholarship" />
          </div>

          <div className="adm-grid-2">
            <div className="adm-field">
              <label htmlFor="sm-amount">Amount <em>required</em></label>
              <input id="sm-amount" type="text" className="adm-input" value={form.amount ?? ''}
                onChange={e => set({ amount: e.target.value })}
                onBlur={e => {
                  const v = e.target.value.trim()
                  if (v && /^\d/.test(v)) set({ amount: '$' + v })
                }}
                placeholder="$2,500 or Varies" />
            </div>
            <div className="adm-field">
              <label htmlFor="sm-application-deadline">Deadline</label>
              <input id="sm-application-deadline" type="date" className="adm-input" value={form.deadline ?? ''}
                onChange={e => set({ deadline: e.target.value })} />
            </div>
          </div>

          <div className="adm-field">
            <label htmlFor="sm-official-website">Official website <em>required</em></label>
            <input id="sm-official-website" type="url" className="adm-input" value={form.url ?? ''}
              onChange={e => set({ url: e.target.value })}
              onBlur={e => {
                const v = e.target.value.trim()
                if (v && !v.startsWith('http://') && !v.startsWith('https://')) set({ url: 'https://' + v })
              }}
              placeholder="https://" />
          </div>

          <div className="adm-grid-2">
            <div className="adm-field">
              <label htmlFor="sm-category">Category</label>
              <select id="sm-category" className="adm-select" value={form.category ?? ''} onChange={e => set({ category: e.target.value })}>
                <option value="">Choose</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="sm-region">Region</label>
              <select id="sm-region" className="adm-select" value={form.region ?? ''} onChange={e => set({ region: e.target.value })}>
                <option value="">Choose</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <label className="adm-check">
            <input type="checkbox" checked={form.active ?? true} onChange={e => set({ active: e.target.checked })} />
            <span>Active cycle. Untick between cycles, the listing stays up.</span>
          </label>

          <AdminSection title="More details" open={showAdvanced} onToggle={() => setShowAdvanced(v => !v)}>
            <div className="adm-field">
              <label htmlFor="sm-who-can-apply-audience">Who can apply</label>
              <input id="sm-who-can-apply-audience" type="text" className="adm-input" value={form.audience ?? ''}
                onChange={e => set({ audience: e.target.value })} placeholder="Grade 12 students in Lethbridge" />
            </div>
            <div className="adm-field">
              <label htmlFor="sm-notes">Notes</label>
              <textarea id="sm-notes" className="adm-textarea" rows={3} value={form.notes ?? ''}
                onChange={e => set({ notes: e.target.value })} />
            </div>
            <div className="adm-field">
              <label htmlFor="sm-applications-open-date">Applications open</label>
              <input id="sm-applications-open-date" type="date" className="adm-input" value={form.openDate ?? ''}
                onChange={e => set({ openDate: e.target.value })} />
            </div>
            <label className="adm-check">
              <input type="checkbox" checked={form.applyViaGuidance ?? false} onChange={e => set({ applyViaGuidance: e.target.checked })} />
              <span>Students apply through the school guidance office</span>
            </label>
          </AdminSection>

          <AdminSection
            title={form.eligibility ? 'Eligibility, tagged' : 'Eligibility'}
            open={showEligibility}
            onToggle={() => setShowEligibility(v => !v)}
            aside={modal.type === 'edit' && modal.item?.audience ? (
              <button type="button" onClick={handleParseEligibility} disabled={parsing} className="adm-btn adm-btn-ghost">
                {parsing ? 'Parsing' : 'Parse with AI'}
              </button>
            ) : undefined}
          >
            <EligibilityEditor
              value={form.eligibility ?? EMPTY_ELIGIBILITY}
              onChange={e => set({ eligibility: e })}
            />
          </AdminSection>
        </AdminSheet>
      )}

      {modal?.type === 'delete' && (
        <AdminDeleteModal idPrefix="sm" entityLabel="scholarship" itemName={modal.item?.title} saving={saving} onCancel={cancelDelete} onConfirm={handleDelete} />
      )}
    </div>
  )
}
