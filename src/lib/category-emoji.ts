// One emoji per scholarship category, used on cards, chips, and the home
// category grid. Programs carry their own per-listing emoji in the data.
export const CATEGORY_EMOJI: Record<string, string> = {
  Academic: '🎓',
  Arts: '🎨',
  Community: '🤝',
  Environmental: '🌱',
  General: '✨',
  Indigenous: '🪶',
  STEM: '🔬',
  Sports: '🏅',
  Trades: '🔧',
};

export function categoryEmoji(category?: string | null): string | null {
  return category ? CATEGORY_EMOJI[category] ?? null : null;
}
