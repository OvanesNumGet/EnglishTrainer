import { state, updateSetting, exportUserData, importUserData } from '../state.js';
import { updateStats } from './stats.js';
import { updateControlsVisibility } from './controls.js';
import { setTheme } from './theme.js';
import { showToast } from '../utils.js';

let swipeListenersInitialized = false;
let settingsBindingsInitialized = false;

let importInputEl = null;

function getAnimMultiplier() {
    return state.settings?.animSpeed === 'slow'
        ? 1.5
        : state.settings?.animSpeed === 'fast'
            ? 0.5
            : 1;
}

function ensureImportInput() {
    if (importInputEl) return importInputEl;

    const existing = document.getElementById('importDataInput');
    if (existing) {
        importInputEl = existing;
        return importInputEl;
    }

    importInputEl = document.createElement('input');
    importInputEl.type = 'file';
    importInputEl.id = 'importDataInput';
    importInputEl.accept = 'application/json,.json';
    importInputEl.style.display = 'none';

    document.body.appendChild(importInputEl);

    importInputEl.addEventListener('change', async () => {
        const file = importInputEl.files && importInputEl.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);

            const res = importUserData(parsed);

            showToast('success', 'Импорт выполнен', `Восстановлено: ${res.restoredKeys} ключей`);
            // Reload so state/store and all modules re-read localStorage consistently
            setTimeout(() => window.location.reload(), 120);
        } catch (e) {
            console.error(e);
            showToast('error', 'Импорт не удался', (e && e.message) ? e.message : 'Некорректный файл');
        }
    });

    return importInputEl;
}

function syncSettingsUI() {
    // Apply global classes (in case settings were restored without UI open)
    document.body.classList.toggle('reduce-motion', !!state.settings?.reduceMotion);
    document.body.classList.toggle('simple-mode', !!state.settings?.simpleMode);

    // Apply CSS multiplier (so speed works even without changing setting this session)
    document.documentElement.style.setProperty('--anim-multiplier', String(getAnimMultiplier()));

    // Checkboxes
    const setChecked = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!state.settings?.[key];
    };

    setChecked('settingAutoSpeak', 'autoSpeak');
    setChecked('settingHaptics', 'haptics');
    setChecked('settingReduceMotion', 'reduceMotion');
    setChecked('settingSimpleMode', 'simpleMode');
    setChecked('settingAutoAdvance', 'autoAdvance');
    setChecked('settingAutoCheck', 'autoCheck');
    setChecked('settingLiveCheck', 'liveCheck');
    setChecked('settingShowHints', 'showHints');
    setChecked('settingSoundEffects', 'soundEffects');
    setChecked('settingConfetti', 'confetti');

    // Hints visibility (also affects the main UI)
    document.querySelectorAll('.btn-hint').forEach(btn => {
        btn.style.display = state.settings?.showHints ? 'flex' : 'none';
    });

    // Active states for segmented controls
    const rateBtns = Array.from(document.querySelectorAll('.segment-btn[data-rate]'));
    rateBtns.forEach(btn => {
        const r = parseFloat(btn.dataset.rate);
        btn.classList.toggle('active', state.settings?.speechRate === r);
    });

    const goalBtns = Array.from(document.querySelectorAll('.segment-btn[data-goal]'));
    goalBtns.forEach(btn => {
        const g = parseInt(btn.dataset.goal);
        btn.classList.toggle('active', state.settings?.dailyGoal === g);
    });

    const animBtns = Array.from(document.querySelectorAll('.segment-btn[data-anim-speed]'));
    animBtns.forEach(btn => {
        btn.classList.toggle('active', state.settings?.animSpeed === btn.dataset.animSpeed);
    });

    // Animation speed control availability: only when animations are enabled
    const animDisabled = !!state.settings?.reduceMotion;
    animBtns.forEach(btn => {
        btn.disabled = animDisabled;
        btn.setAttribute('aria-disabled', animDisabled ? 'true' : 'false');
        if (animDisabled) btn.title = 'Недоступно при включенном режиме "Без анимаций"';
        else btn.removeAttribute('title');
    });
}

function bindSettingsUIOnce() {
    // Checkboxes
    const bindCheckbox = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('change', (e) => {
            updateSetting(key, !!e.target.checked);

            // Keep UI consistent for dependent controls
            if (key === 'reduceMotion' || key === 'simpleMode' || key === 'showHints' || key === 'liveCheck') {
                syncSettingsUI();
            }
        });
    };

    bindCheckbox('settingAutoSpeak', 'autoSpeak');
    bindCheckbox('settingHaptics', 'haptics');
    bindCheckbox('settingReduceMotion', 'reduceMotion');
    bindCheckbox('settingSimpleMode', 'simpleMode');
    bindCheckbox('settingAutoAdvance', 'autoAdvance');
    bindCheckbox('settingAutoCheck', 'autoCheck');
    bindCheckbox('settingLiveCheck', 'liveCheck');
    bindCheckbox('settingShowHints', 'showHints');
    bindCheckbox('settingSoundEffects', 'soundEffects');
    bindCheckbox('settingConfetti', 'confetti');

    // Speech rate buttons
    const rateBtns = Array.from(document.querySelectorAll('.segment-btn[data-rate]'));
    rateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = parseFloat(btn.dataset.rate);
            updateSetting('speechRate', val);
            syncSettingsUI();
        });
    });

    // Daily goal buttons
    const goalBtns = Array.from(document.querySelectorAll('.segment-btn[data-goal]'));
    goalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = parseInt(btn.dataset.goal);
            updateSetting('dailyGoal', val);
            syncSettingsUI();
            updateStats();
        });
    });

    // Animation speed buttons
    const animBtns = Array.from(document.querySelectorAll('.segment-btn[data-anim-speed]'));
    animBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // If animations are disabled, speed controls must not work
            if (state.settings?.reduceMotion) return;

            const val = btn.dataset.animSpeed;
            updateSetting('animSpeed', val);
            syncSettingsUI();
        });
    });

    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('.theme-btn');
            if (target) setTheme(target.dataset.themeVal);
        });
    });

    // Export data button (bind once to avoid multiple downloads)
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportUserData();
            showToast('success', 'Данные экспортированы', 'Файл загружен');
        });
    }

    // Import data button
    const importBtn = document.getElementById('importDataBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const input = ensureImportInput();
            // allow selecting the same file twice
            input.value = '';
            input.click();
        });
    }
}

export function initSettingsUI() {
    if (!settingsBindingsInitialized) {
        bindSettingsUIOnce();
        settingsBindingsInitialized = true;
    }

    syncSettingsUI();
    initSettingsSwipe();
}

// ============ Settings Navigation ============

window.addEventListener('popstate', (event) => {
    if (!event.state) {
        closeSettingsInternal(true);
        return;
    }

    if (event.state.level === 1) {
        // Back from any sub-page to settings
        const subPages = document.querySelectorAll('.sub-page');
        subPages.forEach(p => p.classList.remove('active'));

        const settingsScreen = document.getElementById('settingsScreen');
        if (settingsScreen) {
            settingsScreen.classList.add('active');
            state.settingsOpen = true;
            updateControlsVisibility();
        }
    }
});

export function openSettings() {
    const settingsScreen = document.getElementById('settingsScreen');
    if (settingsScreen && !settingsScreen.classList.contains('active')) {
        history.pushState({ level: 1 }, '', '#settings');
        settingsScreen.classList.add('active');
        state.settingsOpen = true;
        updateStats();
        updateControlsVisibility();
        initSettingsUI(); // safe: idempotent now
    }
}

export function closeSettings() {
    if (history.state && history.state.level >= 1) {
        history.back();
    } else {
        closeSettingsInternal(true);
    }
}

function closeSettingsInternal(forceAll = false) {
    const settingsScreen = document.getElementById('settingsScreen');

    if (forceAll) {
        const subPages = document.querySelectorAll('.sub-page');
        subPages.forEach(p => p.classList.remove('active'));
    }

    if (settingsScreen) {
        settingsScreen.classList.remove('active');
        state.settingsOpen = false;
        updateControlsVisibility();
    }

    if (window.location.hash === '#settings' || window.location.hash.includes('#settings')) {
        if (!history.state) history.replaceState(null, '', window.location.pathname);
    }
}

export function openSubPage(pageId) {
    const page = document.getElementById(pageId);
    if (page) {
        history.pushState({ level: 2, pageId }, '', `#settings/${pageId}`);
        page.classList.add('active');
        updateStats();
    }
}

export function closeSubPage(pageId) {
    if (history.state && history.state.level === 2) {
        history.back();
    } else {
        closeSubPageInternal(pageId);
    }
}

function closeSubPageInternal(pageId) {
    const page = document.getElementById(pageId);
    if (page) page.classList.remove('active');
}

// ============ Swipe to Close ============

function initSettingsSwipe() {
    if (swipeListenersInitialized) return;
    swipeListenersInitialized = true;

    const settingsEl = document.getElementById('settingsScreen');
    addSwipeListener(settingsEl, () => {
        const activeSubPage = document.querySelector('.sub-page.active');
        if (activeSubPage) return;
        closeSettings();
    }, false);

    // Sub-pages: swipe back
    ['statsSubPage', 'topicResetSubPage'].forEach((id) => {
        const el = document.getElementById(id);
        addSwipeListener(el, () => {
            closeSubPage(id);
        }, true);
    });
}

function addSwipeListener(el, callback, exclusive = false) {
    if (!el) return;

    let touchStartX = 0;
    let touchStartY = 0;

    el.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        if (exclusive) {
            e.stopPropagation();
        }

        if (Math.abs(diffX) > Math.abs(diffY) && diffX > 80) {
            if (!exclusive) {
                e.stopPropagation();
            }
            callback();
        }
    }, { passive: true });
}
