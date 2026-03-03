/**
 * Reading View — Nava-e-Ayat
 * Verses with transliteration toggle, breathing pulse,
 * golden aura, reflection canvas, physics scrolling.
 */

import { PhysicsScroller } from '../engine/physics.js';
import { staggeredEntry } from '../engine/transitions.js';
import { impactLight, selectionClick } from '../engine/haptics.js';
import { createIcon, morphIcon, createActionButton } from './IconMorph.js';
import { recordReading, getStreak } from '../engine/streak.js';

export class ReadingView {
    constructor(container, surahData, onBack, onPlayAudio) {
        this.container = container;
        this.surahData = surahData;
        this.onBack = onBack;
        this.onPlayAudio = onPlayAudio;
        this.scroller = null;
        this.verseElements = [];
        this.breathingTimers = new Map();
        this.favorites = new Set();
        this.showTransliteration = false;
        this.reflectionPanel = null;
        this.reflectionVerseNum = null;
        this.mediaRecorder = null;
        this.isRecording = false;
        this.streak = getStreak();

        // Record reading for streak
        recordReading();

        this._render();
    }

    _render() {
        const { arabic, translation, transliteration } = this.surahData;
        if (!arabic) return;
        const surah = arabic;

        const view = document.createElement('div');
        view.className = 'reading-view';
        view.id = 'reading-view';

        // Navbar
        const navbar = document.createElement('div');
        navbar.className = 'navbar glass-nav';
        navbar.id = 'reading-navbar';

        const backBtn = document.createElement('button');
        backBtn.className = 'navbar__back';
        backBtn.id = 'back-button';
        backBtn.appendChild(createIcon('back', 20));
        backBtn.addEventListener('click', () => {
            impactLight();
            if (this.onBack) this.onBack();
        });

        const title = document.createElement('div');
        title.className = 'navbar__title';
        title.textContent = surah.englishName;

        navbar.appendChild(backBtn);
        navbar.appendChild(title);
        view.appendChild(navbar);

        // Scroll container
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'scroll-container';
        scrollContainer.id = 'reading-scroll-container';

        const scrollContent = document.createElement('div');
        scrollContent.className = 'scroll-content';
        scrollContent.id = 'reading-scroll-content';

        // Reading header
        const header = document.createElement('div');
        header.className = 'reading-header';
        header.id = 'reading-header';

        if (surah.number !== 9) {
            const bismillah = document.createElement('div');
            bismillah.className = 'reading-header__bismillah';
            bismillah.textContent = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
            header.appendChild(bismillah);
        }

        const surahName = document.createElement('h1');
        surahName.className = 'reading-header__surah-name';
        surahName.textContent = surah.englishName;
        header.appendChild(surahName);

        const surahArabic = document.createElement('div');
        surahArabic.className = 'reading-header__surah-arabic';
        surahArabic.textContent = surah.name;
        header.appendChild(surahArabic);

        const info = document.createElement('div');
        info.className = 'reading-header__info';
        info.innerHTML = `
      <span>${surah.englishNameTranslation}</span>
      <span class="reading-header__info-divider"></span>
      <span>${surah.revelationType}</span>
      <span class="reading-header__info-divider"></span>
      <span>${surah.numberOfAyahs} Ayahs</span>
    `;
        header.appendChild(info);
        scrollContent.appendChild(header);

        // Toggle bar (transliteration + reflection)
        const toggleBar = document.createElement('div');
        toggleBar.className = 'toggle-bar';

        const translitToggle = document.createElement('button');
        translitToggle.className = 'toggle-pill';
        translitToggle.id = 'translit-toggle';
        translitToggle.textContent = 'Transliteration';
        translitToggle.addEventListener('click', () => this._toggleTransliteration(translitToggle));

        toggleBar.appendChild(translitToggle);
        scrollContent.appendChild(toggleBar);

        // Verse list
        const verseList = document.createElement('div');
        verseList.className = 'verse-list';
        verseList.id = 'verse-list';

        const verses = surah.ayahs;
        const translations = translation ? translation.ayahs : [];
        const transliterations = transliteration ? transliteration.ayahs : [];

        verses.forEach((ayah, index) => {
            const trans = translations[index];
            const translit = transliterations[index];
            const verseCard = this._createVerseCard(ayah, trans, translit, index);
            verseList.appendChild(verseCard);
            this.verseElements.push(verseCard);
        });

        scrollContent.appendChild(verseList);
        scrollContainer.appendChild(scrollContent);
        view.appendChild(scrollContainer);
        this.container.appendChild(view);

        // Reflection Panel
        this._createReflectionPanel(view);

        // Physics scroller
        this.scroller = new PhysicsScroller(scrollContainer, scrollContent, {
            friction: 0.93,
            bounceStiffness: 0.1,
            bounceDamping: 0.72,
            onHaptic: () => selectionClick(),
        });

        // Stagger in verses
        requestAnimationFrame(() => {
            staggeredEntry(this.verseElements.slice(0, 8), { delay: 60, duration: 450 });
        });

        // Breathing observer
        this._setupBreathingObserver();
    }

    _createVerseCard(ayah, translation, transliteration, index) {
        const card = document.createElement('div');
        card.className = 'verse-card';
        card.id = `verse-${ayah.numberInSurah}`;
        card.dataset.verseIndex = index;

        // Golden aura for 7-day streak
        if (this.streak.hasGoldenAura) {
            card.classList.add('golden-aura');
            const auraBg = document.createElement('div');
            auraBg.className = 'golden-aura-bg';
            card.appendChild(auraBg);
        }

        // Breathing glow
        const breathingBg = document.createElement('div');
        breathingBg.className = 'breathing-bg';
        card.appendChild(breathingBg);

        // Arabic
        const arabicEl = document.createElement('div');
        arabicEl.className = 'verse-card__arabic';
        arabicEl.textContent = ayah.text;
        card.appendChild(arabicEl);

        // Transliteration (hidden by default)
        const translitEl = document.createElement('div');
        translitEl.className = 'verse-card__transliteration';
        translitEl.id = `translit-${ayah.numberInSurah}`;
        translitEl.textContent = transliteration ? transliteration.text : 'Transliteration unavailable';
        card.appendChild(translitEl);

        // Translation
        const transEl = document.createElement('div');
        transEl.className = 'verse-card__translation';
        transEl.textContent = translation ? translation.text : '';
        card.appendChild(transEl);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'verse-card__footer';

        const numberEl = document.createElement('div');
        numberEl.className = 'verse-number';
        numberEl.textContent = ayah.numberInSurah;

        const actions = document.createElement('div');
        actions.className = 'verse-card__actions';

        // Favorite
        const favBtn = createActionButton('heart_outline', '', () => {
            impactLight();
            const isFav = this.favorites.has(ayah.numberInSurah);
            if (isFav) {
                this.favorites.delete(ayah.numberInSurah);
                favBtn.classList.remove('active');
                morphIcon(favBtn.querySelector('svg'), 'heart_outline');
            } else {
                this.favorites.add(ayah.numberInSurah);
                favBtn.classList.add('active');
                morphIcon(favBtn.querySelector('svg'), 'heart_filled');
            }
        });

        // Reflection
        const reflectBtn = createActionButton('edit', '', () => {
            impactLight();
            this._openReflection(ayah.numberInSurah);
        });

        // Share
        const shareBtn = createActionButton('share', '', () => {
            impactLight();
            if (navigator.share) {
                navigator.share({
                    title: `Nava-e-Ayat — Verse ${ayah.numberInSurah}`,
                    text: `${ayah.text}\n\n${translation ? translation.text : ''}`,
                }).catch(() => { });
            }
        });

        actions.appendChild(favBtn);
        actions.appendChild(reflectBtn);
        actions.appendChild(shareBtn);

        footer.appendChild(numberEl);
        footer.appendChild(actions);
        card.appendChild(footer);

        return card;
    }

    _toggleTransliteration(btn) {
        this.showTransliteration = !this.showTransliteration;
        btn.classList.toggle('active', this.showTransliteration);
        impactLight();

        document.querySelectorAll('.verse-card__transliteration').forEach(el => {
            el.classList.toggle('visible', this.showTransliteration);
        });
    }

    _createReflectionPanel(parentView) {
        const panel = document.createElement('div');
        panel.className = 'reflection-panel';
        panel.id = 'reflection-panel';

        panel.innerHTML = `
      <div class="reflection-panel__header">
        <div class="reflection-panel__title">✍️ Reflection Canvas</div>
        <button class="reflection-panel__close" id="reflection-close">
          ${createIcon('close', 18).outerHTML}
        </button>
      </div>
      <div class="reflection-panel__body">
        <p style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-3);" id="reflection-verse-ref">
          Your thoughts on this verse...
        </p>
        <textarea class="reflection-textarea" id="reflection-textarea" placeholder="Write your reflection here, or use voice dictation..."></textarea>
        <div class="reflection-panel__actions">
          <button class="reflection-btn" id="dictation-btn">
            ${createIcon('mic', 16).outerHTML}
            <span>Dictate</span>
          </button>
        </div>
      </div>
    `;

        parentView.appendChild(panel);
        this.reflectionPanel = panel;

        // Close
        panel.querySelector('#reflection-close').addEventListener('click', () => {
            this._closeReflection();
        });

        // Dictation
        panel.querySelector('#dictation-btn').addEventListener('click', () => {
            this._toggleDictation();
        });
    }

    _openReflection(verseNum) {
        this.reflectionVerseNum = verseNum;
        const panel = this.reflectionPanel;
        if (!panel) return;

        panel.querySelector('#reflection-verse-ref').textContent = `Reflecting on Verse ${verseNum}`;

        // Load saved reflection
        const saved = this._loadReflection(verseNum);
        panel.querySelector('#reflection-textarea').value = saved || '';

        panel.classList.add('open');
    }

    _closeReflection() {
        if (this.reflectionPanel) {
            // Save before closing
            const textarea = this.reflectionPanel.querySelector('#reflection-textarea');
            if (this.reflectionVerseNum && textarea.value.trim()) {
                this._saveReflection(this.reflectionVerseNum, textarea.value);
            }
            this.reflectionPanel.classList.remove('open');
        }
        this._stopDictation();
    }

    _saveReflection(verseNum, text) {
        try {
            const key = `nava_reflection_${this.surahData.arabic.number}_${verseNum}`;
            localStorage.setItem(key, text);
        } catch (e) { }
    }

    _loadReflection(verseNum) {
        try {
            const key = `nava_reflection_${this.surahData.arabic.number}_${verseNum}`;
            return localStorage.getItem(key) || '';
        } catch (e) { return ''; }
    }

    _toggleDictation() {
        if (this.isRecording) {
            this._stopDictation();
        } else {
            this._startDictation();
        }
    }

    _startDictation() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        const textarea = this.reflectionPanel.querySelector('#reflection-textarea');
        const dictBtn = this.reflectionPanel.querySelector('#dictation-btn');

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            textarea.value = transcript;
        };

        recognition.onend = () => {
            this.isRecording = false;
            dictBtn.classList.remove('recording');
            dictBtn.querySelector('span').textContent = 'Dictate';
        };

        recognition.onerror = () => {
            this.isRecording = false;
            dictBtn.classList.remove('recording');
            dictBtn.querySelector('span').textContent = 'Dictate';
        };

        recognition.start();
        this.recognition = recognition;
        this.isRecording = true;
        dictBtn.classList.add('recording');
        dictBtn.querySelector('span').textContent = 'Stop';
        impactLight();
    }

    _stopDictation() {
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }
        this.isRecording = false;
        const dictBtn = this.reflectionPanel?.querySelector('#dictation-btn');
        if (dictBtn) {
            dictBtn.classList.remove('recording');
            dictBtn.querySelector('span').textContent = 'Dictate';
        }
    }

    _setupBreathingObserver() {
        let lastCheckTime = 0;
        const CHECK_INTERVAL = 1000;

        const checkVisibility = () => {
            const now = Date.now();
            if (now - lastCheckTime < CHECK_INTERVAL) {
                requestAnimationFrame(checkVisibility);
                return;
            }
            lastCheckTime = now;

            const scrollContainer = document.getElementById('reading-scroll-container');
            if (!scrollContainer) return;

            const containerRect = scrollContainer.getBoundingClientRect();

            this.verseElements.forEach((card, index) => {
                const rect = card.getBoundingClientRect();
                const isVisible = rect.top < containerRect.bottom && rect.bottom > containerRect.top;

                if (isVisible && !this.breathingTimers.has(index)) {
                    const timer = setTimeout(() => {
                        card.classList.add('breathing');
                    }, 5000);
                    this.breathingTimers.set(index, timer);
                } else if (!isVisible && this.breathingTimers.has(index)) {
                    clearTimeout(this.breathingTimers.get(index));
                    this.breathingTimers.delete(index);
                    card.classList.remove('breathing');
                }
            });

            if (document.getElementById('reading-view')) {
                requestAnimationFrame(checkVisibility);
            }
        };

        requestAnimationFrame(checkVisibility);
    }

    destroy() {
        this.breathingTimers.forEach(timer => clearTimeout(timer));
        this.breathingTimers.clear();
        this._stopDictation();
        if (this.scroller) this.scroller.destroy();
        const view = document.getElementById('reading-view');
        if (view) view.remove();
    }
}
