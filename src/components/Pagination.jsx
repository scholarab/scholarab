export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Build page number list with ellipsis for large page counts
  function getPageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1];
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }

  const btnBase = 'inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors select-none';
  const btnPage = `${btnBase} border`;
  const btnActive = 'text-[#22d3a5] border-[rgba(34,211,165,0.35)] bg-[rgba(34,211,165,0.08)]';
  const btnInactive = 'text-gray-500 border-gray-200 bg-white hover:border-gray-400 dark:text-white/45 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25';
  const btnNav = `${btnBase} border text-gray-400 border-gray-200 bg-white hover:border-gray-400 dark:text-white/30 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none`;

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={btnNav}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {getPageNumbers().map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="inline-flex items-center justify-center min-w-[36px] h-9 text-sm text-gray-400 dark:text-white/25 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
            className={`${btnPage} ${p === page ? btnActive : btnInactive}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className={btnNav}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </nav>
  );
}
