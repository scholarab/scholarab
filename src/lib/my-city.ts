// The city list a student last opened, kept on the device (localStorage), so
// the home page can offer "Back to Calgary" instead of the whole province.
// Without it a returning student picked their city again through the header
// menu or the home carousel on every visit. Nothing is sent anywhere; opening another city's list replaces it. The home page reads
// it in an inline script under its hero buttons, before first paint, and
// ignores a slug that no longer has a list.

export const MY_CITY_KEY = 'sa_city';

export function rememberCity(slug: string): void {
  try { localStorage.setItem(MY_CITY_KEY, slug); } catch { /* storage blocked: nothing to remember */ }
}
