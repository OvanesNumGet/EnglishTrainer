import { onId } from './helpers.js';
import { updateStats, openSubPage, closeSubPage, closeSettings } from '../../ui/index.js';

export function attachSettingsNavEvents() {
    // Settings Menu Actions
    onId('closeSettings', 'click', closeSettings);

    onId('openStats', 'click', () => {
        openSubPage('statsSubPage');
        updateStats();
    });

    onId('backToSettings', 'click', () => {
        closeSubPage('statsSubPage');
    });

    // Topic reset sub-page
    onId('openTopicReset', 'click', () => {
        openSubPage('topicResetSubPage');
    });

    onId('backFromTopicReset', 'click', () => {
        closeSubPage('topicResetSubPage');
    });
}
