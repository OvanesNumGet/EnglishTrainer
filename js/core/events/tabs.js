import { onAll } from './helpers.js';
import { state } from '../../state.js';
import { closeSettings, updateControlsVisibility } from '../../ui/index.js';

export function attachTabsEvents() {
  // Tab switching
  onAll('.tab', 'click', function () {
    localStorage.setItem('lastTab', this.dataset.tab);
    if (state.settingsOpen) closeSettings();

    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));

    this.classList.add('active');

    const screen = document.getElementById(this.dataset.tab);
    if (screen) screen.classList.add('active');

    updateControlsVisibility();
  });
}
