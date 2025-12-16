import { state, getVerbList, getVerbStatus } from '../state.js';
import { speak } from '../utils.js';

function getAnimMultiplier() {
    return state.settings?.animSpeed === 'slow'
        ? 1.5
        : state.settings?.animSpeed === 'fast'
            ? 0.5
            : 1;
}

/**
 * When navigating between cards we must NOT run flip animation.
 * Otherwise you can see the mirrored/old word on the back face during the transition.
 */
export function resetFlipInstantlyIfNeeded() {
    if (!state.isFlipped) return;

    const cardEl = document.getElementById('flashcard');
    state.isFlipped = false;

    if (!cardEl) return;

    // Disable transition just for the flip reset
    const prevTransition = cardEl.style.transition;
    cardEl.style.transition = 'none';
    cardEl.classList.remove('flipped');

    // Force reflow so the browser applies "no transition" before restoring
    // eslint-disable-next-line no-unused-expressions
    cardEl.offsetHeight;

    cardEl.style.transition = prevTransition;
}

export function showFlashcard(index) {
    const verbList = getVerbList(state.currentCategory);
    const translationEl = document.getElementById('flashcardTranslation');
    const statusEl = document.getElementById('verbStatus');
    const hintEl = document.querySelector('.flashcard-hint');

    if (verbList.length === 0) {
        translationEl.textContent = state.currentCategory === 'hard' ? 'Нет сложных слов!' :
            state.currentCategory === 'progress' ? 'Нет слов в процессе!' : 'Нет слов';

        document.getElementById('cardCounter').textContent = '0 / 0';

        // Hide interactivity elements for empty state
        if (statusEl) statusEl.style.display = 'none';
        if (hintEl) hintEl.style.display = 'none';

        // Ensure not flipped
        if (state.isFlipped) {
            const el = document.getElementById('flashcard');
            if (el) el.classList.remove('flipped');
            state.isFlipped = false;
        }
        return;
    }

    // Show elements if not empty
    if (statusEl) statusEl.style.display = 'block';
    if (hintEl) hintEl.style.display = 'flex';

    // Safety check if order isn't built yet
    if (!state.cardOrder || state.cardOrder.length !== verbList.length) {
        // This circular dependency (render -> logic -> render) is avoided 
        // by assuming logic calls buildCardOrder before render, or we handle it in logic.
        // However, if we must, we just map 1:1 temporarily.
        state.cardOrder = verbList.map((_, i) => i);
    }

    state.currentCardIndex = Math.max(0, Math.min(index, state.cardOrder.length - 1));

    const updateContent = () => {
        const mappedIndex = state.cardOrder[state.currentCardIndex];
        const verb = verbList[mappedIndex];

        if (!state.isReverse) {
            // RU -> EN (Standard)
            translationEl.textContent = verb.translation;
            document.getElementById('verbEnglish').textContent = verb.infinitive;
        } else {
            // EN -> RU (Reverse)
            translationEl.textContent = verb.infinitive;
            document.getElementById('verbEnglish').textContent = verb.translation;
        }

        // Always show English forms in details for reference
        document.getElementById('infinitive').textContent = verb.infinitive;
        document.getElementById('pastSimple').textContent = verb.pastSimple;
        document.getElementById('pastParticiple').textContent = verb.pastParticiple;
        document.getElementById('exampleSentence').innerHTML =
            `<i data-lucide="message-square" class="example-icon" style="width:18px;height:18px"></i><span>${verb.example}</span>`;

        try {
            if (globalThis.lucide && typeof globalThis.lucide.createIcons === 'function') {
                globalThis.lucide.createIcons();
            }
        } catch (e) {
            // ignore
        }

        const status = getVerbStatus(verb.infinitive);
        statusEl.className = 'verb-status ' + status;
        statusEl.style.display = 'block'; // Ensure visible

        document.getElementById('cardCounter').textContent = `${state.currentCardIndex + 1} / ${state.cardOrder.length}`;
    };

    if (state.isFlipped) {
        document.getElementById('flashcard').classList.remove('flipped');
        state.isFlipped = false;

        // If reduce motion is enabled, swap content immediately.
        // Otherwise wait for halfway flip (scaled with animation speed).
        const delay = state.settings?.reduceMotion ? 0 : Math.round(300 * getAnimMultiplier());
        setTimeout(updateContent, delay);
    } else {
        updateContent();
    }
}

export function flipCard() {
    // Prevent flipping if empty list
    const verbList = getVerbList(state.currentCategory);
    if (verbList.length === 0) return;

    state.isFlipped = !state.isFlipped;
    document.getElementById('flashcard').classList.toggle('flipped', state.isFlipped);

    if (state.isFlipped) {
        const mappedIndex = state.cardOrder[state.currentCardIndex];
        const verb = verbList[mappedIndex];

        // Auto Speak Check
        if (state.settings.autoSpeak) {
            // Speak the word on the back of the card
            const text = state.isReverse ? verb.translation : verb.infinitive;
            speak(text);
        }
    }
}
