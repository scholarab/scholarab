// Shared presentational primitives for the two admin managers. These render
// exactly the markup the managers used to inline; behavior stays in the
// managers themselves.

export function AdminTabBar({ tabs, counts, active, onSelect }: {
  tabs: string[]
  counts: Record<string, number>
  active: string
  onSelect: (tab: string) => void
}) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-4">
      {tabs.map(t => {
        const count = counts[t] ?? 0
        const isActive = active === t
        return (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className="px-3 py-1 rounded-full text-xs font-medium transition"
            style={{
              background: isActive ? 'rgba(34,211,165,0.15)' : 'rgba(255,255,255,0.05)',
              border: isActive ? '1px solid rgba(34,211,165,0.35)' : '1px solid rgba(255,255,255,0.08)',
              color: isActive ? '#22d3a5' : 'rgba(255,255,255,0.4)',
            }}
          >
            {t}
            <span className="ml-1.5 opacity-60">{count}</span>
          </button>
        )
      })}
    </div>
  )
}

export function AdminPagination({ page, totalPages, total, totalWord, onPage }: {
  page: number
  totalPages: number
  total: number
  /** The word after the count; 'results' (scholarships) or 'total' (programs). */
  totalWord: string
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-white/40">
      <span>{total} {totalWord} · page {page + 1} of {totalPages}</span>
      <div className="flex gap-2">
        <button onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0}
          className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:border-white/20 transition">
          ← Prev
        </button>
        <button onClick={() => onPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:border-white/20 transition">
          Next →
        </button>
      </div>
    </div>
  )
}

export function AdminDeleteModal({ idPrefix, entityLabel, itemName, saving, onCancel, onConfirm }: {
  idPrefix: string
  entityLabel: string
  itemName: string | undefined
  saving: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby={`${idPrefix}-delete-title`} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 id={`${idPrefix}-delete-title`} className="text-lg font-semibold mb-2">Delete {entityLabel}?</h2>
        <p className="text-white/50 text-sm mb-6">"{itemName}" will be permanently removed.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white border border-white/10 transition disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition">
            {saving ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
