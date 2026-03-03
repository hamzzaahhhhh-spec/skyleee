/**
 * Physics Scroll Engine
 * iOS-style momentum scrolling with rubber-band boundaries.
 * Uses requestAnimationFrame for 120fps-capable animation loop.
 */

export class PhysicsScroller {
  /**
   * @param {HTMLElement} container — the overflow:hidden wrapper
   * @param {HTMLElement} content   — the translating inner element
   * @param {Object} opts
   */
  constructor(container, content, opts = {}) {
    this.container = container;
    this.content = content;

    // Physics constants
    this.friction = opts.friction ?? 0.95;          // momentum decay per frame
    this.bounceStiffness = opts.bounceStiffness ?? 0.08; // rubber-band pull-back
    this.bounceDamping = opts.bounceDamping ?? 0.7;      // rubber-band damping
    this.overscrollResistance = opts.overscrollResistance ?? 0.35;
    this.minVelocity = 0.5; // px/frame — stop threshold

    // State
    this.scrollY = 0;
    this.velocity = 0;
    this.targetY = 0;
    this.isDragging = false;
    this.isAnimating = false;
    this.lastTouchY = 0;
    this.lastTouchTime = 0;
    this.lastDelta = 0;
    this.rafId = null;
    this.headerOffset = opts.headerOffset ?? 0;

    // Haptic callback
    this.onHaptic = opts.onHaptic ?? null;
    this.lastHapticItem = -1;

    // Bind handlers
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._animate = this._animate.bind(this);

    this._attach();
  }

  _attach() {
    this.container.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this.container.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this._onTouchEnd, { passive: true });
    this.container.addEventListener('wheel', this._onWheel, { passive: false });
  }

  destroy() {
    this.container.removeEventListener('touchstart', this._onTouchStart);
    this.container.removeEventListener('touchmove', this._onTouchMove);
    this.container.removeEventListener('touchend', this._onTouchEnd);
    this.container.removeEventListener('wheel', this._onWheel);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  get maxScroll() {
    const contentH = this.content.scrollHeight;
    const containerH = this.container.clientHeight;
    return Math.max(0, contentH - containerH);
  }

  get isOverscrolling() {
    return this.scrollY < 0 || this.scrollY > this.maxScroll;
  }

  _clamp(val) {
    return Math.max(0, Math.min(val, this.maxScroll));
  }

  // ── Touch Handlers ──

  _onTouchStart(e) {
    this.isDragging = true;
    this.velocity = 0;
    this.lastTouchY = e.touches[0].clientY;
    this.lastTouchTime = performance.now();

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _onTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const touchY = e.touches[0].clientY;
    let delta = this.lastTouchY - touchY;
    const now = performance.now();

    // Apply overscroll resistance at boundaries
    if (this.scrollY < 0 || this.scrollY > this.maxScroll) {
      delta *= this.overscrollResistance;
    }

    this.scrollY += delta;
    this.lastDelta = delta;
    this.lastTouchY = touchY;
    
    // Calculate velocity for momentum
    const dt = now - this.lastTouchTime;
    if (dt > 0) {
      this.velocity = delta / (dt / 16); // normalize to ~60fps frame
    }
    this.lastTouchTime = now;

    this._applyTransform();
    this._checkHaptic();
  }

  _onTouchEnd() {
    this.isDragging = false;
    this._startMomentum();
  }

  _onWheel(e) {
    e.preventDefault();
    this.velocity = 0;
    
    this.scrollY += e.deltaY * 0.5;
    this.scrollY = this._clamp(this.scrollY);
    this._applyTransform();

    // Start bounce-back if needed
    if (!this.isAnimating) {
      this._startMomentum();
    }
  }

  // ── Momentum & Bounce ──

  _startMomentum() {
    this.isAnimating = true;
    this._animate();
  }

  _animate() {
    if (this.isDragging) {
      this.isAnimating = false;
      return;
    }

    const max = this.maxScroll;

    if (this.scrollY < 0) {
      // Rubber-band bounce back from top
      const spring = -this.scrollY * this.bounceStiffness;
      this.velocity = (this.velocity + spring) * this.bounceDamping;
      this.scrollY += this.velocity;

      if (Math.abs(this.scrollY) < 0.5 && Math.abs(this.velocity) < this.minVelocity) {
        this.scrollY = 0;
        this.velocity = 0;
      }
    } else if (this.scrollY > max) {
      // Rubber-band bounce back from bottom
      const overshoot = this.scrollY - max;
      const spring = -overshoot * this.bounceStiffness;
      this.velocity = (this.velocity + spring) * this.bounceDamping;
      this.scrollY += this.velocity;

      if (Math.abs(this.scrollY - max) < 0.5 && Math.abs(this.velocity) < this.minVelocity) {
        this.scrollY = max;
        this.velocity = 0;
      }
    } else {
      // Normal momentum
      this.velocity *= this.friction;
      this.scrollY += this.velocity;

      if (Math.abs(this.velocity) < this.minVelocity) {
        this.velocity = 0;
      }
    }

    this._applyTransform();
    this._checkHaptic();

    if (Math.abs(this.velocity) > 0.01 || this.isOverscrolling) {
      this.rafId = requestAnimationFrame(this._animate);
    } else {
      this.isAnimating = false;
      this.rafId = null;
    }
  }

  _applyTransform() {
    this.content.style.transform = `translate3d(0, ${-this.scrollY}px, 0)`;
  }

  _checkHaptic() {
    if (!this.onHaptic) return;
    // Trigger haptic when crossing item boundaries (every ~72px)
    const itemSize = 72;
    const currentItem = Math.floor(this.scrollY / itemSize);
    if (currentItem !== this.lastHapticItem && currentItem >= 0) {
      this.lastHapticItem = currentItem;
      this.onHaptic('selection');
    }
  }

  scrollTo(y, animated = true) {
    if (!animated) {
      this.scrollY = this._clamp(y);
      this.velocity = 0;
      this._applyTransform();
      return;
    }
    this.velocity = 0;
    this.scrollY = this._clamp(y);
    this._applyTransform();
  }

  scrollToTop(animated = true) {
    this.scrollTo(0, animated);
  }
}
