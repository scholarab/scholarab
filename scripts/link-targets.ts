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
