// The directory's drawn icons.
//
// These were ☆ and ↗, two characters standing in for an icon set. A glyph
// takes its shape from whatever font the reader happens to resolve, so the
// save control rendered as a hairline outline on one machine and a solid black
// star on another, at a size nothing here chose. Drawn, they are one stroke
// weight (1.6 and 1.8 at their own scales, both 1.5px effective on screen) and
// the saved state is a fill rather than a different character.
//
// Kept as strings in one module rather than inline in each component: the two
// directories and the saved list all draw the same two marks, and they drifted
// the last time they were three copies.

/** Save control. Open when unsaved; `.sabl-save.on svg` fills it. */
export const BOOKMARK =
  '<svg class="sabl-ico" viewBox="0 0 14 16" width="13" height="15" aria-hidden="true">' +
  '<path d="M2.6 1.6h8.8v12.8L7 11 2.6 14.4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
  '</svg>';

/** Stays on the site. Sits inside a Details link, after its label. */
export const ARROW =
  '<svg class="sabl-ico" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">' +
  '<path d="M1.6 6h8.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
  '<path d="M6.4 2.6 9.8 6l-3.4 3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

/** Leaves the site. Sits inside the Apply/Visit link, after its label. */
export const EXT =
  '<svg class="sabl-ico" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">' +
  '<path d="M4 1.2h6.8V8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M10.4 1.6 1.4 10.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
  '</svg>';

// The directories draw these once per row, 3,000+ times on /scholarships, and
// the inline copies were 806 KB of that page's 3.67 MB (critique 2026-09-23).
// There each row points at one <symbol> instead. The paths are the ones above;
// a symbol's shapes inherit fill and stroke colour through <use>, so
// `.sabl-save.on svg` still fills the bookmark.
const sym = (id: string, full: string) =>
  full.replace(/^<svg class="sabl-ico" (viewBox="[^"]+")[^>]*>/, `<symbol id="${id}" $1>`).replace(/<\/svg>$/, '</symbol>');
const ref = (id: string, full: string) =>
  full.replace(/>.*<\/svg>$/, `><use href="#${id}"/></svg>`);

/** Put once on a page that uses the *_REF marks below. */
export const ICON_SPRITE =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
  sym('i-bookmark', BOOKMARK) + sym('i-arrow', ARROW) + sym('i-ext', EXT) +
  '</svg>';
export const BOOKMARK_REF = ref('i-bookmark', BOOKMARK);
export const ARROW_REF = ref('i-arrow', ARROW);
export const EXT_REF = ref('i-ext', EXT);
