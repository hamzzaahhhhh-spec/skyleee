/**
 * Magnetic Pull Engine — Nava-e-Ayat
 * Cards tilt toward the cursor with 3D perspective.
 * Creates the "weightless" floating interaction feel.
 */

export class MagneticPull {
    constructor(container, selector = '.surah-card') {
        this.container = container;
        this.selector = selector;
        this.strength = 8;
        this.liftZ = 15;
        this._rafId = null;
        this._boundMove = this._onMouseMove.bind(this);
        this._boundLeave = this._onMouseLeave.bind(this);

        this.container.addEventListener('mousemove', this._boundMove);
        this.container.addEventListener('mouseleave', this._boundLeave);
        this.container.addEventListener('touchmove', (e) => {
            if (e.touches[0]) {
                this._onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            }
        });
    }

    _onMouseMove(e) {
        const cards = this.container.querySelectorAll(this.selector);
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 300;

            if (dist < maxDist) {
                const intensity = 1 - (dist / maxDist);
                const rotateY = (dx / rect.width) * this.strength * intensity;
                const rotateX = -(dy / rect.height) * this.strength * intensity;
                const lift = this.liftZ * intensity;
                const glow = intensity * 0.15;

                card.style.transform = `perspective(${1200}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${lift}px) scale(${1 + intensity * 0.02})`;
                card.style.boxShadow = `0 ${8 + lift}px ${32 + lift}px rgba(27, 138, 122, ${0.06 + glow}), 0 0 ${16 + lift}px rgba(139, 126, 200, ${0.03 + glow * 0.5})`;
            } else {
                card.style.transform = '';
                card.style.boxShadow = '';
            }
        });
    }

    _onMouseLeave() {
        const cards = this.container.querySelectorAll(this.selector);
        cards.forEach(card => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });
    }

    destroy() {
        this.container.removeEventListener('mousemove', this._boundMove);
        this.container.removeEventListener('mouseleave', this._boundLeave);
    }
}
