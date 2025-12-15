import { navigateFlashcard } from './logic.js';

let touchStartX = 0;
let touchEndX = 0;

export function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

export function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}

function handleSwipe() {
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
        if (diff > 0) {
            navigateFlashcard('next');
        } else {
            navigateFlashcard('prev');
        }
    }
}
