import { state } from '../state.js';
import { datasets } from '../data.js';

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
}

function formatShortDate(dateStr) {
    const d = new Date(dateStr);
    if (!Number.isFinite(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}`;
}

function buildFullCirclePath(cx, cy, r) {
    // Two arcs trick for a full circle
    return `M ${cx} ${cy}
        m 0 ${-r}
        a ${r} ${r} 0 1 1 0 ${2 * r}
        a ${r} ${r} 0 1 1 0 ${-2 * r}
        z`;
}

function buildPieSlicePath(cx, cy, r, startDeg, endDeg) {
    const delta = endDeg - startDeg;
    if (delta <= 0.000001) return '';

    // Full circle
    if (delta >= 359.999) {
        return buildFullCirclePath(cx, cy, r);
    }

    const startRad = (Math.PI / 180) * startDeg;
    const endRad = (Math.PI / 180) * endDeg;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = delta > 180 ? 1 : 0;

    // Sweep flag = 1 (clockwise)
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function renderProgressPie({ learned, progress, hard, notStarted }) {
    const g = document.getElementById('progressPieSlices');
    if (!g) return;

    const total = learned + progress + hard + notStarted;

    if (total <= 0) {
        g.innerHTML = `<path class="pie-slice not-started" d="${buildFullCirclePath(60, 60, 58)}"></path>`;
        return;
    }

    const parts = [
        { key: 'learned', value: learned },
        { key: 'progress', value: progress },
        { key: 'hard', value: hard },
        { key: 'not-started', value: notStarted }
    ];

    let angle = -90; // start at top
    const r = 58;
    const cx = 60;
    const cy = 60;

    let out = '';
    parts.forEach(p => {
        if (!p.value) return;
        const sliceDeg = (p.value / total) * 360;
        const start = angle;
        const end = angle + sliceDeg;
        angle = end;

        const d = buildPieSlicePath(cx, cy, r, start, end);
        if (!d) return;

        out += `<path class="pie-slice ${escapeAttr(p.key)}" d="${d}"></path>`;
    });

    // If due to floating point we didn't reach the end, it's fine visually.
    g.innerHTML = out || `<path class="pie-slice not-started" d="${buildFullCirclePath(60, 60, 58)}"></path>`;
}

function buildRangeDays(range) {
    const now = new Date();
    const mk = (d) => d.toDateString();

    if (range === 'today') return [mk(now)];

    if (range === 'yesterday') {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return [mk(d)];
    }

    if (range === 'week' || range === 'month') {
        const count = range === 'week' ? 7 : 30;
        const days = [];
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            days.push(mk(d));
        }
        return days;
    }

    // all time
    const history = state.dailyHistory || {};
    const keys = Object.keys(history);
    if (keys.length === 0) return [mk(now)];

    keys.sort((a, b) => new Date(a) - new Date(b));

    const start = new Date(keys[0]);
    const end = new Date(keys[keys.length - 1]);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return keys;

    // Fill gaps for nicer chart, bounded to avoid huge SVGs
    const days = [];
    const cursor = new Date(start);
    const cap = 365;
    while (cursor <= end && days.length < cap) {
        days.push(mk(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return days.length ? days : keys;
}

function renderPerformanceChart() {
    const svg = document.getElementById('performanceChart');
    const summary = document.getElementById('performanceSummary');
    if (!svg) return;

    const range = state.statsPerfRange || 'week';
    const days = buildRangeDays(range);
    const history = state.dailyHistory || {};

    const points = days.map(dayKey => {
        const rec = history[dayKey] || { wordsStudied: 0, correctAnswers: 0, totalAnswers: 0 };
        const totalAnswers = Number(rec.totalAnswers) || 0;
        const correctAnswers = Number(rec.correctAnswers) || 0;
        const wordsStudied = Number(rec.wordsStudied) || 0;
        const acc = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
        return { dayKey, acc: clamp(acc, 0, 100), totalAnswers, correctAnswers, wordsStudied };
    });

    // Summary text
    const sumTotal = points.reduce((a, p) => a + p.totalAnswers, 0);
    const sumCorrect = points.reduce((a, p) => a + p.correctAnswers, 0);
    const sumWords = points.reduce((a, p) => a + p.wordsStudied, 0);
    const sumAcc = sumTotal > 0 ? Math.round((sumCorrect / sumTotal) * 100) : 0;

    if (summary) {
        summary.textContent = `Ответов: ${sumTotal}, правильно: ${sumCorrect}, точность: ${sumAcc}%, изучено: ${sumWords}`;
    }

    // SVG rendering
    const W = 320;
    const H = 140;
    const padL = 28;
    const padR = 10;
    const padT = 12;
    const padB = 24;

    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const bottomY = padT + plotH;

    const n = points.length;
    const xAt = (i) => {
        if (n <= 1) return padL + plotW / 2;
        return padL + (plotW * i) / (n - 1);
    };
    const yAt = (acc) => padT + (1 - acc / 100) * plotH;

    const grid = `
        <g opacity="0.9">
            <line x1="${padL}" y1="${padT}" x2="${W - padR}" y2="${padT}" stroke="var(--border)" stroke-width="1"/>
            <line x1="${padL}" y1="${padT + plotH / 2}" x2="${W - padR}" y2="${padT + plotH / 2}" stroke="var(--border)" stroke-width="1" opacity="0.7"/>
            <line x1="${padL}" y1="${bottomY}" x2="${W - padR}" y2="${bottomY}" stroke="var(--border)" stroke-width="1"/>

            <text x="6" y="${padT + 4}" font-size="10" fill="var(--text-tertiary)" font-weight="700">100%</text>
            <text x="10" y="${padT + plotH / 2 + 4}" font-size="10" fill="var(--text-tertiary)" font-weight="700">50%</text>
            <text x="14" y="${bottomY + 4}" font-size="10" fill="var(--text-tertiary)" font-weight="700">0%</text>
        </g>
    `;

    const coords = points.map((p, i) => ({ x: xAt(i), y: yAt(p.acc), acc: p.acc, dayKey: p.dayKey }));
    const poly = coords.map(c => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');

    const areaPath = (() => {
        if (coords.length === 0) return '';
        const first = coords[0];
        const last = coords[coords.length - 1];
        const linePart = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ');
        return `${linePart} L ${last.x.toFixed(2)} ${bottomY.toFixed(2)} L ${first.x.toFixed(2)} ${bottomY.toFixed(2)} Z`;
    })();

    const dots = coords.map((c) => {
        const label = `${formatShortDate(c.dayKey)} — ${c.acc}%`;
        return `
            <g>
                <circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="4.2" fill="var(--bg-card)" stroke="var(--accent)" stroke-width="2"></circle>
                <title>${escapeAttr(label)}</title>
            </g>
        `;
    }).join('');

    // X labels (first & last; for 1 point just one)
    const xLabels = (() => {
        if (coords.length <= 1) {
            const c = coords[0];
            if (!c) return '';
            return `<text x="${c.x.toFixed(2)}" y="${(H - 8)}" text-anchor="middle" font-size="10" fill="var(--text-tertiary)" font-weight="700">${escapeAttr(formatShortDate(c.dayKey))}</text>`;
        }
        const first = coords[0];
        const last = coords[coords.length - 1];
        return `
            <text x="${first.x.toFixed(2)}" y="${(H - 8)}" text-anchor="start" font-size="10" fill="var(--text-tertiary)" font-weight="700">${escapeAttr(formatShortDate(first.dayKey))}</text>
            <text x="${last.x.toFixed(2)}" y="${(H - 8)}" text-anchor="end" font-size="10" fill="var(--text-tertiary)" font-weight="700">${escapeAttr(formatShortDate(last.dayKey))}</text>
        `;
    })();

    svg.innerHTML = `
        ${grid}
        <path d="${areaPath}" fill="rgba(99, 102, 241, 0.14)"></path>
        <polyline points="${poly}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${dots}
        ${xLabels}
    `;
}

function syncPerfRangeUI() {
    const btns = document.querySelectorAll('.perf-range-btn');
    if (!btns.length) return;

    btns.forEach(btn => {
        const isActive = btn.dataset.range === (state.statsPerfRange || 'week');
        btn.classList.toggle('active', isActive);
    });
}

export function updateStats() {
    // Check if stats elements exist
    if (!document.getElementById('totalCount')) return;

    let globalTotal = 0;
    let globalLearned = 0;
    let globalProgress = 0;
    let globalHard = 0;

    // Iterate all datasets to build global stats
    Object.values(datasets).forEach(list => {
        list.forEach(verb => {
            globalTotal++;
            const stats = state.verbStats[verb.infinitive];
            if (stats) {
                if (stats.errorStreak > 0) globalHard++;
                else if (stats.correctStreak >= 2) globalLearned++;
                else if (stats.correctStreak === 1) globalProgress++;
            }
        });
    });

    const globalNotStarted = globalTotal - (globalLearned + globalProgress + globalHard);
    const learnedPercent = globalTotal > 0 ? Math.round((globalLearned / globalTotal) * 100) : 0;

    // Update main stats
    const updateEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    updateEl('totalCount', globalTotal);
    updateEl('learnedCount', globalLearned);
    updateEl('progressMiniCount', globalProgress);
    updateEl('hardMiniCount', globalHard);
    updateEl('notStartedMiniCount', globalNotStarted);

    updateEl('xpCount', state.xp);
    updateEl('streakCount', state.streak);
    updateEl('bestStreakCount', state.bestStreak);
    updateEl('studyDaysCount', state.studyDays.length);

    // Pie chart (instead of ring)
    renderProgressPie({
        learned: globalLearned,
        progress: globalProgress,
        hard: globalHard,
        notStarted: globalNotStarted
    });

    // Big % in the center (keep "выучено" as headline metric)
    updateEl('overallLearnedPercent', learnedPercent + '%');

    // Daily Goal
    const today = new Date().toDateString();
    let dailyProgress = state.dailyWordsStudied;
    if (state.lastStudyDate !== today) {
        dailyProgress = 0;
    }

    const goalTargetRaw = state.settings.dailyGoal ?? 10;
    const goalTarget = Number.isFinite(goalTargetRaw) ? goalTargetRaw : 10;

    // Prevent division-by-zero visuals
    const goalPercent = goalTarget > 0
        ? Math.min(100, Math.round((dailyProgress / goalTarget) * 100))
        : 0;

    updateEl('dailyGoalCurrent', dailyProgress);
    updateEl('dailyGoalTarget', goalTarget);

    const goalBar = document.getElementById('dailyGoalBar');
    if (goalBar) {
        goalBar.style.width = goalPercent + '%';
    }

    // Session Stats
    const sessionDate = document.getElementById('sessionDate');
    if (sessionDate) {
        const isToday = state.sessionStats.date === today;
        sessionDate.textContent = isToday ? 'Сегодня' : 'Предыдущая сессия';
    }

    const sessionWordsStudied = state.sessionStats.date === today ? state.sessionStats.wordsStudied : 0;
    const sessionCorrect = state.sessionStats.date === today ? state.sessionStats.correctAnswers : 0;
    const sessionTotal = state.sessionStats.date === today ? state.sessionStats.totalAnswers : 0;
    const sessionAccuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;

    updateEl('sessionWordsStudied', sessionWordsStudied);
    updateEl('sessionCorrect', sessionCorrect);
    updateEl('sessionAccuracy', sessionAccuracy + '%');

    // Breakdown bars
    const setBreakdown = (prefix, count) => {
        updateEl(prefix + 'LegendCount', count);
        const pct = globalTotal > 0 ? Math.round((count / globalTotal) * 100) : 0;
        updateEl(prefix + 'Percent', pct + '%');

        const bar = document.getElementById(prefix + 'Bar');
        if (bar) {
            bar.style.width = pct + '%';
        }
    };

    setBreakdown('learned', globalLearned);
    setBreakdown('progress', globalProgress);
    setBreakdown('hard', globalHard);
    setBreakdown('notStarted', globalNotStarted);

    // XP Trend (simplified - show today's XP gain)
    const xpTrend = document.getElementById('xpTrend');
    if (xpTrend) {
        const todayXP = state.sessionStats.date === today ? state.sessionStats.correctAnswers * 10 : 0;
        if (todayXP > 0) {
            xpTrend.className = 'stat-card-trend up';
            xpTrend.innerHTML = `<i data-lucide="trending-up" style="width:12px;height:12px"></i><span>+${todayXP}</span>`;
        } else {
            xpTrend.className = 'stat-card-trend neutral';
            xpTrend.innerHTML = `<i data-lucide="minus" style="width:12px;height:12px"></i><span>0</span>`;
        }

        // Safer: avoid "lucide is not defined" in module scope
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    // Performance chart
    syncPerfRangeUI();
    renderPerformanceChart();

    // Update category chips for current dataset
    const currentList = state.verbs;
    let currHard = 0;
    let currProgress = 0;

    currentList.forEach(v => {
        const s = state.verbStats[v.infinitive];
        if (s) {
            if (s.errorStreak > 0) currHard++;
            else if (s.correctStreak === 1) currProgress++;
        }
    });

    updateEl('allCount', currentList.length);
    updateEl('hardChipCount', currHard);
    updateEl('progressChipCount', currProgress);
    updateEl('testAllCount', currentList.length);
    updateEl('testHardCount', currHard);
    updateEl('testProgressCount', currProgress);
}
