import { state } from '../state/store.js';
import { getAnimMultiplier } from './animSpeed.js';

// ============ Animation Helper ============
export function animateElement(elementId, direction, updateCallback) {
  const el = document.getElementById(elementId);
  if (!el) {
    if (updateCallback) updateCallback();
    return;
  }

  if (state.settings?.reduceMotion) {
    if (updateCallback) updateCallback();
    return;
  }

  const multiplier = getAnimMultiplier();
  const duration = Math.round(200 * multiplier);

  // Let CSS animation classes read duration from variable (element overrides root)
  el.style.setProperty('--nav-anim-duration', `${duration}ms`);

  const outClass = direction === 'next' ? 'anim-slide-out-left' : 'anim-slide-out-right';
  const inClass = direction === 'next' ? 'anim-slide-in-right' : 'anim-slide-in-left';

  el.classList.add(outClass);

  setTimeout(() => {
    if (updateCallback) updateCallback();
    el.classList.remove(outClass);
    el.classList.add(inClass);
    setTimeout(() => el.classList.remove(inClass), duration);
  }, duration);
}
