// The one piece of lib/alberta-map.ts the /map/ page script needs, kept apart
// so the browser does not download the border, the dot field and the school
// list it already has in the page.

/** Straight-line distance in km (haversine, mean Earth radius). */
export function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
