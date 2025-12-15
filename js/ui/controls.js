import { state } from '../state.js';

export function updateControlsVisibility() {
    const flashcardsActive = document.getElementById('flashcards').classList.contains('active');
    const settingsOpen = document.getElementById('settingsScreen') && document.getElementById('settingsScreen').classList.contains('active');
    const testActive = document.getElementById('test') && document.getElementById('test').classList.contains('active');

    const flashControls = document.getElementById('flashcardControls');
    const testControls = document.querySelector('.test-controls');

    if (settingsOpen) {
        if (flashControls) flashControls.style.display = 'none';
        if (testControls) testControls.style.display = 'none';
        return;
    }

    if (flashcardsActive) {
        if (flashControls) flashControls.style.display = 'flex';
        if (testControls) testControls.style.display = 'none';
    } else if (testActive) {
        if (flashControls) flashControls.style.display = 'none';
        if (testControls) testControls.style.display = 'flex';
    }
}
