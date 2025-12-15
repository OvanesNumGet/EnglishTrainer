import { state } from './store.js';
import { applyEffectiveSimpleMode } from './datasets.js';

function readBoolFromStorage(storageKey, defaultValue) {
    const raw = localStorage.getItem(storageKey);
    if (raw === null || raw === undefined) return defaultValue;
    try {
        // stored as JSON.stringify(boolean) for booleans in updateSetting()
        return !!JSON.parse(raw);
    } catch {
        // fallback for legacy "true"/"false"
        return raw === 'true';
    }
}

// Backward-compatible defaults for newly added settings
if (!state.settings) state.settings = {};
if (typeof state.settings.liveCheck === 'undefined') {
    state.settings.liveCheck = readBoolFromStorage('setting_liveCheck', true);
}

export function updateSetting(key, value) {
    state.settings[key] = value;

    localStorage.setItem(
        'setting_' + key,
        typeof value === 'boolean' ? JSON.stringify(value) : value.toString()
    );

    if (key === 'reduceMotion') {
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.toggle('reduce-motion', !!value);
        }
    }

    if (key === 'simpleMode') {
        // Apply effective mode (user setting OR dataset-forced mode)
        applyEffectiveSimpleMode();
    }

    if (key === 'showHints') {
        if (typeof document !== 'undefined') {
            document.querySelectorAll('.btn-hint').forEach(btn => {
                btn.style.display = value ? 'flex' : 'none';
            });
        }
    }

    if (key === 'animSpeed') {
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.style.setProperty(
                '--anim-multiplier',
                value === 'slow' ? '1.5' : value === 'fast' ? '0.5' : '1'
            );
        }
    }

    if (key === 'liveCheck') {
        // When disabling live-check, immediately remove live highlighting and messages.
        if (typeof document !== 'undefined') {
            const LIVE_INPUT_CLASSES = ['live-progress', 'live-ok', 'live-almost', 'live-mismatch'];
            const inputIds = ['testInfinitive', 'testPastSimple', 'testPastParticiple'];
            const feedbackIds = ['feedbackInfinitive', 'feedbackPastSimple', 'feedbackPastParticiple'];

            inputIds.forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.classList.remove(...LIVE_INPUT_CLASSES);
            });

            feedbackIds.forEach((id) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = '';
                    el.dataset.state = '';
                }
            });
        }
    }
}
