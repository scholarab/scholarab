// Metadata for the /guides section. Each guide page imports its own entry;
// the index page, footer, sitemap generator, and "keep reading" blocks all
// read from this list so a new guide only needs a page file + one entry here.
import { deadlineStats } from './deadline-stats'
import { getToday } from './utils'
import scholarshipsJson from '../data/scholarships.json'

// The deadlines guide quotes counts from the catalogue; computed, not typed.
// Build-time only: this module is read by .astro pages and scripts.
const DL = deadlineStats(scholarshipsJson as Array<{ deadline?: string | null; url?: string | null }>, getToday().toLocaleDateString('en-CA'))

export type GuideMeta = {
  slug: string
  title: string
  /** One-line summary used for meta description, cards, and JSON-LD. */
  description: string
  minutes: number
  datePublished: string
  dateModified: string
  /**
   * Detail-page slugs this guide is *about*, not merely mentions. The listing
   * pages named here render a link back to the guide, so Google sees the pair
   * as a directory entry plus its explainer rather than two thin pages
   * competing for the same query, which is how the Rutherford listing ended
   * up as "Duplicate, Google chose different canonical than user".
   *
   * Slugs from either dataset are valid; a guide whose subject is a research
   * program earns the same reciprocal card as one about a scholarship.
   *
   * Only list a slug when the guide's subject IS that listing. A guide that
   * cites a scholarship in passing (Loran in the reference-letter guide) is
   * not an explainer for it, and pointing the listing at it would send
   * students somewhere that never answers the question they arrived with.
   */
  relatedListings?: string[]
}

export const guides: GuideMeta[] = [
  {
    slug: 'high-school-research-programs-alberta',
    // The first guide pointing at /programs/. Every one of the nine before it
    // was scholarship-side, which sent 71 internal links into /scholarships/
    // and none at all into the section that out-earns it on clicks, CTR and
    // impressions. "research opportunities for high school students" is also
    // the highest-converting query on the site at 28.6%, so the demand was
    // measured before this was written rather than assumed.
    title: 'Research programs for Alberta students, and which ones pay',
    description:
      'Which Alberta research programs pay, what marks they ask for, and the geography rule that decides which HYRS campus you apply to. Deadlines run March.',
    minutes: 8,
    datePublished: '2026-08-23',
    dateModified: '2026-09-29',
    relatedListings: [
      'alberta-innovates-hyrs-university-of-alberta',
      'alberta-innovates-hyrs-university-of-calgary',
      'alberta-innovates-hyrs-university-of-lethbridge',
      'wisest-summer-research-program',
    ],
  },
  {
    slug: 'medical-experience-high-school-alberta',
    // Program-side guide #2. /programs/health/ is the hub students arrive at
    // from "how do I get medical experience in high school", which is a
    // question about access rather than about programs: the honest answer is
    // AHS volunteering at 15, a school-registered campus day, and three
    // competitions. Written so it does not restate the HYRS rules that the
    // research guide already owns.
    title: 'How to get medical experience in high school',
    description:
      'AHS takes volunteers from age 15. Where else an Alberta student can get clinical exposure: Discovery Days, HOSA chapters and the biology competitions.',
    minutes: 7,
    datePublished: '2026-08-23',
    dateModified: '2026-09-29',
    relatedListings: [
      'ahs-youth-volunteer-research-programs',
      'cmhf-discovery-days-in-health-sciences',
      'hosa-canada-future-health-professionals',
      'calgaryedmonton-brain-bee',
      'canadian-biology-olympiad-cbo',
    ],
  },
  {
    slug: 'high-school-computing-programs-alberta',
    // Program-side guide #3, and the one with the clearest non-obvious thesis:
    // half of the computing programs worth entering are registered by a
    // teacher inside a window that closes before students start looking, so
    // the guide is organised by who does the registering rather than by topic.
    title: 'Computing contests and camps in Alberta',
    description:
      'Nearly all free. Coding contests, hackathons and camps open to Alberta high school students, and which ones only a teacher can register you for.',
    minutes: 8,
    datePublished: '2026-08-23',
    dateModified: '2026-09-29',
    relatedListings: [
      'canadian-computing-competition-ccc',
      'cybertitan-national-cybersecurity-competition',
      'amii-k-12-ai-literacy',
      'nasa-international-space-apps-challenge',
      'apple-swift-student-challenge',
      'technovation-girls-alberta',
      'hackergal-national-ambassador-program',
    ],
  },
  {
    slug: 'alexander-rutherford-scholarship-guide',
    // Ranks page 1 for ~600 impressions a month of Rutherford queries and took
    // zero clicks on the old "…, explained" title. Two thirds of those queries
    // ask "when does it open" or "how do I apply", so the title and the first
    // clause of the description answer exactly that; the old description led
    // with the dollar figure, which is the one thing the SERP already shows.
    //
    // STOP REWRITING THIS SNIPPET. The 2026-08-22 rewrite above was measured on
    // 2026-09-03 and it did not work: 2026-07-22..08-18 ran 2,985 impressions,
    // 11 clicks, 0.37% CTR at position 8.4, and 2026-08-19..09-03 ran 2,793
    // impressions, 6 clicks, 0.21% at position 7.8. Rank improved and CTR
    // halved. Two further facts say the ceiling is the SERP rather than the
    // wording: this page drew 178 AI-feature impressions in 28 days, and
    // Rutherford is a government award whose deadline and GPA cutoff Alberta
    // Student Aid answers above us. Treat it as a zero-click query shape.
    //
    // The trap this leaves behind is measurement, not copy. This one page is
    // 23% of all site impressions at 0.33% CTR, which drags every site-wide
    // average: the position 8-10 band reads 0.70% with it and 1.86% without,
    // below the 2.29% of the 10-15 band, so the site looks like it has a
    // CTR problem it does not have. Exclude this page before concluding
    // anything from a site-wide CTR number. Every other guide converts
    // normally (Medicine Hat 15.38%, Grade 12 6.06%) from the same positions.
    title: 'Alexander Rutherford Scholarship: amounts and how to apply',
    description:
      'Applications open August 1 with no closing deadline. What each grade pays (up to $2,500 total), the 75% five-course average you need, and how to apply.',
    minutes: 9,
    datePublished: '2026-07-19',
    dateModified: '2026-09-29',
    relatedListings: ['alexander-rutherford-scholarship'],
  },
  {
    slug: 'volunteering-alberta-high-school',
    // Two queries converted at 100% CTR off a single impression each -- "hospital
    // volunteer programs for high school students" at position 7 and "science
    // volunteer opportunities for high school students" at 24 -- against no
    // dedicated page. The AHS listing has been absorbing that intent by accident
    // and is the best-converting listing on the site at 9.23%. This is the page
    // those queries were looking for.
    title: 'Volunteering for Alberta high school students',
    description:
      'Hospital placements through AHS, science centre shifts, youth councils, and the awards that pay for a volunteer record. What is open right now.',
    minutes: 6,
    datePublished: '2026-09-01',
    dateModified: '2026-09-29',
    // No relatedListings: this is a survey across six placements, not the
    // explainer for any one of them, and the AHS listing is already claimed by
    // the medical-experience guide, which is the page a student arriving on
    // that listing is actually looking for.
  },
  {
    slug: 'chemistry-competitions-canada',
    // The CCO listing is the fastest-growing page on the site (+1,300% clicks,
    // 3% CTR) and five query variants feed it, including "junior canadian
    // chemistry olympiad" at 37 impressions and zero clicks. Checking that one
    // to write a listing for it found the CIC publishes no junior division at
    // all, so the honest answer is a pillar that says so and points a Grade 10
    // somewhere real, rather than a page for a competition that does not exist.
    title: 'Chemistry competitions in Canada: the CCC and CCO',
    description:
      'One entry point, one date. How the Canadian Chemistry Contest feeds the Olympiad, why there is no junior division, and when a teacher has to sign you up.',
    minutes: 6,
    datePublished: '2026-09-01',
    dateModified: '2026-09-29',
    relatedListings: ['canadian-chemistry-olympiad-cco'],
  },
  {
    slug: 'loran-award-guide',
    // Written 2026-09-01 off the GSC read: the listing page drew 199 impressions
    // and zero clicks at position 17.7 on 197 words, for the largest award a
    // Canadian high school student can win. Verifying it against loranscholar.ca
    // to write this found the listing understating the award by $50,000 and
    // carrying an open date five days early, which is the real argument for
    // pairing every big award with a guide: nobody re-checks a listing.
    title: 'Loran Award: what it pays and how to apply',
    description:
      'Applications open September 9 and close October 15 at noon ET. What the award pays, the 88% average bar, and the $6,000 finalists get.',
    minutes: 7,
    datePublished: '2026-09-01',
    dateModified: '2026-09-29',
    relatedListings: ['loran-scholarship'],
  },
  {
    slug: 'scholarships-for-grade-12-students-alberta',
    title: 'Grade 12 scholarship timeline for Alberta students',
    description:
      'Loran closes October 15; most local awards close April to June. A month-by-month plan for Alberta Grade 12 students.',
    minutes: 9,
    datePublished: '2026-07-19',
    dateModified: '2026-09-29',
  },
  {
    slug: 'how-to-write-a-scholarship-essay',
    title: 'How to write a scholarship essay',
    description:
      'A 500-word scholarship essay is about four short sittings. How to structure it, what the committee is deciding, and what gets an essay skipped.',
    minutes: 10,
    datePublished: '2026-07-19',
    dateModified: '2026-09-29',
  },
  {
    slug: 'grade-11-scholarship-timeline',
    title: 'Why Grade 11 is the best time to start on scholarships',
    description:
      'Rutherford pays up to $800 for your Grade 11 marks alone. What else to set up in Grade 11, before scholarship season starts.',
    minutes: 5,
    datePublished: '2026-07-19',
    dateModified: '2026-09-29',
  },
  {
    slug: 'reference-letters-for-scholarships',
    title: 'How to ask for a scholarship reference letter',
    description:
      'Ask at least three weeks before the deadline. Who to ask for a scholarship reference letter, and what to hand them so it is strong and on time.',
    minutes: 5,
    datePublished: '2026-07-19',
    dateModified: '2026-09-29',
  },
  {
    slug: 'scholarships-for-medicine-hat-students',
    title: 'Scholarships for Medicine Hat students',
    description:
      'Six named awards only Medicine Hat Catholic graduates can win, the $1,000 Kin Canada Bursary, and the rest of the local awards, grouped by who gives them.',
    minutes: 6,
    datePublished: '2026-07-19',
    dateModified: '2026-09-29',
  },
  {
    // City guide #2, written 2026-09-03 off measured evidence rather than a
    // hunch. The Medicine Hat guide is the highest-converting page on the site
    // at 15.38% CTR from position 5.5, while the Rutherford guide draws 23% of
    // all site impressions at 0.33% and cannot be rescued: it is a government
    // award whose deadline and GPA cutoff Google answers directly. Local,
    // specific, small-pool pages are what convert here, so Red Deer (19 local
    // listings) and Lethbridge (14) get the same treatment. Grande Prairie was
    // considered and dropped: the dataset has no listings scoped to it, and a
    // guide for a region with no verified awards would be invention.
    slug: 'scholarships-for-red-deer-students',
    title: 'Scholarships for Red Deer students',
    description:
      'The two biggest Red Deer awards, Bower and Rotary, go through your counsellor. Every other local pool, from the Community Foundation to the co-op.',
    minutes: 6,
    datePublished: '2026-09-03',
    dateModified: '2026-09-29',
  },
  {
    slug: 'scholarships-for-lethbridge-students',
    title: 'Scholarships for Lethbridge students',
    description:
      'One Lethbridge Polytechnic form reaches 400 awards. The ULethbridge award calendar, the county funds, and the rest of the local pool.',
    minutes: 6,
    datePublished: '2026-09-03',
    dateModified: '2026-09-29',
  },
  {
    slug: 'trades-scholarships-rap-alberta',
    title: 'Trades scholarships and RAP in Alberta',
    description:
      'RAP students qualify for $1,000 and $2,000 scholarships only registered apprentices can enter. How RAP works in Alberta schools and how to get in.',
    minutes: 6,
    datePublished: '2026-07-19',
    dateModified: '2026-09-29',
  },
  {
    slug: 'dead-scholarships-alberta-counsellor-lists',
    // Original research rather than an explainer, which is deliberate: the
    // backlink problem needs a page worth citing, and every other guide here
    // restates advice a counsellor could give. This one contains a finding
    // nobody else has published, and the method section is what makes it
    // quotable by list maintainers rather than only by students.
    title: 'Nine dead scholarships still on Alberta counsellor lists',
    description:
      'We checked a national-awards list used by Alberta schools against each provider\'s own site. Nine awards no longer exist, and one charity folded in 2024.',
    minutes: 7,
    datePublished: '2026-09-08',
    dateModified: '2026-09-29',
  },
  {
    slug: 'local-scholarships-better-odds',
    title: 'Local scholarships in Alberta and where to find them',
    description:
      'Awards from one town, county or school are open to far fewer students than national ones. Where to find them in Alberta, from county offices to unions.',
    minutes: 5,
    datePublished: '2026-07-19',
    dateModified: '2026-08-22',
  },
  {
    slug: 'alberta-scholarship-deadlines-by-month',
    // Written against a measured gap rather than a guessed one. In September
    // 2026 a grounded search for "Alberta scholarship deadlines list grade 12"
    // returned no ScholarAB result at all and closed by recommending
    // studentaid.alberta.ca; the page that should have won it, /deadlines/, is
    // a calendar tool with almost no prose for a crawler to rank. This is the
    // document version of the same corpus, and the one internal link into
    // /deadlines/ from a page that is all content.
    title: 'Alberta scholarship deadlines, month by month',
    description:
      `When Alberta scholarships close: a year of ${DL.total} dated deadlines by month, why May carries ${DL.byMonth[4]} of them, and the single dates that hide dozens of awards.`,
    minutes: 7,
    datePublished: '2026-09-07',
    dateModified: '2026-09-29',
  },
]

export function getGuide(slug: string): GuideMeta {
  const g = guides.find(g => g.slug === slug)
  if (!g) throw new Error(`Unknown guide slug: ${slug}`)
  return g
}
