export interface LinkItem { id: unknown; label: string; url?: string }

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
