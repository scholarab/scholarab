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

/** Category chip shown beside each line. */
export type UpdateKind = 'new' | 'better' | 'fixed' | 'listings' | 'under-hood'

export type UpdateItem = {
  kind: UpdateKind
  text: string
}

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
  items: UpdateItem[]
}

export const KIND_LABELS: Record<UpdateKind, string> = {
  'new': 'NEW',
  'better': 'IMPROVED',
  'fixed': 'FIXED',
  'listings': 'LISTINGS',
  'under-hood': 'UNDER THE HOOD',
}

/**
 * Five categories need five distinguishable marks, so these are the one place
 * the palette carries hues of its own. All five are measured against the WHITE
 * month card these sit on, not the cream page, which is the more forgiving
 * background and the reason the misses went unnoticed. At the badge's 11px:
 * #B8541F was 4.13:1 (the same orange already retired from the day chips and
 * /404), the 0.45 grey was 2.9:1, and #0E8C64; the site's link green, which
 * does clear AA on cream; is only 4.24:1 here. Their replacements measure
 * 6.06, 5.08 and 6.52; the blue and purple always cleared it at 5.22 and 5.77.
 */
export const KIND_COLORS: Record<UpdateKind, string> = {
  'new': '#0A6B4D',
  'better': '#1F6FB8',
  'fixed': '#A0491A',
  'listings': '#7A4FB8',
  'under-hood': 'rgba(20,25,21,0.62)',
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
      {
        kind: 'under-hood',
        text: 'The first plan, from late February, covered Medicine Hat only and ran off a spreadsheet.',
      },
      {
        kind: 'new',
        text: 'Work starts March 2. A tool that builds a site from a description failed twice, so it was written by hand instead.',
      },
      {
        kind: 'new',
        text: 'March 6: the four biggest Canadian scholarship sites were taken apart to see what to do differently. Five rules came out of it and all five are still here: no account, cards you can skim, the dollar total up front, and closing soonest first.',
      },
      {
        kind: 'under-hood',
        text: 'The name changes that day: "ScholarHat" was already taken by a big training company. The next one used the 403 area code.',
      },
      {
        kind: 'new',
        text: 'ScholarAB on March 14. The 403 idea was dropped because 403 means nothing to a student in Edmonton.',
      },
      {
        kind: 'better',
        text: 'One shared layout, so every page looks the same instead of being built separately.',
      },
      {
        kind: 'fixed',
        text: 'Scholarship cards would not line up on phones. The card had to be rebuilt from scratch.',
      },
      {
        kind: 'new',
        text: 'A filter on March 16: pick the university you are heading to, and the list narrows to what fits.',
      },
      {
        kind: 'new',
        text: 'The logo arrives March 17, with an icon for each region.',
      },
      {
        kind: 'new',
        text: 'A teacher pointed out that students lose everything they find by the next day. Saving listings came out of that.',
      },
      {
        kind: 'under-hood',
        text: 'The robots get written: retiring closed scholarships, and checking every link.',
      },
      {
        kind: 'better',
        text: 'March 22, the night before launch: one plain typeface everywhere, and a home page that points you somewhere instead of dumping the whole list on you.',
      },
      {
        kind: 'new',
        text: 'scholarab.ca goes live that evening, with a preview picture for shared links.',
      },
      {
        kind: 'new',
        text: 'March 23: ScholarAB opens to the public with 115 scholarships and 17 research programs. Browse everything, save what you like. No account, no login.',
      },
      {
        kind: 'new',
        text: 'Saved listings stay on your own device. Nothing about you leaves it.',
      },
      {
        kind: 'new',
        text: 'A bar along the bottom on phones, for jumping between sections.',
      },
      {
        kind: 'new',
        text: 'The first guide: how to apply for scholarships in Alberta.',
      },
      {
        kind: 'under-hood',
        text: 'Two robots start on launch day: one retires closed scholarships, one hunts for dead links.',
      },
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
      {
        kind: 'new',
        text: 'The match quiz. Answer a few questions and get back only the scholarships you qualify for.',
      },
      {
        kind: 'new',
        text: 'Page numbers on long lists, so the page stops loading a hundred cards at once.',
      },
      {
        kind: 'under-hood',
        text: 'Listings moved into a database with a private admin screen. Before this, fixing a deadline meant editing the site\'s code.',
      },
      {
        kind: 'listings',
        text: 'Research programs went from 17 to 97: summer labs and student placements.',
      },
      {
        kind: 'listings',
        text: 'Scholarships grew from 113 to 148, adding awards for Red Deer and Lethbridge, with duplicates weeded out.',
      },
      {
        kind: 'better',
        text: 'Scholarships and programs ran on two sets of code that had drifted apart. Merged, so filtering, sorting and saving now behave the same on both.',
      },
      {
        kind: 'new',
        text: 'Deadline alerts. Give an email address, get a reminder before a saved scholarship closes. Nothing else is ever sent.',
      },
      {
        kind: 'new',
        text: 'A page for teachers and counsellors.',
      },
      {
        kind: 'new',
        text: 'An About page, and the rules: no ads, no sponsored listings, no personal data.',
      },
      {
        kind: 'better',
        text: 'The site moved to Cloudflare, so pages come from somewhere near you.',
      },
      {
        kind: 'under-hood',
        text: 'Link checks and browser tests now run on every change.',
      },
    ],
  },

  {
    label: 'May 2026',
    id: 'm-2026-05',
    start: '2026-05-01',
    summary: 'A quieter month on accuracy: dead links, wrong counts, a broken scholarships page.',
    items: [
      {
        kind: 'fixed',
        text: '38 broken links repaired. 5 programs had shut down for good and were retired.',
      },
      {
        kind: 'fixed',
        text: 'The dollar total on the home page was counting closed scholarships. It now counts only money you can still apply for.',
      },
      {
        kind: 'fixed',
        text: 'The scholarships page had started showing "page not found" after a hosting change.',
      },
      {
        kind: 'fixed',
        text: 'The match quiz was ignoring the rules on newer listings, so some never matched.',
      },
      {
        kind: 'listings',
        text: 'Seven scholarships added, including the Medicine Hat Firefighters Charitable Foundation Scholarship, bringing the site to 155.',
      },
      {
        kind: 'better',
        text: 'The match page now explains what the quiz does before you start.',
      },
      {
        kind: 'better',
        text: 'Questions with four or more answers now sit in two columns.',
      },
      {
        kind: 'fixed',
        text: 'The home page count was frozen at whatever it was when the site was last built. It now counts live.',
      },
    ],
  },

  {
    label: 'June 2026',
    id: 'm-2026-06',
    start: '2026-06-01',
    summary: 'A design pass across the whole site, then a rebuild of the match quiz.',
    items: [
      {
        kind: 'better',
        text: 'Closed scholarships now carry a red CLOSED chip and stay in the All tab, so you can plan for next year.',
      },
      {
        kind: 'better',
        text: 'Listings sort in a sensible order: open now, opening later, then closed.',
      },
      {
        kind: 'better',
        text: 'A visual refresh: cards glow on hover, amounts sit in their own pill, the quiz shows progress dots.',
      },
      {
        kind: 'better',
        text: 'A filter that finds nothing now says so instead of going blank.',
      },
      {
        kind: 'fixed',
        text: 'The Previous button used to slide down the screen on longer questions, so you would reach for it and miss. It stays put now.',
      },
      {
        kind: 'better',
        text: 'Answer tiles lift when you hover them, so it is clear what you are picking.',
      },
      {
        kind: 'better',
        text: 'Moving between pages crossfades, and swiping left or right on a phone slides.',
      },
      {
        kind: 'listings',
        text: 'Added the Breakthrough Junior Challenge, worth $250,000.',
      },
      {
        kind: 'fixed',
        text: 'Clear filters did not always clear everything.',
      },
      {
        kind: 'fixed',
        text: 'The overnight listing refresh had stopped running. Restarted.',
      },
    ],
  },

  {
    label: 'July 2026',
    id: 'm-2026-07',
    start: '2026-07-01',
    summary: 'The biggest month since launch: a full redesign, the guides, a new logo, faster pages.',
    items: [
      {
        kind: 'fixed',
        text: 'The live site was building with 28 scholarships instead of the full set.',
      },
      {
        kind: 'new',
        text: 'Search on the scholarships page, and sorting on the programs page.',
      },
      {
        kind: 'new',
        text: 'A real 404 page. A mistyped address used to quietly serve the home page instead.',
      },
      {
        kind: 'better',
        text: 'Every main page was redesigned around a single look.',
      },
      {
        kind: 'under-hood',
        text: 'Anonymous counting of which listings get opened. No names, emails, cookies or IP addresses.',
      },
      {
        kind: 'new',
        text: 'The Guides section: eight write-ups on Rutherford, essays, reference letters, Grade 11 and 12 timelines, local awards and trades funding.',
      },
      {
        kind: 'new',
        text: 'A "More like this" block at the bottom of every listing, so you do not have to go back to the list.',
      },
      {
        kind: 'new',
        text: 'A new logo across the site, the browser tab, and shared links.',
      },
      {
        kind: 'new',
        text: 'Every open scholarship gets its own share picture, so a link shows the actual award.',
      },
      {
        kind: 'better',
        text: '80 listing descriptions rewritten by hand.',
      },
      {
        kind: 'fixed',
        text: '18 dead links repaired.',
      },
      {
        kind: 'fixed',
        text: 'A timezone bug could show a scholarship as closed on its own deadline day.',
      },
      {
        kind: 'better',
        text: 'Pages send far less code to your browser, so they load faster on older phones.',
      },
      {
        kind: 'fixed',
        text: 'The match quiz was returning scholarships only, never research programs. Fixed, with five smaller bugs.',
      },
      {
        kind: 'new',
        text: 'Research programs can now be saved straight from the match results.',
      },
      {
        kind: 'better',
        text: 'Unsubscribing from deadline alerts now confirms it worked.',
      },
      {
        kind: 'fixed',
        text: 'The Rutherford guide listed a deadline that does not officially exist. It was removed, and the guide now says when applications open instead.',
      },
      {
        kind: 'fixed',
        text: 'The Mehl and Wolf deadlines were corrected against their official pages.',
      },
      {
        kind: 'new',
        text: 'An app-style layout for phones, with your saved listings carried over.',
      },
      {
        kind: 'better',
        text: 'You now choose when alert reminders arrive.',
      },
    ],
  },

  {
    label: 'August 2026',
    id: 'm-2026-08',
    start: '2026-08-01',
    summary:
      'The 2026-27 refresh, 37 new research programs, a rebuilt phone home page, a privacy and safety pass over the whole site, and a listing count that more than doubled in the last week.',
    items: [
      {
        kind: 'listings',
        text: 'Provincial, national and city awards were all rolled forward to the 2026-27 cycle. As of August 2, nothing on the site reads closed.',
      },
      {
        kind: 'listings',
        text: '37 research and enrichment programs were added: trades and apprenticeship, math and physics contests, Model UN and youth parliament, Space Apps, Rise, Explore and the House of Commons Page Program.',
      },
      {
        kind: 'listings',
        text: 'All 86 program pages were read end to end. Programs that pointed at a provider home page now point at the page that actually describes them, and the verified stamp on 45 of them was re-checked by hand.',
      },
      {
        kind: 'listings',
        text: 'Listings now say when applications open rather than only "DATE TBA", and 154 awards that were being called open are no longer.',
      },
      {
        kind: 'fixed',
        text: 'The last two dead addresses were repaired. All 251 links now work.',
      },
      {
        kind: 'new',
        text: 'Every award page lists the four real steps of applying, so you can tick them off.',
      },
      {
        kind: 'new',
        text: 'Three guides now cover the programs side: research placements that pay, how to get medical experience in high school, and which computing contests are free.',
      },
      {
        kind: 'better',
        text: 'Search results were showing half a description on 25 program pages. They now use the whole line Google gives them.',
      },
      {
        kind: 'under-hood',
        text: 'Each page now tells search engines the day its own content changed, rather than 308 pages sharing one date.',
      },
      {
        kind: 'new',
        text: 'A home page built for phones, after the old app-style mobile layout was taken back out.',
      },
      {
        kind: 'better',
        text: 'The match quiz carries your answers over from the home page teaser, and each result now says why it ranked where it did.',
      },
      {
        kind: 'better',
        text: 'Filters say how many listings are left, deadlines are shaded by how close they are, and every page shares one width.',
      },
      {
        kind: 'better',
        text: 'The skip link, the focus outlines and the site banner work properly for anyone using a keyboard or a screen reader.',
      },
      {
        kind: 'better',
        text: 'Deadline reminders now ask you to confirm your email before anything is sent, and every reminder carries a one-click unsubscribe.',
      },
      {
        kind: 'better',
        text: '112 scholarship pages had been quietly hidden from Google. They are indexable again, and the sitemap no longer lists pages it tells Google to skip.',
      },
      {
        kind: 'better',
        text: 'Page titles and descriptions were rewritten to answer the question in the search result itself, instead of five awards sharing one line.',
      },
      {
        kind: 'under-hood',
        text: 'The project was licensed: the code is open source, and the listing data can be reused with credit.',
      },
      {
        kind: 'under-hood',
        text: 'A privacy pass: IP addresses are no longer stored, search text that is kept is now disclosed, and 695 educator email addresses were taken out of the public data.',
      },
      {
        kind: 'under-hood',
        text: 'Terms of use were published, every page says plainly that a listing can be wrong or out of date, and the security page now explains what happens if data ever leaks.',
      },
      {
        kind: 'fixed',
        text: 'Admin logins are capped across all addresses, admin sessions expire, and the rate limits count properly instead of losing writes.',
      },
      {
        kind: 'listings',
        text: 'The last week of the month more than doubled the site: 153 scholarships became 345. Almost all of the new ones are city awards, read one at a time against the organisation that funds them, across Calgary, Edmonton, Lethbridge, Red Deer, Medicine Hat, Grande Prairie and Airdrie.',
      },
      {
        kind: 'new',
        text: 'Airdrie and Grande Prairie got pages of their own, and province-wide and national awards now have the same kind of page the cities have.',
      },
      {
        kind: 'better',
        text: 'Every filter says how many listings are behind it before you click, and a city chip now takes you to that city instead of filtering where you stand.',
      },
      {
        kind: 'better',
        text: 'The quiz asks which school you go to, where the city has awards tied to one, and it forgets your answers when you close the tab.',
      },
      {
        kind: 'better',
        text: 'Search results lead with what an award is worth. 73 of them used to open on "Not open yet", which told you nothing.',
      },
      {
        kind: 'better',
        text: 'The emoji came off the category and program pages, the hub intros were cut to one sentence, and the chip rows stopped jumping between pages.',
      },
      {
        kind: 'under-hood',
        text: 'Changed pages are announced to search engines within minutes of a deploy, and a weekly check now reports which pages are actually indexed rather than assuming.',
      },
    ],
  },

  {
    label: 'September 2026',
    id: 'm-2026-09',
    start: '2026-09-01',
    summary: 'St. Albert, Brooks and Spruce Grove get pages of their own, three more guides, the Trades and Tech hub back where it belongs, and a match quiz that asks more and returns more.',
    items: [
      {
        kind: 'listings',
        text: 'Spruce Grove, Stony Plain and Parkland County now have 30 awards and a page of their own, out of the two Parkland high schools and the ag society.',
      },
      {
        kind: 'listings',
        text: 'St. Albert and Sturgeon County now have 46 awards and a page of their own, including the four scholarships the Humboldt Broncos families endowed.',
      },
      {
        kind: 'listings',
        text: 'Brooks and the County of Newell now have 26 awards and a page of their own, read one at a time out of the Brooks Composite scholarship handbook.',
      },
      {
        kind: 'new',
        text: 'Three new guides: the Loran Award, chemistry competitions across Canada, and how volunteering hours actually work in Alberta high schools.',
      },
      {
        kind: 'new',
        text: 'Trades and Tech is a field again, with a page of its own rather than a filter buried in a list.',
      },
      {
        kind: 'better',
        text: 'The match quiz asks two more questions it already knew how to use, and shows up to 20 matches instead of stopping at ten.',
      },
      {
        kind: 'better',
        text: 'Matches are ranked on what actually separates one award from another, not on how much detail a listing happens to carry.',
      },
      {
        kind: 'better',
        text: 'The field chips open the field from the programs side too, and the home page city row fits on one line again.',
      },
      {
        kind: 'fixed',
        text: '149 pages were opening their search result on a date nobody can act on, and three page titles were still promising 2026 when most deadlines are 2027.',
      },
      {
        kind: 'fixed',
        text: 'A listing that existed twice was merged, and the build now refuses to ship a category that does not exist.',
      },
    ],
  },
]
