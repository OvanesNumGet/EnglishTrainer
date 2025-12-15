import { handleTouchStart, handleTouchEnd } from '../../flashcards/index.js';
import { handleTestTouchStart, handleTestTouchEnd } from '../../test/swipe.js';

export function attachTouchEvents() {
  // Touch handlers
  const flashcardContainer = document.querySelector('.flashcard-container');
  if (flashcardContainer) {
    flashcardContainer.addEventListener('touchstart', handleTouchStart, false);
    flashcardContainer.addEventListener('touchend', handleTouchEnd, false);
  }

  const testContainer = document.getElementById('testCardContainer');
  if (testContainer) {
    testContainer.addEventListener('touchstart', handleTestTouchStart, false);
    testContainer.addEventListener('touchend', handleTestTouchEnd, false);
  }
}