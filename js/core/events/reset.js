import { onId } from './helpers.js';
import { resetProgress, state } from '../../state.js';
import { updateStats, closeSettings } from '../../ui/index.js';
import { loadDataset } from '../dataset.js';
import { showToast } from '../../utils.js';
import { datasets } from '../../data.js';

function safeStr(v) {
    if (v === null || v === undefined) return '';
    return String(v).trim();
}

function possibleStatKeys(datasetName, verbObj) {
    const dn = safeStr(datasetName);
    const rawBases = [
        verbObj?.id,
        verbObj?.key,
        verbObj?.infinitive,
        verbObj?.word,
        verbObj?.english,
        verbObj?.en,
        verbObj?.translation,
        verbObj?.ru,
        verbObj?.russian,
        verbObj?.term
    ].map(safeStr).filter(Boolean);

    const bases = Array.from(new Set(rawBases));
    const keys = new Set();

    bases.forEach((base) => {
        // IMPORTANT: current app stores verbStats by "base" (most often infinitive) WITHOUT dataset prefix
        keys.add(base);

        // Keep these for backward/experimental formats too
        if (dn) {
            keys.add(`${dn}:${base}`);
            keys.add(`${dn}::${base}`);
            keys.add(`${dn}_${base}`);
            keys.add(`${dn}__${base}`);
            keys.add(`${dn}|${base}`);
        }
    });

    return Array.from(keys);
}

function clearDatasetConfigForDataset(datasetName) {
    const dn = safeStr(datasetName);
    if (!dn) return false;

    if (state.datasetConfigs && typeof state.datasetConfigs === 'object') {
        if (Object.prototype.hasOwnProperty.call(state.datasetConfigs, dn)) {
            delete state.datasetConfigs[dn];
            localStorage.setItem('datasetConfigs', JSON.stringify(state.datasetConfigs));
            return true;
        }
    }
    return false;
}

/**
 * Clears ALL persisted test state for a dataset.
 * FIX: the real storage keys are "ivt_test_state_${dataset}_${category}_${isReverse}" (see src/js/test/storage.js)
 * The old implementation removed unrelated legacy prefixes, so saved answers stayed and got restored.
 */
function clearTestStorageForDataset(datasetName) {
    const dn = safeStr(datasetName);
    if (!dn) return 0;

    // Real/current key prefix used by the app
    const realPrefix = `ivt_test_state_${dn}_`;

    // Legacy/experimental prefixes (keep for backward safety)
    const legacyPrefixes = [
        'testState_',
        'testOrder_',
        'testResults_',
        'testHintUsed_',
        'testIndex_',
        'testMeta_'
    ];

    let removed = 0;

    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;

        const isReal = key.startsWith(realPrefix);

        const isLegacy =
            legacyPrefixes.some((p) => key.startsWith(p)) &&
            // legacy keys were not well-normalized, so we keep a broad match here
            key.includes(dn);

        if (isReal || isLegacy) {
            localStorage.removeItem(key);
            removed++;
        }
    }

    return removed;
}

function clearTestUIInputs() {
    // This is the user-visible bug: values stay in inputs even after topic reset.
    // We hard reset the UI fields and feedback so the screen becomes "clean" immediately.
    const inputIds = ['testInfinitive', 'testPastSimple', 'testPastParticiple'];
    const feedbackIds = ['feedbackInfinitive', 'feedbackPastSimple', 'feedbackPastParticiple'];

    // Classes used by live-check + common result styling (safe to remove even if not present)
    const classesToRemove = [
        'live-progress',
        'live-ok',
        'live-almost',
        'live-mismatch',
        'correct',
        'incorrect',
        'is-correct',
        'is-wrong'
    ];

    inputIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        el.classList.remove(...classesToRemove);
        try {
            el.dispatchEvent(new Event('input', { bubbles: true }));
        } catch {
            // ignore
        }
    });

    feedbackIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = '';
        if (el.dataset) el.dataset.state = '';
        el.classList.remove(...classesToRemove);
    });

    // Restore default test controls visibility (new question state)
    const checkBtn = document.getElementById('checkAnswer');
    const skipBtn = document.getElementById('skipTest');
    const nextBtn = document.getElementById('nextTest');
    const prevBtn = document.getElementById('prevTest');

    if (checkBtn) checkBtn.style.display = 'flex';
    if (skipBtn) skipBtn.style.display = 'flex';
    if (nextBtn) nextBtn.style.display = 'none';
    // At the beginning, prev is typically hidden
    if (prevBtn) prevBtn.style.display = 'none';
}

function resetDatasetProgress(datasetName) {
    const dn = safeStr(datasetName);
    if (!dn) return { removedStats: 0, removedTestKeys: 0, removedConfig: false };

    let removedStats = 0;

    // If verbStats is nested by datasetName, wipe that bucket (backward/experimental)
    if (state.verbStats && typeof state.verbStats === 'object' && state.verbStats[dn] && typeof state.verbStats[dn] === 'object') {
        delete state.verbStats[dn];
    }

    const list = (datasets && datasets[dn]) ? datasets[dn] : [];

    // Remove stats for every word in this dataset (current canonical format is verbStats[infinitive])
    if (Array.isArray(list) && state.verbStats && typeof state.verbStats === 'object') {
        list.forEach((v) => {
            const keys = possibleStatKeys(dn, v);

            keys.forEach((k) => {
                if (Object.prototype.hasOwnProperty.call(state.verbStats, k)) {
                    delete state.verbStats[k];
                    removedStats++;
                }

                // If verbStats is bucketed: verbStats[dn][k] (legacy/experimental)
                if (state.verbStats[dn] && typeof state.verbStats[dn] === 'object' && Object.prototype.hasOwnProperty.call(state.verbStats[dn], k)) {
                    delete state.verbStats[dn][k];
                    removedStats++;
                }
            });
        });
    }

    localStorage.setItem('verbStats', JSON.stringify(state.verbStats || {}));

    // Remove ALL test state keys for this dataset (fix)
    const removedTestKeys = clearTestStorageForDataset(dn);

    // Remove dataset-level config (direction/category etc.) so "language" resets too
    const removedConfig = clearDatasetConfigForDataset(dn);

    return { removedStats, removedTestKeys, removedConfig };
}

function buildResetTopicsList() {
    const listEl = document.getElementById('resetTopicsList');
    const datasetSelect = document.getElementById('datasetSelect');

    if (!listEl || !datasetSelect) return;

    const current = datasetSelect.value;
    const opts = Array.from(datasetSelect.options);

    listEl.innerHTML = '';

    opts.forEach((opt) => {
        const datasetName = opt.value;
        const label = (opt.textContent || '').trim() || datasetName;

        const total = Array.isArray(datasets?.[datasetName]) ? datasets[datasetName].length : null;
        const isCurrent = datasetName === current;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'settings-item danger reset-topic-item';
        btn.dataset.dataset = datasetName;

        // Confirm dialog (handled globally by initConfirmDialogs)
        btn.setAttribute('data-confirm', 'true');
        btn.setAttribute('data-confirm-variant', 'danger');
        btn.setAttribute('data-confirm-title', `Удалить данные темы «${label}»?`);
        btn.setAttribute(
            'data-confirm-message',
            'Будут очищены: статусы слов, прогресс/результаты теста (все категории и оба направления), настройки темы (язык/направление, выбранные категории) и введённые ответы.'
        );
        btn.setAttribute('data-confirm-confirm', 'Удалить');
        btn.setAttribute('data-confirm-cancel', 'Отмена');

        const smallParts = [];
        if (typeof total === 'number') smallParts.push(`Слов: ${total}`);
        if (isCurrent) smallParts.push('текущая');

        btn.innerHTML = `
      <div class="settings-item-left">
        <div class="settings-icon icon-red">
          <i data-lucide="trash-2" style="width:20px;height:20px"></i>
        </div>
        <div class="settings-text-col">
          <span>${label}</span>
          <small>${smallParts.join(' • ')}</small>
        </div>
      </div>
    `;

        listEl.appendChild(btn);
    });

    // Render lucide icons for dynamically created buttons
    try {
        if (globalThis.lucide && typeof globalThis.lucide.createIcons === 'function') {
            globalThis.lucide.createIcons();
        }
    } catch {
        // ignore
    }
}

export function attachResetEvents() {
    // Reset All Progress (confirm handled by modal via data-confirm)
    onId('resetDataBtn', 'click', () => {
        resetProgress();
        updateStats();

        const datasetEl = document.getElementById('datasetSelect');
        if (datasetEl) loadDataset(datasetEl.value);

        showToast('info', 'Прогресс сброшен');
        closeSettings();
    });

    // Build/manage the "reset topic" UI list
    buildResetTopicsList();

    // Keep "current" marker accurate if user changes dataset later
    const datasetEl = document.getElementById('datasetSelect');
    if (datasetEl) {
        datasetEl.addEventListener('change', () => buildResetTopicsList());
    }

    // Delegate clicks for topic reset items (confirm handled globally)
    const listEl = document.getElementById('resetTopicsList');
    if (listEl) {
        listEl.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('.reset-topic-item') : null;
            if (!btn) return;

            const datasetName = btn.dataset.dataset;
            const datasetSelectEl = document.getElementById('datasetSelect');
            const current = datasetSelectEl ? datasetSelectEl.value : state.currentDataset;

            // If the reset topic is currently open, immediately clear visible inputs too
            if (datasetName === current) {
                clearTestUIInputs();
            }

            resetDatasetProgress(datasetName);

            // If the reset topic is currently open in the app, reload it so UI updates immediately
            if (datasetName === current && datasetSelectEl) {
                // Extra safety: keep runtime consistent
                state.isTestShuffled = false;
                state.currentTestCategory = 'all';
                state.currentTestIndex = 0;
                state.testResults = [];
                state.hintUsed = {};
                state.testOrder = [];
                state.testVerbs = [];
                state.lastOrderedIndex = 0;

                loadDataset(current);
                updateStats();

                // Some render paths might not clear inputs reliably -> enforce clean UI after reload too
                clearTestUIInputs();
            }

            buildResetTopicsList();

            const label = btn.querySelector('.settings-text-col span')?.textContent?.trim() || datasetName;
            showToast('info', `Тема очищена`, `«${label}»`);
        });
    }

    // If the user opens the subpage multiple times, list should still be correct
    onId('openTopicReset', 'click', () => buildResetTopicsList());
}
