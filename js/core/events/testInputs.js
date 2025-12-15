import { isShown } from './helpers.js';
import { navigateTest, checkAnswer } from '../../test/index.js';
import { state } from '../../state.js';
import { getCurrentVerbObj } from '../../test/storage.js';

const LIVE_INPUT_CLASSES = ['live-progress', 'live-ok', 'live-almost', 'live-mismatch'];

function isLiveCheckEnabled() {
    // Default: enabled (backward compatible)
    return state.settings?.liveCheck !== false;
}

/**
 * Normalize for matching (same spirit as checkAnswer logic):
 * - keep letters (Ru/En) and digits
 * - collapse other chars to spaces
 * - trim + lower
 */
function normalize(str) {
    return (str ?? '')
        .toString()
        .replace(/[^a-zA-Zа-яА-ЯёЁ0-9]+/g, ' ')
        .trim()
        .toLowerCase();
}

function normalizeCompact(str) {
    return normalize(str).replace(/\s+/g, '');
}

function splitVariants(correct) {
    if (!correct) return [];
    return correct
        .toString()
        .split('/')
        .map((v) => normalize(v))
        .filter(Boolean);
}

function fullMatch(answerNorm, variantsNorm) {
    if (!answerNorm) return false;
    return variantsNorm.includes(answerNorm);
}

function prefixMatch(answerNorm, variantsNorm) {
    if (!answerNorm) return false;
    return variantsNorm.some((v) => v.startsWith(answerNorm));
}

function variantIsPrefixOfAnswer(answerNorm, variantsNorm) {
    if (!answerNorm) return false;
    return variantsNorm.some((v) => answerNorm.startsWith(v));
}

function levenshtein(a, b) {
    // Iterative DP, O(n*m), fine for short words
    const s = a ?? '';
    const t = b ?? '';
    const n = s.length;
    const m = t.length;

    if (n === 0) return m;
    if (m === 0) return n;

    // dp row
    const dp = new Array(m + 1);
    for (let j = 0; j <= m; j++) dp[j] = j;

    for (let i = 1; i <= n; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= m; j++) {
            const tmp = dp[j];
            const cost = s[i - 1] === t[j - 1] ? 0 : 1;
            dp[j] = Math.min(
                dp[j] + 1,        // deletion
                dp[j - 1] + 1,    // insertion
                prev + cost       // substitution
            );
            prev = tmp;
        }
    }
    return dp[m];
}

function clearLive(inputEl, feedbackEl) {
    if (inputEl) inputEl.classList.remove(...LIVE_INPUT_CLASSES);
    if (feedbackEl) {
        feedbackEl.textContent = '';
        feedbackEl.dataset.state = '';
    }
}

function setLive(inputEl, feedbackEl, liveState, message = '') {
    if (!inputEl || !feedbackEl) return;

    inputEl.classList.remove(...LIVE_INPUT_CLASSES);

    if (liveState) inputEl.classList.add(`live-${liveState}`);

    // IMPORTANT: per request, when the answer is correct we keep input-feedback empty.
    feedbackEl.textContent = message;
    feedbackEl.dataset.state = liveState || '';
}

/**
 * Decide live feedback without revealing the correct answer.
 */
function computeLiveFeedback(answerNorm, variantsNorm, correctRaw) {
    // Don't nag for very short input
    if (!answerNorm) return { state: '', msg: '' };
    if (answerNorm.length < 2) return { state: '', msg: '' };

    // 1) Exact match already typed
    if (fullMatch(answerNorm, variantsNorm)) {
        // Per request: do NOT show anything in input-feedback when correct
        return { state: 'ok', msg: '' };
    }

    // 2) Still on the right path (prefix matches)
    if (prefixMatch(answerNorm, variantsNorm)) {
        return { state: 'progress', msg: '' };
    }

    // 3) “Almost”: user likely missed a space/hyphen etc (compact prefix matches)
    const answerCompact = normalizeCompact(answerNorm);
    const variantsCompact = splitVariants(correctRaw).map((v) => normalizeCompact(v));

    if (answerCompact && variantsCompact.some((v) => v.startsWith(answerCompact))) {
        return { state: 'almost', msg: 'Возможно, нужен пробел или дефис' };
    }

    // 4) Extra letters at the end
    if (variantIsPrefixOfAnswer(answerNorm, variantsNorm) && answerNorm.length >= 3) {
        return { state: 'almost', msg: 'Похоже, в конце есть лишние буквы' };
    }

    // 5) Small typo (edit distance)
    // Keep it conservative: only for "word-like" lengths
    if (answerNorm.length >= 4 && answerNorm.length <= 24 && variantsNorm.length) {
        let best = Infinity;
        for (const v of variantsNorm) {
            if (!v) continue;
            // quick length pruning
            if (Math.abs(v.length - answerNorm.length) > 3) continue;
            best = Math.min(best, levenshtein(answerNorm, v));
            if (best <= 1) break;
        }
        if (best === 1) return { state: 'almost', msg: 'Почти! Отличается на 1 букву' };
        if (best === 2) return { state: 'almost', msg: 'Почти! Отличается на 2 буквы' };
    }

    // 6) Clear mismatch
    return { state: 'mismatch', msg: 'Проверь написание' };
}

function getExpectedRaw(form, verb) {
    if (!verb) return '';

    if (form === 'infinitive') {
        // In reverse mode the "infinitive" input expects translation
        return state.isReverse ? (verb.translation ?? '') : (verb.infinitive ?? '');
    }

    // In simple-mode we do not validate hidden fields
    if (document.body.classList.contains('simple-mode')) return '';

    return verb[form] ?? '';
}

function formToInputId(form) {
    if (form === 'infinitive') return 'testInfinitive';
    if (form === 'pastSimple') return 'testPastSimple';
    if (form === 'pastParticiple') return 'testPastParticiple';
    return '';
}

function isFieldExactlyCorrect(form, verb, inputEl) {
    const expectedRaw = getExpectedRaw(form, verb);

    // If there is nothing to validate (e.g. simple-mode hidden fields), treat as "ok"
    if (!expectedRaw) return true;

    const answerNorm = normalize(inputEl?.value || '');
    if (!answerNorm) return false;

    const variantsNorm = splitVariants(expectedRaw);
    return fullMatch(answerNorm, variantsNorm);
}

function getRequiredFormsFlow() {
    const isSimple = document.body.classList.contains('simple-mode');
    return isSimple ? ['infinitive'] : ['infinitive', 'pastSimple', 'pastParticiple'];
}

const autoMovedForms = new Set();

/**
 * If Auto-advance is enabled: when the current field becomes exactly correct,
 * and this field is NOT the last, move focus to the next field.
 * This replaces pressing Enter to switch fields.
 */
function maybeAutoFocusNextField(form) {
    // Decoupled from liveCheck (highlighting).
    // Now purely based on correctness and the "Auto-Advance" setting.
    if (!state.settings?.autoAdvance) return;

    const checkBtn = document.getElementById('checkAnswer');
    if (!isShown(checkBtn)) return; // already answered / showing result

    if (autoMovedForms.has(form)) return;

    const verb = getCurrentVerbObj();
    if (!verb) return;

    const flow = getRequiredFormsFlow();
    const idx = flow.indexOf(form);
    if (idx === -1) return;
    if (idx >= flow.length - 1) return; // last field -> no focus shift

    const inputId = formToInputId(form);
    const inputEl = inputId ? document.getElementById(inputId) : null;
    if (!inputEl) return;

    if (!isFieldExactlyCorrect(form, verb, inputEl)) return;

    const nextForm = flow[idx + 1];
    const nextId = formToInputId(nextForm);
    const nextEl = nextId ? document.getElementById(nextId) : null;
    if (!nextEl || nextEl.disabled) return;

    autoMovedForms.add(form);

    // Don't fight focus if it is already there
    if (document.activeElement !== nextEl) {
        nextEl.focus();
        const len = nextEl.value.length;
        try { nextEl.setSelectionRange(len, len); } catch { /* ignore */ }
    }
}

/**
 * Auto-submit (call checkAnswer) when ALL required fields are exactly correct.
 * Controlled by setting "Авто-проверка" (Auto Check).
 */
function maybeAutoSubmitIfAllCorrect() {
    // Check the new Auto-Check setting
    if (state.settings?.autoCheck === false) return;

    const checkBtn = document.getElementById('checkAnswer');
    if (!isShown(checkBtn)) return; // already answered / showing result

    const verb = getCurrentVerbObj();
    if (!verb) return;

    const requiredForms = getRequiredFormsFlow();

    for (const form of requiredForms) {
        const inputId = formToInputId(form);
        const inputEl = inputId ? document.getElementById(inputId) : null;
        if (!inputEl) return;

        // Require a real exact match for fields that have an expected value
        if (!isFieldExactlyCorrect(form, verb, inputEl)) return;
    }

    // All required fields match -> submit immediately
    checkAnswer();
}

function validateField(form, inputEl, feedbackEl) {
    // If we're currently showing the "result" state (Next is visible), don't override final styles.
    const checkBtn = document.getElementById('checkAnswer');
    if (!isShown(checkBtn)) return;

    // Setting: disable live highlight + auto-check
    if (!isLiveCheckEnabled()) {
        clearLive(inputEl, feedbackEl);
        return;
    }

    const verb = getCurrentVerbObj();
    const expectedRaw = getExpectedRaw(form, verb);

    // If there is nothing to validate (e.g. simple-mode hidden fields)
    if (!expectedRaw) {
        clearLive(inputEl, feedbackEl);
        return;
    }

    const variantsNorm = splitVariants(expectedRaw);
    const answerNorm = normalize(inputEl?.value || '');

    if (!answerNorm) {
        clearLive(inputEl, feedbackEl);
        return;
    }

    const { state: liveState, msg } = computeLiveFeedback(answerNorm, variantsNorm, expectedRaw);

    // If very short and we decided to keep quiet
    if (!liveState) {
        clearLive(inputEl, feedbackEl);
        return;
    }

    setLive(inputEl, feedbackEl, liveState, msg);
}

export function attachTestInputsEvents() {
    // Input navigation (Test mode)
    const testInfinitive = document.getElementById('testInfinitive');
    const testPastSimple = document.getElementById('testPastSimple');
    const testPastParticiple = document.getElementById('testPastParticiple');

    const feedbackInf = document.getElementById('feedbackInfinitive');
    const feedbackPS = document.getElementById('feedbackPastSimple');
    const feedbackPP = document.getElementById('feedbackPastParticiple');

    const nextBtn = () => document.getElementById('nextTest');
    const checkBtn = () => document.getElementById('checkAnswer');

    // Debounce to avoid "flicker" while user is actively typing fast
    const timers = new Map();
    const scheduleValidate = (key, fn, delayMs = 140) => {
        const prev = timers.get(key);
        if (prev) clearTimeout(prev);
        const t = window.setTimeout(() => {
            timers.delete(key);
            fn();
        }, delayMs);
        timers.set(key, t);
    };

    const clearAllLive = () => {
        autoMovedForms.clear();
        clearLive(testInfinitive, feedbackInf);
        clearLive(testPastSimple, feedbackPS);
        clearLive(testPastParticiple, feedbackPP);
    };

    // Reset live styles when question changes or answer is checked
    document.addEventListener('test:question-changed', clearAllLive);
    document.addEventListener('test:answer-checked', clearAllLive);

    // Live validation wiring + auto-submit when all fields are correct
    if (testInfinitive) {
        testInfinitive.addEventListener('input', () => {
            scheduleValidate('inf', () => {
                validateField('infinitive', testInfinitive, feedbackInf);
                maybeAutoSubmitIfAllCorrect();
                maybeAutoFocusNextField('infinitive');
            });
        });
        testInfinitive.addEventListener('blur', () => {
            validateField('infinitive', testInfinitive, feedbackInf);
            maybeAutoSubmitIfAllCorrect();
            maybeAutoFocusNextField('infinitive');
        });
    }

    if (testPastSimple) {
        testPastSimple.addEventListener('input', () => {
            scheduleValidate('ps', () => {
                validateField('pastSimple', testPastSimple, feedbackPS);
                maybeAutoSubmitIfAllCorrect();
                maybeAutoFocusNextField('pastSimple');
            });
        });
        testPastSimple.addEventListener('blur', () => {
            validateField('pastSimple', testPastSimple, feedbackPS);
            maybeAutoSubmitIfAllCorrect();
            maybeAutoFocusNextField('pastSimple');
        });
    }

    if (testPastParticiple) {
        testPastParticiple.addEventListener('input', () => {
            scheduleValidate('pp', () => {
                validateField('pastParticiple', testPastParticiple, feedbackPP);
                maybeAutoSubmitIfAllCorrect();
                // last field -> focus shift not applicable
            });
        });
        testPastParticiple.addEventListener('blur', () => {
            validateField('pastParticiple', testPastParticiple, feedbackPP);
            maybeAutoSubmitIfAllCorrect();
        });
    }

    // Existing Enter navigation logic
    if (testInfinitive) {
        testInfinitive.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;

            e.preventDefault();
            e.stopPropagation();

            if (isShown(nextBtn())) {
                navigateTest('next', true);
                return;
            }

            if (document.body.classList.contains('simple-mode')) {
                checkAnswer();
                return;
            }

            const ps = document.getElementById('testPastSimple');
            if (ps) ps.focus();
        });
    }

    if (testPastSimple) {
        testPastSimple.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();

                if (isShown(nextBtn())) {
                    navigateTest('next', true);
                    return;
                }

                const pp = document.getElementById('testPastParticiple');
                if (pp) pp.focus();
                return;
            }

            if (e.key === 'Backspace' && e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
                e.preventDefault();
                const prev = document.getElementById('testInfinitive');
                if (!prev) return;
                prev.focus();
                const len = prev.value.length;
                prev.setSelectionRange(len, len);
            }
        });
    }

    if (testPastParticiple) {
        testPastParticiple.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();

                if (isShown(nextBtn())) {
                    navigateTest('next', true);
                    return;
                }

                if (isShown(checkBtn())) checkAnswer();
                return;
            }

            if (e.key === 'Backspace' && e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
                e.preventDefault();
                const prev = document.getElementById('testPastSimple');
                if (!prev) return;
                prev.focus();
                const len = prev.value.length;
                prev.setSelectionRange(len, len);
            }
        });
    }
}

