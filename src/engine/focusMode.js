/**
 * Focus Mode Engine — Nava-e-Ayat
 * The active Ayah scales 1.015x with full opacity.
 * Surrounding verses fade to 38% opacity.
 * Uses IntersectionObserver + scroll position for buttery performance.
 */

import { progressTracker } from './progressTracker.js';

export class FocusMode {
    constructor(scrollContainer, verseCards) {
        this.container = scrollContainer;
        this.cards = verseCards;
        this.activeIndex = -1;
        this.isActive = true;
        this._rafId = null;
        this._lastCheck = 0;

        this._observe();
    }

    _observe() {
        const check = () => {
            if (!this.isActive) return;

            const now = performance.now();
            if (now - this._lastCheck < 80) {
                this._rafId = requestAnimationFrame(check);
                return;
            }
            this._lastCheck = now;

            const containerRect = this.container.getBoundingClientRect();
            const centerY = containerRect.top + containerRect.height * 0.4;

            let closest = -1;
            let closestDist = Infinity;

            for (let i = 0; i < this.cards.length; i++) {
                const card = this.cards[i];
                const rect = card.getBoundingClientRect();
                const cardCenter = rect.top + rect.height / 2;
                const dist = Math.abs(cardCenter - centerY);

                if (dist < closestDist) {
                    closestDist = dist;
                    closest = i;
                }
            }

            if (closest !== this.activeIndex && closest !== -1) {
                this.activeIndex = closest;
                this._updateFocus();

                // Tracing Gamification Points
                const focusedCard = this.cards[closest];
                if (focusedCard && focusedCard.dataset.surahNum && focusedCard.dataset.ayahNum) {
                    progressTracker.recordVerseRead(
                        parseInt(focusedCard.dataset.surahNum, 10),
                        parseInt(focusedCard.dataset.ayahNum, 10)
                    );
                }
            }

            this._rafId = requestAnimationFrame(check);
        };

        this._rafId = requestAnimationFrame(check);
    }

    _updateFocus() {
        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            if (i === this.activeIndex) {
                card.classList.add('verse-focused');
            } else {
                card.classList.remove('verse-focused');
            }
        }
    }

    disable() {
        this.isActive = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
        // Show all verses at full opacity
        for (const card of this.cards) {
            card.classList.remove('verse-focused');
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }
    }

    enable() {
        this.isActive = true;
        for (const card of this.cards) {
            card.style.opacity = '';
            card.style.transform = '';
        }
        this._observe();
    }

    destroy() {
        this.isActive = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
    }
}
