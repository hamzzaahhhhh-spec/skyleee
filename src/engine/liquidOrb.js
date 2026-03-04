/**
 * 3D Liquid Gold Orb — Nava-e-Ayat
 * A glassmorphic sphere with "liquid gold" sloshing inside.
 * Sine-wave physics, cursor-reactive tilt.
 */

export function createLiquidOrb(progress = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'liquid-orb-wrap';
    wrap.id = 'liquid-orb';

    const fill = Math.min(Math.max(progress, 0), 1);
    const pct = Math.round(fill * 100);
    const yOffset = 100 - (fill * 100);

    wrap.innerHTML = `
    <div class="liquid-orb glass-orb">
      <svg viewBox="0 0 120 120" class="liquid-orb__svg">
        <defs>
          <clipPath id="orbClip">
            <circle cx="60" cy="60" r="54" />
          </clipPath>
          <linearGradient id="goldLiquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F0DFA8" />
            <stop offset="40%" stop-color="#C8A24E" />
            <stop offset="100%" stop-color="#A8862A" />
          </linearGradient>
          <radialGradient id="orbShine" cx="35%" cy="30%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.50)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <!-- Liquid fill -->
        <g clip-path="url(#orbClip)">
          <rect x="0" y="${yOffset}%" width="120" height="${pct + 10}%"
                fill="url(#goldLiquid)" opacity="0.85" />
          <!-- Wave 1 -->
          <path class="liquid-orb__wave liquid-orb__wave--1"
                fill="rgba(200, 162, 78, 0.35)" />
          <!-- Wave 2 -->
          <path class="liquid-orb__wave liquid-orb__wave--2"
                fill="rgba(240, 223, 168, 0.30)" />
        </g>
        <!-- Glass reflection -->
        <circle cx="60" cy="60" r="54" fill="url(#orbShine)" />
        <!-- Outer ring -->
        <circle cx="60" cy="60" r="54" fill="none"
                stroke="rgba(200, 162, 78, 0.20)" stroke-width="1.5" />
      </svg>
      <div class="liquid-orb__counter">
        <div class="liquid-orb__number">${pct}</div>
        <div class="liquid-orb__unit">%</div>
      </div>
    </div>
    <div class="liquid-orb__label">Daily Goal</div>
  `;

    // Animate waves
    requestAnimationFrame(function animateWaves() {
        const waves = wrap.querySelectorAll('.liquid-orb__wave');
        const t = Date.now() * 0.002;
        const y = yOffset;

        waves.forEach((wave, i) => {
            const amp = i === 0 ? 4 : 3;
            const freq = i === 0 ? 1.2 : 0.9;
            const offset = i * 1.5;
            let d = `M0,${y}`;
            for (let x = 0; x <= 120; x += 4) {
                const yVal = y + Math.sin((x * 0.05 * freq) + t + offset) * amp
                    + Math.sin((x * 0.08 * freq) + t * 0.7 + offset) * (amp * 0.5);
                d += ` L${x},${yVal}`;
            }
            d += ` L120,130 L0,130 Z`;
            wave.setAttribute('d', d);
        });

        if (wrap.isConnected) requestAnimationFrame(animateWaves);
    });

    // Cursor tilt
    wrap.addEventListener('mousemove', (e) => {
        const rect = wrap.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        const orb = wrap.querySelector('.liquid-orb');
        orb.style.transform = `perspective(400px) rotateY(${dx * 12}deg) rotateX(${-dy * 12}deg)`;
    });

    wrap.addEventListener('mouseleave', () => {
        const orb = wrap.querySelector('.liquid-orb');
        orb.style.transform = '';
    });

    return wrap;
}
