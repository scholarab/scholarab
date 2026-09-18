import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')
/** Comments here explain what was removed, so they name the very selectors
 *  these tests forbid. Strip them before matching. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const globalCss = stripComments(read('src/styles/global.css'))

/**
 * These guard the two defects the 2026-08-20 design-system audit found, both
 * of which had been live for weeks while looking fine in a screenshot.
 */
describe('theme tokens', () => {
  it('has no theme-class selectors left', () => {
    // The theme system was deleted 2026-07-24. What survived was a palette
    // gated on `html.theme-light` that nothing ever applied, which left the
    // DARK block as the live one on every public page. A selector nobody can
    // match does not fail loudly; it just quietly stops being the palette.
    expect(globalCss).not.toMatch(/html\.theme-(light|dark)/)
  })

  it('declares light color-scheme exactly once, on :root', () => {
    const schemes = [...globalCss.matchAll(/color-scheme: *(\w+)/g)].map(m => m[1])
    expect(schemes).toEqual(['light'])
  })

  it('keeps /admin declaring its own dark canvas, on selectors that win', () => {
    // :root now describes the cream public site, so the one dark surface has
    // to say so itself rather than inheriting it, and say it loudly enough.
    // The first version of this test only checked the declarations were
    // present, which they were, on selectors that both lost:
    //   `html`  (0,0,1) lost to global.css's `:root { color-scheme: light }`
    //   `.bg-[#0a0a0f]` on <body> lost to `body { background: var(--bg-page) }`
    //     because Tailwind v4 utilities sit in @layer utilities and unlayered
    //     CSS beats a layer at any specificity
    // so the panel rendered white text on the cream page background and the
    // test stayed green. Assert the selectors, not just the properties.
    for (const page of ['scholarships', 'programs', 'analytics', 'login']) {
      const src = read(`src/pages/admin/${page}.astro`)
      expect(src).toMatch(/html:root \{[^}]*background-color: #0a0a0f/)
      expect(src).toMatch(/html:root \{[^}]*color-scheme: dark/)
      expect(src).toMatch(/html body \{[^}]*background-color: #0a0a0f/)
      expect(src).toMatch(/html body \{[^}]*color: #fff/)
      // A bare `html {` or `body {` setting the canvas is the losing form
      // coming back. `body { font-family }` is fine and pre-dates this; the
      // guard is about which selector paints, not about the tag name.
      expect(stripComments(src)).not.toMatch(/^\s*(html|body) \{[^}]*(background-color|color-scheme|color):/m)
    }
  })
})

describe('green text colour', () => {
  const files = [
    'src/styles/global.css',
    'src/components/sab/SabDetail.astro',
    'src/components/sab/SabGuide.astro',
    'src/pages/index.astro',
    'src/pages/about.astro',
    'src/pages/educators.astro',
    'src/pages/updates.astro',
    'src/pages/guides/index.astro',
    'src/pages/[type]/[slug].astro',
  ]

  it('never uses #0E8C64 as a text colour', () => {
    // 3.96:1 on cream, 4.24:1 on a white card; under AA either way, at any
    // size that is not large-scale. #0A6B4D is 6.09:1 on cream. The lighter
    // green is still fine as a fill, a border or an SVG shape, which is why
    // this checks the property and not the value.
    const offenders: string[] = []
    for (const f of files) {
      stripComments(read(f)).split('\n').forEach((line, i) => {
        if (/(?<!border-)color: *#0E8C64/i.test(line)) offenders.push(`${f}:${i + 1}`)
      })
    }
    expect(offenders).toEqual([])
  })

  it('points the focus ring at the accessible green', () => {
    expect(globalCss).toMatch(/--focus-ring: #0A6B4D/)
  })
})

/** Every selector that suppresses the focus outline, and why it is allowed to.
 *  A bare `outline: none` on a class selector outranks the global
 *  `:focus-visible` rule (0,1,0), so anything added here without a deliberate
 *  replacement silently removes the keyboard indicator, which is exactly how
 *  the search box and the reminder field ended up with no ring for weeks.
 *  Adding an entry is a decision, not a formality: say what puts the ring back. */
const OUTLINE_NONE_ALLOWED: Record<string, string> = {
  '.sabl-search input:focus':
    'ring moves to the whole search group via .sabl-search:has(input:focus-visible)',
  '.sabm-question':
    'focused programmatically on step change (EligibilityQuiz questionHeadingRef), '
    + 'so :focus-visible never matches and a ring would appear unprompted',
  '.sabd-remind-input:focus':
    'ring restored on .sabd-remind-input:focus-visible',
}

/** The selector a declaration sits under; the text between the previous
 *  block boundary and the `{` that opens this rule. */
function selectorsSuppressingOutline(css: string): string[] {
  return [...css.matchAll(/outline: *none/g)].map(m => {
    const before = css.slice(0, m.index)
    const open = before.lastIndexOf('{')
    const start = Math.max(before.lastIndexOf('}', open), before.lastIndexOf(';', open))
    return before.slice(start + 1, open).trim().replace(/\s+/g, ' ')
  })
}

describe('focus indicators', () => {
  it('suppresses the focus outline only where something documented replaces it', () => {
    const sources = [
      globalCss,
      ...['src/components/sab/SabDetail.astro', 'src/components/sab/SabGuide.astro',
        'src/components/sab/SabHeader.astro', 'src/components/sab/SabFooter.astro',
        'src/components/sab/ScholarshipDirectory.astro',
        'src/components/sab/ProgramDirectory.astro',
        'src/components/sab/SavedDirectory.astro'].map(p => stripComments(read(p))),
    ]
    const found = sources.flatMap(selectorsSuppressingOutline)
    // Not a count: name the selector, so the failure says which rule is new.
    expect(found.sort()).toEqual(Object.keys(OUTLINE_NONE_ALLOWED).sort())
  })

  it('puts the ring back where the allowlist says it does', () => {
    // The search box is the one place that does not take --focus-ring. It is
    // deliberately chromeless -- no border, no fill, no hover -- so a ring or a
    // pill would be the only box on the page and was asked for twice to be
    // removed. What replaces it is a 2px rule under the field, ink on cream,
    // drawn on :focus-visible alone. Mouse users see the caret and nothing
    // else; a keyboard user still gets an indicator, which is the line 2.4.7
    // draws. Deleting this without putting something else there is the
    // regression this whole file exists to catch.
    const search = globalCss.slice(globalCss.indexOf('.sabl-search input'))
    expect(search).toMatch(/\.sabl-search:has\(input:focus-visible\)[\s\S]{0,120}box-shadow: inset 0 -2px 0 rgba\(20,25,21,0\.75\)/)

    const detail = read('src/components/sab/SabDetail.astro')
    expect(detail).toMatch(/\.sabd-remind-input:focus-visible[\s\S]{0,120}outline: 2px solid var\(--focus-ring\)/)
  })
})

describe('button press language', () => {
  it('defines hover, active, disabled and reduced-motion on one base class', () => {
    expect(globalCss).toMatch(/\.sab-btn:hover, \.sab-btn:focus-visible \{[\s\S]{0,140}transform: translate\(-3px, -3px\)/)
    expect(globalCss).toMatch(/\.sab-btn:active \{[\s\S]{0,140}transform: translate\(1px, 1px\)/)
    expect(globalCss).toMatch(/\.sab-btn:disabled[\s\S]{0,160}transform: none/)
    expect(globalCss).toMatch(/prefers-reduced-motion[\s\S]{0,200}\.sab-btn:active \{\s*transform: none/)
  })

  it('is worn by the buttons that had no transition at all', () => {
    // These five computed `transition-duration: 0s` or `all 0.15s` before the
    // base existed; no lift, no press. .sabd-cta is the Apply button on all
    // 278 listing pages, so its hover was an instant colour flip.
    const wearers: [string, string[]][] = [
      ['src/pages/404.astro', ['sab404-btn-accent', 'sab404-btn-outline']],
      ['src/pages/educators.astro', ['sabe-btn-solid', 'sabe-btn-outline']],
      ['src/components/sab/SabDetail.astro', ['sabd-cta', 'sabd-remind-btn']],
    ]
    for (const [file, classes] of wearers) {
      const src = read(file)
      // `-` is a word boundary, so match class *tokens*, not substrings;
      // otherwise `sabd-cta` also matches the `sabd-cta-row` wrapper.
      const attrs = [...src.matchAll(/class="([^"{]*)"/g)].map(m => m[1]!.split(/\s+/))
      for (const c of classes) {
        const marks = attrs.filter(tokens => tokens.includes(c))
        expect(marks.length).toBeGreaterThan(0)
        for (const tokens of marks) expect(tokens).toContain('sab-btn')
      }
    }
  })

  it('keeps the educators buttons off `transition: all`', () => {
    expect(read('src/pages/educators.astro')).not.toMatch(/transition: all/)
  })
})

describe('quiz option states', () => {
  it('does not draw selected exactly like hover', () => {
    // One shared rule meant an option you were pointing at looked identical to
    // one you had chosen.
    expect(globalCss).toMatch(/\.sabm-opt-selected \{ border-color: #0A6B4D; \}/)
  })
})
