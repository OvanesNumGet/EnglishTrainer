import { state } from '../state.js';

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === 'system') applyTheme();
});

export function initTheme() {
    applyTheme();
    updateThemeControls();
}

function applyTheme() {
    let isDark = false;
    if (state.theme === 'dark') isDark = true;
    else if (state.theme === 'light') isDark = false;
    else isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (isDark) document.body.setAttribute('data-theme', 'dark');
    else document.body.removeAttribute('data-theme');
}

export function setTheme(mode) {
    state.theme = mode;
    localStorage.setItem('theme', mode);
    applyTheme();
    updateThemeControls();
}

function updateThemeControls() {
    const btns = document.querySelectorAll('.theme-btn');
    if (btns.length) {
        btns.forEach(btn => {
            if (btn.dataset.themeVal === state.theme) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }
}
