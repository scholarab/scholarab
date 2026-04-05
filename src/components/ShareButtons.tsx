import { useState } from 'react';

interface ShareButtonsProps {
  title?: string;
  pageUrl?: string;
}

type ShareState = 'idle' | 'ready' | 'missing';

const btnClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/10 hover:border-[#22d3a5] hover:text-[#22d3a5] dark:hover:border-[#22d3a5] dark:hover:text-[#22d3a5]';

function useAppShare(appScheme: string) {
  const [state, setState] = useState<ShareState>('idle');

  function share(url: string) {
    navigator.clipboard.writeText(url).catch(() => {});

    // Detect if the app opened by listening for the page becoming hidden.
    // If still visible after 1.5s the app is not installed.
    let opened = false;
    const onHide = () => {
      if (document.hidden) {
        opened = true;
        setState('ready');
        setTimeout(() => setState('idle'), 4000);
      }
      document.removeEventListener('visibilitychange', onHide);
    };
    document.addEventListener('visibilitychange', onHide);

    window.location.href = appScheme;

    setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide);
      if (!opened) {
        setState('missing');
        setTimeout(() => setState('idle'), 4000);
      }
    }, 1500);
  }

  return { state, share };
}

export default function ShareButtons({ title, pageUrl }: ShareButtonsProps) {
  const url = pageUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
  const ig  = useAppShare('instagram://direct/inbox');
  const sc  = useAppShare('snapchat://');

  const [copied, setCopied] = useState(false);
  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  }

  return (
    <div className="flex flex-wrap gap-2 pt-3">

      {/* Copy link — desktop only */}
      <button
        onClick={copyLink}
        className={`${btnClass} hidden md:inline-flex`}
        aria-label="Copy link"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        {copied ? <span style={{ color: '#22d3a5' }}>Copied!</span> : 'Copy link'}
      </button>

      {/* Instagram — mobile only */}
      <button
        onClick={() => ig.share(url)}
        className={`${btnClass} md:hidden`}
        aria-label="Send via Instagram DM"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" stroke="none"/>
        </svg>
        {ig.state === 'ready'   ? <span style={{ color: '#22d3a5' }}>Link copied — paste &amp; send!</span>
        : ig.state === 'missing' ? <span style={{ color: '#f87171' }}>Instagram not installed</span>
        : 'Send on Instagram'}
      </button>

      {/* Snapchat — mobile only */}
      <button
        onClick={() => sc.share(url)}
        className={`${btnClass} md:hidden`}
        aria-label="Send via Snapchat"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.002 2c-1.895 0-5.21.535-5.834 4.56-.118.775-.09 1.48-.065 2.048l.007.197c-.29.14-.602.213-.918.213a2.1 2.1 0 0 1-.53-.069c-.064-.017-.128-.025-.19-.025-.322 0-.583.208-.583.462 0 .317.307.51.619.617.082.028.588.188.671.574.046.21.016.439-.088.62l-.047.083c-.538.961-1.649 1.613-2.817 1.668-.257.012-.468.17-.468.37 0 .26.34.48.874.598.128.028.27.054.43.079.506.08.714.3.782.5.076.222-.03.459-.158.617a.756.756 0 0 0-.065.088c-.134.228-.091.497.11.692.242.234.67.344 1.275.344.26 0 .546-.023.853-.069.468-.07.888-.105 1.25-.105.38 0 .665.04.847.118.56.243 1.05.644 1.527 1.032.703.567 1.43 1.154 2.518 1.154 1.088 0 1.818-.587 2.52-1.154.478-.388.968-.789 1.526-1.032.183-.078.468-.118.847-.118.363 0 .783.035 1.252.105.306.046.593.069.852.069.606 0 1.034-.11 1.276-.344.2-.195.244-.464.11-.692a.756.756 0 0 0-.065-.088c-.128-.158-.234-.395-.158-.617.068-.2.276-.42.782-.5.16-.025.302-.051.43-.079.533-.119.874-.338.874-.598 0-.2-.211-.358-.468-.37-1.168-.055-2.28-.707-2.817-1.668l-.047-.083c-.104-.181-.134-.41-.088-.62.083-.386.589-.546.671-.574.312-.107.62-.3.62-.617 0-.254-.262-.462-.584-.462a.808.808 0 0 0-.19.025 2.1 2.1 0 0 1-.53.069c-.315 0-.628-.073-.917-.213l.007-.197c.025-.568.053-1.273-.065-2.048C17.212 2.535 13.897 2 12.002 2z"/>
        </svg>
        {sc.state === 'ready'   ? <span style={{ color: '#22d3a5' }}>Link copied — paste &amp; send!</span>
        : sc.state === 'missing' ? <span style={{ color: '#f87171' }}>Snapchat not installed</span>
        : 'Send on Snapchat'}
      </button>

    </div>
  );
}
