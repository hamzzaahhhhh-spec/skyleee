import { animate } from 'motion';
import { gsap } from 'gsap';
import { Haptics } from '@capacitor/haptics';

/**
 * WordSync Data Engine
 * Handles JSON data containing word-level start_time and end_time.
 * Synchronizes audio via 120fps requestAnimationFrame loop in "Liquid Crossfade".
 */
export class WordSyncEngine {
    constructor(audioElement, scrollContainer) {
        this.audio = audioElement;
        this.scrollContainer = scrollContainer;
        this.syncData = []; // [{ word, start_time, end_time, el }]
        this.activeWordIndex = -1;
        this.activeVerseIndex = -1;
        this.rafId = null;
        this.isPlaying = false;
        this.frameCount = 0;
        this.lastUpdateTime = 0;

        this._loop = this._loop.bind(this);
    }

    /**
     * Load the JSON data containing words and their exact timings
     */
    loadSyncData(verseIndex, wordsJson, verseCardEl, allVerseCards) {
        this.syncData = wordsJson;
        this.verseCardEl = verseCardEl;
        this.allVerseCards = allVerseCards;
        this.verseIndex = verseIndex;
        this.activeWordIndex = -1;

        // Reset states
        gsap.set(this.syncData.map(d => d.el), {
            scale: 1,
            color: 'var(--color-text)',
            textShadow: 'none',
            opacity: 0.8
        });
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        // Trigger micro-vibration on new verse
        this._triggerHaptic();

        // Ethereal Transitions - Scroll to center
        this._centerActiveVerse();
        this._applyEtherealStyles();

        this.rafId = requestAnimationFrame(this._loop);
    }

    stop() {
        this.isPlaying = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    _loop() {
        if (!this.isPlaying || !this.audio || this.audio.paused || this.audio.ended) {
            this.rafId = null;
            return;
        }

        const currentTime = this.audio.currentTime; // in seconds
        let newWordIndex = -1;

        // Binary search keeps frame timing stable even with long verses.
        let low = 0;
        let high = this.syncData.length - 1;
        while (low <= high) {
            const mid = (low + high) >> 1;
            const word = this.syncData[mid];
            const startTime = word.start_time / 1000;
            const endTime = word.end_time / 1000;

            if (currentTime < startTime) {
                high = mid - 1;
            } else if (currentTime >= endTime) {
                low = mid + 1;
            } else {
                newWordIndex = mid;
                break;
            }
        }

        // Only transition if word index actually changed
        if (newWordIndex !== this.activeWordIndex) {
            if (newWordIndex !== -1) {
                this._transitionWord(this.activeWordIndex, newWordIndex);
                this.activeWordIndex = newWordIndex;
            }
        }

        this.frameCount++;
        if (this.isPlaying && this.audio && !this.audio.paused && !this.audio.ended) {
            this.rafId = requestAnimationFrame(this._loop);
        } else {
            this.rafId = null;
        }
    }

    _transitionWord(oldIndex, newIndex) {
        // Smooth Liquid Crossfade using GSAP
        if (oldIndex >= 0 && this.syncData[oldIndex]) {
            const oldEl = this.syncData[oldIndex].el;
            gsap.to(oldEl, {
                scale: 1,
                color: 'var(--color-text)',
                opacity: 0.7,
                textShadow: 'none',
                duration: 0.25,
                ease: 'power1.inOut',
                overwrite: 'auto'
            });
        }

        if (newIndex >= 0 && this.syncData[newIndex]) {
            const newEl = this.syncData[newIndex].el;
            // Smooth Bloom effect
            gsap.to(newEl, {
                scale: 1.08,
                color: '#D4AF37', // Satin Gold
                opacity: 1,
                textShadow: '0 0 12px rgba(212, 175, 55, 0.5)',
                duration: 0.2,
                ease: 'power1.out',
                overwrite: 'auto'
            });
        }
    }

    _centerActiveVerse() {
        if (!this.verseCardEl || !this.scrollContainer) return;

        // Calculate optical center (35% from top)
        const containerRect = this.scrollContainer.getBoundingClientRect();
        const cardRect = this.verseCardEl.getBoundingClientRect();

        const scrollTarget = this.scrollContainer.scrollTop + (cardRect.top - containerRect.top) - (containerRect.height * 0.35);

        // Spring-based verse centering using Framer motion's `animate`
        animate(
            this.scrollContainer.scrollTop,
            scrollTarget,
            {
                type: 'spring',
                stiffness: 70,
                damping: 25,
                onUpdate: (latest) => {
                    this.scrollContainer.scrollTop = latest;
                }
            }
        );
    }

    _applyEtherealStyles() {
        if (!this.allVerseCards) return;

        this.allVerseCards.forEach((card, idx) => {
            if (idx === this.verseIndex) {
                // Active Verse
                gsap.to(card, {
                    opacity: 1,
                    scale: 1.05,
                    filter: 'blur(0px)',
                    duration: 0.6,
                    ease: 'power3.out'
                });
            } else {
                // Non-Active Verses
                gsap.to(card, {
                    opacity: 0.3,
                    scale: 1,
                    filter: 'blur(4px)',
                    duration: 0.6,
                    ease: 'power3.out'
                });
            }
        });
    }

    /**
     * Load accurate word timing data from API or preprocessed JSON
     * Expected format:
     * [
     *   { word: "الْحَمْدُ", start: 0.5, end: 1.2, el: HTMLElement },
     *   { word: "لِلَّهِ", start: 1.2, end: 1.9, el: HTMLElement }
     * ]
     */
    loadAccurateWordData(verseNumber, wordTimingsJson) {
        this.syncData = wordTimingsJson.map(item => ({
            ...item,
            start_time: item.start * 1000, // Convert to ms for consistency
            end_time: item.end * 1000
        }));
        
        this.activeWordIndex = -1;
        
        // Reset styling
        gsap.set(this.syncData.map(d => d.el), {
            scale: 1,
            color: 'var(--color-text)',
            textShadow: 'none',
            opacity: 0.8
        });
    }

    async _triggerHaptic() {
        try {
            if (Haptics && Haptics.impact) {
                // 10ms micro-vibration simulation via Light impact
                await Haptics.impact({ style: 'LIGHT' });
            }
        } catch (e) {
            // Ignore if not in capacitor environment
        }
    }
}
