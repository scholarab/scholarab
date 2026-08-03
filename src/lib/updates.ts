// Public changelog for /updates.
//
// Every entry below was derived from the repo's own commit history (596
// commits, 2026-03-23 through 2026-08-02). The first 349 commits all carry the
// same placeholder message, so that stretch (Mar 23 - Apr 19) was reconstructed
// from what the diffs actually touched rather than from what they claimed.
//
// The wording is deliberately for students, not for developers: say what
// changed on the site, not which file moved.

/** Category chip shown beside each line. */
export type UpdateKind = 'new' | 'better' | 'fixed' | 'listings' | 'under-hood'

export type UpdateItem = {
  kind: UpdateKind
  text: string
}

export type UpdateWeek = {
  /** Human label, e.g. "Mar 23 - 29". */
  label: string
  /** ISO date of the first day covered, used for sorting and datetime attrs. */
  start: string
  /**
   * Number of commits landed in this range. Omitted for the three weeks that
   * predate the first commit — those are dated from the files on disk instead,
   * so there is no count to give.
   */
  commits?: number
  /**
   * Overrides the count shown in the rail. Used where a raw commit number would
   * mislead, e.g. the week whose work was squashed into a single commit.
   */
  railNote?: string
  /** One-sentence summary of what the week was about. */
  headline: string
  items: UpdateItem[]
}

export type UpdateMonth = {
  /** e.g. "March 2026" */
  label: string
  /** Anchor id, e.g. "m-2026-03". Prefixed so it is a valid CSS selector. */
  id: string
  /** One line on the shape of the month. */
  summary: string
  weeks: UpdateWeek[]
}

export const KIND_LABELS: Record<UpdateKind, string> = {
  'new': 'NEW',
  'better': 'IMPROVED',
  'fixed': 'FIXED',
  'listings': 'LISTINGS',
  'under-hood': 'UNDER THE HOOD',
}

export const KIND_COLORS: Record<UpdateKind, string> = {
  'new': '#0E8C64',
  'better': '#1F6FB8',
  'fixed': '#B8541F',
  'listings': '#7A4FB8',
  'under-hood': 'rgba(20,25,21,0.45)',
}

/**
 * Commits reachable from main when this log was compiled. It is a floor, not a
 * true count of changes made: the history was tidied up early on, and every
 * change before 2026-04-03 was squashed into the single commit dated Mar 23.
 * The originals are no longer in the repository.
 */
export const TOTAL_COMMITS = 596
/** When TOTAL_COMMITS was counted, so a stale number is obvious rather than wrong. */
export const COUNTED_ON = '2026-08-02'
/** Date the project folder was created on disk. Work began here. */
export const PROJECT_START = '2026-03-02'
/** Date on the oldest surviving commit. It is a squash of everything before it. */
export const FIRST_COMMIT = '2026-03-23'

export const months: UpdateMonth[] = [
  {
    label: 'March 2026',
    id: 'm-2026-03',
    summary:
      'Three weeks of building, then the first version goes out the door with 115 scholarships already in it.',
    weeks: [
      {
        label: 'Mar 2 - 8',
        start: '2026-03-02',
        headline: 'Day one. The project gets created, under a different name.',
        items: [
          {
            kind: 'new',
            text: 'The ScholarAB folder is created on March 2. The setup script that built it calls the project "scholarhat", so the name it ships under was not the name it started with.',
          },
          {
            kind: 'under-hood',
            text: 'The foundation gets picked in one go: Astro for the pages, Tailwind for the styling, React for the interactive parts, and strict type checking from the very first file.',
          },
          {
            kind: 'new',
            text: 'The first pages, the first components, and the file that would hold every scholarship all appear the same evening.',
          },
        ],
      },
      {
        label: 'Mar 9 - 15',
        start: '2026-03-09',
        headline: 'One shared frame for every page.',
        items: [
          {
            kind: 'better',
            text: 'A single shared layout and one stylesheet arrive, so every page on the site inherits the same header, footer and typography instead of each one being built separately.',
          },
        ],
      },
      {
        label: 'Mar 16 - 22',
        start: '2026-03-16',
        headline: 'The automation and the launch prep.',
        items: [
          {
            kind: 'under-hood',
            text: 'Shared logic gets pulled into one place, so the same scholarship is described identically wherever it appears.',
          },
          {
            kind: 'under-hood',
            text: 'The robots are written the week before launch: retiring scholarships whose deadlines have passed, checking every link, validating the data, and handling scholarship submissions.',
          },
          {
            kind: 'new',
            text: 'The share image is drawn on March 22, the day before launch, so a link posted anywhere shows a proper preview.',
          },
        ],
      },
      {
        label: 'Mar 23 - 29',
        start: '2026-03-23',
        commits: 1,
        railNote: 'all of the above, squashed into one',
        headline: 'The first version ships, with 115 scholarships and 17 research programs.',
        items: [
          {
            kind: 'new',
            text: 'ScholarAB opens to the public. You can browse every listing, open a page for any single one, and save the ones you care about. No account, no login.',
          },
          {
            kind: 'new',
            text: 'Saved listings are kept on your own device, so nothing about you leaves your phone or laptop.',
          },
          {
            kind: 'new',
            text: 'A bar along the bottom of the screen on phones, so you can jump between sections with your thumb.',
          },
          {
            kind: 'under-hood',
            text: 'Two robots start work on day one: one retires scholarships once their deadline passes, one checks every link on the site to catch pages that have gone dead.',
          },
        ],
      },
    ],
  },

  {
    label: 'April 2026',
    id: 'm-2026-04',
    summary: 'The busiest month by far, at 369 changes. The match quiz, the research-program library, and the move to faster hosting all happened here.',
    weeks: [
      {
        label: 'Mar 30 - Apr 5',
        start: '2026-03-30',
        commits: 123,
        headline: 'The match quiz arrives, and listings become editable without a code change.',
        items: [
          {
            kind: 'new',
            text: 'The match quiz. Answer a handful of questions about your grade, school and interests, and get back the scholarships you actually qualify for instead of the full list.',
          },
          {
            kind: 'new',
            text: 'Long lists get page numbers, so the scholarships page no longer loads a hundred cards at once.',
          },
          {
            kind: 'better',
            text: 'The scholarship and program cards were redesigned, and the homepage was rebuilt several times over until the numbers at the top read clearly.',
          },
          {
            kind: 'under-hood',
            text: 'Listings moved into a proper database with a private admin screen behind it. Before this, correcting a deadline meant editing the site\'s source code.',
          },
          {
            kind: 'under-hood',
            text: 'The whole codebase was converted to a stricter language (TypeScript) and the first automated tests were written, so mistakes get caught before they reach the site.',
          },
        ],
      },
      {
        label: 'Apr 6 - 12',
        start: '2026-04-06',
        commits: 101,
        headline: 'The research-program library grows almost six-fold.',
        items: [
          {
            kind: 'listings',
            text: 'Research programs went from 17 to 97: summer labs, university programs and student research placements across Alberta and Canada.',
          },
          {
            kind: 'listings',
            text: 'Scholarships grew from 113 to 140, with duplicates weeded out along the way.',
          },
          {
            kind: 'better',
            text: 'Scholarships and research programs used to be built from two separate pieces of code that slowly drifted apart. They were merged into one, so filtering, sorting and saving now behave identically on both pages.',
          },
          {
            kind: 'better',
            text: 'The admin editing screens were reworked so listings could be corrected faster.',
          },
          {
            kind: 'under-hood',
            text: 'Every admin route got its own test.',
          },
        ],
      },
      {
        label: 'Apr 13 - 19',
        start: '2026-04-13',
        commits: 145,
        headline: 'Email deadline alerts, an educators page, and a move to faster hosting.',
        items: [
          {
            kind: 'new',
            text: 'Deadline alerts. Give an email address and get a reminder before a scholarship you saved closes. Nothing else is ever sent to that address.',
          },
          {
            kind: 'new',
            text: 'A page for teachers and counsellors, with the numbers and links they need to point students here.',
          },
          {
            kind: 'new',
            text: 'An About page explaining who built the site and the rules it runs on: no ads, no sponsored listings, no personal data.',
          },
          {
            kind: 'listings',
            text: 'Regional coverage expanded to 148 scholarships, adding awards specific to Red Deer and Lethbridge.',
          },
          {
            kind: 'better',
            text: 'The site moved to Cloudflare, which serves pages from a location near you instead of one far away.',
          },
          {
            kind: 'under-hood',
            text: 'The admin login was hardened: repeated failed attempts are now throttled, and passwords are stored properly.',
          },
          {
            kind: 'under-hood',
            text: 'Four rounds of cleanup deleted broken automation, dead code and duplicated tests. Link checking and full browser tests now run automatically on every change.',
          },
        ],
      },
    ],
  },

  {
    label: 'May 2026',
    id: 'm-2026-05',
    summary: 'A quieter month spent on accuracy: dead links, wrong counts, and a deploy that had broken the scholarships page.',
    weeks: [
      {
        label: 'May 1 - 10',
        start: '2026-05-01',
        commits: 10,
        headline: 'A link sweep catches 38 dead pages.',
        items: [
          {
            kind: 'fixed',
            text: '38 broken links were repaired: 7 had moved to new addresses, and 5 programs had been discontinued entirely and were retired from the site.',
          },
          {
            kind: 'fixed',
            text: 'The total dollar figure on the homepage was counting scholarships whose deadlines had already passed. It now only counts money you can still apply for.',
          },
          {
            kind: 'listings',
            text: 'Added the Medicine Hat Firefighters Charitable Foundation Scholarship.',
          },
          {
            kind: 'under-hood',
            text: 'All known security advisories in the site\'s dependencies were cleared.',
          },
        ],
      },
      {
        label: 'May 11 - 17',
        start: '2026-05-11',
        commits: 13,
        headline: 'The scholarships page comes back from a 404, and six new awards land.',
        items: [
          {
            kind: 'fixed',
            text: 'The main scholarships page had started returning "page not found" after a hosting change. Tracked down and fixed.',
          },
          {
            kind: 'listings',
            text: 'Six scholarships added: Voice for Animals, Luke Santi Memorial, Stuck at Prom, Fraser Institute, Valour Canada, and the Optimist Deaf/Hard of Hearing award. That brought the site to 155.',
          },
          {
            kind: 'fixed',
            text: 'The match quiz was ignoring the eligibility rules on newer listings, so some scholarships never showed up as matches.',
          },
          {
            kind: 'fixed',
            text: 'The homepage count was leaving out scholarships that have no fixed deadline.',
          },
        ],
      },
      {
        label: 'May 18 - 31',
        start: '2026-05-18',
        commits: 7,
        headline: 'The match page gets a cleaner first impression.',
        items: [
          {
            kind: 'better',
            text: 'The match page opens with a larger heading and a clearer explanation of what the quiz does before you start it.',
          },
          {
            kind: 'better',
            text: 'Questions with four or more answers now lay out in two columns instead of one long stack.',
          },
          {
            kind: 'fixed',
            text: 'The homepage scholarship count was frozen at whatever it was when the site was last built. It now counts live.',
          },
        ],
      },
    ],
  },

  {
    label: 'June 2026',
    id: 'm-2026-06',
    summary: 'A design pass across the whole site, then a focused rebuild of the match quiz.',
    weeks: [
      {
        label: 'Jun 1 - 7',
        start: '2026-06-01',
        commits: 22,
        headline: 'Closed scholarships stop hiding, and the site gets a visual refresh.',
        items: [
          {
            kind: 'better',
            text: 'Closed scholarships now carry a red CLOSED chip and stay visible in the All tab, instead of quietly disappearing. If an award exists but has passed, you can still see it and plan for next year.',
          },
          {
            kind: 'better',
            text: 'Listings sort in a sensible order: open now first, opening later next, closed last, with the most recently closed at the top of that group.',
          },
          {
            kind: 'better',
            text: 'A visual refresh across the site: cards glow slightly on hover, the navigation underline slides between sections, award amounts sit in their own pill, and the quiz shows progress dots.',
          },
          {
            kind: 'better',
            text: 'Empty states now say something useful when a filter returns nothing, instead of showing a blank page.',
          },
        ],
      },
      {
        label: 'Jun 8 - 14',
        start: '2026-06-08',
        commits: 19,
        headline: 'The match quiz stops jumping around while you answer it.',
        items: [
          {
            kind: 'fixed',
            text: 'The Previous button used to move down the screen as questions got longer, so you would reach for it and miss. The answer area is now a fixed height and the button stays put.',
          },
          {
            kind: 'better',
            text: 'Answer tiles got taller on short questions, drop a shadow, and lift when you hover them, so it is obvious what you are about to pick.',
          },
          {
            kind: 'better',
            text: 'On phones, the bottom navigation now sits flush as a proper tab bar, and cards stopped flickering as they loaded.',
          },
          {
            kind: 'better',
            text: 'Moving between pages crossfades instead of jumping. Swiping left or right on a phone slides, as you would expect.',
          },
          {
            kind: 'listings',
            text: 'Added the Breakthrough Junior Challenge, worth $250,000 and closing September 15, 2026.',
          },
          {
            kind: 'fixed',
            text: 'The Clear filters button did not always clear everything.',
          },
        ],
      },
      {
        label: 'Jun 15 - 30',
        start: '2026-06-15',
        commits: 1,
        headline: 'A single repair to the nightly data sync.',
        items: [
          {
            kind: 'fixed',
            text: 'The automation that refreshes listings overnight had stopped running. Restarted.',
          },
        ],
      },
    ],
  },

  {
    label: 'July 2026',
    id: 'm-2026-07',
    summary: 'The biggest month of change since launch: a full editorial redesign, the guides section, a new logo, and a rebuild that made every page noticeably faster.',
    weeks: [
      {
        label: 'Jul 1 - 12',
        start: '2026-07-01',
        commits: 28,
        headline: 'A site-wide redesign, plus a fix for a build that had silently dropped most of the listings.',
        items: [
          {
            kind: 'fixed',
            text: 'The live site had been building with only 28 scholarships instead of the full set. Fixed, along with a JavaScript error that was affecting every page.',
          },
          {
            kind: 'fixed',
            text: 'Google was showing a generic globe next to ScholarAB in search results instead of the site\'s icon.',
          },
          {
            kind: 'new',
            text: 'Search on the scholarships page, and sorting on the programs page.',
          },
          {
            kind: 'new',
            text: 'A real 404 page. Before this, a mistyped address quietly served the homepage and pretended nothing was wrong.',
          },
          {
            kind: 'better',
            text: 'Every main page (Home, Scholarships, Programs, Match, Saved, About, and the individual listing pages) was redesigned around a single editorial look.',
          },
          {
            kind: 'fixed',
            text: 'Region filters and sorting on the list pages were returning the wrong results in some combinations.',
          },
          {
            kind: 'under-hood',
            text: 'Anonymous counting was added so it is possible to see which listings get opened most. No names, no emails, no cookies, no IP addresses.',
          },
        ],
      },
      {
        label: 'Jul 13 - 19',
        start: '2026-07-13',
        commits: 75,
        headline: 'Guides, a new logo, related listings, and a rewrite of 80 descriptions.',
        items: [
          {
            kind: 'new',
            text: 'The Guides section: eight practical write-ups on the Rutherford scholarship, essay writing, reference letters, Grade 11 and 12 timelines, local awards, Medicine Hat awards, and trades and RAP funding.',
          },
          {
            kind: 'new',
            text: 'A "More like this" block at the bottom of every listing, so finding the next thing to apply for does not mean going back to the list.',
          },
          {
            kind: 'new',
            text: 'A new ScholarAB logo across the site, the browser tab, and the preview image that shows when a link is shared.',
          },
          {
            kind: 'new',
            text: 'Every open scholarship now generates its own share image, so sending a link to a friend shows the actual award rather than a generic banner.',
          },
          {
            kind: 'better',
            text: '80 listing descriptions were rewritten by hand to sound like a person wrote them, not a template.',
          },
          {
            kind: 'fixed',
            text: '18 dead links repaired, 12 on research programs and 6 on scholarships, and the link checker was hardened against sites that block automated checks.',
          },
          {
            kind: 'fixed',
            text: 'Timezone bugs meant a scholarship could show as closed on its own deadline day, and retired listings could still appear in places. Fixed everywhere, including the homepage total and quiz results.',
          },
          {
            kind: 'better',
            text: 'The pages were rebuilt to send far less code to your browser, which made them load and respond faster, especially on older phones.',
          },
          {
            kind: 'better',
            text: 'The educators page was redesigned to match the rest of the site, and its numbers now agree with the homepage.',
          },
          {
            kind: 'under-hood',
            text: 'A security patch for the site framework, and search-engine fixes: correct canonical addresses, a redirect from the bare domain, and explicit permission for AI assistants to read the site.',
          },
          {
            kind: 'under-hood',
            text: 'A dataset of 531 Alberta high schools and the 171 school authorities behind them was assembled, for reaching counsellors directly.',
          },
        ],
      },
      {
        label: 'Jul 20 - 26',
        start: '2026-07-20',
        commits: 21,
        headline: 'Research programs start showing up in quiz results again.',
        items: [
          {
            kind: 'fixed',
            text: 'The match quiz was never returning research programs, only scholarships. Fixed, along with five smaller bugs found in the same sweep.',
          },
          {
            kind: 'new',
            text: 'Research programs can now be saved from the match results, and program rows line up with the scholarship rows above them.',
          },
          {
            kind: 'fixed',
            text: 'Apply clicks were being counted twice, and some rows in the internal stats had no name attached.',
          },
          {
            kind: 'better',
            text: 'Unsubscribing from deadline alerts now confirms it worked, instead of leaving you guessing.',
          },
          {
            kind: 'better',
            text: 'The social handles were updated: Instagram at @scholarab.ca and TikTok at @scholarab.',
          },
          {
            kind: 'under-hood',
            text: 'Full browser tests now run on every single change, not just occasionally.',
          },
        ],
      },
      {
        label: 'Jul 27 - 31',
        start: '2026-07-27',
        commits: 15,
        headline: 'A mobile app layout, and the Rutherford page stops guessing at a deadline.',
        items: [
          {
            kind: 'fixed',
            text: 'The Rutherford guide listed a deadline that does not officially exist. It was removed, the eligibility was corrected to Grades 10 and 11, and the guide now answers the question people actually search for: when the application opens.',
          },
          {
            kind: 'fixed',
            text: 'The Mehl and Wolf award deadlines were corrected against their official pages.',
          },
          {
            kind: 'new',
            text: 'A dedicated app-style layout for phones. Visiting the site on a phone now lands in it, with saved listings and research programs carried across.',
          },
          {
            kind: 'better',
            text: 'The alert reminder schedule is now something you choose, rather than a fixed setting.',
          },
          {
            kind: 'better',
            text: 'The quiz says it takes 30 seconds, because that is how long it actually takes.',
          },
          {
            kind: 'under-hood',
            text: 'Every internal link was pointed at one consistent address format, which had been splitting each page into two entries in Google.',
          },
        ],
      },
    ],
  },

  {
    label: 'August 2026',
    id: 'm-2026-08',
    summary: 'The 2026-27 cycle refresh: every date checked, every link checked.',
    weeks: [
      {
        label: 'Aug 1 - 2',
        start: '2026-08-01',
        commits: 15,
        headline: 'Every listing re-dated for the new school year, and nothing on the site reads CLOSED.',
        items: [
          {
            kind: 'listings',
            text: 'Provincial bursaries, national awards, Alberta-wide awards and the city collections were all rolled forward to the 2026-27 cycle. As of August 2, nothing on the site is showing as closed.',
          },
          {
            kind: 'fixed',
            text: 'The Indspire and CPA Alberta listings were checked against their live pages and corrected.',
          },
          {
            kind: 'fixed',
            text: 'The last two dead addresses were repaired. All 251 links on the site now resolve.',
          },
          {
            kind: 'better',
            text: 'Research program fields were simplified so the details row fits on one line instead of wrapping.',
          },
          {
            kind: 'under-hood',
            text: 'The project was formally licensed: the code is open source, the listing data can be reused with credit, and the ScholarAB name and logo stay reserved.',
          },
          {
            kind: 'under-hood',
            text: 'The alert signup form now cleans up email addresses before storing them, with tests covering it.',
          },
        ],
      },
    ],
  },
]
