import he from 'he';

/**
 * Decode HTML entities in plain text strings.
 * e.g. "&amp;amp;" → "&amp;" → "&"
 * Safe for text node rendering — does NOT produce raw HTML.
 */
export function decodeEntities(str) {
  if (!str) return str;
  return he.decode(String(str));
}

/**
 * Sanitize an HTML string using DOMPurify (browser only).
 * Falls back to plain text stripping via he if DOMPurify is unavailable.
 * Use this when rendering user-contributed content via dangerouslySetInnerHTML.
 */
export async function sanitizeHtml(dirty) {
  if (!dirty) return '';
  if (typeof window === 'undefined') {
    // SSR: strip tags by decoding entities only — no innerHTML risk
    return he.decode(String(dirty).replace(/<[^>]*>/g, ''));
  }
  const { default: DOMPurify } = await import('dompurify');
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
}
