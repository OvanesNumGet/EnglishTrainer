import { state } from '../state/store.js';

export function getAnimMultiplier() {
  return state.settings?.animSpeed === 'slow'
    ? 1.5
    : state.settings?.animSpeed === 'fast'
      ? 0.5
      : 1;
}