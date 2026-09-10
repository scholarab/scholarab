/** Existing curated board codes and labels, not inferred fuzzy aliases. School
 * and institution catalogs will grow through source review. Unknown names stay
 * unknown instead of matching a substring of an unrelated institution. */
import { SCHOOL_BOARD_NAMES } from '../quiz';
export const schoolBoardEntities = Object.entries(SCHOOL_BOARD_NAMES).map(([id, label]) => ({
  id,
  label,
  aliases: [id, label],
}));
export interface Entity {
  id: string;
  label: string;
  aliases: string[];
}
const normalized = (value: string) =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-CA');
export function resolveEntity(value: string, entities: Entity[]): string | null {
  const found = entities.filter((e) =>
    e.aliases.some((alias) => normalized(alias) === normalized(value))
  );
  return found.length === 1 ? found[0]!.id : null;
}
