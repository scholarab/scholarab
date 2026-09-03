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
   * prose. Written for the /app guide reader, which was deleted 2026-08-12;
   * nothing renders these today. Kept because it is authored content, not
   * mobile plumbing: a guide-summary block on the web pages would use it as-is.
   */
  takeaways: [string, string, string]
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
    title: 'Research programs for Alberta students: who pays',
    description:
      'Which Alberta research programs pay, what marks they ask for, and the geography rule that decides which HYRS campus you apply to. Deadlines run March.',
    kicker: 'GET INTO A LAB',
    minutes: 8,
    datePublished: '2026-08-23',
    dateModified: '2026-08-23',
    takeaways: [
      'HYRS splits by geography, not preference: north of Red Deer is the U of A, south to Claresholm is UCalgary, Claresholm and below is Lethbridge.',
      'The paid programs want Grade 11 with 85% in Math 20, Biology 20 and one more science, and they close in March for a July start.',
      'If you miss the marks or the deadline, Youreka and the Heritage Fairs still produce a real research project on your record.',
    ],
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
      'Where an Alberta student can actually get clinical exposure: AHS volunteering from 15, Discovery Days, HOSA chapters, and the biology competitions.',
    kicker: 'BEFORE MED SCHOOL',
    minutes: 7,
    datePublished: '2026-08-23',
    dateModified: '2026-08-23',
    takeaways: [
      'AHS youth volunteering opens at 15, runs year-round, and is the only route that puts you in a clinical building on a schedule.',
      'Discovery Days and HOSA both run through your school, so the way in is a teacher conversation in September, not an application in April.',
      'Paying for a summer medical program teaches you material; a placement or a contest result is what a referee can later write about.',
    ],
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
      'Coding contests, hackathons and camps open to Alberta high school students, nearly all free, and the ones only a teacher can register you for.',
    kicker: 'BUILD SOMETHING',
    minutes: 8,
    datePublished: '2026-08-23',
    dateModified: '2026-08-23',
    takeaways: [
      'The Canadian Computing Competition is written at your school in February, and a teacher registers it: if yours never has, that is the fixable part.',
      'CyberTitan teams are registered between April and October, so the window closes before most students start thinking about the year.',
      'Space Apps, the Swift Student Challenge, CyberSci and IBM SkillsBuild need no gatekeeper and no money.',
    ],
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
    kicker: 'THE BIG ONE',
    minutes: 9,
    datePublished: '2026-07-19',
    dateModified: '2026-08-22',
    takeaways: [
      'Each grade is assessed on its own: $400 for Grade 10, $800 for Grade 11 and $1,300 for Grade 12 at 80%+.',
      'There is no essay, no interview and no competition. Meet the five-course average and the money is yours.',
      'Applications open August 1, and you apply once you are enrolled in post-secondary, not while still in high school.',
    ],
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
    kicker: 'SERVICE',
    minutes: 6,
    datePublished: '2026-09-01',
    dateModified: '2026-09-01',
    takeaways: [
      'Committees read for whether you stayed, not for hours. One placement held two years beats eight things tried once, and is less work.',
      'AHS hospital placements, TELUS Spark and JA all take students on ongoing intake, so there is no application window to wait for.',
      'Community involvement is an explicit criterion on dozens of awards, from a $70,000 national one down to $1,000 in Medicine Hat, where the odds are far better.',
    ],
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
    title: 'Chemistry competitions in Canada: the CCC and CCO ladder',
    description:
      'One entry point, one date. How the Canadian Chemistry Contest feeds the Olympiad, why there is no junior division, and when a teacher has to sign you up.',
    kicker: 'COMPETITIONS',
    minutes: 6,
    datePublished: '2026-09-01',
    dateModified: '2026-09-01',
    takeaways: [
      'There is no junior chemistry olympiad. The bar is taking chemistry and being under 20, not a grade, so a Grade 10 in Chem 20 may write it.',
      'The Canadian Chemistry Contest is the only entry point, and you cannot register yourself: a teacher signs the school up through a regional coordinator by late March.',
      'At the olympiad round the take-home exam is 15% of the score and a hard gate: skip it and you are ineligible for the National Camp regardless of your exam mark.',
    ],
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
      'Applications open September 9 and close October 15 at noon ET. What the award actually pays, the 88% average bar, and the $6,000 finalists get.',
    kicker: 'NATIONAL',
    minutes: 7,
    datePublished: '2026-09-01',
    dateModified: '2026-09-01',
    takeaways: [
      'Roughly $150,000 over four years, not the $100,000 usually quoted: a $12,000 stipend, a full tuition waiver at a partner university, and up to $14,000 for summers.',
      'The 88% is calculated from Grade 10, 11 and 12 courses only, so recalculate before you rule yourself out. Past that bar it is judged on service, not marks.',
      'You can lose and still be paid: up to 54 finalists get $6,000 and up to 70 provincial recipients get $3,000, which is why the application is worth five weeks.',
    ],
    relatedListings: ['loran-scholarship'],
  },
  {
    slug: 'scholarships-for-grade-12-students-alberta',
    title: 'Grade 12 scholarship timeline for Alberta students',
    description:
      'A month-by-month plan for Grade 12 students in Alberta: which scholarships open when, from Loran in the fall to local awards in the spring.',
    kicker: 'SENIOR YEAR',
    minutes: 9,
    datePublished: '2026-07-19',
    dateModified: '2026-08-22',
    takeaways: [
      'The most valuable awards close earliest: Loran goes in mid-October, before most schools mention scholarships at all.',
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
    minutes: 10,
    datePublished: '2026-07-19',
    dateModified: '2026-08-22',
    takeaways: [
      'Underline the nouns in the award description: leadership, resilience, community. Those nouns are your marking rubric.',
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
      'Two years in one role beats eight one-off activities. Grade 11 is the last year you can start something and still call it sustained.',
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
    dateModified: '2026-08-22',
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
      'Every scholarship pool a Medicine Hat student can draw from: local service clubs, city and county awards, school funds, and how to work through them.',
    kicker: 'MEDICINE HAT',
    minutes: 6,
    datePublished: '2026-07-19',
    dateModified: '2026-07-19',
    takeaways: [
      'Take Rutherford first. It pays up to $2,500 for marks you already earned and stacks with everything else.',
      'Work the pools in order of odds: your own school office, then service clubs, then city, county and community foundations.',
      'Some school awards are only advertised on a sheet by the counsellor’s door, so ask for the local awards list by name.',
    ],
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
      'Every scholarship pool a Red Deer student can draw from: single-school awards, the two your counsellor hands out, the Community Foundation, and the co-op.',
    kicker: 'RED DEER',
    minutes: 6,
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
    takeaways: [
      'Take Rutherford first. It pays up to $2,500 for marks you already earned and stacks with everything else.',
      'The best odds are awards tied to one school: Penhold Crossing alone gives three $10,000 Ford Family scholarships a year.',
      'Bower and Rotary are the two biggest local awards and both are handed out through your counsellor, so ask in September.',
    ],
  },
  {
    slug: 'scholarships-for-lethbridge-students',
    title: 'Scholarships for Lethbridge students',
    description:
      'Every scholarship pool a Lethbridge student can draw from: the ULethbridge award calendar, one Polytechnic form worth 400 awards, and the county funds.',
    kicker: 'LETHBRIDGE',
    minutes: 6,
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
    takeaways: [
      'December 15 is the date that matters: ULethbridge early admission carries the Board of Governors award with it.',
      'The Health Care Professionals of Tomorrow award needs 40 lifetime volunteer hours at Chinook Regional Hospital, so start in Grade 10 or 11.',
      'One Lethbridge Polytechnic form reaches over 400 awards and also carries Jason Lang and Louise McKinney.',
    ],
  },
  {
    slug: 'trades-scholarships-rap-alberta',
    title: 'Trades scholarships and RAP in Alberta',
    description:
      'How the Registered Apprenticeship Program works in Alberta schools, the scholarships attached to it, and the money nobody else applies for.',
    kicker: 'TRADES',
    minutes: 6,
    datePublished: '2026-07-19',
    dateModified: '2026-08-22',
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
    dateModified: '2026-08-22',
    takeaways: [
      'A $10,000 national award drawing 10,000 applicants is worth a dollar in expected value. A $1,000 local award drawing 25 is worth forty.',
      'Local committees know your school, your employers and often your referee, and they read part-time jobs as the point, not as filler.',
      'They hide in guidance offices, city and county programs, service clubs and community foundations. Ask for the list directly.',
    ],
  },
]

export function getGuide(slug: string): GuideMeta {
  const g = guides.find(g => g.slug === slug)
  if (!g) throw new Error(`Unknown guide slug: ${slug}`)
  return g
}
