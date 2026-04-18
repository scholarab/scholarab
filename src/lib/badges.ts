export interface BadgeStyle {
  emoji: string;
  bg: string;
  color: string;
  border: string;
}

export const SCHOLARSHIP_BADGES: Record<string, BadgeStyle> = {
  'Academic':      { emoji: '🎓', bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)'  }, // blue
  'Arts':          { emoji: '🎨', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' }, // violet
  'Community':     { emoji: '🤝', bg: 'rgba(52,211,153,0.15)',  color: '#34d399', border: 'rgba(52,211,153,0.3)'  }, // emerald
  'Environmental': { emoji: '🌿', bg: 'rgba(163,230,53,0.15)',  color: '#a3e635', border: 'rgba(163,230,53,0.3)'  }, // lime
  'General':       { emoji: '✨', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' }, // slate
  'Indigenous':    { emoji: '🪶', bg: 'rgba(251,146,60,0.15)',  color: '#fb923c', border: 'rgba(251,146,60,0.3)'  }, // orange
  'STEM':          { emoji: '🔬', bg: 'rgba(34,211,238,0.15)',  color: '#22d3ee', border: 'rgba(34,211,238,0.3)'  }, // cyan
  'Sports':        { emoji: '🏆', bg: 'rgba(251,113,133,0.15)', color: '#fb7185', border: 'rgba(251,113,133,0.3)' }, // rose
  'Trades':        { emoji: '🔧', bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', border: 'rgba(251,191,36,0.3)'  }, // amber
  'Health':        { emoji: '🏥', bg: 'rgba(244,114,182,0.15)', color: '#f472b6', border: 'rgba(244,114,182,0.3)' }, // pink
  'Engineering':   { emoji: '⚙️', bg: 'rgba(99,102,241,0.15)',  color: '#818cf8', border: 'rgba(99,102,241,0.3)'  }, // indigo
};

export const PROGRAM_BADGES: Record<string, BadgeStyle> = {
  'Computer Science':      { emoji: '💻', bg: 'rgba(99,102,241,0.15)',  color: '#818cf8', border: 'rgba(99,102,241,0.3)'  }, // indigo
  'Engineering':           { emoji: '⚙️', bg: 'rgba(251,146,60,0.15)',  color: '#fb923c', border: 'rgba(251,146,60,0.3)'  }, // orange
  'Environmental':         { emoji: '🌿', bg: 'rgba(163,230,53,0.15)',  color: '#a3e635', border: 'rgba(163,230,53,0.3)'  }, // lime
  'Environmental Science': { emoji: '🌱', bg: 'rgba(163,230,53,0.15)',  color: '#a3e635', border: 'rgba(163,230,53,0.3)'  }, // lime
  'Health':                { emoji: '🏥', bg: 'rgba(244,114,182,0.15)', color: '#f472b6', border: 'rgba(244,114,182,0.3)' }, // pink
  'Health Research':       { emoji: '🩺', bg: 'rgba(251,113,133,0.15)', color: '#fb7185', border: 'rgba(251,113,133,0.3)' }, // rose
  'Mathematics':           { emoji: '📐', bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', border: 'rgba(251,191,36,0.3)'  }, // amber
  'Neuroscience':          { emoji: '🧠', bg: 'rgba(217,70,239,0.15)',  color: '#e879f9', border: 'rgba(217,70,239,0.3)'  }, // fuchsia
  'Physics':               { emoji: '⚛️', bg: 'rgba(14,165,233,0.15)',  color: '#38bdf8', border: 'rgba(14,165,233,0.3)'  }, // sky
  'STEAM Enrichment':      { emoji: '🎨', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' }, // violet
  'STEM':                  { emoji: '🔬', bg: 'rgba(34,211,238,0.15)',  color: '#22d3ee', border: 'rgba(34,211,238,0.3)'  }, // cyan
  'STEM Enrichment':       { emoji: '🧪', bg: 'rgba(20,184,166,0.15)',  color: '#2dd4bf', border: 'rgba(20,184,166,0.3)'  }, // teal
  'STEM Mentorship':       { emoji: '🧑‍🏫', bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)'  }, // blue
  'STEM Research':         { emoji: '🔭', bg: 'rgba(168,85,247,0.15)',  color: '#a855f7', border: 'rgba(168,85,247,0.3)'  }, // purple
  'Social Sciences':       { emoji: '🌍', bg: 'rgba(52,211,153,0.15)',  color: '#34d399', border: 'rgba(52,211,153,0.3)'  }, // emerald
  'Arts/Humanities':       { emoji: '📚', bg: 'rgba(196,181,253,0.15)', color: '#c4b5fd', border: 'rgba(196,181,253,0.3)' }, // violet-300
};

export const DEFAULT_BADGE: BadgeStyle = { emoji: '📋', bg: 'rgba(34,211,165,0.12)', color: '#22d3a5', border: 'rgba(34,211,165,0.25)' };
