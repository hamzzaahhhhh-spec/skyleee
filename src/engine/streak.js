/**
 * Barakah Streak Engine
 * Tracks daily reading streaks with localStorage.
 * Unlocks "Golden Aura" at 7-day streak.
 */

const STORAGE_KEY = 'nava_streak';

function getTodayKey() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getStreakData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) { }
    return { count: 0, lastDate: null, history: [] };
}

function saveStreakData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { }
}

/**
 * Record today's reading activity
 * @returns {{ count: number, isNewDay: boolean, hasGoldenAura: boolean, weekProgress: number }}
 */
export function recordReading() {
    const data = getStreakData();
    const today = getTodayKey();

    if (data.lastDate === today) {
        // Already counted today
        return {
            count: data.count,
            isNewDay: false,
            hasGoldenAura: data.count >= 7,
            weekProgress: Math.min(data.count / 7, 1),
        };
    }

    // Check if yesterday was the last day (streak continues)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    if (data.lastDate === yesterdayKey) {
        data.count += 1;
    } else {
        // Streak broken, reset
        data.count = 1;
    }

    data.lastDate = today;
    if (!data.history.includes(today)) {
        data.history.push(today);
        // Keep last 30 days
        if (data.history.length > 30) data.history = data.history.slice(-30);
    }

    saveStreakData(data);

    return {
        count: data.count,
        isNewDay: true,
        hasGoldenAura: data.count >= 7,
        weekProgress: Math.min(data.count / 7, 1),
    };
}

/**
 * Get current streak info without recording
 */
export function getStreak() {
    const data = getStreakData();
    const today = getTodayKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    // If last date was not today or yesterday, streak is broken
    if (data.lastDate !== today && data.lastDate !== yesterdayKey) {
        return { count: 0, hasGoldenAura: false, weekProgress: 0 };
    }

    return {
        count: data.count,
        hasGoldenAura: data.count >= 7,
        weekProgress: Math.min(data.count / 7, 1),
    };
}

/**
 * Create the streak banner DOM element
 * @param {Object} streakInfo
 * @returns {HTMLElement}
 */
export function createStreakBanner(streakInfo) {
    const banner = document.createElement('div');
    banner.className = 'streak-banner';
    banner.id = 'streak-banner';

    const circumference = 2 * Math.PI * 15; // r=15
    const offset = circumference * (1 - streakInfo.weekProgress);

    banner.innerHTML = `
    <span class="streak-banner__flame">🔥</span>
    <div class="streak-banner__info">
      <div class="streak-banner__count">${streakInfo.count} Day Streak</div>
      <div class="streak-banner__label">${streakInfo.hasGoldenAura ? '✨ Golden Aura Unlocked!' : `${Math.round(streakInfo.weekProgress * 100)}% to Golden Aura`}</div>
    </div>
    <svg class="streak-banner__ring" viewBox="0 0 40 40">
      <circle class="streak-ring-bg" cx="20" cy="20" r="15" fill="none" stroke-width="3" />
      <circle class="streak-ring-fill" cx="20" cy="20" r="15" fill="none" stroke-width="3"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}" />
    </svg>
  `;

    return banner;
}
