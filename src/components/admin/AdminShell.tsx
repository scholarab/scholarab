import { useState, useEffect, type ComponentProps } from 'react';
import { Toaster, toast } from 'sonner';
import ScholarshipManager from './ScholarshipManager';
import ProgramManager from './ProgramManager';
import AnalyticsPanel, { type AnalyticsData } from './AnalyticsPanel';
import { AdminSheet, Scoreboard, type ScoreboardData } from './primitives';
import { optOutOfEvents } from '../../lib/events';

interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface Props {
  user: User;
  page: 'scholarships' | 'programs' | 'analytics';
  data: string;
  /** This month so far; the analytics page draws its own from the period picker. */
  scoreboard?: ScoreboardData;
}

const TABS = [
  { page: 'scholarships', href: '/admin/scholarships', label: 'Scholarships' },
  { page: 'programs', href: '/admin/programs', label: 'Programs' },
  { page: 'analytics', href: '/admin/analytics', label: 'Analytics' },
] as const;

export default function AdminShell({ user, page, data, scoreboard }: Props) {
  // Anyone using the admin panel is the owner - stop counting their browsing
  useEffect(() => {
    optOutOfEvents();
  }, []);

  const [deploying, setDeploying] = useState(false);
  const [publication, setPublication] = useState<{
    id?: string;
    status: string;
    message?: string;
    previewHash?: string;
    drafts?: { kind: string; id: number; title: string; action: string; fields: string[] }[];
  }>({ status: 'idle' });
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => {
    let alive = true;
    const update = async () => {
      try {
        const res = await fetch('/admin/api/deploy');
        if (res.ok && alive && !reviewing) setPublication(await res.json());
      } catch {
        /* keep last known status */
      }
    };
    void update();
    const timer = setInterval(() => void update(), 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [reviewing]);
  const handlePreview = async () => {
    try {
      const response = await fetch('/admin/api/deploy');
      if (!response.ok) throw new Error('Preview unavailable');
      setPublication(await response.json());
      setReviewing(true);
    } catch {
      toast.error('Unable to load the publication preview');
    }
  };
  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch('/admin/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewHash: publication.previewHash }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Unable to queue publication');
      setPublication(result);
      setReviewing(false);
      // The workflow is scheduled every 15 minutes, but GitHub throttles it to
      // 4 to 7 runs a day (measured 2026-09-29), so promise what happens.
      toast.success('Changes queued. Publication usually runs within a few hours.', {
        action: {
          label: 'Run now',
          onClick: () => window.open('https://github.com/scholarab/scholarab/actions/workflows/publish-drafts.yml', '_blank', 'noopener'),
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to queue publication');
    } finally {
      setDeploying(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/admin/api/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(data);
  } catch {
    parsedData =
      page === 'analytics'
        ? { error: true }
        : { items: [], total: 0, counts: {}, page: 0, pageSize: 25 };
  }

  const drafts = publication.drafts?.length ?? 0;
  // A finished publication has nothing left to report, and its stored message
  // can be a stale manual note; only in-flight or failed runs show it.
  const settled = publication.status === 'idle' || publication.status === 'published';

  return (
    <div className="adm">
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18271E', color: '#EEF1EC', border: '1px solid rgba(238, 241, 236, 0.22)',
            borderRadius: 3, fontFamily: 'var(--adm-body)',
          },
        }}
      />

      <header className="adm-bar">
        <a className="adm-brand" href="/admin/scholarships">
          <img src="/brand/scholarab-logo-on-dark.svg" alt="ScholarAB" width="107" height="24" />
          <span>Admin</span>
        </a>
        <nav className="adm-tabs" aria-label="Admin">
          {TABS.map(t => (
            <a key={t.page} className="adm-tab" href={t.href} aria-current={page === t.page ? 'page' : undefined}>{t.label}</a>
          ))}
        </nav>
        <div className="adm-bar-end">
          {/* Only an in-flight or failed publication has something to say. */}
          {!settled && (
            <p role="status" className="adm-pub-status" data-state={publication.status}>
              <strong>{publication.message ?? publication.status}</strong>
            </p>
          )}
          <button type="button" className={`adm-btn ${drafts > 0 ? 'adm-btn-primary' : 'adm-btn-ghost'}`} onClick={handlePreview} disabled={deploying}>
            {deploying ? 'Queuing' : drafts > 0 ? `Publish ${drafts} ${drafts === 1 ? 'draft' : 'drafts'}` : 'Publish'}
          </button>
          <button type="button" className="adm-link" onClick={handleLogout} title={user.email}>Sign out</button>
        </div>
      </header>

      {page !== 'analytics' && scoreboard && (
        <Scoreboard title={scoreboard.period} sub={`Change on ${scoreboard.against}`} cells={scoreboard.cells} />
      )}

      {reviewing && (
        <AdminSheet
          id="publication"
          title="Review unpublished changes"
          sub="Each change is checked before it reaches the public site."
          onClose={() => setReviewing(false)}
          footer={<>
            <span className="adm-spacer" />
            <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setReviewing(false)}>Cancel</button>
            <button type="button" className="adm-btn adm-btn-primary" disabled={deploying || !publication.drafts?.length} onClick={handleDeploy}>
              Publish these changes
            </button>
          </>}
        >
          {publication.drafts?.length ? (
            <ul className="adm-drafts">
              {publication.drafts.map((d) => (
                <li key={`${d.kind}-${d.id}`}>
                  <span className="adm-verb" data-action={d.action}>{d.action}</span><b>{d.title}</b>
                  <span className="adm-draft-fields">{d.kind === 'program' ? 'Program' : 'Scholarship'}, {d.fields.filter((f) => f !== 'id').join(', ') || 'no field changes'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-sub">No unpublished changes.</p>
          )}
        </AdminSheet>
      )}

      <main className="adm-main">
        {page === 'scholarships' ? (
          <ScholarshipManager
            initialData={parsedData as ComponentProps<typeof ScholarshipManager>['initialData']}
          />
        ) : page === 'programs' ? (
          <ProgramManager
            initialData={parsedData as ComponentProps<typeof ProgramManager>['initialData']}
          />
        ) : (
          <AnalyticsPanel data={parsedData as AnalyticsData} />
        )}
      </main>
    </div>
  );
}
