/**
 * Reading View — Nava-e-Ayat
 * Verses with transliteration toggle, breathing pulse,
 * golden aura, reflection canvas, physics scrolling.
 */

import { PhysicsScroller } from '../engine/physics.js';
import { staggeredEntry } from '../engine/transitions.js';
import { impactLight, selectionClick } from '../engine/haptics.js';
import { createIcon, morphIcon, createActionButton, ICONS } from './IconMorph.js';
import { recordReading, getStreak } from '../engine/streak.js';
import { progressTracker } from '../engine/progressTracker.js';
import { WordSyncEngine } from '../engine/WordSync.js';
import { gsap } from 'gsap';

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
        this.activePlayingVerseIndex = -1;
        this._centerVerseRafId = null;
        this._centerVerseVelocity = 0;
        this._scrollTween = null;
        this._surahPlaybackVerseIndex = -1;
        this._surahPlaybackWordIndex = -1;
        this._surahWordBoundariesCache = new Map();
        this._navbarPlayBtn = null; // ref for icon sync

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

        const playBtn = document.createElement('button');
        playBtn.className = 'navbar__play';
        playBtn.id = 'navbar-play-btn';
        playBtn.appendChild(createIcon('play', 24));
        playBtn.style.background = 'none';
        playBtn.style.border = 'none';
        playBtn.style.color = 'var(--color-text)';
        playBtn.style.cursor = 'pointer';
        playBtn.style.marginRight = '8px';
        playBtn.addEventListener('click', () => {
            impactLight();
            if (this.onPlayAudio) this.onPlayAudio();
        });
        this._navbarPlayBtn = playBtn; // store ref for icon sync

        navbar.appendChild(backBtn);
        navbar.appendChild(title);
        navbar.appendChild(playBtn);
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

        // Inject sync CSS classes (engine-only — no CSS file modifications)
        if (!document.getElementById('nava-sync-styles')) {
            const syncStyle = document.createElement('style');
            syncStyle.id = 'nava-sync-styles';
            syncStyle.textContent = `
                .sync-word.is-active-word {
                    transform: scale(1.045) !important;
                    opacity: 1 !important;
                    text-shadow: 0 0 12px rgba(212, 175, 55, 0.45) !important;
                    color: #D4AF37 !important;
                    transition: transform 140ms cubic-bezier(0.25, 1, 0.5, 1),
                                opacity 140ms cubic-bezier(0.25, 1, 0.5, 1),
                                text-shadow 140ms cubic-bezier(0.25, 1, 0.5, 1),
                                color 140ms cubic-bezier(0.25, 1, 0.5, 1);
                }
                .sync-word:not(.is-active-word) {
                    transition: transform 160ms ease,
                                opacity 160ms ease,
                                text-shadow 160ms ease,
                                color 160ms ease;
                }
                .verse-card.is-active-verse {
                    opacity: 1 !important;
                    transform: scale(1.006) !important;
                    filter: blur(0px) !important;
                    transition: opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                                transform 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                                filter 0.5s cubic-bezier(0.25, 1, 0.5, 1);
                }
                .verse-card.is-dimmed {
                    opacity: 0.7 !important;
                    transform: scale(1) !important;
                    filter: blur(0px) !important;
                    transition: opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                                transform 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                                filter 0.5s cubic-bezier(0.25, 1, 0.5, 1);
                }
            `;
            document.head.appendChild(syncStyle);
        }
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

        // Arabic (RTL, GPU optimized)
        const arabicEl = document.createElement('div');
        arabicEl.className = 'verse-card__arabic';
        arabicEl.dir = 'rtl';
        arabicEl.style.willChange = 'transform';

        card.wordElements = [];
        const words = ayah.text.split(' ');
        words.forEach(wordText => {
            const span = document.createElement('span');
            span.className = 'sync-word';
            span.textContent = wordText + ' ';
            span.style.display = 'inline-block';
            arabicEl.appendChild(span);
            card.wordElements.push(span);
        });

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

        // Play
        const playBtn = createActionButton('play', '', () => {
            impactLight();
            this._playVerse(ayah, playBtn, card);
        });

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

        actions.appendChild(playBtn);
        actions.appendChild(favBtn);
        actions.appendChild(reflectBtn);
        actions.appendChild(shareBtn);

        footer.appendChild(numberEl);
        footer.appendChild(actions);
        card.appendChild(footer);

        // Lightweight per-verse playback progress indicator (UI styling remains intact).
        const progressTrack = document.createElement('div');
        progressTrack.setAttribute('aria-hidden', 'true');
        progressTrack.style.position = 'absolute';
        progressTrack.style.left = '16px';
        progressTrack.style.right = '16px';
        progressTrack.style.bottom = '6px';
        progressTrack.style.height = '2px';
        progressTrack.style.borderRadius = '999px';
        progressTrack.style.overflow = 'hidden';
        progressTrack.style.pointerEvents = 'none';
        progressTrack.style.opacity = '0';
        progressTrack.style.transition = 'opacity 220ms cubic-bezier(0.25, 1, 0.5, 1)';
        progressTrack.style.background = 'rgba(0, 191, 165, 0.16)';

        const progressFill = document.createElement('div');
        progressFill.style.width = '100%';
        progressFill.style.height = '100%';
        progressFill.style.transform = 'scaleX(0)';
        progressFill.style.transformOrigin = 'left center';
        progressFill.style.transition = 'transform 90ms linear';
        progressFill.style.background = 'linear-gradient(90deg, var(--color-teal), var(--color-gold))';
        progressTrack.appendChild(progressFill);

        card.playbackProgressTrack = progressTrack;
        card.playbackProgressFill = progressFill;
        card.appendChild(progressTrack);

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

    _playVerse(ayah, btn, card) {
        if (!this.verseAudio) {
            this.verseAudio = new Audio();

            const scrollContainer = document.getElementById('reading-scroll-container');
            this.wordSyncEngine = new WordSyncEngine(this.verseAudio, scrollContainer);

            this.verseAudio.addEventListener('ended', () => {
                if (this.currentPlayingBtn) {
                    this.currentPlayingBtn.classList.remove('playing');
                    morphIcon(this.currentPlayingBtn.querySelector('svg'), 'play');
                }
                if (this.currentPlayingCard) {
                    this.currentPlayingCard.classList.remove('playing');
                }
                this._isAudioPlaying = false;
                if (this.wordSyncEngine) this.wordSyncEngine.stop();
            });

            this.verseAudio.addEventListener('play', () => {
                if (this.wordSyncEngine) this.wordSyncEngine.start();
            });

            this.verseAudio.addEventListener('pause', () => {
                if (this.wordSyncEngine) this.wordSyncEngine.stop();
            });

            this.verseAudio.addEventListener('loadedmetadata', () => {
                if (this.currentPlayingCard && this.currentPlayingCard.wordElements && this.verseAudio.duration) {
                    const durationMs = this.verseAudio.duration * 1000;
                    const wordEls = this.currentPlayingCard.wordElements;
                    const wordCount = Math.max(wordEls.length, 1);

                    // Weight by word length for a closer approximation than uniform slicing.
                    const weights = wordEls.map(el => Math.max(1, (el.textContent || '').trim().length));
                    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
                    let elapsedWeight = 0;

                    const wordsJson = wordEls.map((el, i) => {
                        const startWeight = elapsedWeight;
                        elapsedWeight += weights[i];
                        const endWeight = elapsedWeight;

                        return {
                            el,
                            start_time: (startWeight / totalWeight) * durationMs,
                            end_time: (endWeight / totalWeight) * durationMs
                        };
                    });

                    const currentAyah = this.currentPlayingAyah;
                    if (!currentAyah) return;

                    // Re-bind to ensure it grabs the current layout component correctly
                    this.wordSyncEngine.scrollContainer = document.getElementById('reading-scroll-container');
                    this.wordSyncEngine.loadSyncData(currentAyah.numberInSurah - 1, wordsJson, this.currentPlayingCard, this.verseElements);
                }
            });
        }

        if (this._isAudioPlaying && this.currentPlayingAyah === ayah) {
            if (this.verseAudio.paused) {
                this.verseAudio.play();
                btn.classList.add('playing');
                morphIcon(btn.querySelector('svg'), 'pause');
            } else {
                this.verseAudio.pause();
                btn.classList.remove('playing');
                morphIcon(btn.querySelector('svg'), 'play');
            }
            return;
        }

        if (this.verseAudio.src) {
            this.verseAudio.pause();
            if (this.wordSyncEngine) this.wordSyncEngine.stop();
        }

        if (this.currentPlayingBtn) {
            this.currentPlayingBtn.classList.remove('playing');
            morphIcon(this.currentPlayingBtn.querySelector('svg'), 'play');
        }
        if (this.currentPlayingCard) {
            this.currentPlayingCard.classList.remove('playing');
        }

        this.currentPlayingAyah = ayah;
        this.currentPlayingBtn = btn;
        this.currentPlayingCard = card;
        this._isAudioPlaying = true;

        if (progressTracker && progressTracker.recordVersePlayed) {
            progressTracker.recordVersePlayed(this.surahData.number, ayah.numberInSurah);
        }

        const sNum = String(ayah.surah?.number || this.surahData?.arabic?.number || 1).padStart(3, '0');
        const vNum = String(ayah.numberInSurah).padStart(3, '0');
        this.verseAudio.src = `https://everyayah.com/data/Alafasy_128kbps/${sNum}${vNum}.mp3`;
        this.verseAudio.play().catch(() => {
            this._isAudioPlaying = false;
            btn.classList.remove('playing');
            card.classList.remove('playing');
            morphIcon(btn.querySelector('svg'), 'play');
        });
        btn.classList.add('playing');
        card.classList.add('playing');
        morphIcon(btn.querySelector('svg'), 'pause');
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

    onSurahVerseChanged(verseIndex) {
        if (verseIndex === -1) {
            // End of Surah — clear all highlights
            this._resetAllVerseStyles();
            return;
        }
        this._activateSurahPlaybackVerse(verseIndex);
    }

    /**
     * Called by App.js whenever AudioPlayer.isPlaying changes.
     * Directly sets the SVG path — does NOT use morphIcon animation because
     * morphIcon can stack ghost clones if called while a previous morph is
     * still running, leaving the icon permanently stuck on the wrong shape.
     */
    updatePlayState(isPlaying) {
        if (!this._navbarPlayBtn) return;
        const svg = this._navbarPlayBtn.querySelector('svg');
        if (!svg) return;

        const targetD = ICONS[isPlaying ? 'pause' : 'play'];
        if (!targetD) return;

        // Kill any in-progress morph clones to avoid stacking
        svg.querySelectorAll('path').forEach((p, i) => {
            if (i > 0) p.remove(); // remove clone paths from prior morphIcon calls
        });

        const path = svg.querySelector('path');
        if (path) path.setAttribute('d', targetD);
    }

    onSurahPlaybackFrame(frame) {
        if (!frame) return;
        const verseIndex = frame.verseIndex;

        if (typeof verseIndex !== 'number' || verseIndex < 0 || verseIndex >= this.verseElements.length) {
            return;
        }

        if (this._surahPlaybackVerseIndex !== verseIndex) {
            this._activateSurahPlaybackVerse(verseIndex);
        }

        const progress = Math.max(0, Math.min(1, frame.progress || 0));
        this._updateSurahVerseProgress(verseIndex, progress);
        this._updateSurahWordProgress(verseIndex, progress);
    }

    _activateSurahPlaybackVerse(verseIndex) {
        if (verseIndex < 0 || verseIndex >= this.verseElements.length) return;

        const previousVerseIndex = this._surahPlaybackVerseIndex;
        if (previousVerseIndex !== -1 && previousVerseIndex !== verseIndex) {
            this._updateSurahVerseProgress(previousVerseIndex, 0);
            this._resetSurahWordStyles(previousVerseIndex);
        }

        this._surahPlaybackVerseIndex = verseIndex;
        this._surahPlaybackWordIndex = -1;
        this._centerVerseByIndex(verseIndex);
    }

    _updateSurahVerseProgress(verseIndex, progress) {
        const card = this.verseElements[verseIndex];
        if (!card || !card.playbackProgressFill || !card.playbackProgressTrack) return;

        const clamped = Math.max(0, Math.min(1, progress));
        card.playbackProgressFill.style.transform = `scaleX(${clamped})`;
        card.playbackProgressTrack.style.opacity = clamped > 0 ? '1' : '0';
    }

    _updateSurahWordProgress(verseIndex, progress) {
        const card = this.verseElements[verseIndex];
        if (!card || !card.wordElements || card.wordElements.length === 0) return;

        const boundaries = this._getSurahWordBoundaries(verseIndex);
        if (!boundaries || boundaries.length === 0) return;

        const wordIndex = this._findWordIndexForProgress(progress, boundaries);

        // NEVER go backward — only advance forward within a verse.
        // Prevents floating-point noise or src-swap gaps from jumping
        // the highlight back to an earlier word.
        const safeIndex = Math.max(this._surahPlaybackWordIndex, wordIndex);
        if (safeIndex === this._surahPlaybackWordIndex) return;

        // Direct DOM classList toggle — bypasses render cycle entirely
        if (this._surahPlaybackWordIndex !== -1 && card.wordElements[this._surahPlaybackWordIndex]) {
            card.wordElements[this._surahPlaybackWordIndex].classList.remove('is-active-word');
        }

        if (safeIndex !== -1 && card.wordElements[safeIndex]) {
            card.wordElements[safeIndex].classList.add('is-active-word');
        }

        this._surahPlaybackWordIndex = safeIndex;
    }

    _getSurahWordBoundaries(verseIndex) {
        if (this._surahWordBoundariesCache.has(verseIndex)) {
            return this._surahWordBoundariesCache.get(verseIndex);
        }

        const card = this.verseElements[verseIndex];
        const wordEls = card?.wordElements || [];
        if (wordEls.length === 0) {
            this._surahWordBoundariesCache.set(verseIndex, []);
            return [];
        }

        // Uniform equal-time distribution — each word gets the same fraction of
        // the verse duration. Arabic word length ≠ spoken duration, so
        // character-weight was causing uneven jumps. Equal slices are more accurate
        // without real per-word timestamps from the API.
        const count = wordEls.length;
        const boundaries = wordEls.map((_, i) => (i + 1) / count);

        this._surahWordBoundariesCache.set(verseIndex, boundaries);
        return boundaries;
    }

    _findWordIndexForProgress(progress, boundaries) {
        if (!boundaries || boundaries.length === 0) return -1;

        const p = Math.max(0, Math.min(1, progress));
        let low = 0;
        let high = boundaries.length - 1;
        let answer = high;

        while (low <= high) {
            const mid = (low + high) >> 1;
            if (p <= boundaries[mid]) {
                answer = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }

        return answer;
    }

    _resetSurahWordStyles(verseIndex) {
        const card = this.verseElements[verseIndex];
        if (!card || !card.wordElements) return;

        // Single classList.remove per word — zero forced reflows
        card.wordElements.forEach(wordEl => {
            wordEl.classList.remove('is-active-word');
        });
    }

    _resetAllVerseStyles() {
        // Reset tracking state
        const prev = this._surahPlaybackVerseIndex;
        this._surahPlaybackVerseIndex = -1;
        this._surahPlaybackWordIndex = -1;

        // Clear word highlights on previously-active verse
        if (prev !== -1) this._resetSurahWordStyles(prev);
        if (prev !== -1) this._updateSurahVerseProgress(prev, 0);

        // Clear all verse-level classes
        this._applyEtherealStyles(-1);
    }

    _centerVerseByIndex(verseIndex) {
        if (verseIndex < 0 || verseIndex >= this.verseElements.length) return;

        this.activePlayingVerseIndex = verseIndex;
        const targetCard = this.verseElements[verseIndex];
        if (!targetCard) return;

        const scrollContainer = document.getElementById('reading-scroll-container');
        if (!scrollContainer) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const cardRect = targetCard.getBoundingClientRect();
        const currentScrollY = this.scroller ? this.scroller.scrollY : scrollContainer.scrollTop;

        // Optical center: 35% from top of viewport
        const opticalCenter = containerRect.height * 0.35;
        const cardCenter = (cardRect.top - containerRect.top) + cardRect.height / 2;
        const centerDelta = cardCenter - opticalCenter;

        const maxScroll = this.scroller
            ? this.scroller.maxScroll
            : Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
        const targetScrollY = Math.max(0, Math.min(currentScrollY + centerDelta, maxScroll));

        // Kill any previous GSAP tween or legacy rAF loop
        if (this._scrollTween) {
            this._scrollTween.kill();
            this._scrollTween = null;
        }
        if (this._centerVerseRafId) {
            cancelAnimationFrame(this._centerVerseRafId);
            this._centerVerseRafId = null;
        }

        // GSAP Silk Scroll — power3.out easing to optical center
        const proxy = { y: currentScrollY };
        this._scrollTween = gsap.to(proxy, {
            y: targetScrollY,
            duration: 0.8,
            ease: 'power3.out',
            onUpdate: () => {
                if (this.scroller) {
                    this.scroller.scrollTo(proxy.y, false);
                } else {
                    scrollContainer.scrollTop = proxy.y;
                }
            },
            onComplete: () => {
                this._scrollTween = null;
            }
        });

        // Apply effects immediately
        this._applyEtherealStyles(verseIndex);
    }

    _applyEtherealStyles(activeVerseIndex) {
        if (activeVerseIndex === -1) {
            // No verse playing — remove all engine classes, clear leftover inline styles
            this.verseElements.forEach(card => {
                card.classList.remove('is-active-verse', 'is-dimmed', 'active-verse');
                card.style.opacity = '';
                card.style.transform = '';
                card.style.filter = '';
                card.style.transition = '';
            });
            return;
        }

        // classList-only loop — zero forced reflows, zero inline style writes
        this.verseElements.forEach((card, idx) => {
            // Clear any leftover inline styles from legacy engine
            card.style.opacity = '';
            card.style.transform = '';
            card.style.filter = '';
            card.style.transition = '';

            if (idx === activeVerseIndex) {
                card.classList.add('is-active-verse');
                card.classList.remove('is-dimmed', 'active-verse');
            } else {
                card.classList.remove('is-active-verse', 'active-verse');
                card.classList.add('is-dimmed');
            }
        });
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
        if (this._scrollTween) {
            this._scrollTween.kill();
            this._scrollTween = null;
        }
        if (this._centerVerseRafId) {
            cancelAnimationFrame(this._centerVerseRafId);
            this._centerVerseRafId = null;
        }
        this._surahWordBoundariesCache.clear();
        if (this.verseAudio) {
            this.verseAudio.pause();
            this.verseAudio.src = '';
            this.verseAudio = null;
        }
        if (this.wordSyncEngine) {
            this.wordSyncEngine.stop();
        }
        this.breathingTimers.forEach(timer => clearTimeout(timer));
        this.breathingTimers.clear();
        this._stopDictation();
        if (this.scroller) this.scroller.destroy();
        const view = document.getElementById('reading-view');
        if (view) view.remove();
    }
}
