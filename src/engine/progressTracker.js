/**
 * Progress Tracker — Nava-e-Ayat
 * Central engine for tracking Hasanat, Verses Read, Pages, Streak.
 * All data persists in localStorage. Provides event callbacks for live UI updates.
 *
 * Hasanat rewards:
 *  - Reading a verse (scroll focus):  +10 hasanat
 *  - Listening to a verse (audio):    +5 hasanat
 *  - Completing a full surah:         +50 hasanat bonus
 *  - Daily login (first read):        +20 hasanat
 *
 * Daily Goal: 100 hasanat (configurable)
 */

import { recordReading } from './streak.js';

const KEYS = {
    hasanat: 'nava_hasanat',
    verses: 'nava_verses',
    pages: 'nava_pages',
    todayHasanat: 'nava_today_hasanat',
    todayDate: 'nava_today_date',
    readVerses: 'nava_read_verses_set',
};

const DAILY_GOAL = 100; // hasanat needed to complete daily goal

class ProgressTracker {
    constructor() {
        this._listeners = [];
        this._checkDayReset();
        this._readVerseSet = this._loadReadVerseSet();
    }

    // ── Getters ──

    get hasanat() {
        return parseInt(localStorage.getItem(KEYS.hasanat) || '0', 10);
    }

    get versesRead() {
        return parseInt(localStorage.getItem(KEYS.verses) || '0', 10);
    }

    get pages() {
        return parseInt(localStorage.getItem(KEYS.pages) || '0', 10);
    }

    get todayHasanat() {
        this._checkDayReset();
        return parseInt(localStorage.getItem(KEYS.todayHasanat) || '0', 10);
    }

    get dailyGoalProgress() {
        return Math.min(this.todayHasanat / DAILY_GOAL, 1);
    }

    get dailyGoalTarget() {
        return DAILY_GOAL;
    }

    // ── Actions ──

    /**
     * Called when a verse becomes "active" (scrolled into focus or being read).
     * Awards hasanat only once per unique verse per session.
     */
    recordVerseRead(surahNumber, ayahNumber) {
        const key = `${surahNumber}:${ayahNumber}`;
        if (this._readVerseSet.has(key)) return; // already counted

        this._readVerseSet.add(key);
        this._saveReadVerseSet();

        this._addHasanat(10);
        this._incrementVerses(1);

        // Gamification sync with Streak engine
        recordReading();

        this._notify();
    }

    /**
     * Called when a verse audio finishes playing.
     */
    recordVersePlayed(surahNumber, ayahNumber) {
        this._addHasanat(5);
        this._notify();
    }

    /**
     * Called when user completes all verses in a surah.
     */
    recordSurahCompleted(surahNumber) {
        this._addHasanat(50);
        this._notify();
    }

    /**
     * Called when user opens a surah (tracks "pages" opened).
     */
    recordPageOpened() {
        const current = this.pages;
        localStorage.setItem(KEYS.pages, (current + 1).toString());
        this._notify();
    }

    /**
     * Register a listener for progress updates.
     * Callback receives: { hasanat, versesRead, pages, todayHasanat, dailyGoalProgress }
     */
    onChange(callback) {
        this._listeners.push(callback);
    }

    offChange(callback) {
        this._listeners = this._listeners.filter(cb => cb !== callback);
    }

    /**
     * Get a snapshot of all stats.
     */
    getStats() {
        return {
            hasanat: this.hasanat,
            versesRead: this.versesRead,
            pages: this.pages,
            todayHasanat: this.todayHasanat,
            dailyGoalProgress: this.dailyGoalProgress,
            dailyGoalTarget: this.dailyGoalTarget,
        };
    }

    // ── Internal ──

    _addHasanat(amount) {
        const total = this.hasanat + amount;
        localStorage.setItem(KEYS.hasanat, total.toString());

        this._checkDayReset();
        const todayTotal = this.todayHasanat + amount;
        localStorage.setItem(KEYS.todayHasanat, todayTotal.toString());
    }

    _incrementVerses(count) {
        const total = this.versesRead + count;
        localStorage.setItem(KEYS.verses, total.toString());
    }

    _checkDayReset() {
        const today = new Date().toISOString().split('T')[0];
        const storedDate = localStorage.getItem(KEYS.todayDate);
        if (storedDate !== today) {
            localStorage.setItem(KEYS.todayDate, today);
            localStorage.setItem(KEYS.todayHasanat, '0');
            // Clear read verse set for new day
            this._readVerseSet = new Set();
            this._saveReadVerseSet();
        }
    }

    _loadReadVerseSet() {
        try {
            const raw = localStorage.getItem(KEYS.readVerses);
            if (raw) return new Set(JSON.parse(raw));
        } catch (e) { }
        return new Set();
    }

    _saveReadVerseSet() {
        try {
            localStorage.setItem(KEYS.readVerses, JSON.stringify([...this._readVerseSet]));
        } catch (e) { }
    }

    _notify() {
        const stats = this.getStats();
        this._listeners.forEach(cb => {
            try { cb(stats); } catch (e) { }
        });
    }
}

// Singleton
export const progressTracker = new ProgressTracker();
