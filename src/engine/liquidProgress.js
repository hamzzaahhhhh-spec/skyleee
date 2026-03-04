/**
 * Liquid Progress Vessel — Nava-e-Ayat
 * A wave-animated liquid-filled progress indicator.
 * Gold/teal liquid that sloshes as progress increases.
 */

export function createLiquidProgress(progress = 0, color = 'teal') {
    const vessel = document.createElement('div');
    vessel.className = 'liquid-vessel';
    vessel.id = 'liquid-progress';

    const fillPercent = Math.min(Math.max(progress, 0), 1) * 100;
    const offset = 100 - fillPercent;

    const colors = color === 'gold'
        ? { fill: '#F5C842', fillLight: '#FDE68A', wave: 'rgba(245, 200, 66, 0.4)' }
        : { fill: '#00E5C3', fillLight: '#7EFCCF', wave: 'rgba(0, 229, 195, 0.4)' };

    vessel.innerHTML = `
    <svg viewBox="0 0 100 120" class="liquid-vessel__svg">
      <defs>
        <clipPath id="vesselClip">
          <path d="M25,10 Q25,0 35,0 L65,0 Q75,0 75,10 L78,95 Q78,115 60,118 L40,118 Q22,115 22,95 Z" />
        </clipPath>
        <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${colors.fillLight}" />
          <stop offset="100%" stop-color="${colors.fill}" />
        </linearGradient>
      </defs>
      <!-- Vessel outline -->
      <path d="M25,10 Q25,0 35,0 L65,0 Q75,0 75,10 L78,95 Q78,115 60,118 L40,118 Q22,115 22,95 Z"
            fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
      <!-- Liquid fill group -->
      <g clip-path="url(#vesselClip)">
        <!-- Main liquid -->
        <rect x="0" y="${offset}%" width="100" height="${fillPercent + 10}%"
              fill="url(#liquidGrad)" opacity="0.85" />
        <!-- Wave 1 -->
        <path class="liquid-wave liquid-wave-1"
              d="M0,${offset} Q15,${offset - 4} 25,${offset} T50,${offset} T75,${offset} T100,${offset} V120 H0 Z"
              fill="${colors.wave}" />
        <!-- Wave 2 -->
        <path class="liquid-wave liquid-wave-2"
              d="M0,${offset + 2} Q20,${offset - 2} 35,${offset + 2} T60,${offset + 2} T85,${offset + 2} T100,${offset + 2} V120 H0 Z"
              fill="${colors.fill}" opacity="0.5" />
      </g>
      <!-- Glass reflection -->
      <ellipse cx="40" cy="20" rx="8" ry="4" fill="rgba(255,255,255,0.12)" />
    </svg>
    <div class="liquid-vessel__label">${Math.round(fillPercent)}%</div>
  `;

    return vessel;
}

/**
 * Update the liquid level in an existing vessel.
 */
export function updateLiquidProgress(vessel, progress) {
    const fillPercent = Math.min(Math.max(progress, 0), 1) * 100;
    const offset = 100 - fillPercent;

    const rect = vessel.querySelector('rect');
    if (rect) {
        rect.setAttribute('y', `${offset}%`);
        rect.setAttribute('height', `${fillPercent + 10}%`);
    }

    const waves = vessel.querySelectorAll('.liquid-wave');
    waves.forEach((wave, i) => {
        const yOff = i === 0 ? offset : offset + 2;
        const wobble = i === 0 ? 4 : 2;
        wave.setAttribute('d',
            `M0,${yOff} Q15,${yOff - wobble} 25,${yOff} T50,${yOff} T75,${yOff} T100,${yOff} V120 H0 Z`
        );
    });

    const label = vessel.querySelector('.liquid-vessel__label');
    if (label) label.textContent = `${Math.round(fillPercent)}%`;
}
