import { state } from './store.js';

export function addXP(amount) {
    state.xp += amount;
    localStorage.setItem('xp', String(state.xp));
}

export function updateStreak(correct) {
    if (correct) {
        state.streak++;
        if (state.streak > state.bestStreak) {
            state.bestStreak = state.streak;
            localStorage.setItem('bestStreak', String(state.bestStreak));
        }
    } else {
        state.streak = 0;
    }
    localStorage.setItem('streak', String(state.streak));
}

export function resetProgress() {
    const savedTheme = localStorage.getItem('theme');
    const savedSettings = {
        autoSpeak: localStorage.getItem('setting_autoSpeak'),
        speechRate: localStorage.getItem('setting_speechRate'),
        haptics: localStorage.getItem('setting_haptics'),
        reduceMotion: localStorage.getItem('setting_reduceMotion'),
        dailyGoal: localStorage.getItem('setting_dailyGoal'),
        simpleMode: localStorage.getItem('setting_simpleMode'),
        autoAdvance: localStorage.getItem('setting_autoAdvance'),
        autoCheck: localStorage.getItem('setting_autoCheck'),
        liveCheck: localStorage.getItem('setting_liveCheck'),
        showHints: localStorage.getItem('setting_showHints'),
        soundEffects: localStorage.getItem('setting_soundEffects'),
        animSpeed: localStorage.getItem('setting_animSpeed'),
        confetti: localStorage.getItem('setting_confetti')
    };
    const savedLocation = {
        lastDataset: localStorage.getItem('lastDataset'),
        lastTab: localStorage.getItem('lastTab')
    };

    localStorage.clear();

    if (savedTheme) localStorage.setItem('theme', savedTheme);
    Object.entries(savedSettings).forEach(([key, value]) => {
        if (value !== null) localStorage.setItem('setting_' + key, value);
    });

    if (savedLocation.lastDataset) localStorage.setItem('lastDataset', savedLocation.lastDataset);
    if (savedLocation.lastTab) localStorage.setItem('lastTab', savedLocation.lastTab);

    state.verbStats = {};
    state.datasetConfigs = {};
    state.xp = 0;
    state.streak = 0;
    state.bestStreak = 0;

    state.sessionStats = {
        date: new Date().toDateString(),
        wordsStudied: 0,
        correctAnswers: 0,
        totalAnswers: 0
    };

    state.studyDays = [];
    state.dailyWordsStudied = 0;

    // NEW: chart history
    state.dailyHistory = {};
    state.statsPerfRange = 'week';

    // Keep theme/settings in-memory consistent enough
    state.theme = savedTheme || state.theme || 'system';
    state.lastDataset = savedLocation.lastDataset || state.lastDataset || 'verbs';
    state.lastTab = savedLocation.lastTab || state.lastTab || 'flashcards';
}
