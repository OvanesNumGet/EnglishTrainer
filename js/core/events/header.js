import { onId } from './helpers.js';
import { openSettings } from '../../ui/index.js';

export function attachHeaderEvents() {
  onId('settingsToggle', 'click', openSettings);
}
