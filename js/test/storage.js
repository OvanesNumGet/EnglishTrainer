import { state, getVerbList } from '../state.js';

// ============ Helpers ============
export function getDatasetName() {
    const el = document.getElementById('datasetSelect');
    return el ? el.value : 'verbs';
}

// Generate unique key per dataset AND category AND direction
function getStorageKey(dataset, category, isReverse) {
    return `ivt_test_state_${dataset}_${category}_${isReverse}`;
}

// ============ State Accessors ============

// Get the actual verb object based on current step and shuffle state
export function getCurrentVerbObj() {
    if (!state.testVerbs || !state.testVerbs.length) return null;
    const actualIndex = state.testOrder[state.currentTestIndex];
    return state.testVerbs[actualIndex];
}

// Get the result for the current step (mapped via order)
export function getCurrentResult() {
    if (!state.testResults) return null;
    const actualIndex = state.testOrder[state.currentTestIndex];
    return state.testResults[actualIndex];
}

// ============ Persistence ============

export function saveTestState(datasetNameOverride = null) {
    // Don't save if test hasn't started
    if (!state.testVerbs || state.testVerbs.length === 0) return;

    const saveData = {
        // We DON'T save verbs content, just the fact we initialized
        // We save the Results keyed by original Index
        testResults: state.testResults,
        currentTestIndex: state.currentTestIndex,
        isTestShuffled: state.isTestShuffled,
        testOrder: state.testOrder, // Save the shuffled order
        lastOrderedIndex: state.lastOrderedIndex || 0 // Save where we left off in ordered mode
    };

    const datasetName = datasetNameOverride || getDatasetName();
    const key = getStorageKey(datasetName, state.currentTestCategory, state.isReverse);
    localStorage.setItem(key, JSON.stringify(saveData));
}

export function restoreTestState(datasetName, category, isReverse) {
    const key = getStorageKey(datasetName, category, isReverse);
    const saved = localStorage.getItem(key);

    if (!saved) return false;

    try {
        const data = JSON.parse(saved);
        state.testResults = data.testResults || [];
        state.currentTestIndex = data.currentTestIndex || 0;
        state.isTestShuffled = data.isTestShuffled || false;
        state.testOrder = data.testOrder || [];
        state.lastOrderedIndex = data.lastOrderedIndex || 0;

        // Check integrity of testOrder vs current list size
        const currentList = getVerbList(category);
        if (state.testOrder.length !== currentList.length) {
            return false; // List changed, force regen
        }

        // Restore verbs array (ordered)
        state.testVerbs = currentList.map(v => ({ ...v }));

        const shuffleBtn = document.getElementById('shuffleTest');
        if (shuffleBtn) shuffleBtn.classList.toggle('btn-toggle-active', state.isTestShuffled);

        return true;
    } catch (e) {
        console.error('Error restoring test state', e);
        return false;
    }
}

export function clearTestState(datasetName, category, isReverse) {
    const dataset = datasetName || getDatasetName();
    const cat = category || state.currentTestCategory;
    const rev = isReverse !== undefined ? isReverse : state.isReverse;

    const key = getStorageKey(dataset, cat, rev);
    localStorage.removeItem(key);
}
