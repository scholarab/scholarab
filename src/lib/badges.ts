export interface BadgeStyle {
  emoji: string;
  bg: string;
  color: string;
  border: string;
}

export const SCHOLARSHIP_BADGES: Record<string, BadgeStyle> = {
  'Academic':      { emoji: '🎓', bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  'Indigenous':    { emoji: '🪶', bg: 'rgba(251,146,60,0.15)',  color: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  'Arts':          { emoji: '🎨', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
  'Trades':        { emoji: '🔧', bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  'Community':     { emoji: '🤝', bg: 'rgba(52,211,153,0.15)',  color: '#34d399', border: 'rgba(52,211,153,0.3)' },
  'STEM':          { emoji: '🔬', bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  'Health':        { emoji: '🏥', bg: 'rgba(244,114,182,0.15)', color: '#f472b6', border: 'rgba(244,114,182,0.3)' },
  'Engineering':   { emoji: '⚙️', bg: 'rgba(251,146,60,0.15)',  color: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  'Environmental': { emoji: '🌿', bg: 'rgba(52,211,153,0.15)',  color: '#34d399', border: 'rgba(52,211,153,0.3)' },
};

export const PROGRAM_BADGES: Record<string, BadgeStyle> = {
  'Health Research':   { emoji: '🏥', bg: 'rgba(244,114,182,0.15)', color: '#f472b6', border: 'rgba(244,114,182,0.3)' },
  'STEM Research':     { emoji: '🔬', bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  'STEM Mentorship':   { emoji: '🧑‍🏫', bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'STEAM Enrichment':  { emoji: '🎨', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
  'Engineering':       { emoji: '⚙️', bg: 'rgba(251,146,60,0.15)',  color: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  'Environmental':     { emoji: '🌿', bg: 'rgba(52,211,153,0.15)',  color: '#34d399', border: 'rgba(52,211,153,0.3)' },
  'Arts/Humanities':   { emoji: '📚', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
  'Health':            { emoji: '🏥', bg: 'rgba(244,114,182,0.15)', color: '#f472b6', border: 'rgba(244,114,182,0.3)' },
  'STEM':              { emoji: '🔬', bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
};

export const DEFAULT_BADGE: BadgeStyle = { emoji: '📋', bg: 'rgba(34,211,165,0.12)', color: '#22d3a5', border: 'rgba(34,211,165,0.25)' };
