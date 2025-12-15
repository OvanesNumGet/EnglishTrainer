/**
 * Sync "system bars" colors (status bar / browser UI) with the app theme.
 *
 * - Android/Chrome: meta[name="theme-color"] controls the status bar color in PWA/standalone.
 * - iOS: apple-mobile-web-app-status-bar-style is limited to: default | black | black-translucent.
 *   Dynamic changes may not apply while the app is running, but setting it is harmless.
 */

const LIGHT_BG = '#fafafa'; // must match --bg-primary in light theme
const DARK_BG = '#0a0a0a';  // must match --bg-primary in dark theme

function getSavedThemePref() {
  try {
    return localStorage.getItem('theme') || 'system';
  } catch {
    return 'system';
  }
}

function getEffectiveTheme() {
  const docEl = document.documentElement;
  const body = document.body;

  const attr =
    (docEl && docEl.getAttribute('data-theme')) ||
    (body && body.getAttribute('data-theme'));

  if (attr === 'dark' || attr === 'light') return attr;

  const saved = getSavedThemePref();
  if (saved === 'dark' || saved === 'light') return saved;

  const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  return (mql && mql.matches) ? 'dark' : 'light';
}

function setMetaThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  if (meta.getAttribute('content') !== color) {
    meta.setAttribute('content', color);
  }
}

function setAppleStatusBarStyle(style) {
  const meta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!meta) return;
  if (meta.getAttribute('content') !== style) {
    meta.setAttribute('content', style);
  }
}

export function applySystemBars() {
  const theme = getEffectiveTheme();
  const bg = theme === 'dark' ? DARK_BG : LIGHT_BG;

  setMetaThemeColor(bg);

  // Best-effort for iOS at launch (limited options)
  setAppleStatusBarStyle(theme === 'dark' ? 'black' : 'default');
}

export function initSystemBars() {
  applySystemBars();

  // Re-apply when app toggles data-theme
  if ('MutationObserver' in window) {
    const obs = new MutationObserver(() => applySystemBars());
    if (document.documentElement) {
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
    if (document.body) {
      obs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }
  }

  // Re-apply on OS theme changes when theme preference is "system"
  const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (mql) {
    const handler = () => {
      const saved = getSavedThemePref();
      if (saved === 'system') applySystemBars();
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(handler);
    }
  }
}