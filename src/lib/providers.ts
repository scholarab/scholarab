// Who runs a listing's application, read from its link (Ilia, 2026-10-12,
// after polymarket.com's icons). The icon on a directory card is the real
// mark of that organisation, never a category symbol, so the same mark on
// several cards means the same people and, most often, the same form.
//
// A match is a host (and its subdomains) or a host plus the start of a path,
// for links that sit on a shared host: Google Sites, Keyano College's file
// server. School divisions are matched at the division, so a student sees
// the board they know rather than forty school crests.
//
// Logos live in public/logos/<slug>.webp, a 96px square tile cut from the
// organisation's own site icon or header logo (2026-10-12). A provider marked
// logo: false falls back to the card's place photo.

export interface Provider { slug: string; name: string; match: string[]; /** false: no usable mark yet, the card shows its place. */ logo?: false }

export const PROVIDERS: Provider[] = [
  { slug: 'educationmatters', name: 'EducationMatters', match: ['educationmatters.ca'] },
  { slug: 'keyano', name: 'Keyano College', match: ['media-002-ca.cdn.govstack.com/keyano-015-ca', 'keyano.ca'] },
  { slug: 'rdpolytech', name: 'Red Deer Polytechnic', match: ['rdpolytech.academicworks.ca', 'rdpolytech.ca'] },
  { slug: 'wolfcreek', name: 'Wolf Creek Public Schools', match: ['wolfcreek.ab.ca'] },
  { slug: 'battle-river', name: 'Battle River School Division', match: ['brsd.ab.ca'] },
  { slug: 'foothills', name: 'Foothills School Division', match: ['foothillsschooldivision.ca'] },
  { slug: 'alberta', name: 'Government of Alberta', match: ['alberta.ca'] },
  { slug: 'lloydminster-public', name: 'Lloydminster Public School Division', match: ['sites.google.com/lpsd.ca', 'lpsd.ca'] },
  { slug: 'grasslands', name: 'Grasslands Public Schools', match: ['sites.google.com/grasslands.ab.ca', 'grasslands.ab.ca'] },
  { slug: 'northern-lights', name: 'Northern Lights Public Schools', match: ['sites.google.com/nlsd.ab.ca', 'nlsd.ab.ca', 'nlpsab.ca'] },
  { slug: 'wetaskiwin-comp', name: 'Wetaskiwin Composite High School', match: ['wetaskiwincomp.ca'] },
  { slug: 'parkland', name: 'Parkland School Division', match: ['psd.ca'] },
  { slug: 'st-albert-public', name: 'St. Albert Public Schools', match: ['spschools.org'] },
  { slug: 'calgary-foundation', name: 'Calgary Foundation', match: ['calgaryfoundation.org'] },
  { slug: 'epsb', name: 'Edmonton Public Schools', match: ['sites.google.com/epsb.ca', 'epsb.ca'] },
  { slug: 'ucalgary', name: 'University of Calgary', match: ['ucalgary.ca'] },
  { slug: 'fondationfa', name: 'Fondation franco-albertaine', match: ['fondationfa.ca'] },
  { slug: 'ualberta', name: 'University of Alberta', match: ['ualberta.ca', 'alberta.academicworks.ca'] },
  { slug: 'nafgives', name: 'Northwestern Alberta Foundation', match: ['nafgives.com'] },
  { slug: 'rocky-view', name: 'Rocky View Schools', match: ['rockyview.ab.ca'] },
  { slug: 'elk-island', name: 'Elk Island Public Schools', match: ['bevfacey.ca', 'ardrossan.ca', 'eips.ca'] },
  { slug: 'county-central', name: 'County Central High School', match: ['countycentral.ca'] },
  { slug: 'sascf', name: 'St. Albert Community Foundation', match: ['sascf.ca'] },
  { slug: 'nwpolytech', name: 'Northwestern Polytechnic', match: ['nwpolytech.ca'] },
  { slug: 'burman', name: 'Burman University', match: ['burmanu.ca'] },
  { slug: 'cfcab', name: 'Community Foundation of Central Alberta', match: ['cfcab.ca'] },
  { slug: 'aspen-view', name: 'Aspen View Public Schools', match: ['aspenview.org'] },
  { slug: 'peace-river', name: 'Peace River School Division', match: ['prsd.ab.ca'], logo: false },
  { slug: 'ecsd', name: 'Edmonton Catholic Schools', match: ['ecsd.net'] },
  { slug: 'ecf', name: 'Edmonton Community Foundation', match: ['ecf.ca'], logo: false },
  { slug: 'fort-sask-high', name: 'Fort Saskatchewan High School', match: ['forthigh.ca'] },
  { slug: 'dvcf', name: 'Drayton Valley Community Foundation', match: ['dvcf.org'] },
  { slug: 'prairie-land', name: 'Prairie Land Public Schools', match: ['plrd.ab.ca'] },
  { slug: 'stmu', name: "St. Mary's University", match: ['stmu.ca'] },
  { slug: '4-h', name: '4-H Canada', match: ['4-h-canada.ca'] },
  { slug: 'black-gold', name: 'Black Gold School Division', match: ['blackgold.ca'] },
  { slug: 'nupge', name: 'National Union of Public and General Employees', match: ['nupge.ca'] },
  { slug: 'willow-creek', name: 'Willow Creek Composite High School', match: ['willowcreekhighschool.ca'] },
  { slug: 'nait', name: 'NAIT', match: ['nait.academicworks.ca', 'nait.ca'] },
  { slug: 'western', name: 'Western University', match: ['uwo.ca'] },
  { slug: 'kingsu', name: "The King's University", match: ['kingsu.ca'] },
  { slug: 'waterloo', name: 'University of Waterloo', match: ['uwaterloo.ca'] },
  { slug: 'sait', name: 'SAIT', match: ['sait.ca'] },
  { slug: 'cpa-alberta', name: 'CPA Alberta', match: ['cpaalberta.ca'] },
  { slug: 'macewan', name: 'MacEwan University', match: ['macewan.ca'] },
  { slug: 'medicine-hat-public', name: 'Medicine Hat Public School Division', match: ['mhcbe.ab.ca'] },
  { slug: 'burns-fund', name: 'Burns Memorial Fund', match: ['burnsfund.com'] },
  { slug: 'horatio-alger', name: 'Horatio Alger Association of Canada', match: ['horatioalger.ca'] },
  { slug: 'ulethbridge', name: 'University of Lethbridge', match: ['ulethbridge.ca'] },
  { slug: 'fort-mcmurray-public', name: 'Fort McMurray Public Schools', match: ['fmpsdschools.ca'], logo: false },
];

/** The organisation behind a listing's application link, or null. */
export function providerOf(url: string | null | undefined): Provider | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  const at = host + u.pathname;
  for (const p of PROVIDERS) {
    for (const m of p.match) {
      if (m.includes('/') ? at.startsWith(m) : host === m || host.endsWith('.' + m)) return p;
    }
  }
  return null;
}

/** The logo file for a listing's link, with the name it stands for. */
export function providerLogo(url: string | null | undefined): { src: string; name: string } | null {
  const p = providerOf(url);
  return p && p.logo !== false ? { src: `/logos/${p.slug}.webp`, name: p.name } : null;
}
