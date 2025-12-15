import { onId, onAll } from './helpers.js';
import { state } from '../../state.js';
import {
  checkAnswer,
  skipQuestion,
  navigateTest,
  finishTest,
  toggleShuffleTest,
  showHint
} from '../../test/index.js';
import { getCurrentVerbObj } from '../../test/storage.js';
import { speak } from '../../utils.js';

export function attachTestEvents() {
  // Test Controls
  onId('checkAnswer', 'click', checkAnswer);
  onId('skipTest', 'click', skipQuestion);

  onId('prevTest', 'click', () => navigateTest('prev', false));

  onId('nextTest', 'click', () => {
    if (state.currentTestIndex < state.testVerbs.length - 1) {
      navigateTest('next', true);
    } else {
      finishTest();
    }
  });

  onId('shuffleTest', 'click', toggleShuffleTest);

  onId('testSpeak', 'click', () => {
    const verb = getCurrentVerbObj();
    if (verb) speak(verb.infinitive);
  });

  onAll('.btn-hint', 'click', (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    if (btn?.dataset?.form) showHint(btn.dataset.form);
  });
}
