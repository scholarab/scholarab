# Vanilla-port playbook: cutting shipped JS without changing anything visible

This is a handoff guide for a fresh Claude session (or any developer) who wants to
apply the July 2026 de-React method to more of this project — or to audit whether
anything is left worth cutting. It documents exactly how /programs, /scholarships,
and /saved went from ~200KB of React each to 7–16KB of vanilla JS with zero visual
or functional change, and every trap hit along the way.

**Read the "What's left (honest assessment)" section before starting anything.
The big wins are done. Do not invent work to fit this playbook.**

---

## 1. Why the method works

An Astro island like `<ProgramList items={programs} client:idle />` ships
react-dom (~182KB) to re-create in the browser what the server already rendered.
If the component's interactivity is *selection over a fixed dataset* — filter,
sort, search, toggle, save — then React is pure overhead: the full dataset is a
build-time prop, and every UI state is some subset/ordering of markup the server
can render up front.

The port relocates three concerns:

| Concern | Before | After |
|---|---|---|
| Filter/sort/status math | inside React hooks | `src/lib/list-core.ts` (framework-free, imported by BOTH the .astro frontmatter and the browser script) |
| Markup | JSX re-rendered on hydration | server-rendered once in a `.astro` component; every card carries `data-*` attributes |
| Interactivity | React state + re-render | a delegated-listener controller that parses `data-*`, runs the same list-core functions, and toggles `hidden` / reorders with `grid.append()` |

A component is a GOOD candidate when: data is fully known at build time, states
are subsets/orderings of renderable content, and interactions are show/hide/
reorder/class-toggle/text-swap. A component is a BAD candidate when it has deep
branching client state (multi-step forms), server round-trips per interaction, or
markup that can't exist until the user acts. That's why **EligibilityQuiz stayed
React** — 543 lines of multi-step state was the worst effort/risk ratio for the
last ~200KB, on a page users visit deliberately.

## 2. Current architecture (post-refactor, 2026-07-17)

- React ships ONLY on `/match` (EligibilityQuiz + ErrorBoundary) and `/admin/*`.
- `src/lib/list-core.ts` — pure status/filter/sort + day-chip logic, tested in
  `list-core.test.ts`.
- `src/lib/directory-client.ts` — generic `initDirectory(rootSelector, config)`
  controller shared by ScholarshipDirectory + ProgramDirectory. Config supplies
  `parseCard`, `select`, `countLine`, `stat`, save fns, `onCardsParsed` (clock
  recompute), `initialState` (URL params). Tested in `directory-client.test.ts`.
- `src/lib/saved-client.ts` — /saved controller: localStorage unhide, remove
  animation flow, list/calendar view toggle, vanilla calendar renderer,
  `storage`-event sync. ICS export in `src/lib/ics.ts`. Both tested.
- `src/components/sab/{Scholarship,Program,Saved}Directory.astro` — the
  server-rendered markup + a `<script>` that just calls the controller.
- Proven pattern origin: `src/components/sab/SabDetail.astro` (lines ~312-414).

## 3. The step-by-step method

### Phase 0 — Audit (never skip)
```sh
# who hydrates what
grep -rn "client:" src/pages src/components --include='*.astro'
# per-page shipped JS from a fresh build
npm run build
for f in $(grep -o '_astro/[^"]*\.js' dist/<page>/index.html | sort -u); do du -h "dist/$f"; done
```
Decide candidacy per §1. Estimate the win in KB, not lines — these ports are
roughly LOC-neutral in source.

### Phase 1 — Extract pure logic, change nothing
Move every pure function the component uses into `src/lib/` (or reuse
`list-core.ts`). The old component imports/re-exports from the new module.
Port the corresponding tests to direct function calls. Verify the bundle is
byte-identical. **Commit + push.** This phase is what makes the rest low-risk:
from here on, build-time rendering and the browser controller consume one
source of truth.

### Phase 2 — Snapshot the React output BEFORE touching the page
```sh
cp dist/<page>/index.html /tmp/<page>-before.html
```
This is your parity oracle. Without it you cannot prove "no visual change".

### Phase 3 — Server-render everything, with a data contract
Write the `.astro` component. Rules learned the hard way:

- **Render ALL items**, including ones the default view hides (build-time-closed
  programs), with the `hidden` attribute — the client re-checks them against the
  *user's* clock (a user with a slow clock may legitimately still see them;
  React computed status client-side, so must you).
- **Initial order = the default filter state computed at build time** with the
  same list-core function the client uses. Sort comparators must depend only on
  static data (`_deadline_ms`, amounts, names) — never the clock — so server
  and client order can't diverge. Status (clock-dependent) may only affect
  *membership/grouping*, and the client recomputes it on load.
- Each card carries `data-*` for everything the controller needs: id, name,
  search corpus, sort keys, raw deadline/openDate strings, precomputed ms
  values. Search corpus = the exact fields React matched, lowercased, joined
  with `\n` (queries can't contain `\n`, so no false matches across field
  boundaries; a space separator WOULD false-match).
- **`_deadline_ms: 0` means "no deadline"** in this codebase. Keep `||` (not
  `??`) semantics everywhere, with a comment. This bug has bitten before.
- Markup must match the JSX output exactly: same classes, same conditional
  class strings (`sabl-chip on`), same aria attributes, same inline styles
  (React serializes `{ marginTop: 48 }` → `margin-top:48px`). Emoji spans with
  trailing spaces: use `{`${emoji} `}` in Astro to force the text node.
- Things that MAY differ (verified harmless): React's `<!-- -->` comment nodes,
  entity encoding (`&#x27;` vs `'`), attribute case (`referrerPolicy` →
  `referrerpolicy`), the `<astro-island>` wrapper disappearing, and rendering
  hidden empty-states/placeholders that React conditionally omitted.

### Phase 4 — The controller
Model on `directory-client.ts` (read it first — extend it via config if the new
page is a directory variant; only write a new controller for a genuinely
different interaction model, like saved-client's remove-animation flow).

Non-negotiables:
- **One delegated `document` click/input listener set, registered once at module
  scope.** Scope every handler with `if (!root || !root.contains(e.target))
  return` — controllers from other pages stay loaded across view transitions
  and must not cross-talk.
- **All node lookups and state resets inside the `astro:page-load` handler**,
  which fires on first load AND after every ClientRouter swap. Re-parse cards,
  reset filter state, clear the search input (browsers restore form values on
  back-nav; React remounts got this for free), repaint saved state from
  localStorage, then render.
- **Recompute every clock-dependent thing in that handler**: day-chip text and
  `urgent` class, CLOSED/OPENS states, Apply→/Visit→ labels, hiding
  now-closed items. Static HTML is CDN-cached for days; first paint shows
  build-time values, the load handler corrects them.
- Reorder with `grid.append(...visibleEls)`; hidden cards can sit anywhere.
  Toggle grid/empty-state with `hidden`.
- Port behavioral subtleties verbatim: chip toggle-off semantics (category/
  region/grade toggle off on re-click; sort/status don't), the 1s `search_empty`
  debounce that only fires when the query misses the FULL directory (not when
  starved by a filter) and cancels on any state change, confetti only on save
  (not unsave), `?category=` applied on load.
- If any `<form>` is involved: capture-phase `stopPropagation` on submit, or
  Astro's ClientRouter hijacks it (see SabDetail's alert form).

### Phase 5 — Tests in the SAME commit as the island deletion
- jsdom-style controller tests (happy-dom, existing Vitest setup): build an HTML
  fixture matching the `data-*` contract, dispatch `astro:page-load`, assert on
  clicks/input/counts/aria. **Call the init function ONCE per test file and
  re-mount fixture + re-dispatch `astro:page-load` per test** — repeated init
  stacks document listeners and double-fires save toggles.
- Mock `./utils.ts` with `prefersReducedMotion: () => true` to make animation
  flows synchronous in tests.
- Update `vitest.config.ts` coverage `include` if you add lib modules.
- Never leave a window where deleted `renderHook` tests aren't replaced.

### Phase 6 — Verify (all of it, every phase)
```sh
npm test && npm run lint && npm run type-check && npm run build
```
1. **Token-level HTML parity diff** against the Phase-2 snapshot. Normalize:
   strip `data-*` attrs, `<!-- -->`, `<astro-island>` wrappers, entity-decode
   apostrophes, lowercase `referrerPolicy`, drop known-hidden new elements;
   split on tags; difflib. The residual diff must be ONLY the module `<script>`
   tag and deliberately-hidden additions. (The A1/A2 sessions did this with a
   ~30-line python script — rewrite it, it's short.)
2. Confirm React is gone: `grep -o '_astro/[^"]*\.js' dist/<page>/index.html`
   must not list `client.*.js`.
3. **Live browser** via `preview_start` name `scholarab-dist` (wrangler serving
   dist on 4321). Exercise every interaction with `javascript_tool` and check
   `read_console_messages` for errors. Known harness quirks: synthetic
   `a.click()` does NOT navigate (use `computer` clicks or `navigate`); Web
   Animations `finished` promises never resolve in the headless pane (the old
   React code had the same issue there — test animation-gated flows via the
   reduced-motion path by stubbing `window.matchMedia`).
4. Test view-transition re-init: really navigate away and back, then filter.
5. E2E: `npm run test:e2e` (needs `npm run build` first; reuses a running
   wrangler on 4321; 5 specs × chromium+mobile).
6. **Commit + push every phase** (standing rule). The remote "validate /
   Bypassed rule violations" warning is a stale branch-protection artifact —
   ignore it.

## 4. What's left (honest assessment — read before proposing work)

- **Admin panel (`/admin`, AdminShell ~150KB): OFF-LIMITS.** Standing rule:
  never suggest removing or simplifying it. It loads only for the admin. Shared
  primitives were already extracted (admin/primitives.tsx). Leave it alone.
- **EligibilityQuiz (`/match`, ~201KB): deliberately kept React.** A vanilla
  port is feasible (state machine + template strings) but is the highest-risk,
  lowest-value item: deep multi-step state, 352-line RTL test suite to rewrite,
  one deliberate-visit page. Only do this if Ilia explicitly asks; budget a
  full session and reuse this playbook's phases.
- **Everything else public already ships ≤16KB.** index.astro, global.css, Nav/
  BottomNav were audited and are lean; a NAV_LINKS constant was evaluated and
  rejected (5 lines saved, indirection added).
- Plausible small follow-ups if asked: ErrorBoundary is quiz-only (verify no
  stray imports); `scripts/` dedup; further admin-manager field-component
  extraction (medium risk, touches admin — ask first).
- **If a request doesn't fit these, say so.** Per Ilia's standing instruction,
  call out time-wasters directly instead of silently doing them.

## 5. Reference numbers (2026-07-17)

Per-page shipped JS after: /scholarships 8KB, /programs 7KB, /saved 16KB,
/ 9KB, /match 201KB. Tests: 397 Vitest + 5 Playwright specs. The eight commits
`fc6bc83..65b871c` on main are the worked example of every phase above.
