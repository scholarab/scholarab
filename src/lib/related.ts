// Choosing the "more like this" neighbours for every detail page at once.
//
// The previous selector scored candidates per page and took the top four,
// independently each time. That guarantees every page *emits* four links and
// says nothing about whether any page *receives* one, and with deterministic
// scoring over a shared corpus the same high-scoring listings win the slots
// everywhere: 68 of 117 program pages had zero inbound links from a peer while
// one had 27. A page nothing links to is the "Discovered - currently not
// indexed" case, which is the same failure the guides' keep-reading block had
// when it was a .slice(0, 3).
//
// So the choice is made corpus-wide, exactly as scholarshipMetas builds every
// description at once for the same class of reason: a per-item rule whose
// defect is only visible across the whole set. getStaticPaths already has the
// full list in hand, so this costs nothing structurally.
//
// No data-loader import, so this stays usable from build scripts.

export interface BalancedOptions<T> {
  /** How many neighbours each page shows. */
  slots?: number;
  /** Minimum inbound links every eligible item must end up with. */
  floor?: number;
  /** Items that may be linked *to*. Retired programs are still sources, never targets. */
  eligible?: (item: T) => boolean;
  /** Higher is more relevant. Shared category, shared region, still open, etc. */
  score: (self: T, other: T) => number;
  /** Whether a score is good enough to be a real suggestion rather than a filler. */
  qualifies: (score: number, other: T) => boolean;
  /** Final tiebreak between equally good, equally linked candidates. */
  prefer: (a: T, b: T) => number;
}

/**
 * The shared greedy-plus-repair assignment both public helpers run on.
 *
 * Two passes:
 *
 * 1. A greedy pass that keeps relevance first but breaks ties toward whichever
 *    candidate has been linked least so far. Scores are coarse (0-5), so ties
 *    are the common case and this alone flattens most of the skew.
 * 2. A repair pass, because greedy still leaves a tail. It hands starved items
 *    a slot taken from a page whose pick already has links to spare, never
 *    dropping a donor below the floor. Without this the floor is a tendency
 *    rather than a guarantee, and a guarantee is the thing worth testing.
 *
 * Relevance still dominates: the qualified/unqualified split is the primary
 * sort key and a filler can never displace a genuine match. What changed from
 * the previous behaviour is that equally-relevant candidates are no longer
 * resolved by corpus order, which is what concentrated the links.
 */
function assign<S, T>(
  sources: S[],
  targets: T[],
  o: {
    slots: number;
    floor: number;
    excludes: (si: number, ti: number) => boolean;
    canReceive: (t: T) => boolean;
    score: (s: S, t: T) => number;
    qualifies: (score: number, t: T) => boolean;
    prefer: (a: T, b: T) => number;
  },
): number[][] {
  const nS = sources.length;
  const nT = targets.length;
  const inbound = new Array<number>(nT).fill(0);
  const canReceive = targets.map(t => o.canReceive(t));

  const picks: number[][] = [];
  for (let i = 0; i < nS; i++) {
    const self = sources[i]!;
    const cands: { j: number; sc: number; q: number }[] = [];
    for (let j = 0; j < nT; j++) {
      if (!canReceive[j] || o.excludes(i, j)) continue;
      const sc = o.score(self, targets[j]!);
      cands.push({ j, sc, q: o.qualifies(sc, targets[j]!) ? 1 : 0 });
    }
    cands.sort(
      (a, b) =>
        b.q - a.q ||
        b.sc - a.sc ||
        inbound[a.j]! - inbound[b.j]! ||
        o.prefer(targets[a.j]!, targets[b.j]!) ||
        a.j - b.j,
    );
    const chosen = cands.slice(0, o.slots).map(c => c.j);
    for (const j of chosen) inbound[j]!++;
    picks.push(chosen);
  }

  // Repair. Bounded by nT passes; in practice it settles in one or two.
  for (let pass = 0; pass < nT; pass++) {
    const starved: number[] = [];
    for (let j = 0; j < nT; j++) if (canReceive[j] && inbound[j]! < o.floor) starved.push(j);
    if (starved.length === 0) break;

    let swapped = false;
    for (const t of starved) {
      for (let i = 0; i < nS && inbound[t]! < o.floor; i++) {
        if (o.excludes(i, t)) continue;
        const row = picks[i]!;
        if (row.includes(t)) continue;
        // Steal from whichever of this page's picks has the most to spare.
        // Starting the search at `floor` means a donor can never be pushed
        // below it, so repairing one item cannot starve another.
        let donorPos = -1;
        let donorInbound = o.floor;
        for (let k = 0; k < row.length; k++) {
          if (inbound[row[k]!]! > donorInbound) {
            donorInbound = inbound[row[k]!]!;
            donorPos = k;
          }
        }
        if (donorPos === -1) continue;
        inbound[row[donorPos]!]!--;
        row[donorPos] = t;
        inbound[t]!++;
        swapped = true;
      }
    }
    // No donor anywhere has slack: the corpus is too small to reach the floor
    // (slots * sources has to cover floor * targets). Better a flatter graph
    // than a hang.
    if (!swapped) break;
  }

  return picks;
}

/** Neighbours from the same corpus, as an array parallel to `items`. */
export function balancedRelated<T>(items: T[], opts: BalancedOptions<T>): T[][] {
  const eligible = opts.eligible;
  return assign(items, items, {
    slots: opts.slots ?? 4,
    floor: opts.floor ?? 3,
    excludes: (i, j) => i === j,
    canReceive: t => (eligible ? eligible(t) : true),
    score: opts.score,
    qualifies: opts.qualifies,
    prefer: opts.prefer,
  }).map(row => row.map(j => items[j]!));
}

/**
 * Neighbours drawn from a *different* corpus.
 *
 * Scholarship pages linked to zero program pages and programs linked to zero
 * scholarships; median and max were both nought in each direction. That is the
 * product's own differentiator (programs listed alongside awards, the one thing
 * no competitor had) missing from the link graph, and it left the two halves of
 * the site as two disconnected components.
 *
 * Same balancing as the same-corpus case, so the new links spread instead of
 * piling onto whichever handful of listings scores well against everything.
 */
export function balancedCross<S, T>(
  sources: S[],
  targets: T[],
  opts: Omit<BalancedOptions<T>, 'score' | 'qualifies'> & {
    score: (self: S, other: T) => number;
    qualifies: (score: number, other: T) => boolean;
  },
): T[][] {
  const eligible = opts.eligible;
  return assign(sources, targets, {
    slots: opts.slots ?? 3,
    floor: opts.floor ?? 2,
    excludes: () => false,
    canReceive: t => (eligible ? eligible(t) : true),
    score: opts.score,
    qualifies: opts.qualifies,
    prefer: opts.prefer,
  }).map(row => row.map(j => targets[j]!));
}

/** Inbound link counts for a result of balancedRelated, for tests and audits. */
export function inboundCounts<T>(items: T[], picks: T[][]): Map<T, number> {
  const counts = new Map<T, number>(items.map(it => [it, 0]));
  for (const row of picks) for (const it of row) counts.set(it, (counts.get(it) ?? 0) + 1);
  return counts;
}
