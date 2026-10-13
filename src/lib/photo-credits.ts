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
  'brooks': { shows: "The Brooks Aqueduct", author: "Quintin Soloviev", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Brooks_Aqueduct_(Alberta).jpg", added: '2026-09-23' },
  'cold-lake': { shows: "Cold Lake from Cold Lake Provincial Park", author: "Qwexcxewq", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Cold_Lake_View,_from_Cold_Lake_Provincial_Park.jpg", added: '2026-09-23' },
  'grande-prairie': { shows: "Downtown Grande Prairie from Muskoseepi Park", author: "Grant Berg", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Downtown_Grande_Prairie_from_Muskoseepi_Park_-_panoramio.jpg", added: '2026-09-23' },
  'lacombe': { shows: "The Campbell Block, downtown Lacombe", author: "Properpostman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Campbell_Block_Lacombe_AB_CAN.jpg", added: '2026-09-23' },
  'lethbridge': { shows: "The High Level Bridge over the Oldman River coulees", author: "Travhillier", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Lethbridge_River_Valley_Bridge_.jpg", added: '2026-09-23' },
  'medicine-hat': { shows: "Downtown Medicine Hat and the South Saskatchewan River from the air", author: "Quintin Soloviev", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Medicine_Hat,_Alberta.jpg", added: '2026-09-23' },
  'red-deer': { shows: "Red Deer and its river bridges from the air in autumn", author: "Waynercook", license: "Public domain", licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Red_Deer_-_Aerial_-_downtown_bridges.jpg", added: '2026-09-23' },
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
  // The directory tab line's topic tabs (tab crop only). All public domain or CC0.
  'tab-graduation': { shows: "Graduates in mortarboards", author: "McElspeth", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Graduation-cap-g6c3c0e4d0_1920.jpg", added: '2026-10-12' },
  'tab-campus': { shows: "The Winspear Business Reference Library, University of Alberta", author: "WinterforceMedia", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Winspear_Business_Reference_Library_University_of_Alberta_Edmonton_Alberta_Canada_01.jpg", added: '2026-10-12' },
  'tab-indigenous': { shows: "Dancers at the Alexis Nakota Sioux Nation powwow", author: "Yiwahikanak", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Alexispowwow.jpg", added: '2026-10-12' },
  'tab-trades': { shows: "A builder at a framed wall", author: "U.S. Naval Forces Europe-Africa", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:160620-N-ZZ999-002_(27901152156).jpg", added: '2026-10-12' },
  'tab-arts': { shows: "A watercolour, Close Harmony", author: "Fons Heijnsbroek", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:%27Close_Harmony%27_-_a_small_abstract_watercolor_painting,_painted_by_Dutch_artist_Fons_Heijnsbroek_in_2008.tif", added: '2026-10-12' },
  'tab-stem': { shows: "A student coding a small robot", author: "Senior Airman Sydney Franklin, U.S. Air Force", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Spangdahlem_airmen_power_up_STEMposium_with_green_energy_focus_(9546070).jpg", added: '2026-10-12' },
  'tab-research': { shows: "Students at a laboratory microscope", author: "Asamoah Daniel Kwame Oware", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Laboratory_Microscope.jpg", added: '2026-10-12' },
  'tab-community': { shows: "Volunteers packing boxes at a food bank", author: "U.S. Department of Homeland Security", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Acting_Secretary_Wolf_Volunteers_at_the_Capital_Area_Food_Bank_(50695223413).jpg", added: '2026-10-12' },
  'tab-sports': { shows: "A hockey rink between periods", author: "Kyvuh", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Yost_Ice_Arena,_Michigan_Ice_Hockey_Game_During_Intermission.jpg", added: '2026-10-12' },
  'tab-computing': { shows: "Code on a monitor", author: "Markus Spiske", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Code_on_computer_monitor_(Unsplash).jpg", added: '2026-10-12' },
  'tab-math-physics': { shows: "Formulas on a blackboard", author: "Wallpoper", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Pure-mathematics-formul%C3%A6-blackboard.jpg", added: '2026-10-12' },
  'tab-social-sciences': { shows: "A lecture to a class of students", author: "George Serdechny", license: 'Public domain', licenseUrl: null, source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:A_lecture_at_the_ITM.jpg", added: '2026-10-12' },
  'tab-health': { shows: "A stethoscope", author: "Tama998", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Stethoscope_No.120.JPG", added: '2026-10-12' },
  'tab-engineering': { shows: "A circuit board", author: "ComputerUserUser", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'Wikimedia Commons', sourceUrl: "https://commons.wikimedia.org/wiki/File:Caviar_2340_Hard_Drive_Circuit_Board_Side_2.jpg", added: '2026-10-12' },
};

/**
 * The Explore menu's photos, by the tile they sit on. They are not facets, so
 * they ship only the tile crop and name their place here for /credits/.
 */
export const EXPLORE_PHOTOS: Record<string, string> = {
  'explore-quiz': 'Explore: Build my combo',
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

/**
 * The tab line's photos for the tabs that are not a place or a format (Ilia,
 * 2026-10-12): the two All tabs and the kinds and fields of award and
 * program, by the tab's link. They ship only the tab crop, <photo>-tab.webp.
 * A place or format tab uses its own backdrop instead.
 */
export const TAB_PHOTOS: Record<string, { photo: string; usedFor: string }> = {
  '/scholarships/': { photo: 'tab-graduation', usedFor: 'All scholarships tab' },
  '/scholarships/university-college-awards/': { photo: 'tab-campus', usedFor: 'Universities & colleges tab' },
  '/scholarships/indigenous/': { photo: 'tab-indigenous', usedFor: 'Indigenous tab' },
  '/scholarships/trades/': { photo: 'tab-trades', usedFor: 'Trades scholarships tab' },
  '/scholarships/arts/': { photo: 'tab-arts', usedFor: 'Arts tab' },
  '/scholarships/stem/': { photo: 'tab-stem', usedFor: 'STEM tab' },
  '/scholarships/community/': { photo: 'tab-community', usedFor: 'Community tab' },
  '/scholarships/sports/': { photo: 'tab-sports', usedFor: 'Sports tab' },
  '/programs/': { photo: 'explore-quiz', usedFor: 'All programs tab' },
  '/programs/research/': { photo: 'tab-research', usedFor: 'Research tab' },
  '/programs/computing/': { photo: 'tab-computing', usedFor: 'Computing tab' },
  '/programs/math-physics/': { photo: 'tab-math-physics', usedFor: 'Math & Physics tab' },
  '/programs/social-sciences/': { photo: 'tab-social-sciences', usedFor: 'Social Sciences tab' },
  '/programs/health/': { photo: 'tab-health', usedFor: 'Health tab' },
  '/programs/engineering/': { photo: 'tab-engineering', usedFor: 'Engineering tab' },
  '/programs/trades/': { photo: 'tab-trades', usedFor: 'Trades programs tab' },
  '/programs/enrichment/': { photo: 'explore-guides', usedFor: 'Enrichment tab' },
};
