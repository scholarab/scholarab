import { useState, useEffect, type ComponentProps } from 'react';
import { Toaster, toast } from 'sonner';
import ScholarshipManager from './ScholarshipManager';
import ProgramManager from './ProgramManager';
import AnalyticsPanel, { type AnalyticsData } from './AnalyticsPanel';
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
}

export default function AdminShell({ user, page, data }: Props) {
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
      toast.success('Changes queued. Validation and publication run every 15 minutes.');
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
    parsedData = page === 'analytics' ? { error: true } : {items:[],total:0,counts:{},page:0,pageSize:25};
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white flex"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <Toaster richColors position="top-right" />

      {/* Sidebar */}
      <aside className="w-56 bg-[#0a0a0f] border-r border-white/6 flex flex-col p-4 gap-2 fixed h-full z-10">
        <div className="mb-4 px-2">
          <span className="text-lg font-bold">
            Scholar<span style={{ color: '#22d3a5' }}>AB</span>
          </span>
          <span className="ml-2 text-xs text-white/30 border border-white/10 rounded-sm px-1.5 py-0.5">
            Admin
          </span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <a
            href="/admin/scholarships"
            className={`px-3 py-2 rounded-lg text-sm transition ${page === 'scholarships' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Scholarships
          </a>
          <a
            href="/admin/programs"
            className={`px-3 py-2 rounded-lg text-sm transition ${page === 'programs' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Research Programs
          </a>
          <a
            href="/admin/analytics"
            className={`px-3 py-2 rounded-lg text-sm transition ${page === 'analytics' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Analytics
          </a>
        </nav>

        <div className="border-t border-white/6 pt-4 space-y-3">
          <button
            onClick={handlePreview}
            disabled={deploying}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition disabled:opacity-50 text-[#0a0a0f]"
            style={{ background: deploying ? '#22d3a560' : '#22d3a5' }}
          >
            {deploying ? 'Queuing…' : 'Review and publish'}
          </button>
          <p role="status" className="text-xs text-white/50">
            {publication.status === 'idle'
              ? 'Edits are saved as drafts until published.'
              : (publication.message ?? publication.status)}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 truncate">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-white/30 hover:text-white/70 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {reviewing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publication-title"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
        >
          <div className="bg-[#101817] p-6 rounded-lg max-w-2xl max-h-[80vh] overflow-auto">
            <h2 id="publication-title" className="text-xl">
              Review unpublished changes
            </h2>
            <p className="text-sm text-white/60 my-3">
              These changes will be validated before they reach the public site.
            </p>
            <ul>
              {publication.drafts?.map((d) => (
                <li key={`${d.kind}-${d.id}`} className="border-t border-white/10 py-3">
                  <strong>
                    {d.action}: {d.title}
                  </strong>
                  <p className="text-xs text-white/60">
                    {d.fields.filter((f) => f !== 'id').join(', ')}
                  </p>
                </li>
              ))}
            </ul>
            {!publication.drafts?.length && <p>No unpublished changes.</p>}
            <div className="flex gap-4 mt-4">
              <button onClick={() => setReviewing(false)}>Cancel</button>
              <button
                disabled={deploying || !publication.drafts?.length}
                onClick={handleDeploy}
                className="bg-[#2fd3a0] text-black px-4 py-2 rounded disabled:opacity-50"
              >
                Publish these changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Main content */}
      <main className="ml-56 flex-1 p-8">
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
