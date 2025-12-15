import { state, getVerbList } from '../state.js';
import { showToast, animateElement } from '../utils.js';
import { showFlashcard, resetFlipInstantlyIfNeeded } from './render.js';

export function buildCardOrder() {
    const list = getVerbList(state.currentCategory);
    state.cardOrder = list.map((_, i) => i);
    if (state.isCardShuffled) {
        for (let i = state.cardOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.cardOrder[i], state.cardOrder[j]] = [state.cardOrder[j], state.cardOrder[i]];
        }
    }
}

// Wrapper for animation
export function navigateFlashcard(direction) {
    const verbList = getVerbList(state.currentCategory);
    // Don't navigate if list is empty
    if (verbList.length === 0) return;

    const newIndex = direction === 'next' ? state.currentCardIndex + 1 : state.currentCardIndex - 1;
    // Bounds check
    if (state.cardOrder && (newIndex < 0 || newIndex >= state.cardOrder.length)) return;

    // Critical fix: if card is flipped, reset instantly WITHOUT flip animation.
    resetFlipInstantlyIfNeeded();

    animateElement('flashcard', direction, () => {
        showFlashcard(newIndex);
    });
}

export function toggleShuffleCards() {
    const verbList = getVerbList(state.currentCategory);
    if (verbList.length === 0) return;

    state.isCardShuffled = !state.isCardShuffled;
    buildCardOrder();

    const btn = document.getElementById('shuffleCards');
    btn.classList.toggle('btn-toggle-active', state.isCardShuffled);

    state.currentCardIndex = 0;
    showFlashcard(0);

    showToast('info', state.isCardShuffled ? 'Перемешано' : 'По порядку');
}
