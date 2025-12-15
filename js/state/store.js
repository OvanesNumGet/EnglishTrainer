function readJSON(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function readInt(key, fallback = 0) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
}

function readFloat(key, fallback = 0) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
}

// ============ App State ============
export const state = {
    verbs: [],
    isReverse: false, // false = RU->EN, true = EN->RU

    // Flashcards
    currentCardIndex: 0,
    cardOrder: [],
    isCardShuffled: false,
    isFlipped: false,
    currentCategory: 'all',

    // Test
    currentTestIndex: 0,
    isTestShuffled: false,
    currentTestCategory: 'all',
    testVerbs: [],
    testOrder: [],
    testResults: [],
    hintUsed: {},
    lastOrderedIndex: 0,

    // Persistence
    verbStats: readJSON('verbStats', {}),
    xp: readInt('xp', 0),
    streak: readInt('streak', 0),
    bestStreak: readInt('bestStreak', 0),

    // Session Stats
    sessionStats: readJSON('sessionStats', {
        date: new Date().toDateString(),
        wordsStudied: 0,
        correctAnswers: 0,
        totalAnswers: 0
    }),

    // Study tracking
    studyDays: readJSON('studyDays', []),
    dailyWordsStudied: readInt('dailyWordsStudied', 0),
    lastStudyDate: localStorage.getItem('lastStudyDate') || '',

    /**
     * Daily aggregated history used for performance chart.
     * Key: Date.toDateString()
     * Value: { wordsStudied, correctAnswers, totalAnswers }
     */
    dailyHistory: readJSON('dailyHistory', {}),

    // UI state for stats chart range
    statsPerfRange: localStorage.getItem('statsPerfRange') || 'week',

    // Persistent Location
    lastDataset: localStorage.getItem('lastDataset') || 'verbs',
    lastTab: localStorage.getItem('lastTab') || 'flashcards',

    // Current dataset (runtime)
    currentDataset: localStorage.getItem('lastDataset') || 'verbs',

    // Dataset Configurations
    datasetConfigs: readJSON('datasetConfigs', {}),

    // Theme
    theme: localStorage.getItem('theme') || 'system',

    // Settings
    settings: {
        autoSpeak: readJSON('setting_autoSpeak', false) ?? false,
        speechRate: readFloat('setting_speechRate', 1.0) || 1.0,
        haptics: readJSON('setting_haptics', true) ?? true,
        reduceMotion: readJSON('setting_reduceMotion', false) ?? false,
        dailyGoal: readInt('setting_dailyGoal', 10) || 10,
        simpleMode: readJSON('setting_simpleMode', false) ?? false,
        autoAdvance: readJSON('setting_autoAdvance', true) ?? true,
        showHints: readJSON('setting_showHints', true) ?? true,
        soundEffects: readJSON('setting_soundEffects', true) ?? true,
        animSpeed: localStorage.getItem('setting_animSpeed') || 'normal',
        confetti: readJSON('setting_confetti', true) ?? true
    },

    /**
     * Forced simple-mode for datasets that don't have verb forms (e.g. text1..text5).
     * This prevents Past Simple / Past Participle fields from appearing accidentally
     * after opening/closing settings.
     */
    forceSimpleMode: false,

    settingsOpen: false,
    statsVisible: false
};
