// The /map/ page: every university, polytechnic and college in Alberta, on a
// map drawn here from the province's border, so no map tiles, fonts or
// scripts come from anyone else (Ilia, 2026-10-03: "interactive, visionary,
// beautiful, modern, very easy to navigate", Alberta only).
//
// Which schools: the 28 publicly funded institutions on
// alberta.ca/types-publicly-funded-post-secondary-institutions and the five
// First Nations colleges on alberta.ca/indigenous-learning-providers, both
// read 2026-10-03, plus every school ScholarAB lists entrance awards for
// (map test: a new one fails the build until it is placed). Websites were
// opened the same day.
//
// Where: a school sits at each town it has a campus in that we could
// confirm, at the town's own coordinates. The map works at town scale (one
// dot per town), so a campus's street address would add nothing.

export type SchoolKind = 'university' | 'polytechnic' | 'college';

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Which side of the dot the name sits on, where the default (right) would collide. */
  label?: 'left' | 'above' | 'below' | 'below-left';
}

export interface School {
  id: string;
  name: string;
  /** What a student calls it, where that is not the full name. */
  short?: string;
  kind: SchoolKind;
  /** One line under the name: what sort of school it is. */
  about: string;
  site: string;
  /** The name the listings use (eligibility.targetInstitutions), when it has awards. */
  awardsName?: string;
  campuses: Array<{ place: string; note?: string }>;
}

export const PLACES: Place[] = [
  { id: 'edmonton', name: 'Edmonton', lat: 53.546, lon: -113.494 },
  { id: 'calgary', name: 'Calgary', lat: 51.045, lon: -114.072, label: 'above' },
  { id: 'lethbridge', name: 'Lethbridge', lat: 49.694, lon: -112.842 },
  { id: 'red-deer', name: 'Red Deer', lat: 52.268, lon: -113.811, label: 'left' },
  { id: 'medicine-hat', name: 'Medicine Hat', lat: 50.041, lon: -110.677, label: 'left' },
  { id: 'brooks', name: 'Brooks', lat: 50.564, lon: -111.899 },
  { id: 'grande-prairie', name: 'Grande Prairie', lat: 55.171, lon: -118.795 },
  { id: 'fairview', name: 'Fairview', lat: 56.067, lon: -118.383 },
  { id: 'fort-mcmurray', name: 'Fort McMurray', lat: 56.727, lon: -111.381, label: 'left' },
  { id: 'vermilion', name: 'Vermilion', lat: 53.354, lon: -110.853, label: 'below' },
  { id: 'lloydminster', name: 'Lloydminster', lat: 53.278, lon: -110.02, label: 'above' },
  { id: 'olds', name: 'Olds', lat: 51.793, lon: -114.107, label: 'left' },
  { id: 'lac-la-biche', name: 'Lac La Biche', lat: 54.769, lon: -111.965 },
  { id: 'slave-lake', name: 'Slave Lake', lat: 55.283, lon: -114.772 },
  { id: 'athabasca', name: 'Athabasca', lat: 54.719, lon: -113.286, label: 'left' },
  { id: 'lacombe', name: 'Lacombe', lat: 52.468, lon: -113.737 },
  { id: 'cochrane', name: 'Cochrane', lat: 51.189, lon: -114.467, label: 'below-left' },
  { id: 'camrose', name: 'Camrose', lat: 53.017, lon: -112.834 },
  { id: 'banff', name: 'Banff', lat: 51.178, lon: -115.571, label: 'above' },
  { id: 'st-paul', name: 'St. Paul', lat: 53.995, lon: -111.37 },
  { id: 'maskwacis', name: 'Maskwacis', lat: 52.83, lon: -113.44 },
  { id: 'siksika', name: 'Siksika Nation', lat: 50.88, lon: -112.97, label: 'below' },
  { id: 'stand-off', name: 'Stand Off', lat: 49.45, lon: -113.32, label: 'left' },
];

export const SCHOOLS: School[] = [
  // Universities
  { id: 'ualberta', name: 'University of Alberta', kind: 'university', about: 'Research university', site: 'https://www.ualberta.ca/', awardsName: 'University of Alberta',
    campuses: [{ place: 'edmonton' }, { place: 'camrose', note: 'Augustana Campus' }] },
  { id: 'ucalgary', name: 'University of Calgary', kind: 'university', about: 'Research university', site: 'https://www.ucalgary.ca/', awardsName: 'University of Calgary',
    campuses: [{ place: 'calgary' }] },
  { id: 'ulethbridge', name: 'University of Lethbridge', kind: 'university', about: 'Research university', site: 'https://www.ulethbridge.ca/', awardsName: 'University of Lethbridge',
    campuses: [{ place: 'lethbridge' }] },
  { id: 'athabasca', name: 'Athabasca University', kind: 'university', about: 'Research university, studied online', site: 'https://www.athabascau.ca/', awardsName: 'Athabasca University',
    campuses: [{ place: 'athabasca' }] },
  { id: 'macewan', name: 'MacEwan University', kind: 'university', about: 'Undergraduate university', site: 'https://www.macewan.ca/', awardsName: 'MacEwan University',
    campuses: [{ place: 'edmonton' }] },
  { id: 'mru', name: 'Mount Royal University', kind: 'university', about: 'Undergraduate university', site: 'https://www.mtroyal.ca/', awardsName: 'Mount Royal University',
    campuses: [{ place: 'calgary' }] },
  { id: 'auarts', name: 'Alberta University of the Arts', short: 'AUArts', kind: 'university', about: 'Art and design university', site: 'https://www.auarts.ca/', awardsName: 'Alberta University of the Arts',
    campuses: [{ place: 'calgary' }] },
  { id: 'ambrose', name: 'Ambrose University', kind: 'university', about: 'Independent university', site: 'https://www.ambrose.edu/', awardsName: 'Ambrose University',
    campuses: [{ place: 'calgary' }] },
  { id: 'burman', name: 'Burman University', kind: 'university', about: 'Independent university', site: 'https://www.burmanu.ca/', awardsName: 'Burman University',
    campuses: [{ place: 'lacombe' }] },
  { id: 'concordia', name: 'Concordia University of Edmonton', kind: 'university', about: 'Independent university', site: 'https://concordia.ab.ca/', awardsName: 'Concordia University of Edmonton',
    campuses: [{ place: 'edmonton' }] },
  { id: 'kings', name: "The King's University", kind: 'university', about: 'Independent university', site: 'https://www.kingsu.ca/', awardsName: "The King's University",
    campuses: [{ place: 'edmonton' }] },
  { id: 'stmu', name: "St. Mary's University", kind: 'university', about: 'Independent university', site: 'https://www.stmu.ca/', awardsName: "St. Mary's University",
    campuses: [{ place: 'calgary' }] },
  // Polytechnics
  { id: 'nait', name: 'Northern Alberta Institute of Technology', short: 'NAIT', kind: 'polytechnic', about: 'Polytechnic', site: 'https://www.nait.ca/', awardsName: 'Northern Alberta Institute of Technology',
    campuses: [{ place: 'edmonton' }] },
  { id: 'sait', name: 'Southern Alberta Institute of Technology', short: 'SAIT', kind: 'polytechnic', about: 'Polytechnic', site: 'https://www.sait.ca/', awardsName: 'SAIT',
    campuses: [{ place: 'calgary' }] },
  { id: 'rdp', name: 'Red Deer Polytechnic', kind: 'polytechnic', about: 'Polytechnic', site: 'https://rdpolytech.ca/', awardsName: 'Red Deer Polytechnic',
    campuses: [{ place: 'red-deer' }] },
  { id: 'lethpoly', name: 'Lethbridge Polytechnic', kind: 'polytechnic', about: 'Polytechnic', site: 'https://lethpolytech.ca/', awardsName: 'Lethbridge Polytechnic',
    campuses: [{ place: 'lethbridge' }] },
  { id: 'nwp', name: 'Northwestern Polytechnic', kind: 'polytechnic', about: 'Polytechnic', site: 'https://www.nwpolytech.ca/', awardsName: 'Northwestern Polytechnic',
    campuses: [{ place: 'grande-prairie' }, { place: 'fairview', note: 'Fairview Campus' }] },
  // Colleges
  { id: 'bowvalley', name: 'Bow Valley College', kind: 'college', about: 'Community college', site: 'https://www.bowvalleycollege.ca/', awardsName: 'Bow Valley College',
    campuses: [{ place: 'calgary' }] },
  { id: 'keyano', name: 'Keyano College', kind: 'college', about: 'Community college', site: 'https://www.keyano.ca/', awardsName: 'Keyano College',
    campuses: [{ place: 'fort-mcmurray' }] },
  { id: 'lakeland', name: 'Lakeland College', kind: 'college', about: 'Community college', site: 'https://www.lakelandcollege.ca/', awardsName: 'Lakeland College',
    campuses: [{ place: 'vermilion' }, { place: 'lloydminster' }] },
  { id: 'mhc', name: 'Medicine Hat College', kind: 'college', about: 'Community college', site: 'https://www.mhc.ab.ca/', awardsName: 'Medicine Hat College',
    campuses: [{ place: 'medicine-hat' }, { place: 'brooks', note: 'Brooks Campus' }] },
  { id: 'norquest', name: 'NorQuest College', kind: 'college', about: 'Community college', site: 'https://www.norquest.ca/', awardsName: 'NorQuest College',
    campuses: [{ place: 'edmonton' }] },
  { id: 'northernlakes', name: 'Northern Lakes College', kind: 'college', about: 'Community college', site: 'https://www.northernlakescollege.ca/', awardsName: 'Northern Lakes College',
    campuses: [{ place: 'slave-lake' }] },
  { id: 'olds', name: 'Olds College', kind: 'college', about: 'Community college, agriculture and technology', site: 'https://www.oldscollege.ca/', awardsName: 'Olds College',
    campuses: [{ place: 'olds' }] },
  { id: 'portage', name: 'Portage College', kind: 'college', about: 'Community college', site: 'https://portagecollege.ca/', awardsName: 'Portage College',
    campuses: [{ place: 'lac-la-biche' }] },
  { id: 'makami', name: 'MaKami College', kind: 'college', about: 'Independent career college', site: 'https://www.makamicollege.com/', awardsName: 'MaKami College',
    campuses: [{ place: 'edmonton' }, { place: 'calgary' }] },
  { id: 'banff', name: 'Banff Centre for Arts and Creativity', short: 'Banff Centre', kind: 'college', about: 'Arts and culture centre', site: 'https://www.banffcentre.ca/',
    campuses: [{ place: 'banff' }] },
  { id: 'cbts', name: 'Canadian Baptist Theological Seminary and College', short: 'CBTS', kind: 'college', about: 'Seminary and college', site: 'https://www.cbts.edu/', awardsName: 'Canadian Baptist Theological Seminary and College',
    campuses: [{ place: 'cochrane' }] },
  // First Nations colleges
  { id: 'bluequills', name: "University nuhelot'įne thaiyots'į nistameyimâkanak Blue Quills", short: 'Blue Quills', kind: 'college', about: 'First Nations college', site: 'https://www.bluequills.ca/',
    campuses: [{ place: 'st-paul', note: 'Near St. Paul' }] },
  { id: 'maskwacis', name: 'Maskwacis Cultural College', kind: 'college', about: 'First Nations college', site: 'https://www.mccedu.ca/',
    campuses: [{ place: 'maskwacis' }] },
  { id: 'oldsun', name: 'Old Sun Community College', kind: 'college', about: 'First Nations college', site: 'https://oldsuncommunitycollege.ca/',
    campuses: [{ place: 'siksika' }] },
  { id: 'redcrow', name: 'Red Crow Community College', kind: 'college', about: 'First Nations college', site: 'https://www.redcrowcollege.com/',
    campuses: [{ place: 'stand-off' }, { place: 'lethbridge' }] },
  { id: 'yellowhead', name: 'Yellowhead Tribal College', kind: 'college', about: 'First Nations college', site: 'https://www.ytced.ab.ca/',
    campuses: [{ place: 'edmonton' }] },
];

export const KIND_WORDS: Record<SchoolKind, { one: string; many: string }> = {
  university: { one: 'university', many: 'Universities' },
  polytechnic: { one: 'polytechnic', many: 'Polytechnics' },
  college: { one: 'college', many: 'Colleges' },
};

/**
 * Towns a student can measure from: the quiz's named cities, plus the towns
 * with a school, so "how far is it" works from most of the province.
 */
export const FROM_TOWNS: Array<{ slug: string; name: string; lat: number; lon: number }> = [
  ...PLACES.filter(p => p.id !== 'siksika' && p.id !== 'stand-off' && p.id !== 'maskwacis')
    .map(p => ({ slug: p.id, name: p.name, lat: p.lat, lon: p.lon })),
  { slug: 'airdrie', name: 'Airdrie', lat: 51.292, lon: -114.014 },
  { slug: 'sherwood-park', name: 'Sherwood Park', lat: 53.541, lon: -113.296 },
  { slug: 'st-albert', name: 'St. Albert', lat: 53.631, lon: -113.626 },
  { slug: 'spruce-grove', name: 'Spruce Grove', lat: 53.545, lon: -113.901 },
  { slug: 'leduc', name: 'Leduc', lat: 53.259, lon: -113.549 },
  { slug: 'okotoks', name: 'Okotoks', lat: 50.725, lon: -113.975 },
  { slug: 'fort-saskatchewan', name: 'Fort Saskatchewan', lat: 53.713, lon: -113.213 },
  { slug: 'chestermere', name: 'Chestermere', lat: 51.05, lon: -113.823 },
  { slug: 'beaumont', name: 'Beaumont', lat: 53.357, lon: -113.415 },
  { slug: 'cold-lake', name: 'Cold Lake', lat: 54.464, lon: -110.183 },
  { slug: 'wetaskiwin', name: 'Wetaskiwin', lat: 52.969, lon: -113.377 },
].sort((a, b) => a.name.localeCompare(b.name, 'en-CA'));

export { kmBetween } from './alberta-map-client';

// ── Geometry ─────────────────────────────────────────────────────────────────

/**
 * The border, clockwise from where the 49th parallel meets the Continental
 * Divide. Three sides are lines of latitude or longitude (49°N, 110°W, 60°N,
 * 120°W); the fourth follows the Divide from Intersection Mountain (53.8°N,
 * 120°W) down to 49°N through its named passes (Yellowhead, Athabasca,
 * Howse, Kicking Horse, Vermilion, Crowsnest). Accurate to a few kilometres,
 * which is under a pixel at the size the map is drawn.
 */
const DIVIDE: Array<[number, number]> = [
  [53.8, -120], [53.62, -119.78], [53.42, -119.45], [53.27, -119.2], [53.12, -118.92],
  [52.89, -118.46], [52.7, -118.4], [52.5, -118.25], [52.37, -118.19], [52.27, -117.75],
  [52.15, -117.44], [52.0, -117.1], [51.81, -116.77], [51.62, -116.52], [51.45, -116.29],
  [51.23, -116.05], [51.08, -115.82], [50.87, -115.6], [50.65, -115.28], [50.5, -115.03],
  [50.3, -114.8], [50.05, -114.7], [49.8, -114.68], [49.63, -114.69], [49.45, -114.52],
  [49.25, -114.3], [49.0, -114.068],
];
const CORNERS: Array<[number, number]> = [[49.0, -114.068], [49.0, -110], [60, -110], [60, -120], [53.8, -120]];

/** Straight runs split into short steps, so a parallel bends as it should. */
function densify(points: Array<[number, number]>, step = 0.2): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i]!, points[i + 1]!];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  out.push(points[points.length - 1]!);
  return out;
}

/**
 * Lambert conformal conic, standard parallels 49.5°N and 58.5°N, centred on
 * 115°W: the projection provincial maps of Alberta use, so the province has
 * its familiar shape (the 60th parallel bowed, the north narrower).
 */
function lcc(lat: number, lon: number): [number, number] {
  const r = Math.PI / 180;
  const p1 = 49.5 * r, p2 = 58.5 * r, p0 = 49 * r, l0 = -115 * r;
  const t = (p: number) => Math.tan(Math.PI / 4 + p / 2);
  const n = Math.log(Math.cos(p1) / Math.cos(p2)) / Math.log(t(p2) / t(p1));
  const F = Math.cos(p1) * t(p1) ** n / n;
  const rho = F / t(lat * r) ** n;
  const rho0 = F / t(p0) ** n;
  const th = n * (lon * r - l0);
  return [rho * Math.sin(th), -(rho0 - rho * Math.cos(th))];
}

const RING = densify([...CORNERS, ...DIVIDE.slice(1)]);
const RAW = RING.map(([la, lo]) => lcc(la, lo));
const PAD = 14;
const MIN_X = Math.min(...RAW.map(p => p[0]));
const MAX_X = Math.max(...RAW.map(p => p[0]));
const MIN_Y = Math.min(...RAW.map(p => p[1]));
const MAX_Y = Math.max(...RAW.map(p => p[1]));
/** The map's drawing units: 600 wide, height from Alberta's own proportions. */
export const MAP_W = 600;
const SCALE = (MAP_W - 2 * PAD) / (MAX_X - MIN_X);
export const MAP_H = Math.round((MAX_Y - MIN_Y) * SCALE + 2 * PAD);

/** A latitude and longitude in map units (0..MAP_W, 0..MAP_H). */
export function project(lat: number, lon: number): [number, number] {
  const [x, y] = lcc(lat, lon);
  return [(x - MIN_X) * SCALE + PAD, (y - MIN_Y) * SCALE + PAD];
}

const BORDER = RING.map(([la, lo]) => project(la, lo));
const DIVIDE_XY = densify(DIVIDE, 0.1).map(([la, lo]) => project(la, lo));
const r1 = (n: number) => Math.round(n * 10) / 10;

export const BORDER_PATH = `M${BORDER.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z`;

export function insideAlberta(x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = BORDER.length - 1; i < BORDER.length; j = i++) {
    const [xi, yi] = BORDER[i]!, [xj, yj] = BORDER[j]!;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToDivide(x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < DIVIDE_XY.length - 1; i++) {
    const [ax, ay] = DIVIDE_XY[i]!, [bx, by] = DIVIDE_XY[i + 1]!;
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

/**
 * The province as a field of dots on a hex grid, in three paths by how close
 * each dot sits to the Divide: the Rockies read as a brighter band down the
 * south-west edge without drawing a single mountain. Each dot is a zero-length
 * segment with a round cap, written as relative moves, so the whole field is
 * a few short repeating strings that compress to almost nothing.
 */
export function dotField(step = 9): { plain: string; foothills: string; peaks: string } {
  const rows = { plain: [] as Array<[number, number]>, foothills: [] as Array<[number, number]>, peaks: [] as Array<[number, number]> };
  const dy = step * Math.sqrt(3) / 2;
  for (let row = 0, y = PAD + step / 2; y < MAP_H - PAD / 2; row++, y += dy) {
    for (let x = PAD / 2 + (row % 2 ? step / 2 : 0); x < MAP_W - PAD / 2; x += step) {
      if (!insideAlberta(x, y)) continue;
      // Keep a dot's own width off the border line, so the outline stays clean.
      if (!insideAlberta(x - 2, y) || !insideAlberta(x + 2, y) || !insideAlberta(x, y - 2) || !insideAlberta(x, y + 2)) continue;
      const d = distToDivide(x, y);
      rows[d < step * 3.2 ? 'peaks' : d < step * 7 ? 'foothills' : 'plain'].push([x, y]);
    }
  }
  const path = (pts: Array<[number, number]>) => {
    let out = '';
    let px = 0, py = 0;
    for (const [x, y] of pts) {
      out += out ? `m${r1(x - px)} ${r1(y - py)}h0` : `M${r1(x)} ${r1(y)}h0`;
      px = x; py = y;
    }
    return out;
  };
  return { plain: path(rows.plain), foothills: path(rows.foothills), peaks: path(rows.peaks) };
}

/** Graticule ticks at the edges, labelled the way a survey map labels them. */
export function edgeTicks(): Array<{ x: number; y: number; text: string; anchor: 'start' | 'end' | 'middle' }> {
  const [sx, sy] = project(49, -112);
  const [nx, ny] = project(60, -115);
  const [ex, ey] = project(55, -110);
  const [wx, wy] = project(57, -120);
  return [
    { x: sx, y: sy + 16, text: '49°N', anchor: 'middle' },
    { x: nx, y: ny - 7, text: '60°N', anchor: 'middle' },
    { x: ex - 6, y: ey, text: '110°W', anchor: 'end' },
    { x: wx + 6, y: wy, text: '120°W', anchor: 'start' },
  ];
}

export interface MapPlace extends Place {
  x: number;
  y: number;
  schools: Array<School & { note?: string }>;
}

/** Places with their schools, largest first, then by name. */
export function mapPlaces(): MapPlace[] {
  return PLACES.map(p => {
    const [x, y] = project(p.lat, p.lon);
    const schools = SCHOOLS.flatMap(s => s.campuses.filter(c => c.place === p.id).map(c => ({ ...s, note: c.note })));
    return { ...p, x, y, schools };
  }).sort((a, b) => b.schools.length - a.schools.length || a.name.localeCompare(b.name, 'en-CA'));
}
