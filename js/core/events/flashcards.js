import { onId, onAll } from './helpers.js';
import { navigateFlashcard, toggleShuffleCards, flipCard } from '../../flashcards/index.js';
import { speak } from '../../utils.js';

export function attachFlashcardsEvents() {
  // Flashcard Controls
  onId('prevCard', 'click', () => navigateFlashcard('prev'));
  onId('nextCard', 'click', () => navigateFlashcard('next'));
  onId('shuffleCards', 'click', toggleShuffleCards);

  // Flashcard Interaction
  onId('flashcard', 'click', (e) => {
    const formRow = e.target.closest('.form-row');
    if (formRow) {
      const btn = formRow.querySelector('.btn-speak');
      if (btn && btn.dataset.textId) {
        const textEl = document.getElementById(btn.dataset.textId);
        const text = textEl ? textEl.textContent : '';
        if (text) speak(text);
      }
    } else if (!e.target.closest('.btn-speak')) {
      flipCard();
    }
  });

  // Speak buttons (explicit)
  onAll('.btn-speak[data-text-id]', 'click', (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const textId = btn.dataset.textId;
    const textEl = document.getElementById(textId);
    const text = textEl ? textEl.textContent : '';
    if (text) speak(text);
  });
}