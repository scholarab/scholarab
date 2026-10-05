// The starter pack: awards almost every Alberta Grade 12 student can enter,
// put in every visitor's My combo once (Ilia, 2026-10-04: "2 or 3 awards that
// anybody can apply to ... preload for all users").
//
// - Alexander Rutherford: every Alberta Grade 12 with the averages, and its
//   application also considers you for the Mehl scholarship.
// - Canada's Luckiest Student: a free random draw, no essay, no grades.
// - RE/MAX Quest for Excellence: any Grade 12 outside Quebec, a 500-word
//   essay, winners drawn at random.
//
// starter-pack.test.ts checks each id against the catalogue, so a removed or
// narrowed award fails the build rather than seeding a dead row.
export const STARTER_PACK_IDS = [14, 126, 8] as const;

/** Set once the pack has been added, so an award a student removes stays out. */
export const STARTER_PACK_KEY = 'scholarab_starter_pack';
