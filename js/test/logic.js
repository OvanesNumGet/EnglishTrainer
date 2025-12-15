import { state, getVerbList, updateVerbStats, updateStreak, addXP } from '../state.js';
// Updated import path
import { updateStats } from '../ui/index.js';
import { showToast, vibrate, launchConfetti, animateElement } from '../utils.js';
import { saveTestState, restoreTestState, clearTestState, getDatasetName, getCurrentVerbObj, getCurrentResult } from './storage.js';
import { showTestQuestion, showTestResult, renderEmptyState } from './render.js';

// ============ Logic ============

let autoAdvanceTimeout = null;

function clearAutoAdvanceTimer() {
    if (autoAdvanceTimeout) {
        clearTimeout(autoAdvanceTimeout);
        autoAdvanceTimeout = null;
    }
}

function getAnimMultiplier() {
    return state.settings?.animSpeed === 'slow'
        ? 1.5
        : state.settings?.animSpeed === 'fast'
            ? 0.5
            : 1;
}

function notifyQuestionChanged() {
    try {
        document.dispatchEvent(new CustomEvent('test:question-changed'));
    } catch {
        // ignore (older environments)
    }
}

function notifyAnswerChecked() {
    try {
        document.dispatchEvent(new CustomEvent('test:answer-checked'));
    } catch {
        // ignore
    }
}

export function initTestMode() {
    clearAutoAdvanceTimer();

    const dataset = getDatasetName();
    const category = state.currentTestCategory;
    const isReverse = state.isReverse;

    // Try restore
    if (restoreTestState(dataset, category, isReverse)) {
        showTestQuestion(state.currentTestIndex, false);
        notifyQuestionChanged();
    } else {
        generateNewTest();
    }
}

function generateNewTest() {
    clearAutoAdvanceTimer();

    const baseList = getVerbList(state.currentTestCategory);

    // Always keep verbs ordered in memory
    state.testVerbs = baseList.map(v => ({ ...v }));

    // Generate natural order [0, 1, 2...]
    state.testOrder = state.testVerbs.map((_, i) => i);

    // If shuffled flag is active, shuffle the Order array
    if (state.isTestShuffled) {
        shuffleOrderArray(state.testOrder);
    }

    state.currentTestIndex = 0;
    state.testResults = []; // Results are sparse array indexed by Original ID
    state.hintUsed = {};
    state.lastOrderedIndex = 0; // Reset ordered marker

    const shuffleBtn = document.getElementById('shuffleTest');
    if (shuffleBtn) shuffleBtn.classList.toggle('btn-toggle-active', state.isTestShuffled);

    if (state.testVerbs.length === 0) {
        renderEmptyState();
        notifyQuestionChanged();
        return;
    }

    saveTestState();
    showTestQuestion(0, false);
    notifyQuestionChanged();
}

function shuffleOrderArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function navigateTest(direction, shouldFocus = false) {
    clearAutoAdvanceTimer();

    if (!state.testVerbs.length) return;

    const newIndex = direction === 'next' ? state.currentTestIndex + 1 : state.currentTestIndex - 1;

    if (newIndex < 0 || newIndex >= state.testVerbs.length) {
        if (direction === 'next') finishTest();
        return;
    }

    animateElement('testCardContainer', direction, () => {
        showTestQuestion(newIndex, shouldFocus);
        notifyQuestionChanged();
    });
}

// Normalization for flexible checking
function normalize(str) {
    // Replace anything that is NOT a letter (Ru/En) or Number with a space
    // Then collapse multiple spaces to one and trim
    return str.replace(/[^a-zA-Zа-яА-ЯёЁ0-9]+/g, ' ').trim().toLowerCase();
}

function checkVariants(answer, correct) {
    if (!correct) return false;
    const normAnswer = normalize(answer);
    const variants = correct.split('/').map(v => normalize(v));
    return variants.some(v => normAnswer === v);
}

export function checkAnswer() {
    clearAutoAdvanceTimer();

    const verb = getCurrentVerbObj();
    if (!verb) return;

    // FIX: prevent double notifications / double-check when the same question
    // gets checked twice (e.g. live auto-check + button/Enter).
    const existing = getCurrentResult();
    if (existing && !existing.skipped) return;

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };

    const answers = {
        infinitive: getVal('testInfinitive'),
        pastSimple: getVal('testPastSimple'),
        pastParticiple: getVal('testPastParticiple')
    };

    const isSimple = document.body.classList.contains('simple-mode');

    let correctInfCheck;
    if (state.isReverse) {
        correctInfCheck = checkVariants(answers.infinitive, verb.translation);
    } else {
        correctInfCheck = checkVariants(answers.infinitive, verb.infinitive);
    }

    const correct = {
        infinitive: correctInfCheck,
        pastSimple: isSimple ? true : checkVariants(answers.pastSimple, verb.pastSimple),
        pastParticiple: isSimple ? true : checkVariants(answers.pastParticiple, verb.pastParticiple)
    };

    const allCorrect = correct.infinitive && correct.pastSimple && correct.pastParticiple;

    // Save result at the ORIGINAL index
    const actualIndex = state.testOrder[state.currentTestIndex];
    state.testResults[actualIndex] = {
        verb: verb,
        answers: answers,
        correct: correct,
        allCorrect: allCorrect,
        skipped: false
    };

    updateVerbStats(verb.infinitive, allCorrect);

    if (!allCorrect) {
        let rightAnswer = isSimple ? verb.infinitive : verb.pastSimple;
        if (state.isReverse && isSimple) rightAnswer = verb.translation;
        vibrate([100, 50, 100]);
        showToast('error', 'Неправильно', `Правильно: ${rightAnswer}`);
        updateStreak(false);
    } else {
        vibrate(50);
        addXP(10);
        if (state.streak % 5 === 0 && state.streak > 0) {
            showToast('success', `${state.streak} правильных подряд!`, '+20 XP бонус');
            addXP(20);
            launchConfetti();
        } else {
            showToast('success', 'Правильно!', '+10 XP');
        }
        updateStreak(true);
    }

    showTestResult(state.currentTestIndex);
    updateStats();
    saveTestState();

    // Tell live-validation to stop and reset its visuals (final .correct/.incorrect take over)
    notifyAnswerChecked();

    document.getElementById('checkAnswer').style.display = 'none';
    document.getElementById('skipTest').style.display = 'none';
    document.getElementById('nextTest').style.display = 'flex';
    document.getElementById('nextTest').focus();

    // Auto-advance after a fully correct answer (setting: Авто-переход)
    if (allCorrect && state.settings?.autoAdvance) {
        const delay = state.settings?.reduceMotion ? 0 : Math.round(550 * getAnimMultiplier());
        autoAdvanceTimeout = window.setTimeout(() => {
            autoAdvanceTimeout = null;
            navigateTest('next', true);
        }, delay);
    }
}

export function skipQuestion() {
    navigateTest('next', false);
}

export function finishTest() {
    clearAutoAdvanceTimer();

    // Count results based on testResults array keys that exist
    const answeredCount = state.testResults.filter(r => r).length;
    const correctCount = state.testResults.filter(r => r && r.allCorrect).length;
    const percentage = Math.round((correctCount / state.testVerbs.length) * 100);

    if (percentage === 100) {
        launchConfetti();
        showToast('success', 'Идеальный результат!', 'Все ответы верны!');
        addXP(50);
    } else if (percentage >= 80) {
        showToast('success', 'Отлично!', `${percentage}% правильных ответов`);
        addXP(30);
    } else {
        showToast('info', 'Тест завершен', `${correctCount} из ${state.testVerbs.length} правильно`);
    }

    updateStats();

    clearTestState();
    generateNewTest();
}

export function showHint(form) {
    const verb = getCurrentVerbObj();
    if (!verb) return;

    const inputId = 'test' + form.charAt(0).toUpperCase() + form.slice(1);
    const input = document.getElementById(inputId);
    const correctAnswer = verb[form].split('/')[0].trim();
    const currentValue = input.value;
    const nextLetter = correctAnswer.substring(0, currentValue.length + 1);

    input.value = nextLetter;
    // Trigger live validation visuals immediately
    try {
        input.dispatchEvent(new Event('input', { bubbles: true }));
    } catch {
        // ignore
    }

    state.hintUsed[form] = true;
    vibrate(30);
}

export function toggleShuffleTest() {
    state.isTestShuffled = !state.isTestShuffled;
    document.getElementById('shuffleTest').classList.toggle('btn-toggle-active', state.isTestShuffled);

    if (state.isTestShuffled) {
        // --- Enabling Shuffle ---
        // 1. Save the current spot (this is our place in the ordered list)
        state.lastOrderedIndex = state.currentTestIndex;

        // 2. Shuffle the order
        shuffleOrderArray(state.testOrder);

        // 3. Start shuffle mode from the beginning (per user request)
        state.currentTestIndex = 0;

        showToast('info', 'Вопросы перемешаны');
    } else {
        // --- Disabling Shuffle ---
        // 1. Restore natural order [0, 1, 2...]
        state.testOrder = state.testVerbs.map((_, i) => i);

        // 2. Restore the spot where we were before shuffling
        state.currentTestIndex = state.lastOrderedIndex || 0;

        showToast('info', 'Вопросы по порядку');
    }

    saveTestState();
    showTestQuestion(state.currentTestIndex, false);
    notifyQuestionChanged();
}

export function resetCurrentDataset() {
    const dataset = getDatasetName();
    // Clear storage for ALL categories in this dataset to be safe
    ['all', 'hard', 'progress'].forEach(cat => {
        clearTestState(dataset, cat, false);
        clearTestState(dataset, cat, true); // both directions
    });

    // Also clear verb stats for words belonging to this dataset
    state.verbs.forEach(v => {
        if (state.verbStats[v.infinitive]) {
            delete state.verbStats[v.infinitive];
        }
    });
    localStorage.setItem('verbStats', JSON.stringify(state.verbStats));
}
