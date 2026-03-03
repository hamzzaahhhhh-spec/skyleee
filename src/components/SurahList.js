/**
 * Surah List View — Nava-e-Ayat
 * Physics scrolling, streak banner, search, staggered cards.
 */

import { PhysicsScroller } from '../engine/physics.js';
import { staggeredEntry } from '../engine/transitions.js';
import { selectionClick } from '../engine/haptics.js';
import { searchSurahs } from '../data/api.js';
import { createIcon } from './IconMorph.js';
import { getStreak, recordReading, createStreakBanner } from '../engine/streak.js';

export class SurahListView {
    constructor(container, surahs, onSurahTap) {
        this.container = container;
        this.allSurahs = surahs;
        this.filteredSurahs = surahs;
        this.onSurahTap = onSurahTap;
        this.scroller = null;
        this.cardElements = [];
        this.searchInput = null;
        this._render();
    }

    _render() {
        this.container.innerHTML = '';

        const view = document.createElement('div');
        view.className = 'surah-list-view';
        view.id = 'surah-list-view';

        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'scroll-container';
        scrollContainer.id = 'surah-scroll-container';

        const scrollContent = document.createElement('div');
        scrollContent.className = 'scroll-content';
        scrollContent.id = 'surah-scroll-content';

        // Header with brand
        const header = document.createElement('div');
        header.className = 'surah-list-header';
        header.innerHTML = `
      <div class="surah-list-header__brand">
        <div class="surah-list-header__logo">☽</div>
        <h1 class="surah-list-header__title">Nava-e-Ayat</h1>
      </div>
      <p class="surah-list-header__subtitle">114 Surahs · The Voice of Verses</p>
    `;
        scrollContent.appendChild(header);

        // Streak banner
        const streakInfo = getStreak();
        if (streakInfo.count > 0) {
            const streakBanner = createStreakBanner(streakInfo);
            scrollContent.appendChild(streakBanner);
        }

        // Search bar
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';

        const searchBar = document.createElement('div');
        searchBar.className = 'search-bar';
        searchBar.id = 'search-bar';

        const searchIcon = createIcon('search', 18);
        searchIcon.setAttribute('class', 'search-bar__icon');
        searchBar.appendChild(searchIcon);

        this.searchInput = document.createElement('input');
        this.searchInput.className = 'search-bar__input';
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search surahs...';
        this.searchInput.id = 'search-input';
        this.searchInput.addEventListener('input', (e) => this._onSearch(e.target.value));
        searchBar.appendChild(this.searchInput);

        searchContainer.appendChild(searchBar);
        scrollContent.appendChild(searchContainer);

        // Grid
        this.gridEl = document.createElement('div');
        this.gridEl.className = 'surah-grid';
        this.gridEl.id = 'surah-grid';
        this._renderCards(this.allSurahs);
        scrollContent.appendChild(this.gridEl);

        scrollContainer.appendChild(scrollContent);
        view.appendChild(scrollContainer);
        this.container.appendChild(view);

        // Physics scroller
        this.scroller = new PhysicsScroller(scrollContainer, scrollContent, {
            friction: 0.94,
            bounceStiffness: 0.1,
            bounceDamping: 0.75,
            onHaptic: () => selectionClick(),
        });

        // Stagger in
        requestAnimationFrame(() => {
            staggeredEntry(this.cardElements.slice(0, 15), { delay: 40, duration: 400 });
        });
    }

    _renderCards(surahs) {
        this.gridEl.innerHTML = '';
        this.cardElements = [];

        surahs.forEach((surah) => {
            const card = this._createCard(surah);
            this.gridEl.appendChild(card);
            this.cardElements.push(card);
        });
    }

    _createCard(surah) {
        const card = document.createElement('div');
        card.className = 'surah-card glass-card';
        card.id = `surah-card-${surah.number}`;
        card.dataset.surahNumber = surah.number;

        const numberEl = document.createElement('div');
        numberEl.className = 'surah-card__number';
        numberEl.textContent = surah.number;

        const infoEl = document.createElement('div');
        infoEl.className = 'surah-card__info';

        const nameEl = document.createElement('div');
        nameEl.className = 'surah-card__name';
        nameEl.textContent = surah.englishName;

        const metaEl = document.createElement('div');
        metaEl.className = 'surah-card__meta';
        metaEl.innerHTML = `
      <span>${surah.englishNameTranslation}</span>
      <span class="surah-card__meta-dot"></span>
      <span>${surah.numberOfAyahs} ayahs</span>
      <span class="surah-card__meta-dot"></span>
      <span>${surah.revelationType}</span>
    `;

        infoEl.appendChild(nameEl);
        infoEl.appendChild(metaEl);

        const arabicEl = document.createElement('div');
        arabicEl.className = 'surah-card__arabic';
        arabicEl.textContent = surah.name;

        card.appendChild(numberEl);
        card.appendChild(infoEl);
        card.appendChild(arabicEl);

        card.addEventListener('click', () => {
            if (this.onSurahTap) this.onSurahTap(surah, card);
        });

        return card;
    }

    _onSearch(query) {
        this.filteredSurahs = searchSurahs(this.allSurahs, query);
        this._renderCards(this.filteredSurahs);

        if (this.scroller) {
            this.scroller.scrollY = 0;
            this.scroller._applyTransform();
        }

        if (this.cardElements.length > 0) {
            staggeredEntry(this.cardElements.slice(0, 10), { delay: 25, duration: 300 });
        }
    }

    getCardElement(surahNumber) {
        return document.getElementById(`surah-card-${surahNumber}`);
    }

    destroy() { if (this.scroller) this.scroller.destroy(); }

    show() {
        const view = this.container.querySelector('.surah-list-view');
        if (view) { view.style.display = ''; view.style.opacity = '1'; }
    }

    hide() {
        const view = this.container.querySelector('.surah-list-view');
        if (view) view.style.display = 'none';
    }
}
