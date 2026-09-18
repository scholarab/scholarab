// Public changelog for /updates.
//
// Written from what the site actually did each month, not from the version
// history. The history was squashed to a single commit in September 2026, and
// counting commits was always the wrong unit anyway: one line here often
// covers a dozen of them, and a month of small fixes could outscore the month
// that shipped the redesign.
//
// Grouped by month, not by week: a reader wants the shape of a month, and a
// seven-day slice of a solo project is mostly noise.
//
// The wording is deliberately for students, not for developers: say what
// changed on the site, not which file moved. Kept short on purpose; one plain
// sentence per line, and only the changes a reader would care about. A month
// that did ten forgettable things gets three lines, not ten.

/**
 * A screenshot of the site as it looked at a point in time.
 *
 * Sources are the real screenshots taken while the work was happening, cropped
 * to the page itself: no browser tabs, no menu bar, nothing off-site. They are
 * served from /history as WebP. Width and height are the file's true pixel
 * dimensions so the space can be reserved before the image loads.
 */
export type UpdateShot = {
  /** Path under /history, e.g. "/history/2026-03-02-first-prototype.webp". */
  src: string
  /** ISO date the screenshot was taken. */
  takenAt: string
  width: number
  height: number
  /** 'wide' for a desktop window, 'tall' for a phone. Controls the size shown. */
  shape: 'wide' | 'tall'
  /** Describes the picture for anyone who cannot see it. */
  alt: string
  /** Shown under the picture. Say when it was, and what is worth noticing. */
  caption: string
}

export type UpdateMonth = {
  /** e.g. "March 2026" */
  label: string
  /** Anchor id, e.g. "m-2026-03". Prefixed so it is a valid CSS selector. */
  id: string
  /** ISO date of the first day covered, for sorting and datetime attrs. */
  start: string
  /** One line on the shape of the month. */
  summary: string
  /**
   * How the site looked during this month. Optional: most months have no
   * surviving screenshots, and a month with none simply shows no strip.
   */
  shots?: UpdateShot[]
  items: string[]
}

/** Date the project folder was created on disk. Work began here. */
export const PROJECT_START = '2026-03-02'

export const months: UpdateMonth[] = [
  {
    label: 'March 2026',
    id: 'm-2026-03',
    start: '2026-03-02',
    summary:
      'Three weeks of building under two names that did not stick, then launch with 115 scholarships.',
    shots: [
      {
        src: '/history/2026-03-02-first-prototype.webp',
        takenAt: '2026-03-02',
        width: 1010,
        height: 488,
        shape: 'wide',
        alt: 'An early version of the site called Scholarhat, with scholarships in three columns: Active, Opening Soon and Closed.',
        caption:
          'March 2, an hour in. The first working version: six scholarships under the original name, already split into open, opening soon and closed.',
      },
    ],
    items: [
      "Planned a Medicine Hat directory using a spreadsheet.",
      "Started building on March 2 after two failed prototypes.",
      "Chose no accounts, scannable cards, visible amounts and deadline sorting.",
      "Dropped ScholarHat because another company already used the name.",
      "Renamed the site ScholarAB on March 14.",
      "Gave every page a shared layout.",
      "Rebuilt scholarship cards to fit phones.",
      "Added a filter for the university students plan to attend.",
      "Added the logo and region icons.",
      "Added saved listings after a teacher suggested them.",
      "Built automatic expiry and link checks.",
      "Simplified the typeface and homepage before launch.",
      "Launched scholarab.ca with shared-link previews.",
      "Opened March 23 with 115 scholarships and 17 programs.",
      "Kept saved listings on the student's device.",
      "Added bottom navigation on phones.",
      "Published the first Alberta scholarship application guide.",
      "Started daily expiry and broken-link checks.",
    ],
  },

  {
    label: 'April 2026',
    id: 'm-2026-04',
    start: '2026-04-01',
    summary: 'The busiest month by far: the match quiz, the program library, faster hosting.',
    shots: [
      {
        src: '/history/2026-04-04-how-it-works.webp',
        takenAt: '2026-04-04',
        width: 620,
        height: 1052,
        shape: 'tall',
        alt: 'The site on a phone, in dark colours, listing three steps: Browse, Filter and Apply.',
        caption:
          'April 4. The site explained itself in three steps, and was dark until July.',
      },
      {
        src: '/history/2026-04-25-home.webp',
        takenAt: '2026-04-25',
        width: 620,
        height: 1052,
        shape: 'tall',
        alt: "The home page on a phone, in dark colours, reading Alberta's student opportunity directory and $653,510+ open right now.",
        caption:
          'April 25: 95 scholarships and 89 research programs. Nothing changed for the rest of the month.',
      },
    ],
    items: [
      "Launched the scholarship match quiz.",
      "Added pagination for long lists.",
      "Added a private admin screen for editing listings.",
      "Expanded research programs from 17 to 97.",
      "Expanded scholarships from 113 to 148, removing duplicates.",
      "Made scholarship and program filters, sorting and saving consistent.",
      "Added optional deadline reminder emails.",
      "Added a page for teachers and counsellors.",
      "Added About and the site's privacy commitments.",
      "Moved hosting to Cloudflare.",
      "Added automated link and browser checks.",
    ],
  },

  {
    label: 'May 2026',
    id: 'm-2026-05',
    start: '2026-05-01',
    summary: 'A quieter month on accuracy: dead links, wrong counts, a broken scholarships page.',
    items: [
      "Clarified Cypress agricultural bursary eligibility for Medicine Hat and Redcliff.",
      "Added 24 Red Deer awards, mostly Polytechnic entrance scholarships.",
      "Added Lethbridge school, Rotary and lifeguard awards.",
      "Repaired 38 links and retired five discontinued programs.",
      "Excluded closed awards from the homepage dollar total.",
      "Fixed the scholarship directory's broken route.",
      "Fixed matching for newer listings.",
      "Added seven scholarships, bringing the total to 155.",
      "Explained the match quiz before students start.",
      "Arranged longer answer lists in two columns.",
      "Fixed the homepage count's stale data.",
    ],
  },

  {
    label: 'June 2026',
    id: 'm-2026-06',
    start: '2026-06-01',
    summary: 'A design pass across the whole site, then a rebuild of the match quiz.',
    items: [
      "Kept closed awards visible with a CLOSED label.",
      "Sorted listings by open, opening later, then closed.",
      "Refreshed cards, amount labels and quiz progress dots.",
      "Added a message when filters return nothing.",
      "Kept the Previous button in place between questions.",
      "Made answer tiles respond on hover.",
      "Added transitions between pages.",
      "Added the $250,000 Breakthrough Junior Challenge.",
      "Fixed Clear filters.",
      "Restarted the overnight listing refresh.",
    ],
  },

  {
    label: 'July 2026',
    id: 'm-2026-07',
    start: '2026-07-01',
    summary: 'The biggest month since launch: a full redesign, the guides, a new logo, faster pages.',
    items: [
      "Fixed a build that showed only 28 scholarships.",
      "Added scholarship search and program sorting.",
      "Added a proper page-not-found screen.",
      "Unified the main pages' design.",
      "Added anonymous counts of listing views.",
      "Published eight scholarship guides.",
      "Added related listings below each award.",
      "Updated the logo, browser icon and link previews.",
      "Added share pictures for open scholarships.",
      "Rewrote 80 listing descriptions.",
      "Repaired 18 dead links.",
      "Fixed awards closing early because of timezones.",
      "Reduced browser code for older phones.",
      "Fixed missing program matches and five quiz bugs.",
      "Enabled saving programs from match results.",
      "Confirmed successful reminder unsubscribes.",
      "Removed an unofficial Rutherford deadline from its guide.",
      "Corrected Mehl and Wolf deadlines from official sources.",
      "Added an app-style phone layout with saved listings.",
      "Added a choice of reminder timing.",
    ],
  },

  {
    label: 'August 2026',
    id: 'm-2026-08',
    start: '2026-08-01',
    summary:
      'The 2026-27 refresh, 37 new research programs, a rebuilt phone home page, a privacy and safety pass over the whole site, and a listing count that more than doubled in the last week.',
    items: [
      "Merged duplicate RMA awards and corrected amount and deadline.",
      "Updated provincial, national and city awards for the next cycle.",
      "Added 37 research and enrichment programs.",
      "Reviewed 86 program pages and rechecked 45 verification dates.",
      "Added opening dates and corrected 154 misleading open statuses.",
      "Repaired the remaining two broken links.",
      "Added four application steps to each award.",
      "Published research, medical-experience and computing guides.",
      "Fixed incomplete descriptions on 25 program search results.",
      "Gave search engines each page's actual update date.",
      "Replaced the app-style phone layout with a mobile homepage.",
      "Carried homepage answers into the quiz and explained match rankings.",
      "Added filter counts, deadline colours and consistent page widths.",
      "Fixed keyboard navigation, focus outlines and page landmarks.",
      "Required email confirmation and added one-click reminder unsubscribe.",
      "Restored 112 pages to search indexing and corrected the sitemap.",
      "Rewrote titles and descriptions for clearer search results.",
      "Licensed the code and data for reuse.",
      "Stopped storing IP addresses and removed educator email contacts.",
      "Published terms, accuracy notices and a data-incident policy.",
      "Fixed admin login limits, session expiry and rate limits.",
      "Expanded scholarships from 153 to 345 through verified city awards.",
      "Added Airdrie, Grande Prairie, provincial and national hub navigation.",
      "Added filter counts and direct city links.",
      "Added school questions and cleared quiz answers when tabs close.",
      "Made 73 search snippets lead with award amounts.",
      "Shortened hub introductions and stopped filter rows jumping.",
      "Added search-engine notifications and weekly indexing checks.",
    ],
  },

  {
    label: 'September 2026',
    id: 'm-2026-09',
    start: '2026-09-01',
    summary: 'Seventeen new city pages, for St. Albert, Brooks, Spruce Grove, Leduc, Fort Saskatchewan, Chestermere, Beaumont, Lloydminster, Camrose, Cold Lake, Lacombe, Wetaskiwin, Fort McMurray, Grande Prairie, Sherwood Park, Okotoks and Cochrane, a much deeper Edmonton page, three more guides, the Trades and Tech hub back where it belongs, and a match quiz that asks more and returns more.',
    items: [
      "Published a guide to nine discontinued awards on counsellor lists.",
      "Added Cochrane awards, including the $5,000 Rotary U-START bursary.",
      "Added Okotoks and 52 awards from its school handbooks.",
      "Added 25 Edmonton school awards, including Eastglen's mathematics scholarship.",
      "Fixed eligibility parsing that discarded grade and subject rules.",
      "Added Sherwood Park and Strathcona County school awards.",
      "Corrected Grande Prairie's hub and added Polytechnic entrance awards.",
      "Added Fort McMurray, Wood Buffalo and 76 awards.",
      "Added Wetaskiwin school, county and service-club awards.",
      "Added Lacombe and 60 school, division and university awards.",
      "Added Cold Lake, the Lakeland and 22 awards.",
      "Added Camrose and 53 school, service-club and entrance awards.",
      "Added 46 Lloydminster awards, including 32 sharing one application.",
      "Added Chestermere school and Calgary-region awards.",
      "Added Fort Saskatchewan and 21 Elk Island awards.",
      "Added 16 awards for Leduc, Leduc County and Devon.",
      "Separated Beaumont's nine awards from Leduc County's.",
      "Added 30 Spruce Grove, Stony Plain and Parkland awards.",
      "Added 46 St. Albert and Sturgeon County awards.",
      "Added 26 Brooks and County of Newell awards.",
      "Published Loran, chemistry-competition and volunteering guides.",
      "Restored the Trades and Tech field hub.",
      "Added two quiz questions and expanded results to 20.",
      "Ranked matches by eligibility fit rather than listing detail.",
      "Linked program field chips and fixed homepage city wrapping.",
      "Corrected 149 search snippets and three outdated page titles.",
      "Merged a duplicate award and blocked invalid categories.",
    ],
  },
]
