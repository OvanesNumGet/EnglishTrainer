import { onId } from './helpers.js';
import { toggleFocusMode, setFocusMode } from '../../ui/focusMode.js';

export function attachFocusModeEvents() {
  onId('focusModeToggleFlashcards', 'click', (e) => {
    e.preventDefault();
    toggleFocusMode();
  });

  onId('focusModeToggleTest', 'click', (e) => {
    e.preventDefault();
    toggleFocusMode();
  });
}
