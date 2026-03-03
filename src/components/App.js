/**
 * App — Nava-e-Ayat Root Controller
 * Routing, state, FLIP transitions, feature orchestration.
 */

import { getSurahList, getSurahFull, getAudioUrl, prefetchAdjacent } from '../data/api.js';
import { SurahListView } from './SurahList.js';
import { ReadingView } from './ReadingView.js';
import { AudioPlayer } from './AudioPlayer.js';
import { flipTransition, flipTransitionReverse } from '../engine/transitions.js';
import { impactMedium } from '../engine/haptics.js';

export class App {
    constructor(rootEl) {
        this.rootEl = rootEl;
        this.currentView = 'list';
        this.surahList = null;
        this.readingView = null;
        this.audioPlayer = null;
        this.surahs = [];
        this.currentSurah = null;
        this.lastCardRect = null;

        this.heroOverlay = document.createElement('div');
        this.heroOverlay.className = 'hero-overlay';
        this.heroOverlay.id = 'hero-overlay';
        document.body.appendChild(this.heroOverlay);

        this._init();
    }

    async _init() {
        this._showLoading();

        try {
            this.surahs = await getSurahList();
            this.audioPlayer = new AudioPlayer(document.body);
            this._showSurahList();
        } catch (err) {
            this._showError(err.message);
        }
    }

    _showLoading() {
        this.rootEl.innerHTML = '';
        const loading = document.createElement('div');
        loading.className = 'surah-list-view';
        loading.style.padding = 'calc(var(--nav-height) + var(--safe-top) + 20px) 20px';

        const headerSkel = document.createElement('div');
        headerSkel.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div class="skeleton" style="width:40px;height:40px;border-radius:12px;"></div>
        <div class="skeleton skeleton-text" style="width:160px;height:28px;"></div>
      </div>
      <div class="skeleton skeleton-text short" style="height:14px;margin-bottom:16px;margin-left:52px;"></div>
    `;
        loading.appendChild(headerSkel);

        const grid = document.createElement('div');
        grid.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:0 4px;';
        for (let i = 0; i < 10; i++) {
            const skel = document.createElement('div');
            skel.className = 'skeleton skeleton-card';
            skel.style.animationDelay = `${i * 80}ms`;
            grid.appendChild(skel);
        }
        loading.appendChild(grid);
        this.rootEl.appendChild(loading);
    }

    _showError(message) {
        this.rootEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center;gap:16px;">
        <div style="font-size:48px;">☽</div>
        <h2 style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text);">Unable to Load</h2>
        <p style="color:var(--color-text-secondary);font-size:var(--text-base);">${message}</p>
        <button id="retry-btn" style="padding:12px 28px;border-radius:var(--radius-full);background:var(--gradient-teal-gold);color:white;font-weight:600;font-size:var(--text-base);cursor:pointer;box-shadow:var(--shadow-teal);">Try Again</button>
      </div>
    `;
        document.getElementById('retry-btn')?.addEventListener('click', () => this._init());
    }

    _showSurahList() {
        this.rootEl.innerHTML = '';
        this.currentView = 'list';

        this.surahList = new SurahListView(
            this.rootEl,
            this.surahs,
            (surah, cardEl) => this._openSurah(surah, cardEl)
        );

        if (this.audioPlayer) this.audioPlayer.hide();
    }

    async _openSurah(surah, cardEl) {
        impactMedium();
        this.currentSurah = surah;
        this.lastCardRect = cardEl.getBoundingClientRect();

        // Loading placeholder
        const loadingView = document.createElement('div');
        loadingView.className = 'reading-view';
        loadingView.id = 'reading-view-loading';
        loadingView.style.cssText = 'display:flex;align-items:center;justify-content:center;background:var(--color-bg);';
        loadingView.innerHTML = `
      <div style="text-align:center;">
        <div class="skeleton" style="width:200px;height:28px;margin:0 auto 12px;border-radius:8px;"></div>
        <div class="skeleton" style="width:140px;height:18px;margin:0 auto;border-radius:8px;"></div>
      </div>
    `;

        this.rootEl.appendChild(loadingView);

        await flipTransition(cardEl, loadingView, this.heroOverlay, {
            duration: 500,
            onStart: () => {
                const listView = document.getElementById('surah-list-view');
                if (listView) {
                    listView.style.transition = 'opacity 250ms ease';
                    listView.style.opacity = '0';
                }
            },
            onEnd: () => {
                if (this.surahList) this.surahList.hide();
            }
        });

        try {
            const surahData = await getSurahFull(surah.number);
            loadingView.remove();
            this.rootEl.innerHTML = '';

            this.currentView = 'reading';
            this.readingView = new ReadingView(
                this.rootEl,
                surahData,
                () => this._goBack(),
                () => this._playAudio(surah)
            );

            if (this.audioPlayer) {
                this.audioPlayer.loadSurah(getAudioUrl(surah.number), surah.englishName);
                this.audioPlayer.show();
            }

            prefetchAdjacent(surah.number);
        } catch (err) {
            loadingView.remove();
            this._showError(`Failed to load ${surah.englishName}: ${err.message}`);
        }
    }

    async _goBack() {
        impactMedium();

        const readingView = document.getElementById('reading-view');
        if (readingView && this.lastCardRect) {
            await flipTransitionReverse(readingView, this.lastCardRect, this.heroOverlay, {
                duration: 400,
            });
        }

        if (this.readingView) {
            this.readingView.destroy();
            this.readingView = null;
        }

        this._showSurahList();
    }

    _playAudio(surah) {
        if (this.audioPlayer) this.audioPlayer.togglePlay();
    }
}
