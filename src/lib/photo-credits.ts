// Who took each scope and program-format photo (public/photos/backdrops/<key>-*.webp), under what
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
  // The Programs menu tiles, one per format hub. All public domain or CC0.
  'summer-programs': { shows: 'A camp counsellor and camper in a canoe on Lake George', author: 'ADKPhoto', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Counselor-and-camper-in-canoe-class-summer-camp-on-lake-george.jpg', added: '2026-09-23' },
  'competitions': { shows: "A student readies her team's robot at NASA's Lunabotics Challenge", author: 'NASA / Ben Smegelsky', license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lunabotics_Robotic_Mining_Competition_(KSC-20260519-PH-JBS01_0032).jpg', added: '2026-09-23' },
  'olympiads': { shows: 'Geometry work and a graphing calculator at a math workshop', author: 'U.S. Department of Education', license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Math_Workshop_Portland_7_(9610679810).jpg', added: '2026-09-23' },
  'science-fairs': { shows: 'A student beside her science fair project', author: 'Senior Airman Lexie West, U.S. Air Force', license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Homeschool_students_compete_in_science_fair_(5130165).jpg', added: '2026-09-23' },
  'research-placements': { shows: 'A student intern in a molecular diagnostics lab', author: 'U.S. Department of Agriculture', license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:APHIS-Moore_Air_Base_in_Texas-Plant_Protection_and_Quarantine_Science_and_Technology_Insect_Management_and_Molecular_Diagnostics_Laboratory_(20230621-CDP-APHIS-0514).jpg', added: '2026-09-23' },
  'dual-credit': { shows: 'An apprentice practising welding', author: 'Staff Sgt. Ivy Thomas, U.S. Air National Guard', license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:121_ARW_practices_welding_at_Lajes_Field_(9870984).jpg', added: '2026-09-23' },
  'clubs': { shows: 'A youth delegate at the National 4-H Conference', author: 'U.S. Department of Agriculture', license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:2025_National_4-H_Conference_of_over_400_youth_delegates_from_across_the_U.S._and_its_territories_at_U.S._Department_of_Agriculture_in_Washington,_D.C._from_April_11-15,_2025_-_4.jpg', added: '2026-09-23' },
  'conferences': { shows: 'The House of Commons chamber, Ottawa', author: 'Makaristos', license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Commons-chamber.jpg', added: '2026-09-23' },
  // The Explore menu tiles (tile crop only). All public domain or CC0.
  'explore-quiz': { shows: "Students working on laptops", author: "Jim Henderson", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:L_Nicosia%27s_YAL_laptop_students_jeh.jpg", added: '2026-09-27' },
  'explore-closing': { shows: "An hourglass on a table", author: "Suohros", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Hourglass_1.jpg", added: '2026-09-27' },
  'explore-deadlines': { shows: "A wooden flip calendar", author: "Amitbalani", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Manual_scrollable_wooden_wall_calendar.jpg", added: '2026-09-27' },
  'explore-guides': { shows: "Textbooks on a library shelf", author: "Drew Rollman, U.S. Fish and Wildlife Service", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Wolf_Creek_NFH_library_books.png", added: '2026-09-27' },
  'explore-reference': { shows: "A pen on a notebook", author: "Thomas Martinsen", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Pen_on_a_notebook_(Unsplash).jpg", added: '2026-09-27' },
  'explore-rutherford': { shows: "The Alberta Legislature Building, Edmonton", author: "D. Benjamin Miller", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Alberta_Legislature_Building,_June_7,_2024.jpg", added: '2026-09-27' },
  'explore-essays': { shows: "Writing in a notebook", author: "Kristin Hardwick", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Woman_writing_on_a_notebook_with_a_pen.jpg", added: '2026-09-27' },
  'explore-grade-11': { shows: "High school students by their lockers, New Ulm, Minnesota", author: "Art Hanson, U.S. National Archives", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:STUDENTS_RESTING_IN_THE_HALL_AGAINST_THEIR_LOCKERS_WAITING_FOR_CLASS_AT_SENIOR_HIGH_SCHOOL_IN_NEW_ULM,_MINNESOTA._THE..._-_NARA_-_558223.tif", added: '2026-09-27' },
  'explore-educators': { shows: "A teacher and his class at Cathedral High School, New Ulm, Minnesota", author: "David Stroble, U.S. National Archives", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:A_TEACHER_TALKS_TO_HIS_STUDENTS_IN_A_CLASSROOM_AT_CATHEDRAL_HIGH_SCHOOL_IN_NEW_ULM,_MINNESOTA._THE_TOWN_IS_A_COUNTY..._-_NARA_-_558210.tif", added: '2026-09-27' },
  'explore-updates': { shows: "A vintage typewriter", author: "Florian Klauer", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Vintage_typewriter_(Unsplash).jpg", added: '2026-09-27' },
};

/**
 * The Explore menu's photos, by the tile they sit on. They are not facets, so
 * they ship only the tile crop and name their place here for /credits/.
 */
export const EXPLORE_PHOTOS: Record<string, string> = {
  'explore-quiz': 'Explore: Find my scholarships',
  'explore-closing': 'Explore: Closing soon',
  'explore-deadlines': 'Explore: Deadlines',
  'explore-guides': 'Explore: Guides',
  'explore-reference': 'Explore: Reference letter',
  'explore-rutherford': 'Explore: Rutherford guide',
  'explore-essays': 'Explore: Scholarship essays',
  'explore-grade-11': 'Explore: Grade 11 timeline',
  'explore-educators': 'Explore: For educators',
  'explore-updates': 'Explore: What changed',
};

/** CC BY and CC BY-SA require the author and license beside the photo. */
export const needsCredit = (c: PhotoCredit): boolean => /^CC BY/.test(c.license);
