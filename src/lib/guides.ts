// Metadata for the /guides section. Each guide page imports its own entry;
// the index page, footer, sitemap generator, and "keep reading" blocks all
// read from this list so a new guide only needs a page file + one entry here.
export type GuideMeta = {
  slug: string
  title: string
  /** One-line summary used for meta description, cards, and JSON-LD. */
  description: string
  /** Mono kicker label shown above the title. */
  kicker: string
  minutes: number
  datePublished: string
  dateModified: string
  /**
   * Three-line "what you need to know" summary, drawn from the guide's own
   * prose. Written for the /app guide reader, which was deleted 2026-08-12 —
   * nothing renders these today. Kept because it is authored content, not
   * mobile plumbing: a guide-summary block on the web pages would use it as-is.
   */
  takeaways: [string, string, string]
  /**
   * Detail-page slugs this guide is *about*, not merely mentions. The listing
   * pages named here render a link back to the guide, so Google sees the pair
   * as a directory entry plus its explainer rather than two thin pages
   * competing for the same query — which is how the Rutherford listing ended
   * up as "Duplicate, Google chose different canonical than user".
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
    slug: 'alexander-rutherford-scholarship-guide',
    // Ranks page 1 for ~600 impressions a month of Rutherford queries and took
    // zero clicks on the old "…, explained" title. Two thirds of those queries
    // ask "when does it open" or "how do I apply", so the title and the first
    // clause of the description answer exactly that — the old description led
    // with the dollar figure, which is the one thing the SERP already shows.
    title: 'Alexander Rutherford Scholarship: amounts and how to apply',
    description:
      'Applications open August 1 with no closing deadline. What each grade pays (up to $2,500 total), the 75% five-course average you need, and how to apply through Alberta Student Aid.',
    kicker: 'THE BIG ONE',
    minutes: 6,
    datePublished: '2026-07-19',
    dateModified: '2026-08-07',
    takeaways: [
      'Each grade is assessed on its own: $400 for Grade 10, $800 for Grade 11 and $1,300 for Grade 12 at 80%+.',
      'There is no essay, no interview and no competition — meet the five-course average and the money is yours.',
      'Applications open August 1, and you apply once you are enrolled in post-secondary, not while still in high school.',
    ],
    relatedListings: ['alexander-rutherford-scholarship'],
  },
  {
    slug: 'scholarships-for-grade-12-students-alberta',
    title: 'Grade 12 scholarship timeline for Alberta students',
    description:
      'A month-by-month plan for Grade 12 students in Alberta: which scholarships open when, from Loran in the fall to local awards in the spring.',
    kicker: 'SENIOR YEAR',
    minutes: 7,
    datePublished: '2026-07-19',
    dateModified: '2026-07-19',
    takeaways: [
      'The most valuable awards close earliest — Loran goes in mid-October, before most schools mention scholarships at all.',
      'November to February is nominated and institutional awards; internal school deadlines are always earlier than published ones.',
      'March to May is local awards, where the applicant pools are smallest and the odds are best.',
    ],
  },
  {
    slug: 'how-to-write-a-scholarship-essay',
    title: 'How to write a scholarship essay that gets read',
    description:
      'A practical structure for scholarship essays, what selection committees actually look for, and the mistakes that get applications skipped.',
    kicker: 'WRITING',
    minutes: 8,
    datePublished: '2026-07-19',
    dateModified: '2026-07-19',
    takeaways: [
      'Underline the nouns in the award description — leadership, resilience, community. Those nouns are your marking rubric.',
      'Open inside one specific moment, show the action you took, then say what changed. Specifics are proof; adjectives are claims.',
      'Reusing an essay is smart. Reusing it without re-aiming it at the new award is how strong students lose.',
    ],
  },
  {
    slug: 'grade-11-scholarship-timeline',
    title: 'Why Grade 11 is the best time to start on scholarships',
    description:
      'What Alberta students can do in Grade 11 to set up their scholarship applications: marks that count, activities that matter, and a simple prep list.',
    kicker: 'START EARLY',
    minutes: 5,
    datePublished: '2026-07-19',
    dateModified: '2026-07-19',
    takeaways: [
      'Your Grade 11 average has a posted price: $500 at 75–79.9% and $800 at 80%+, straight from Rutherford.',
      'Two years in one role beats eight one-off activities — Grade 11 is the last year you can start something and still call it sustained.',
      'The teachers who write your Grade 12 reference letters are the ones who know you from Grade 11.',
    ],
  },
  {
    slug: 'reference-letters-for-scholarships',
    title: 'How to ask for a scholarship reference letter',
    description:
      'Who to ask for a reference letter, when to ask, and exactly what to give your teacher or counsellor so the letter is strong and on time.',
    kicker: 'REFERENCES',
    minutes: 5,
    datePublished: '2026-07-19',
    dateModified: '2026-07-19',
    takeaways: [
      'Ask the person who knows you best, not the one with the best title. A teacher who watched you improve beats a principal who knows your name.',
      'Three weeks before the deadline is the minimum, and the word "strong" in the ask gives a lukewarm referee a graceful exit.',
      'Hand every referee one page: what the award rewards, the deadline and how to submit, and three specific things they saw you do.',
    ],
  },
  {
    slug: 'scholarships-for-medicine-hat-students',
    title: 'Scholarships for Medicine Hat students',
    description:
      'Every scholarship pool a Medicine Hat student can draw from: local service clubs, city and county awards, school-specific funds, and how to work through them.',
    kicker: 'MEDICINE HAT',
    minutes: 6,
    datePublished: '2026-07-19',
    dateModified: '2026-07-19',
    takeaways: [
      'Take Rutherford first. It pays up to $2,500 for marks you already earned and stacks with everything else.',
      'Work the pools in order of odds: your own school office, then service clubs, then city, county and community foundations.',
      'Some school awards are only advertised on a sheet by the counsellor’s door — ask for the local awards list by name.',
    ],
  },
  {
    slug: 'trades-scholarships-rap-alberta',
    title: 'Trades scholarships and RAP in Alberta',
    description:
      'How the Registered Apprenticeship Program works in Alberta high schools, the scholarships attached to it, and where trades students find money nobody else applies for.',
    kicker: 'TRADES',
    minutes: 6,
    datePublished: '2026-07-19',
    dateModified: '2026-07-19',
    takeaways: [
      'RAP pays you a wage, gives you high school credits, and banks hours toward the first period of your apprenticeship.',
      'Being registered unlocks awards nobody competes for: $1,000 High School Apprenticeship and $2,000 Bright Futures.',
      'Getting in goes through your off-campus education coordinator or guidance counsellor, not an application form.',
    ],
  },
  {
    slug: 'local-scholarships-better-odds',
    title: 'Local scholarships: smaller awards, much better odds',
    description:
      'Why community scholarships in places like Medicine Hat and Lethbridge are easier to win than national awards, and where to find them.',
    kicker: 'STRATEGY',
    minutes: 5,
    datePublished: '2026-07-19',
    dateModified: '2026-07-19',
    takeaways: [
      'A $10,000 national award drawing 10,000 applicants is worth a dollar in expected value. A $1,000 local award drawing 25 is worth forty.',
      'Local committees know your school, your employers and often your referee — and they read part-time jobs as the point, not as filler.',
      'They hide in guidance offices, city and county programs, service clubs and community foundations. Ask for the list directly.',
    ],
  },
]

export function getGuide(slug: string): GuideMeta {
  const g = guides.find(g => g.slug === slug)
  if (!g) throw new Error(`Unknown guide slug: ${slug}`)
  return g
}
