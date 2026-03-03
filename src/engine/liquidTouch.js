/**
 * Liquid Touch Engine
 * Creates soft, translucent ripples from touch/click points.
 * Reacts to pressure/speed of the touch.
 */

export class LiquidTouch {
    constructor() {
        this.layer = document.getElementById('ripple-layer');
        if (!this.layer) return;

        this._onPointerDown = this._onPointerDown.bind(this);
        document.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    }

    _onPointerDown(e) {
        // Only ripple inside #app
        const app = document.getElementById('app');
        if (!app) return;
        const appRect = app.getBoundingClientRect();
        if (e.clientX < appRect.left || e.clientX > appRect.right ||
            e.clientY < appRect.top || e.clientY > appRect.bottom) return;

        this.createRipple(e.clientX, e.clientY, e.pressure || 0.5);
    }

    /**
     * Create a ripple at given coordinates
     * @param {number} x — clientX
     * @param {number} y — clientY
     * @param {number} pressure — 0-1, affects size/opacity
     */
    createRipple(x, y, pressure = 0.5) {
        if (!this.layer) return;

        const ripple = document.createElement('div');
        ripple.className = 'liquid-ripple';

        // Scale ripple size based on pressure
        const size = 60 + pressure * 80;
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        this.layer.appendChild(ripple);

        // Remove after animation
        ripple.addEventListener('animationend', () => ripple.remove());
    }

    destroy() {
        document.removeEventListener('pointerdown', this._onPointerDown);
    }
}
