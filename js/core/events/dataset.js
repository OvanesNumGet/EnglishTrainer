import { onId } from './helpers.js';
import { loadDataset, toggleDirection } from '../dataset.js';
import { saveTestState } from '../../test/index.js';

export function attachDatasetEvents() {
  // Dataset Select
  onId('datasetSelect', 'change', (e) => {
    const newDataset = e.target.value;

    // BUG FIX: Retrieve the dataset we are navigating AWAY from
    const oldDataset = localStorage.getItem('lastDataset');

    // Save current test state specifically to the OLD dataset key
    if (oldDataset) {
      saveTestState(oldDataset);
    }

    localStorage.setItem('lastDataset', newDataset);
    loadDataset(newDataset);
  });

  // Direction toggle lives in header but is dataset-related behavior
  onId('directionToggle', 'click', toggleDirection);
}
