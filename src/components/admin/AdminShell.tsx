import { useEffect } from 'react';
import AnalyticsPanel, { type AnalyticsData } from './AnalyticsPanel';
import { optOutOfEvents } from '../../lib/events';

interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface Props {
  user: User;
  data: string;
}

export default function AdminShell({ user, data }: Props) {
  // Anyone using the admin panel is the owner - stop counting their browsing
  useEffect(() => {
    optOutOfEvents();
  }, []);

  const handleLogout = async () => {
    await fetch('/admin/api/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(data);
  } catch {
    parsedData = { error: true };
  }

  return (
    <div className="adm">
      <header className="adm-bar">
        <a className="adm-brand" href="/admin/analytics">
          <img src="/brand/scholarab-logo-on-dark.svg" alt="ScholarAB" width="107" height="24" />
          <span>Admin</span>
        </a>
        <div className="adm-bar-end">
          <button type="button" className="adm-link" onClick={handleLogout} title={user.email}>Sign out</button>
        </div>
      </header>

      <main className="adm-main">
        <AnalyticsPanel data={parsedData as AnalyticsData} />
      </main>
    </div>
  );
}
