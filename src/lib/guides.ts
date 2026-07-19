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
}

export const guides: GuideMeta[] = [
  {
    slug: 'alexander-rutherford-scholarship-guide',
    title: 'The Alexander Rutherford Scholarship, explained',
    description:
      'Who qualifies for the Alexander Rutherford Scholarship, exactly how much each grade is worth, and how to apply through Alberta Student Aid.',
    kicker: 'THE BIG ONE',
    minutes: 6,
    datePublished: '2026-07-19',
    dateModified: '2026-07-19',
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
  },
]

export function getGuide(slug: string): GuideMeta {
  const g = guides.find(g => g.slug === slug)
  if (!g) throw new Error(`Unknown guide slug: ${slug}`)
  return g
}
