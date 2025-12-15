import { onAll } from './helpers.js';
import { state } from '../../state.js';
import { updateStats } from '../../ui/index.js';

export function attachStatsEvents() {
  onAll('.perf-range-btn', 'click', (e) => {
    const btn = e.currentTarget;
    const range = btn?.dataset?.range;
    if (!range) return;

    state.statsPerfRange = range;
    localStorage.setItem('statsPerfRange', range);

    // Re-render stats (pie + chart + active states)
    updateStats();
  });
}