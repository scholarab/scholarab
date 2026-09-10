import { useEffect, useState, useCallback } from 'react';
export interface AdminPage<T> {
  items: T[];
  total: number;
  counts: Record<string, number>;
  page: number;
  pageSize: number;
}
export type AdminRecord<T> = T & { revision: number; updatedAt: string; unpublished: boolean };
/** One paginated contract for SSR, search and refresh. An aborted/stale request
 * never replaces a newer search. The server searches the complete catalogue. */
export function useAdminList<T>(
  initial: AdminPage<T>,
  endpoint: string,
  page: number,
  search: string,
  facet: string,
  paused: boolean,
  onPage: (page: number) => void
) {
  const [data, setData] = useState(initial);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!paused) refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [paused, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        try {
          const res = await fetch(
            `${endpoint}?${new URLSearchParams({ page: String(page), q: search, facet })}`,
            { signal: controller.signal }
          );
          if (!res.ok) throw new Error('Unable to refresh listings. Please try again.');
          const next = (await res.json()) as AdminPage<T>;
          if (!controller.signal.aborted) {
            setData(next);
            setError('');
            const last = Math.max(0, Math.ceil(next.total / next.pageSize) - 1);
            if (page > last) onPage(last);
          }
        } catch (e) {
          if (!controller.signal.aborted)
            setError(e instanceof Error ? e.message : 'Unable to refresh listings');
        }
      },
      search ? 150 : 0
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [endpoint, page, search, facet, version, onPage]);
  const setItems = (update: (rows: T[]) => T[]) =>
    setData((prev) => ({ ...prev, items: update(prev.items) }));
  return { ...data, items: data.items, setItems, refresh, error };
}
