import { onAll } from './helpers.js';
import { state, saveDatasetConfig } from '../../state.js';
import { buildCardOrder, showFlashcard } from '../../flashcards/index.js';
import { initTestMode, saveTestState } from '../../test/index.js';

export function attachCategoriesEvents() {
  // Category switching for flashcards
  onAll('[data-category]', 'click', function () {
    document.querySelectorAll('[data-category]').forEach((c) => c.classList.remove('active'));
    this.classList.add('active');

    state.currentCategory = this.dataset.category;
    state.currentCardIndex = 0;

    buildCardOrder();
    showFlashcard(0);
  });

  // Category switching for test
  onAll('[data-test-category]', 'click', function () {
    const newCategory = this.dataset.testCategory;
    if (state.currentTestCategory === newCategory) return;

    // 1. Save old category state
    saveTestState();

    // 2. Set new category
    document.querySelectorAll('[data-test-category]').forEach((c) => c.classList.remove('active'));
    this.classList.add('active');
    state.currentTestCategory = newCategory;

    // 3. Persist this as the active category for this dataset
    const datasetEl = document.getElementById('datasetSelect');
    if (datasetEl) {
      saveDatasetConfig(datasetEl.value, { category: newCategory });
    }

    // 4. Initialize test (Restore or New)
    initTestMode();
  });
}
