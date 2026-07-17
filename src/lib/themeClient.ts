// Browser-only — do not import in SSR context
export type Theme = 'dark' | 'light';

export function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem('theme') as Theme) ?? getSystemTheme();
  } catch {
    return 'dark';
  }
}

function getSystemTheme(): Theme {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  // Suppress all transitions for one paint cycle — prevents color "bleeding"
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(s);
  requestAnimationFrame(() => requestAnimationFrame(() => s.remove()));

  document.documentElement.classList.remove('theme-dark', 'theme-light');
  document.documentElement.classList.add(`theme-${theme}`);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);

  try { localStorage.setItem('theme', theme); } catch { /* localStorage unavailable */ }
}
