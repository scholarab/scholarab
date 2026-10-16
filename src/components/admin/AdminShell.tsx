/** @jsxImportSource preact */
import { useEffect } from 'preact/hooks';
import AnalyticsPanel, { type AnalyticsData } from './AnalyticsPanel';
import { optOutOfEvents } from '../../lib/events';

interface Props {
  email: string;
  data: AnalyticsData;
}

export default function AdminShell({ email, data }: Props) {
  // Anyone using the admin panel is the owner - stop counting their browsing
  useEffect(() => {
    optOutOfEvents();
  }, []);

  const handleLogout = async () => {
    await fetch('/admin/api/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <div className="adm">
      <header className="adm-bar">
        <a className="adm-brand" href="/admin/analytics">
          <img src="/brand/scholarab-logo-on-dark.svg" alt="ScholarAB" width="107" height="24" />
          <span>Admin</span>
        </a>
        <div className="adm-bar-end">
          <button type="button" className="adm-link" onClick={handleLogout} title={email}>Sign out</button>
        </div>
      </header>

      <main className="adm-main">
        <AnalyticsPanel data={data} />
      </main>
    </div>
  );
}
