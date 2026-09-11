const BASE = 'https://www.scholarab.ca';
const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

/** A same-day sitemap alone cannot distinguish two different deployments. */
export async function livePublicationMatches(catalogueHash: string, sitemap: string): Promise<boolean> {
  try {
    const [marker, liveSitemap] = await Promise.all([
      fetch(`${BASE}/publication.json`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) }),
      fetch(`${BASE}/sitemap.xml`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) }),
    ]);
    if (!marker.ok || !liveSitemap.ok) return false;
    const [published, xml] = await Promise.all([marker.json(), liveSitemap.text()]);
    return published.catalogueHash === catalogueHash && xml === sitemap;
  } catch {
    return false;
  }
}
