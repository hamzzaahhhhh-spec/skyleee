/**
 * FLIP Transition Engine
 * Hero / shared-element transitions using the First-Last-Invert-Play technique.
 * Targets 120fps by using only transform and opacity.
 */

/**
 * Perform a FLIP hero transition from a source element to a target element.
 * 
 * @param {HTMLElement} sourceEl      — the element in the origin view (e.g. surah card)
 * @param {HTMLElement} targetEl      — the element in the destination view (e.g. reading header)
 * @param {HTMLElement} overlayEl     — a fixed overlay container for the clone
 * @param {Object}      opts
 * @param {number}      opts.duration — transition duration in ms (default 600)
 * @param {string}      opts.easing   — CSS easing (default spring curve)
 * @param {Function}    opts.onStart  — called when animation begins
 * @param {Function}    opts.onEnd    — called when animation completes
 * @returns {Promise} resolves when transition completes
 */
export function flipTransition(sourceEl, targetEl, overlayEl, opts = {}) {
    const duration = opts.duration ?? 600;
    const easing = opts.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)';

    return new Promise((resolve) => {
        // FIRST — capture source rect
        const firstRect = sourceEl.getBoundingClientRect();

        // Create clone for animation
        const clone = sourceEl.cloneNode(true);
        clone.classList.add('hero-clone');
        clone.style.cssText = `
      position: fixed;
      top: ${firstRect.top}px;
      left: ${firstRect.left}px;
      width: ${firstRect.width}px;
      height: ${firstRect.height}px;
      border-radius: ${getComputedStyle(sourceEl).borderRadius};
      background: ${getComputedStyle(sourceEl).background};
      backdrop-filter: ${getComputedStyle(sourceEl).backdropFilter};
      z-index: 9999;
      pointer-events: none;
      transform-origin: top left;
      will-change: transform, width, height, border-radius, opacity;
    `;

        overlayEl.appendChild(clone);

        // Hide source
        sourceEl.style.opacity = '0';

        if (opts.onStart) opts.onStart();

        // Force layout
        clone.getBoundingClientRect();

        // LAST — capture target rect
        const lastRect = targetEl.getBoundingClientRect();

        // INVERT & PLAY — animate from first to last using Web Animations API
        const animation = clone.animate([
            {
                top: `${firstRect.top}px`,
                left: `${firstRect.left}px`,
                width: `${firstRect.width}px`,
                height: `${firstRect.height}px`,
                borderRadius: getComputedStyle(sourceEl).borderRadius,
                opacity: 1,
            },
            {
                top: `${lastRect.top}px`,
                left: `${lastRect.left}px`,
                width: `${lastRect.width}px`,
                height: `${lastRect.height}px`,
                borderRadius: '0px',
                opacity: 1,
            }
        ], {
            duration,
            easing,
            fill: 'forwards',
        });

        animation.onfinish = () => {
            clone.remove();
            sourceEl.style.opacity = '';
            if (opts.onEnd) opts.onEnd();
            resolve();
        };
    });
}

/**
 * Reverse FLIP — animate back from target to source position
 */
export function flipTransitionReverse(targetEl, sourceRect, overlayEl, opts = {}) {
    const duration = opts.duration ?? 500;
    const easing = opts.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)';

    return new Promise((resolve) => {
        const lastRect = targetEl.getBoundingClientRect();

        const clone = document.createElement('div');
        clone.classList.add('hero-clone');
        clone.style.cssText = `
      position: fixed;
      top: ${lastRect.top}px;
      left: ${lastRect.left}px;
      width: ${lastRect.width}px;
      height: ${lastRect.height}px;
      border-radius: 0px;
      background: var(--color-bg);
      z-index: 9999;
      pointer-events: none;
      will-change: transform, width, height, border-radius, opacity;
    `;
        overlayEl.appendChild(clone);

        const animation = clone.animate([
            {
                top: `${lastRect.top}px`,
                left: `${lastRect.left}px`,
                width: `${lastRect.width}px`,
                height: `${lastRect.height}px`,
                borderRadius: '0px',
                opacity: 1,
            },
            {
                top: `${sourceRect.top}px`,
                left: `${sourceRect.left}px`,
                width: `${sourceRect.width}px`,
                height: `${sourceRect.height}px`,
                borderRadius: '16px',
                opacity: 0.6,
            }
        ], {
            duration,
            easing,
            fill: 'forwards',
        });

        animation.onfinish = () => {
            clone.remove();
            if (opts.onEnd) opts.onEnd();
            resolve();
        };
    });
}

/**
 * Staggered entry animation for a list of elements
 * @param {HTMLElement[]} elements 
 * @param {Object} opts
 */
export function staggeredEntry(elements, opts = {}) {
    const delay = opts.delay ?? 60;
    const duration = opts.duration ?? 500;
    const easing = opts.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)';

    elements.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px) scale(0.96)';

        requestAnimationFrame(() => {
            const animation = el.animate([
                { opacity: 0, transform: 'translateY(24px) scale(0.96)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' }
            ], {
                duration,
                delay: i * delay,
                easing,
                fill: 'forwards',
            });

            animation.onfinish = () => {
                el.style.opacity = '1';
                el.style.transform = '';
            };
        });
    });
}
