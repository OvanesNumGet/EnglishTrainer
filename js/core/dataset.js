import { datasets } from '../data.js';
import { state, getDatasetConfig, saveDatasetConfig } from '../state.js';
import { updateStats, updateControlsVisibility } from '../ui/index.js';
import { showFlashcard, buildCardOrder } from '../flashcards/index.js';
import { initTestMode, saveTestState } from '../test/index.js';
import { showToast } from '../utils.js';

// ============ Data Logic ============
export function loadDataset(name) {
    state.verbs = datasets[name] || datasets['verbs'];

    // 1. Simple Mode check
    if (name !== 'verbs') {
        document.body.classList.add('simple-mode');
        const labelInf = document.getElementById('labelInfinitive');
        const testLabelInf = document.getElementById('testLabelInfinitive');
        if (labelInf) labelInf.textContent = 'Word';
        if (testLabelInf) testLabelInf.textContent = 'Word';
    } else {
        document.body.classList.remove('simple-mode');
        const labelInf = document.getElementById('labelInfinitive');
        const testLabelInf = document.getElementById('testLabelInfinitive');
        if (labelInf) labelInf.textContent = 'Infinitive';
        if (testLabelInf) testLabelInf.textContent = 'Infinitive';
    }

    // 2. Reset Flashcards to All
    state.currentCategory = 'all';
    document.querySelectorAll('[data-category]').forEach(c => c.classList.remove('active'));
    const catAll = document.querySelector('[data-category="all"]');
    if (catAll) catAll.classList.add('active');

    state.currentCardIndex = 0;
    state.isCardShuffled = false;
    const shuffleBtn = document.getElementById('shuffleCards');
    if (shuffleBtn) shuffleBtn.classList.remove('btn-toggle-active');

    // 3. Load Saved Config for this Dataset (Direction + Category for Test)
    const savedConfig = getDatasetConfig(name);

    // Apply Direction
    state.isReverse = savedConfig.isReverse;
    const dirBtn = document.getElementById('directionToggle');
    if (dirBtn) dirBtn.classList.toggle('active', state.isReverse);

    // Apply Test Category
    state.currentTestCategory = savedConfig.category || 'all';
    document.querySelectorAll('[data-test-category]').forEach(c => c.classList.remove('active'));
    const testCatChip = document.querySelector(`[data-test-category="${state.currentTestCategory}"]`);
    if (testCatChip) testCatChip.classList.add('active');
    else {
        // Fallback
        state.currentTestCategory = 'all';
        const testCatAll = document.querySelector('[data-test-category="all"]');
        if (testCatAll) testCatAll.classList.add('active');
    }

    updateStats();

    // 4. Initialize Views
    buildCardOrder();
    showFlashcard(0);

    // 5. Initialize Test (Automatic start/restore)
    // Clear old test data first to be safe
    state.testVerbs = [];
    state.testOrder = []; // Clear order too
    initTestMode();

    updateControlsVisibility();
}

// ============ Direction UI ============
export function toggleDirection() {
    // 1. Save current test state for the *old* direction
    saveTestState();

    // 2. Switch
    state.isReverse = !state.isReverse;
    const btn = document.getElementById('directionToggle');
    if (btn) btn.classList.toggle('active', state.isReverse);

    // 3. Save new config to persistent storage for this dataset
    const datasetEl = document.getElementById('datasetSelect');
    if (datasetEl) {
        saveDatasetConfig(datasetEl.value, { isReverse: state.isReverse });
    }

    showToast('info', state.isReverse ? 'Режим: Английский → Русский' : 'Режим: Русский → Английский');

    // 4. Refresh Flashcards (just visual update)
    if (state.verbs && state.verbs.length > 0) {
        showFlashcard(state.currentCardIndex);
    }

    // 5. Switch Test Context (Load state for new direction or start new)
    initTestMode();
}
