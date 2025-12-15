function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Import full backup (preferred) OR legacy export format (older builds).
 *
 * Preferred format:
 * {
 *   type: "ivt-backup",
 *   version: 2,
 *   localStorage: { [key: string]: string | null }
 * }
 *
 * Legacy format (older):
 * {
 *   verbStats, xp, streak, bestStreak, studyDays, settings, exportDate, ...
 * }
 */
export function importUserData(parsedJson) {
  if (!isPlainObject(parsedJson)) {
    throw new Error('Некорректный файл: ожидается JSON-объект');
  }

  // New full snapshot format
  const ls = parsedJson.localStorage;
  if (isPlainObject(ls)) {
    localStorage.clear();

    let restoredKeys = 0;
    Object.keys(ls).forEach((k) => {
      const v = ls[k];
      if (v === null || typeof v === 'undefined') {
        localStorage.removeItem(k);
        return;
      }
      localStorage.setItem(k, String(v));
      restoredKeys++;
    });

    return { mode: 'snapshot', restoredKeys };
  }

  // Legacy format support (best-effort)
  const restored = [];

  const set = (key, value) => {
    if (value === null || typeof value === 'undefined') return;
    localStorage.setItem(key, String(value));
    restored.push(key);
  };

  // Clear first to behave like “restore backup”
  localStorage.clear();

  if (typeof parsedJson.theme === 'string') set('theme', parsedJson.theme);

  if (typeof parsedJson.lastDataset === 'string') set('lastDataset', parsedJson.lastDataset);
  if (typeof parsedJson.lastTab === 'string') set('lastTab', parsedJson.lastTab);

  if (isPlainObject(parsedJson.datasetConfigs)) {
    set('datasetConfigs', JSON.stringify(parsedJson.datasetConfigs));
  }

  if (isPlainObject(parsedJson.verbStats)) {
    set('verbStats', JSON.stringify(parsedJson.verbStats));
  }

  if (typeof parsedJson.xp !== 'undefined') set('xp', parsedJson.xp);
  if (typeof parsedJson.streak !== 'undefined') set('streak', parsedJson.streak);
  if (typeof parsedJson.bestStreak !== 'undefined') set('bestStreak', parsedJson.bestStreak);

  if (Array.isArray(parsedJson.studyDays)) {
    set('studyDays', JSON.stringify(parsedJson.studyDays));
  }

  if (typeof parsedJson.dailyWordsStudied !== 'undefined') {
    set('dailyWordsStudied', parsedJson.dailyWordsStudied);
  }

  if (typeof parsedJson.lastStudyDate === 'string') {
    set('lastStudyDate', parsedJson.lastStudyDate);
  }

  if (isPlainObject(parsedJson.sessionStats)) {
    set('sessionStats', JSON.stringify(parsedJson.sessionStats));
  }

  // Settings: stored under setting_*
  if (isPlainObject(parsedJson.settings)) {
    Object.keys(parsedJson.settings).forEach((k) => {
      const v = parsedJson.settings[k];
      const storageKey = 'setting_' + k;
      if (typeof v === 'boolean') {
        localStorage.setItem(storageKey, JSON.stringify(v));
      } else if (v === null || typeof v === 'undefined') {
        // ignore
      } else {
        localStorage.setItem(storageKey, String(v));
      }
      restored.push(storageKey);
    });
  }

  return { mode: 'legacy', restoredKeys: restored.length };
}
