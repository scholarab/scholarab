/** The offline shortlist needs card facts and calendar URLs, not full paragraphs. */
export type SavedItem = {
  type: 'scholarship' | 'program'; id: number; name: string;
  category?: string | null; deadline: string | null; url: string;
  amount?: string | null; provider?: string | null;
  openDate?: string | null; active?: boolean; concluded?: boolean;
};

// Field names live once in code instead of on every catalogue row.
const fields = ['type', 'id', 'name', 'amount', 'category', 'deadline', 'openDate', 'active', 'concluded', 'url', 'provider'] as const;
type SavedRow = Array<SavedItem[keyof SavedItem] | null>;
export function savedPayload(items: SavedItem[]): SavedRow[] {
  return items.map(item => fields.map(key => item[key] ?? null));
}
export function readSavedPayload(rows: SavedRow[]): SavedItem[] {
  return rows.map(row => Object.fromEntries(fields.map((key, i) => [key, row[i]])) as SavedItem);
}
