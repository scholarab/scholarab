export interface LinkItem { id: unknown; label: string; url?: string }

export interface LinkResponse { status?: number; error?: string }

/** Switch transport after a socket failure, within the existing three attempts. */
export async function requestLink(
  url: string,
  request: (url: string) => Promise<LinkResponse>,
  fallback: (url: string) => Promise<LinkResponse>,
  sleep: (ms: number) => Promise<void>,
): Promise<LinkResponse> {
  let result = await request(url);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!result.error && !(result.status && (result.status >= 500 || result.status === 429))) break;
    await sleep(2_000 * (attempt + 1));
    result = await (result.error ? fallback : request)(url);
  }
  return result;
}

export type LinkException = { host: string; reason: string } | {
  url: string;
  error: 'HTTP 403' | 'HTTP 429';
  reviewUntil: string;
  reason: string;
};

/** A reviewed bot refusal is not permission to hide a later broken page. */
export function reviewedLinkFailure(
  url: string, verdict: { kind: string; error?: string }, exceptions: LinkException[], today: string,
): boolean {
  if (verdict.kind !== 'suspect') return false;
  return exceptions.some(entry => 'url' in entry && entry.url === url &&
    entry.error === verdict.error && /^\d{4}-\d{2}-\d{2}$/.test(entry.reviewUntil) &&
    entry.reviewUntil >= today);
}

/** One network request per exact URL; retain every affected listing in reports. */
export function groupLinkTargets(items: LinkItem[]): Map<string, LinkItem[]> {
  const targets = new Map<string, LinkItem[]>();
  for (const item of items) {
    if (!item.url) continue;
    const group = targets.get(item.url);
    if (group) group.push(item);
    else targets.set(item.url, [item]);
  }
  return targets;
}

/** Refill a free host slot immediately; one slow host must not hold a batch. */
export async function forEachHost<T>(
  hosts: readonly T[], concurrency: number, check: (host: T) => Promise<void>,
): Promise<void> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1)
    throw new Error('Host concurrency must be a positive integer');
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, hosts.length) }, async () => {
    while (next < hosts.length) await check(hosts[next++]!);
  }));
}
