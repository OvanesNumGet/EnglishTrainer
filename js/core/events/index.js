import { attachDatasetEvents } from './dataset.js';
import { attachHeaderEvents } from './header.js';
import { attachSettingsNavEvents } from './settingsNav.js';
import { attachResetEvents } from './reset.js';
import { attachFlashcardsEvents } from './flashcards.js';
import { attachTestEvents } from './test.js';
import { attachTabsEvents } from './tabs.js';
import { attachCategoriesEvents } from './categories.js';
import { attachTouchEvents } from './touch.js';
import { attachKeyboardEvents } from './keyboard.js';
import { attachTestInputsEvents } from './testInputs.js';
import { attachStatsEvents } from './stats.js';
import { attachFocusModeEvents } from './focusMode.js';

// ============ Event Listeners Wiring ============
export function attachEventListeners() {
    attachDatasetEvents();
    attachHeaderEvents();
    attachSettingsNavEvents();
    attachResetEvents();

    attachFlashcardsEvents();
    attachTestEvents();

    attachTabsEvents();
    attachCategoriesEvents();

    attachTouchEvents();
    attachKeyboardEvents();
    attachTestInputsEvents();

    // Focus mode
    attachFocusModeEvents();

    // Stats UI (chart range)
    attachStatsEvents();
}
