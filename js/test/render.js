import { state } from '../state.js';
import { getCurrentVerbObj, getCurrentResult } from './storage.js';

export function renderEmptyState() {
    document.getElementById('testTranslation').textContent = "Нет слов";
    ['testInfinitive', 'testPastSimple', 'testPastParticiple'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ""; el.disabled = true; el.placeholder = "Список пуст"; }
    });
    document.getElementById('checkAnswer').style.display = 'none';
    document.getElementById('skipTest').style.display = 'none';
    document.getElementById('nextTest').style.display = 'none';
}

export function showTestQuestion(index, shouldFocus = true) {
    if (index < 0 || index >= state.testVerbs.length) return;

    state.currentTestIndex = index;
    const verb = getCurrentVerbObj();
    const result = getCurrentResult();
    const isAnswered = !!result;

    document.getElementById('testTranslation').textContent = state.isReverse ? verb.infinitive : verb.translation;

    const ans = (result && result.answers) || {};
    document.getElementById('testInfinitive').value = ans.infinitive || '';
    document.getElementById('testPastSimple').value = ans.pastSimple || '';
    document.getElementById('testPastParticiple').value = ans.pastParticiple || '';

    ['testInfinitive', 'testPastSimple', 'testPastParticiple'].forEach(id => {
        const input = document.getElementById(id);
        input.classList.remove('correct', 'incorrect', 'skipped');
        input.disabled = false;
        if (state.isReverse && id === 'testInfinitive') input.placeholder = 'Введите перевод...';
        else if (id === 'testInfinitive') input.placeholder = 'Type in English...';
        else input.placeholder = '...';
    });

    ['correctInfinitive', 'correctPastSimple', 'correctPastParticiple'].forEach(id => {
        document.getElementById(id).textContent = '';
    });

    const progress = ((state.currentTestIndex + 1) / state.testVerbs.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;

    document.getElementById('checkAnswer').style.display = isAnswered ? 'none' : 'block';
    document.getElementById('skipTest').style.display = isAnswered ? 'none' : 'block';
    document.getElementById('nextTest').style.display = isAnswered ? 'flex' : 'none';

    if (isAnswered) {
        showTestResult(index); // Visual update
    }

    if (!isAnswered && shouldFocus) {
        setTimeout(() => {
            const input = document.getElementById('testInfinitive');
            if (input && !input.disabled) input.focus();
        }, 50);
    } else if (!shouldFocus) {
        if (document.activeElement && document.activeElement.tagName === "INPUT") {
            document.activeElement.blur();
        }
    }
}

export function showTestResult(index) {
    const result = getCurrentResult();
    if (!result || result.skipped) return;

    const getCorrectText = (form) => {
        if (state.isReverse && form === 'infinitive') return result.verb.translation;
        return result.verb[form];
    };

    ['infinitive', 'pastSimple', 'pastParticiple'].forEach(form => {
        const inputId = 'test' + form.charAt(0).toUpperCase() + form.slice(1);
        const correctId = 'correct' + form.charAt(0).toUpperCase() + form.slice(1);
        const input = document.getElementById(inputId);
        const correctDiv = document.getElementById(correctId);

        if (input && correctDiv) {
            input.classList.remove('correct', 'incorrect', 'skipped');
            correctDiv.className = 'correct-answer';

            if (result.correct[form]) {
                input.classList.add('correct');
            } else {
                input.classList.add('incorrect');
                correctDiv.textContent = `Правильно: ${getCorrectText(form)}`;
            }
            input.disabled = true;
        }
    });
}
