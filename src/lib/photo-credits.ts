// Who took each scope photo (public/photos/backdrops/<key>-*.webp), under what
// license, and where it came from. One record per `backdrop` value in
// facets.ts, and the only place these facts live: the credit line on the home
// carousel cards and the /credits/ page both read it, and photo-credits.test.ts
// fails if a backdrop has no record here.
//
// The Wikimedia Commons photos under CC BY and CC BY-SA must be credited where
// they are used, which is what `needsCredit` drives. The edited crops of a
// CC BY-SA photo stay under CC BY-SA. The Unsplash, CC0 and public domain
// photos need no credit; they are listed on /credits/ all the same.

export interface PhotoCredit {
  /** What the photo shows, in a few words. */
  shows: string;
  author: string;
  license: string;
  /** Null for public domain, which has no license text to link. */
  licenseUrl: string | null;
  source: 'Unsplash' | 'Wikimedia Commons';
  sourceUrl: string;
  /** The day the files were added to the repository. */
  added: string;
}

export const PHOTO_CREDITS: Record<string, PhotoCredit> = {
  'alberta': { shows: "A mountain lake in the Alberta Rockies", author: "Nataliia Kvitovska", license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license', source: 'Unsplash', sourceUrl: 'https://unsplash.com/photos/tTsdpwnLZ_s', added: '2026-09-13' },
  'calgary': { shows: "The Calgary skyline over the Bow River", author: "Igor Kyryliuk and Tetiana Kravchenko", license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license', source: 'Unsplash', sourceUrl: 'https://unsplash.com/photos/n4mvQ1YWk1U', added: '2026-09-13' },
  'edmonton': { shows: "The Edmonton skyline", author: "Alex Pugliese", license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license', source: 'Unsplash', sourceUrl: 'https://unsplash.com/photos/u2tSj5H3rXQ', added: '2026-09-13' },
  'fort-mcmurray': { shows: "The river at Fort McMurray at sunset", author: "Rovi Matilla", license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license', source: 'Unsplash', sourceUrl: 'https://unsplash.com/photos/T2ItzSPzIxw', added: '2026-09-13' },
  'national': { shows: "Toronto skyline and the CN Tower", author: "Caio Silva", license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license', source: 'Unsplash', sourceUrl: 'https://unsplash.com/photos/l3mNDwVVT10', added: '2026-09-13' },
  'airdrie': { shows: "Airdrie from the air, looking west to the Rockies", author: "formulanone", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Airdrie_Towards_Mountains_Aerial_(48796460641).jpg", added: '2026-09-23' },
  'beaumont': { shows: "Saint Vital Roman Catholic Church, Beaumont", author: "WinterE229 (WinterforceMedia)", license: "Public domain", licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Vital_Roman_Catholic_Church_Beaumont_Alberta_Canada_01A.jpg", added: '2026-09-23' },
  'brooks': { shows: "The Brooks Aqueduct", author: "Quintin Soloviev", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Brooks_Aqueduct_(Alberta).jpg", added: '2026-09-23' },
  'camrose': { shows: "The Camrose grain elevator", author: "Wilson Hui", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Camrose_Alberta_Grain_Elevator_(10149028365).jpg", added: '2026-09-23' },
  'chestermere': { shows: "John Peake Park on Chestermere Lake from the air", author: "Bythelake10", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Chestermere_Alberta_2.JPG", added: '2026-09-23' },
  'cochrane': { shows: "Cochrane from the Glen Eagles hills, looking west", author: "Chuck Szmurlo", license: "CC BY 2.5", licenseUrl: "https://creativecommons.org/licenses/by/2.5/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Cochrane-Szmurlo.jpg", added: '2026-09-23' },
  'cold-lake': { shows: "Cold Lake from Cold Lake Provincial Park", author: "Qwexcxewq", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Cold_Lake_View,_from_Cold_Lake_Provincial_Park.jpg", added: '2026-09-23' },
  'fort-saskatchewan': { shows: "The Fort Saskatchewan bridge from Fort Centre Park", author: "Kurt Bauschardt", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Fort_Saskatchewan_Bridge_(25432987644).jpg", added: '2026-09-23' },
  'grande-prairie': { shows: "Downtown Grande Prairie from Muskoseepi Park", author: "Grant Berg", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Downtown_Grande_Prairie_from_Muskoseepi_Park_-_panoramio.jpg", added: '2026-09-23' },
  'lacombe': { shows: "The Campbell Block, downtown Lacombe", author: "Properpostman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Campbell_Block_Lacombe_AB_CAN.jpg", added: '2026-09-23' },
  'leduc': { shows: "The Alberta Wheat Pool elevators in Leduc", author: "Jeffery J. Nichols", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Alberta_Wheat_Pool_complex_in_Leduc_(south).JPG", added: '2026-09-23' },
  'lethbridge': { shows: "The High Level Bridge over the Oldman River coulees", author: "Travhillier", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Lethbridge_River_Valley_Bridge_.jpg", added: '2026-09-23' },
  'lloydminster': { shows: "Lloydminster City Hall and the border markers from the air", author: "Jason Whiting", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Lloydminster_City_Hall.jpg", added: '2026-09-23' },
  'medicine-hat': { shows: "Downtown Medicine Hat and the South Saskatchewan River from the air", author: "Quintin Soloviev", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Medicine_Hat,_Alberta.jpg", added: '2026-09-23' },
  'okotoks': { shows: "The Okotoks Erratic (Big Rock)", author: "formulanone", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Okotoks_Erratic_Front_(53451857456).jpg", added: '2026-09-23' },
  'red-deer': { shows: "Red Deer and its river bridges from the air in autumn", author: "Waynercook", license: "Public domain", licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Red_Deer_-_Aerial_-_downtown_bridges.jpg", added: '2026-09-23' },
  'sherwood-park': { shows: "Sherwood Park at sunset", author: "Super Russell 457", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Beautiful_Sherwood_Park.jpg", added: '2026-09-23' },
  'spruce-grove': { shows: "The Spruce Grove grain elevator", author: "Wilson Hui", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Spruce_Grove_Alberta_Grain_Elevator_(10100112966).jpg", added: '2026-09-23' },
  'st-albert': { shows: "The St. Albert grain elevators from the air", author: "Peter Vogelaar", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:St._Albert_Grain_Elevator.JPG", added: '2026-09-23' },
  'wetaskiwin': { shows: "A Canadian Pacific train at Wetaskiwin", author: "WinterE229 (WinterforceMedia)", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Canadian_Pacific_Track_Laying_Train_Wetaskiwin_Alberta_Canada_06A.jpg", added: '2026-09-23' },
};

/** CC BY and CC BY-SA require the author and license beside the photo. */
export const needsCredit = (c: PhotoCredit): boolean => /^CC BY/.test(c.license);
