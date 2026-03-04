/**
 * Sparkle Particle Engine — Nava-e-Ayat
 * Canvas-based gold particle celebration effect
 * for streak goal completion.
 */

export class SparkleEngine {
    constructor(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext('2d');
        this.particles = [];
        this.isRunning = false;
        this._resize();
        window.addEventListener('resize', () => this._resize());
    }

    _resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.w = rect.width;
        this.h = rect.height;
    }

    burst(x, y, count = 24) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 1.5 + Math.random() * 3;
            const size = 1.5 + Math.random() * 3;
            const life = 40 + Math.random() * 30;
            const hue = 42 + Math.random() * 15; // Gold hue range

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                size,
                life,
                maxLife: life,
                hue,
                gravity: 0.04,
            });
        }

        if (!this.isRunning) {
            this.isRunning = true;
            this._animate();
        }
    }

    _animate() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        this.particles = this.particles.filter(p => p.life > 0);

        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.life--;

            const progress = p.life / p.maxLife;
            const alpha = progress * 0.9;
            const scale = progress;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `hsl(${p.hue}, 75%, 55%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
            ctx.fill();

            // Glow
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = `hsl(${p.hue}, 85%, 70%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * scale * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.particles.length > 0) {
            requestAnimationFrame(() => this._animate());
        } else {
            this.isRunning = false;
        }
    }
}
