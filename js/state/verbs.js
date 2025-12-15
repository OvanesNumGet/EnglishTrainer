import { state } from './store.js';

// ============ Helpers ============

export function getVerbStatus(infinitive) {
    const stats = state.verbStats[infinitive];
    if (!stats) return 'not-started';

    if (stats.errorStreak > 0) return 'hard';
    if (stats.correctStreak >= 2) return 'learned';
    if (stats.correctStreak === 1) return 'progress';

    return 'not-started';
}

function updateSessionStats(correct) {
    const today = new Date().toDateString();

    // Reset if new day
    if (state.sessionStats.date !== today) {
        state.sessionStats = {
            date: today,
            wordsStudied: 0,
            correctAnswers: 0,
            totalAnswers: 0
        };
        state.dailyWordsStudied = 0;
        localStorage.setItem('dailyWordsStudied', '0');
    }

    state.sessionStats.wordsStudied++;
    state.sessionStats.totalAnswers++;
    if (correct) state.sessionStats.correctAnswers++;

    localStorage.setItem('sessionStats', JSON.stringify(state.sessionStats));

    // Track daily words
    state.dailyWordsStudied++;
    localStorage.setItem('dailyWordsStudied', state.dailyWordsStudied.toString());

    // Track daily history for performance chart
    if (!state.dailyHistory) state.dailyHistory = {};
    if (!state.dailyHistory[today]) {
        state.dailyHistory[today] = { wordsStudied: 0, correctAnswers: 0, totalAnswers: 0 };
    }
    state.dailyHistory[today].wordsStudied++;
    state.dailyHistory[today].totalAnswers++;
    if (correct) state.dailyHistory[today].correctAnswers++;

    // Keep history bounded (last ~365 days)
    const keys = Object.keys(state.dailyHistory);
    if (keys.length > 400) {
        keys.sort((a, b) => new Date(a) - new Date(b));
        const keep = keys.slice(-365);
        const next = {};
        keep.forEach(k => { next[k] = state.dailyHistory[k]; });
        state.dailyHistory = next;
    }

    localStorage.setItem('dailyHistory', JSON.stringify(state.dailyHistory));

    // Track study days
    if (state.lastStudyDate !== today) {
        state.lastStudyDate = today;
        localStorage.setItem('lastStudyDate', today);

        if (!state.studyDays.includes(today)) {
            state.studyDays.push(today);
            // Keep only last 365 days
            if (state.studyDays.length > 365) {
                state.studyDays = state.studyDays.slice(-365);
            }
            localStorage.setItem('studyDays', JSON.stringify(state.studyDays));
        }
    }
}

export function updateVerbStats(infinitive, correct) {
    if (!state.verbStats[infinitive]) {
        state.verbStats[infinitive] = { correctStreak: 0, errorStreak: 0 };
    }

    if (correct) {
        state.verbStats[infinitive].correctStreak++;
        state.verbStats[infinitive].errorStreak = 0;
    } else {
        state.verbStats[infinitive].errorStreak++;
        state.verbStats[infinitive].correctStreak = 0;
    }

    localStorage.setItem('verbStats', JSON.stringify(state.verbStats));

    // Track session
    updateSessionStats(correct);
}

export function getVerbsByStatus(status) {
    return state.verbs.filter(v => getVerbStatus(v.infinitive) === status);
}

export function getVerbList(category) {
    if (category === 'hard') return getVerbsByStatus('hard');
    if (category === 'progress') return getVerbsByStatus('progress');
    if (category === 'learned') return getVerbsByStatus('learned');
    return state.verbs;
}
