import { useState } from 'react';

interface ShareButtonsProps {
  title?: string;
  pageUrl?: string;
}

const btnClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/10 hover:border-[#22d3a5] hover:text-[#22d3a5] dark:hover:border-[#22d3a5] dark:hover:text-[#22d3a5]';

export default function ShareButtons({ title, pageUrl }: ShareButtonsProps) {
  const url = pageUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  }

  return (
    <div className="flex flex-wrap gap-2 pt-3">
      <button
        onClick={copyLink}
        className={btnClass}
        aria-label="Copy link"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        {copied ? <span style={{ color: '#22d3a5' }}>Copied!</span> : 'Copy link'}
      </button>
    </div>
  );
}
