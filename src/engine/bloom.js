/**
 * Bloom Engine — Nava-e-Ayat "Lyrics Flow"
 * 
 * Apple Music-style verse focus:
 * - Active verse: 100% opacity, scale(1.03), subtle glow
 * - Previous/next: 50% opacity
 * - All others: 30% opacity
 * 
 * Uses requestAnimationFrame for 60fps transitions.
 * CSS handles the actual transition smoothly — this engine
 * only sets which verse is "blooming."
 */

export class BloomEngine {
    constructor(verseCards, options = {}) {
        this.cards = verseCards;
        this.activeIndex = -1;
        this.fadeFar = options.fadeFar ?? 0.30;    // Far verses opacity
        this.fadeNear = options.fadeNear ?? 0.50;   // Adjacent verses opacity
        this.scaleFactor = options.scaleFactor ?? 1.03;
        this.isEnabled = true;
    }

    /**
     * Set the active verse by index. Applies bloom transitions.
     * @param {number} index
     */
    setActive(index) {
        if (index === this.activeIndex || !this.isEnabled) return;
        this.activeIndex = index;
        this._applyBloom();
    }

    _applyBloom() {
        const active = this.activeIndex;

        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            const distance = Math.abs(i - active);

            // Remove all bloom states
            card.classList.remove('bloom-active', 'bloom-near', 'bloom-far');

            if (i === active) {
                card.classList.add('bloom-active');
            } else if (distance <= 1) {
                card.classList.add('bloom-near');
            } else {
                card.classList.add('bloom-far');
            }
        }
    }

    /**
     * Clear all bloom states (e.g., when audio stops).
     */
    clearAll() {
        this.activeIndex = -1;
        for (const card of this.cards) {
            card.classList.remove('bloom-active', 'bloom-near', 'bloom-far');
        }
    }

    disable() {
        this.isEnabled = false;
        this.clearAll();
    }

    enable() {
        this.isEnabled = true;
    }
}
