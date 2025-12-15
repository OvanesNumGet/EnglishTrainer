import { state } from '../state.js';

const BODY_CLASS = 'focus-mode';

// In focus mode we temporarily disable confetti without touching user's setting in storage
let prevConfettiSetting = null;

let popstateInstalled = false;

function safeCreateIcons() {
    try {
        if (globalThis.lucide && typeof globalThis.lucide.createIcons === 'function') {
            globalThis.lucide.createIcons();
        }
    } catch {
        // ignore
    }
}

export function isFocusModeEnabled() {
    return !!document.body?.classList.contains(BODY_CLASS);
}

function syncFocusHiddenAccessibility(enabled) {
    const blocks = document.querySelectorAll('.focus-hide');
    blocks.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        // Prevent focus/tabbing into hidden areas when supported
        try {
            el.inert = !!enabled;
        } catch {
            // inert not supported everywhere
        }

        // Screen readers: hide the non-essential UI
        el.setAttribute('aria-hidden', enabled ? 'true' : 'false');
    });
}

export function updateFocusModeButtons() {
    const active = isFocusModeEnabled();

    const btns = [
        document.getElementById('focusModeToggleFlashcards'),
        document.getElementById('focusModeToggleTest')
    ].filter(Boolean);

    btns.forEach((btn) => {
        btn.classList.toggle('btn-toggle-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.setAttribute('aria-label', active ? 'Выйти из режима фокусировки' : 'Включить режим фокусировки');
        btn.title = active ? 'Выйти из фокусировки (Esc / Назад)' : 'Режим фокусировки';

        btn.innerHTML = active
            ? `<i data-lucide="minimize-2" style="width:18px;height:18px"></i>`
            : `<i data-lucide="maximize-2" style="width:18px;height:18px"></i>`;
    });

    safeCreateIcons();
}

/**
 * Low-level setter.
 * Options:
 * - skipHistory: do not push/alter history (used for popstate sync)
 * - pushHistory: when enabling, push a history entry so Back closes focus mode
 */
export function setFocusMode(enabled, opts = {}) {
    const next = !!enabled;
    const { skipHistory = false, pushHistory = true } = opts;

    // Don't mix with modal open state (safety): keep working but avoid weird focus traps
    if (document.body.classList.contains('modal-open') && next) return;

    // If enabling and we want "Back" to close it, register a history entry
    if (next && !skipHistory && pushHistory) {
        const cur = history.state || null;
        if (!cur || !cur.focusMode) {
            history.pushState({ ...(cur || {}), focusMode: true }, '');
        }
    }

    document.body.classList.toggle(BODY_CLASS, next);

    // Focus-mode overrides
    if (next) {
        // disable confetti while in focus mode
        if (prevConfettiSetting === null) prevConfettiSetting = !!state.settings?.confetti;
        if (state.settings) state.settings.confetti = false;
    } else {
        // restore confetti setting
        if (prevConfettiSetting !== null) {
            if (state.settings) state.settings.confetti = prevConfettiSetting;
            prevConfettiSetting = null;
        }
    }

    // Accessibility & focus safety
    syncFocusHiddenAccessibility(next);

    // If current focus is inside something we hide -> blur it
    if (next) {
        const a = document.activeElement;
        if (a && a instanceof HTMLElement) {
            const hiddenParent = a.closest('.focus-hide');
            if (hiddenParent) a.blur();
        }
    }

    // Keep state usage minimal; but if future logic needs it, it's here:
    state.focusMode = next;

    updateFocusModeButtons();
}

export function enterFocusMode() {
    setFocusMode(true, { skipHistory: false, pushHistory: true });
}

export function exitFocusMode() {
    // If we have a focus-mode history entry on top, go back.
    // popstate handler will actually turn focus-mode off.
    if (history.state && history.state.focusMode) {
        history.back();
        return;
    }
    // Fallback (should be rare)
    setFocusMode(false, { skipHistory: true });
}

export function toggleFocusMode() {
    if (isFocusModeEnabled()) exitFocusMode();
    else enterFocusMode();
}

function installPopstateHandlerOnce() {
    if (popstateInstalled) return;
    popstateInstalled = true;

    window.addEventListener('popstate', (event) => {
        const shouldBeOn = !!event.state?.focusMode;

        // Sync UI with history state
        if (shouldBeOn && !isFocusModeEnabled()) {
            setFocusMode(true, { skipHistory: true, pushHistory: false });
        } else if (!shouldBeOn && isFocusModeEnabled()) {
            setFocusMode(false, { skipHistory: true, pushHistory: false });
        }
    });
}

export function initFocusModeUI() {
    installPopstateHandlerOnce();

    // default: OFF on load
    document.body.classList.remove(BODY_CLASS);
    syncFocusHiddenAccessibility(false);
    state.focusMode = false;
    prevConfettiSetting = null;
    updateFocusModeButtons();
}
