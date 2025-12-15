import { state } from '../state/store.js';

// ============ Haptic Feedback ============
export function vibrate(pattern) {
  if (state.settings && !state.settings.haptics) return;
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}