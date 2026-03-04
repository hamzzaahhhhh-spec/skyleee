/**
 * Divine Light Shader — Nava-e-Ayat
 * Teal & Gold radial gradients following touch/mouse/gyroscope.
 */

export class DivineLight {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.mouseX = 0.5;
        this.mouseY = 0.3;
        this.targetX = 0.5;
        this.targetY = 0.3;
        this.time = 0;
        this.isRunning = false;
        this.rafId = null;

        this._onResize = this._onResize.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onDeviceOrientation = this._onDeviceOrientation.bind(this);
        this._render = this._render.bind(this);

        this._init();
    }

    _init() {
        this._onResize();
        window.addEventListener('resize', this._onResize);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('touchmove', this._onTouchMove, { passive: true });
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', this._onDeviceOrientation, { passive: true });
        }
        this.start();
    }

    _onResize() {
        const dpr = Math.min(window.devicePixelRatio, 2);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.scale(dpr, dpr);
    }

    _onMouseMove(e) {
        this.targetX = e.clientX / this.width;
        this.targetY = e.clientY / this.height;
    }

    _onTouchMove(e) {
        if (e.touches.length > 0) {
            this.targetX = e.touches[0].clientX / this.width;
            this.targetY = e.touches[0].clientY / this.height;
        }
    }

    _onDeviceOrientation(e) {
        if (e.gamma !== null && e.beta !== null) {
            this.targetX = Math.max(0, Math.min(1, (e.gamma + 45) / 90));
            this.targetY = Math.max(0, Math.min(1, (e.beta + 45) / 90));
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._render();
    }

    stop() {
        this.isRunning = false;
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('touchmove', this._onTouchMove);
        window.removeEventListener('deviceorientation', this._onDeviceOrientation);
    }

    _render() {
        if (!this.isRunning) return;
        this.time += 0.002;

        // Smooth follow
        this.mouseX += (this.targetX - this.mouseX) * 0.025;
        this.mouseY += (this.targetY - this.mouseY) * 0.025;

        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear with base color (Soft Cream)
        ctx.fillStyle = '#FDFCF9';
        ctx.fillRect(0, 0, w, h);

        // Teal orb (primary, follows cursor)
        this._drawOrb(ctx,
            w * (this.mouseX * 0.5 + 0.25),
            h * (this.mouseY * 0.5 + 0.1),
            Math.max(w, h) * 0.45,
            `rgba(0, 191, 165, ${0.06 + Math.sin(this.time) * 0.02})`,
            'rgba(0, 191, 165, 0)'
        );

        // Lavender orb (secondary, inverse movement)
        this._drawOrb(ctx,
            w * (1 - this.mouseX * 0.3 + Math.sin(this.time * 0.6) * 0.04),
            h * (0.65 + Math.cos(this.time * 0.4) * 0.08),
            Math.max(w, h) * 0.38,
            `rgba(180, 160, 230, ${0.04 + Math.cos(this.time * 1.2) * 0.015})`,
            'rgba(180, 160, 230, 0)'
        );

        // Subtle cool accent
        this._drawOrb(ctx,
            w * (0.3 + Math.sin(this.time * 0.35) * 0.08),
            h * (this.mouseY * 0.25 + 0.45),
            Math.max(w, h) * 0.3,
            `rgba(38, 198, 218, ${0.03 + Math.sin(this.time * 0.8) * 0.01})`,
            'rgba(38, 198, 218, 0)'
        );

        // Cursor-following teal highlight
        this._drawOrb(ctx,
            w * this.mouseX,
            h * this.mouseY,
            180,
            'rgba(0, 191, 165, 0.04)',
            'rgba(0, 191, 165, 0)'
        );

        this.rafId = requestAnimationFrame(this._render);
    }

    _drawOrb(ctx, x, y, radius, colorInner, colorOuter) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, colorInner);
        gradient.addColorStop(1, colorOuter);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
    }
}
