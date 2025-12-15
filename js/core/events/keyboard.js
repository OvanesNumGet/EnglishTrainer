import { isShown, isTextInputTarget } from './helpers.js';
import { closeSettings } from '../../ui/index.js';
import { navigateFlashcard, flipCard } from '../../flashcards/index.js';
import { navigateTest, skipQuestion } from '../../test/index.js';
import { isFocusModeEnabled, exitFocusMode } from '../../ui/focusMode.js';

export function attachKeyboardEvents() {
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const flashcardsScreen = document.getElementById('flashcards');
        const testScreen = document.getElementById('test');
        const settingsScreen = document.getElementById('settingsScreen');

        if (!flashcardsScreen || !testScreen) return;

        if (settingsScreen && settingsScreen.classList.contains('active')) {
            if (e.key === 'Escape') closeSettings();
            return;
        }

        // Focus mode: Esc exits focus mode (unless settings open, handled above)
        if (e.key === 'Escape' && isFocusModeEnabled()) {
            e.preventDefault();
            exitFocusMode();
            return;
        }

        const flashcardsActive = flashcardsScreen.classList.contains('active');
        const testActive = testScreen.classList.contains('active');

        if (flashcardsActive && !isTextInputTarget(e.target)) {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigateFlashcard('next');
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateFlashcard('prev');
            } else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                flipCard();
            }
            return;
        }

        if (testActive) {
            const nextBtn = document.getElementById('nextTest');
            const skipBtn = document.getElementById('skipTest');
            const prevBtn = document.getElementById('prevTest');

            if (e.key === 'Enter') {
                if (isShown(nextBtn)) {
                    e.preventDefault();
                    navigateTest('next', true);
                }
            } else if (e.key === 'ArrowRight' && !isTextInputTarget(e.target)) {
                if (isShown(nextBtn)) navigateTest('next', false);
                else if (isShown(skipBtn)) skipQuestion();
            } else if (e.key === 'ArrowLeft' && !isTextInputTarget(e.target)) {
                if (isShown(prevBtn)) navigateTest('prev', false);
            }
        }
    });
}
