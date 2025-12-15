/**
 * Full backup export:
 * we export a snapshot of ALL localStorage keys for this origin,
 * so it includes progress, settings, dataset configs, test states, last tab/dataset, etc.
 */
export function exportUserData() {
    const snapshot = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        snapshot[k] = localStorage.getItem(k);
    }

    const data = {
        type: 'ivt-backup',
        version: 2,
        exportedAt: new Date().toISOString(),
        localStorage: snapshot
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `ivt-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
}
