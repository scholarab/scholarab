/** Shared by Astro pages, React, and scripts/generate-sitemap.js — keep single source of truth. */
export function generateSlug(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
