import { loadComponent } from './loader.js';
import { attachEventListeners } from './events.js';
import { loadDataset } from './dataset.js';
// Updated import path
import { initTheme, initSettingsUI, initDropboxUI, initConfirmDialogs, initFocusModeUI } from '../ui/index.js';
import { initSystemBars } from '../ui/systemBars.js';
import { state, setCurrentDataset, applyEffectiveSimpleMode } from '../state.js';

export async function initApp() {
    // 1. Load HTML fragments
    await Promise.all([
        loadComponent('header-container', 'html/header.html'),
        loadComponent('tabs-container', 'html/tabs.html'),
        loadComponent('settings-container', 'html/settings_menu.html'),
        loadComponent('statsContentPlaceholder', 'html/stats.html'),
        loadComponent('flashcards', 'html/flashcards.html'),
        loadComponent('test', 'html/test.html'),
        loadComponent('controls-container', 'html/controls.html')
    ]);

    // Apply reduce-motion early (used by modal/toasts/layout)
    document.body.classList.toggle('reduce-motion', !!state.settings?.reduceMotion);

    // Apply animation speed multiplier early (so animations work on first render)
    const speed = state.settings?.animSpeed || 'normal';
    const multiplier = speed === 'slow' ? 1.5 : speed === 'fast' ? 0.5 : 1;
    document.documentElement.style.setProperty('--anim-multiplier', String(multiplier));

    // Restore dataset select value BEFORE enhancing it
    const savedDataset = state.lastDataset;
    const datasetSelect = document.getElementById('datasetSelect');
    if (datasetSelect && datasetSelect.querySelector(`option[value="${savedDataset}"]`)) {
        datasetSelect.value = savedDataset;
    }

    // IMPORTANT: dataset-dependent UI (forces simple-mode for text datasets)
    setCurrentDataset(savedDataset);
    applyEffectiveSimpleMode();

    // Keep forced simple-mode stable when dataset changes
    if (datasetSelect) {
        const onDatasetChange = () => {
            setCurrentDataset(datasetSelect.value);
            applyEffectiveSimpleMode();
        };
        datasetSelect.addEventListener('change', onDatasetChange);
        datasetSelect.addEventListener('input', onDatasetChange);
    }

    // Fix: opening/closing settings should not accidentally "reveal" hidden fields.
    // We re-apply effective simple-mode whenever settings DOM state changes.
    const settingsScreen = document.getElementById('settingsScreen');
    if (settingsScreen && 'MutationObserver' in window) {
        const obs = new MutationObserver(() => {
            applyEffectiveSimpleMode();
        });
        obs.observe(settingsScreen, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    // 2. Initialize UI components
    // Lucide is loaded from CDN in index.html; offline it may be unavailable.
    // Guard to avoid breaking the whole app when offline.
    try {
        if (globalThis.lucide && typeof globalThis.lucide.createIcons === 'function') {
            globalThis.lucide.createIcons();
        }
    } catch (e) {
        // Ignore icon rendering errors; app should still work offline.
        console.warn('Lucide icons not available:', e);
    }

    initTheme();

    // Keep status bar / system UI in sync with theme changes
    initSystemBars();

    initSettingsUI();

    initDropboxUI();
    initConfirmDialogs();

    // Focus mode (buttons + floating exit)
    initFocusModeUI();

    // 3. Attach Event Listeners
    attachEventListeners();

    // 4. Init Data - Restore Last Dataset and Tab
    loadDataset(savedDataset);

    // Restore Tab
    const savedTab = state.lastTab;
    const tabBtn = document.querySelector(`.tab[data-tab="${savedTab}"]`);
    if (tabBtn) tabBtn.click();
}
