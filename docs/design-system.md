# ScholarAB design system

What the public site's CSS actually is, written down after the 2026-08-20 audit
found three defects that had been live for weeks and looked fine in every
screenshot. It is a description, not a proposal: every value here is what ships.

The source of truth for *appearance* is still Ilia's claude.ai/design project
(`ScholarAB {Home,Scholarships,Programs,Match,Saved,About,Detail}.dc.html`).
This file is the source of truth for *behaviour and structure*, the parts the
design files do not specify and that therefore drifted.

**Read section 6 before "fixing" the type scale or the radius set.**

---

## 1. Tokens

There is one `:root`. There used to be two, a dark palette on `:root` and a
light one on `html.theme-light`: left over from the theme system deleted
2026-07-24. Nothing ever added that class, so the light block never applied and
the dark one was silently the live palette: `color-scheme: dark` on a cream
site, and `body { color: #fff }`. Do not reintroduce a second palette block,
under any selector.

| Token | Value | Used by |
|---|---|---|
| `--brand` | `#2FD3A0` | `showToast()` in `src/lib/utils.ts`: its only consumer |
| `--brand-rgb` | `47, 211, 160` | the toast's shadow |
| `--text-on-brand` | `#0B1512` | the toast's label |
| `--bg-page` | `#FAF7F0` | `html`/`body`; the canvas behind everything |
| `--text-primary` | `#141915` | `body` colour |
| `--focus-ring` | `#0A6B4D` | every focus indicator; rebound per surface |
| `--sab-measure` | `1180px` | grid/dashboard content width |
| `--sab-read` | `660px` | long-form prose width (~78 characters at 17px) |
| `--sab-nav-h` | `89px` | declared, so the home hero can subtract it |
| `--sab-ticker-h` | `45px` | same; both apply above 900px only |
| `--kicker` | per surface | `.sab-kicker` colour, mint on ink bands |
| `--sab-btn-shadow` | `#2FD3A0` | the button press shadow |

Everything else is a literal. That is deliberate, see section 6.

### Palette

| Role | Value | Notes |
|---|---|---|
| Canvas | `#FAF7F0` | cream |
| Alt band | `#F2EEE4` | |
| Ink | `#141915` | body text |
| Ink band | `#0B1512` | hero, footer, header, dark panels |
| On-ink | `#F2F0E9` | text on the ink band |
| Accent | `#2FD3A0` | mint: **fills only**, 1.8:1 on cream |
| Green, text | `#0A6B4D` | 6.09:1 on cream, 6.72:1 on white |
| Green, fill | `#0E8C64` | 3.96:1 on cream: **never as text** |
| Urgency | `#A0491A` / `#B8541F` | deadline pressure |

The two greens are the one rule in this file that is easy to get wrong.
`#0E8C64` is fine as a background, a border or an SVG shape, and fails AA at
every text size that is not large-scale. `src/lib/design-tokens.test.ts` fails
the build if it appears as a `color:`.

---

## 2. Class prefixes

One prefix per surface, no sharing. This has held since the editorial redesign
and is the main reason the CSS is auditable at all.

| Prefix | Surface | Scoped? |
|---|---|---|
| `.sab-` | shared/home | global |
| `.sabh-` | header | Astro-scoped |
| `.sabf-` | footer | Astro-scoped |
| `.sabp-` | page shell | global |
| `.sabl-` | directory lists | global |
| `.sabm-` | match/quiz | global |
| `.sabs-` | saved | global |
| `.sabd-` | detail | Astro-scoped |
| `.saba-` | about | Astro-scoped |
| `.sabe-` | educators | Astro-scoped |
| `.sabg-` | guides | Astro-scoped |
| `.sabu-` | updates | Astro-scoped |
| `.sab404-` | 404 | Astro-scoped |

Astro-scoped selectors carry a `[data-astro-cid-*]` attribute, which makes them
outrank anything in `global.css` at the same class count. That is how two inputs
ended up with `outline: none` beating the global `:focus-visible` rule.

---

## 3. Components

### Button

Seventeen button classes across ten prefixes. They do **not** share metrics, each
surface's size and padding come from its design file and differ on purpose.
They **do** share one interaction language, which is what `.sab-btn` carries.

```html
<a href="/scholarships/" class="sab-btn sabe-btn sabe-btn-solid">Browse</a>
```

| | |
|---|---|
| **Base** | `.sab-btn`: transition, hover/focus lift, active snap, disabled opt-out, reduced-motion |
| **Metrics** | the per-surface class (`.sabe-btn-solid`, `.sabd-cta`, …) |
| **Variants** | *accent* (mint fill, ink label) · *outline* (border, no fill) · *solid* (ink fill on cream) |

| State | Treatment |
|---|---|
| Default | flat, no shadow |
| Hover | `translate(-3px, -3px)`, `5px 5px 0` mint shadow |
| Focus-visible | identical to hover, **plus** the global 2px ring |
| Active | `translate(1px, 1px)`, shadow collapses, duration drops to 0.07s |
| Disabled | `:disabled`, `[aria-disabled]` or `.sabd-cta-disabled`: no transform, no shadow |
| Reduced motion | no transform, no transition |

Two lift distances exist: `-3px` (home, guides, educators, 404, detail, empty
states) and `-2px` (about, match). Both come from their design files. `.sab-btn`
supplies `-3px`; the `-2px` surfaces override it from their scoped block. Do not
unify them without checking the design files first.

**Do / don't**

| ✅ | ❌ |
|---|---|
| Add `sab-btn` beside the existing class | Fold padding or colour into `.sab-btn` |
| Let the per-surface class own colour and size | Write a fresh `:hover { transform: … }` copy |
| Give a non-pressable control the disabled opt-out | Use `transition: all` |

### Card (`.sabl-card`)

Directory listing card. Hover lifts; the whole card is not a link, the title
is. Chips inside truncate rather than wrap (`.sabl-meta` is
`white-space: nowrap` + `text-overflow: ellipsis`), because one long free-text
duration once drove the height of every card beside it.

### Chip / badge

`.sabl-chip`, `.sabl-meta`, `.sabl-tag`, `.sabm-count-chip`, `.sabm-paid-chip`,
and the `/updates` kind labels coloured from `KIND_COLORS` in
`src/lib/updates.ts`. Pill radius, mono or 600-weight label. **Contrast is measured
against the white card, not the cream page**: that distinction is what made
three `/updates` badges fail AA while looking fine.

### Kicker (`.sab-kicker`)

The dot-and-mono label above every `h1`. One rule, replacing seven
implementations. Colour comes from `--kicker`: green on cream, mint on an ink
band. Never hard-code its colour at the call site.

### Search field (`.sabl-search`)

Unlabelled, so the placeholder is the only affordance, it is `0.62` alpha to
clear AA, not the `0.4` it started at. WebKit's clear button is replaced with a
data-URI ✕ because the native one cannot be recoloured. The focus ring goes on
the **group**, not the input: a ring on the bare input collides with the
toolbar's own borders.

### Quiz option (`.sabm-opt`)

| State | Treatment |
|---|---|
| Idle | white, ink border |
| Hover | lift + mint shadow |
| Selected | lift + mint shadow + **green border** |
| Dim | `opacity: 0.45` |

Hover and selected shared one rule until 2026-08-21, so an option you were
pointing at looked exactly like one you had chosen.

### Arrows

`→` stays on ScholarAB. `↗` (`.sabl-ext`, `aria-hidden`) leaves for the
sponsor's site. Two buttons that look alike must not do categorically different
things silently.

---

## 4. Focus

One global rule:

```css
:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: 4px; }
```

`--focus-ring` is rebound per surface, because a ring must contrast with what it
sits on:

| Surface | Ring |
|---|---|
| cream (default) | `#0A6B4D` |
| ink bands, dark panels | `#2FD3A0` |
| accent-filled controls | `#0B1512`: a mint ring on a mint pill is 1:1 |

**Never write a bare `outline: none`.** A class selector beats the global rule,
and the control silently loses its indicator. If a control needs its own
treatment, scope the removal to `:focus` and put something back for
`:focus-visible`. Both existing exceptions do exactly that.

---

## 5. Motion

| Purpose | Duration | Easing |
|---|---|---|
| Colour / border | `0.18s` | `ease` |
| Lift, shadow | `0.18s` | `cubic-bezier(0.2, 0.8, 0.3, 1)` |
| Press | `0.07s` | inherited |
| Card hover | `0.15s` | `ease` |
| Page transition | `0.14s` out / `0.18s` in | `ease` |
| Ticker marquee | `30s` | `linear` |

Every animated component needs a `prefers-reduced-motion: reduce` block. The
ones that have one: cards, all `.sab-btn`s, quiz tiles, view transitions.

---

## 6. What is deliberately not tokenised

The audit counted 31 distinct font sizes (including nine half-pixel values) and
nine border radii, and recommended a scale. **Do not impose one.**

The design files specify these values per screen, and the project's parity rule
is that the design is floor *and* ceiling. Normalising `13.5px` to `14px`
site-wide would be a silent deviation from the mock on a dozen surfaces to buy
tidiness in a file nobody reads. The sizes are not an accident; they are a
different designer's decision.

What *was* worth fixing is behaviour that no design file specifies and that
therefore drifted freely: transitions, focus, hover/selected collisions, dead
palettes. That is what sections 1–5 cover.

The one exception taken: `999px` and `100px` both produced the same pill, so
they are all `100px` now.

If a future design pass does introduce a scale, this is the file to update.

---

## 7. Regression guards

`src/lib/design-tokens.test.ts`: ten tests, each proven to fail before it
passes:

- no `html.theme-*` selector survives
- `color-scheme` is declared once, `light`, on `:root`
- `/admin` declares its own dark canvas
- `#0E8C64` never appears as a `color:`
- `--focus-ring` points at the accessible green
- both `outline: none` sites have a `:focus-visible` replacement
- `.sab-btn` defines hover, active, disabled and reduced-motion
- the five previously-transition-less buttons wear `sab-btn`
- `/educators` stays off `transition: all`
- selected is not drawn exactly like hover

Contrast is not covered by a unit test. To re-check it, run the site under
`npx wrangler pages dev dist` and sweep computed colours against computed
backgrounds at 1440×900, measuring against the *rendered* background, since
chips sit on white cards and text sits on cream.
