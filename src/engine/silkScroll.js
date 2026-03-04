/**
 * Silk Scroll Engine — Nava-e-Ayat
 * Spring-physics scroll that glides the active verse
 * to the optical center (35% from top).
 * 
 * Uses a critically-damped spring instead of CSS scroll-behavior.
 * stiffness: 70, damping: 20 → starts with intention, settles softly.
 */

export class SilkScroll {
    constructor(scrollContainer, options = {}) {
        this.container = scrollContainer;
        this.stiffness = options.stiffness ?? 70;
        this.damping = options.damping ?? 20;
        this.mass = options.mass ?? 1;
        this.opticalCenter = options.opticalCenter ?? 0.35; // 35% from top
        this.precision = options.precision ?? 0.5; // px threshold to stop

        this._currentY = 0;
        this._targetY = 0;
        this._velocity = 0;
        this._isAnimating = false;
        this._rafId = null;
        this._lastTime = 0;
    }

    /**
     * Smoothly scroll an element to the optical center of the container.
     * @param {HTMLElement} element - The verse card to center
     * @param {Object} opts - Override options
     */
    scrollToElement(element, opts = {}) {
        if (!element || !this.container) return;

        const containerRect = this.container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Where is the element currently relative to container?
        const elementTop = elementRect.top - containerRect.top;
        const elementCenter = elementTop + elementRect.height / 2;

        // Where should it be? (optical center = 35% from top)
        const center = containerRect.height * (opts.opticalCenter ?? this.opticalCenter);

        // How far do we need to scroll?
        const delta = elementCenter - center;

        // Current scroll position
        this._currentY = this.container.scrollTop;
        this._targetY = this._currentY + delta;

        // Clamp to scroll bounds
        const maxScroll = this.container.scrollHeight - this.container.clientHeight;
        this._targetY = Math.max(0, Math.min(this._targetY, maxScroll));

        // Reset velocity for fresh spring
        this._velocity = 0;

        if (!this._isAnimating) {
            this._isAnimating = true;
            this._lastTime = performance.now();
            this._animate();
        }
    }

    /**
     * Spring physics animation loop.
     * F = -stiffness * displacement - damping * velocity
     */
    _animate() {
        const now = performance.now();
        const dt = Math.min((now - this._lastTime) / 1000, 0.064); // Cap at ~16fps min
        this._lastTime = now;

        const displacement = this._currentY - this._targetY;
        const springForce = -this.stiffness * displacement;
        const dampingForce = -this.damping * this._velocity;
        const acceleration = (springForce + dampingForce) / this.mass;

        this._velocity += acceleration * dt;
        this._currentY += this._velocity * dt;

        // Apply scroll
        this.container.scrollTop = this._currentY;

        // Check if settled
        const isSettled = Math.abs(displacement) < this.precision
            && Math.abs(this._velocity) < this.precision;

        if (isSettled) {
            this.container.scrollTop = this._targetY;
            this._currentY = this._targetY;
            this._velocity = 0;
            this._isAnimating = false;
            return;
        }

        this._rafId = requestAnimationFrame(() => this._animate());
    }

    /**
     * Immediately stop any in-progress animation.
     */
    stop() {
        this._isAnimating = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._velocity = 0;
    }

    destroy() {
        this.stop();
    }
}
