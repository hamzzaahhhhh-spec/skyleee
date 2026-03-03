/**
 * Audio Player — Nava-e-Ayat
 * Gradient play button with circular "Nava" ring pulsing,
 * waveform visualizer, icon morphing.
 */

import { createIcon, morphIcon } from './IconMorph.js';
import { impactLight } from '../engine/haptics.js';

export class AudioPlayer {
    constructor(container) {
        this.container = container;
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentSurah = null;
        this.audioContext = null;
        this.analyser = null;
        this.canvasEl = null;
        this.canvasCtx = null;
        this.animationId = null;
        this.playBtn = null;
        this.playerEl = null;
        this.navaRings = [];

        this._render();
    }

    _render() {
        this.playerEl = document.createElement('div');
        this.playerEl.className = 'audio-player glass-player';
        this.playerEl.id = 'audio-player';
        this.playerEl.style.display = 'none';

        // Play button with Nava rings
        this.playBtn = document.createElement('button');
        this.playBtn.className = 'audio-player__play-btn';
        this.playBtn.id = 'audio-play-btn';
        this.playBtn.appendChild(createIcon('play', 20));

        // 3 concentric rings
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.className = `nava-ring ${i === 1 ? 'ring-2' : i === 2 ? 'ring-3' : ''}`;
            this.playBtn.appendChild(ring);
            this.navaRings.push(ring);
        }

        this.playBtn.addEventListener('click', () => this.togglePlay());

        // Info
        const info = document.createElement('div');
        info.className = 'audio-player__info';

        this.titleEl = document.createElement('div');
        this.titleEl.className = 'audio-player__title';
        this.titleEl.textContent = 'Ready to play';

        this.subtitleEl = document.createElement('div');
        this.subtitleEl.className = 'audio-player__subtitle';
        this.subtitleEl.textContent = 'Tap to listen';

        info.appendChild(this.titleEl);
        info.appendChild(this.subtitleEl);

        // Waveform canvas
        this.canvasEl = document.createElement('canvas');
        this.canvasEl.className = 'audio-player__waveform';
        this.canvasEl.id = 'waveform-canvas';
        this.canvasEl.width = 180;
        this.canvasEl.height = 72;
        this.canvasCtx = this.canvasEl.getContext('2d');

        this.playerEl.appendChild(this.playBtn);
        this.playerEl.appendChild(info);
        this.playerEl.appendChild(this.canvasEl);
        this.container.appendChild(this.playerEl);

        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            morphIcon(this.playBtn.querySelector('svg'), 'play');
            this._setNavaRings(false);
            this._stopWaveform();
        });

        this.audio.addEventListener('error', () => {
            this.subtitleEl.textContent = 'Audio unavailable';
        });
    }

    loadSurah(url, surahName) {
        this.currentSurah = surahName;
        this.audio.src = url;
        this.audio.load();
        this.titleEl.textContent = surahName;
        this.subtitleEl.textContent = 'Recitation · Al-Afasy';
        this.isPlaying = false;
        morphIcon(this.playBtn.querySelector('svg'), 'play');
        this._setNavaRings(false);
        this._stopWaveform();
    }

    togglePlay() {
        impactLight();
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            morphIcon(this.playBtn.querySelector('svg'), 'play');
            this._setNavaRings(false);
            this._stopWaveform();
        } else {
            this.audio.play().then(() => {
                this.isPlaying = true;
                morphIcon(this.playBtn.querySelector('svg'), 'pause');
                this._initAudioContext();
                this._setNavaRings(true);
                this._startWaveform();
            }).catch(() => {
                this.subtitleEl.textContent = 'Tap again to play';
            });
        }
    }

    _setNavaRings(active) {
        this.navaRings.forEach(ring => {
            ring.classList.toggle('active', active);
        });
    }

    _initAudioContext() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 64;
            const source = this.audioContext.createMediaElementSource(this.audio);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        } catch (e) { }
    }

    _startWaveform() {
        const draw = () => {
            if (!this.isPlaying) return;

            const canvas = this.canvasEl;
            const ctx = this.canvasCtx;
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            if (this.analyser) {
                const bufferLength = this.analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                this.analyser.getByteFrequencyData(dataArray);

                const barCount = 24;
                const barWidth = (w / barCount) - 2;
                const step = Math.floor(bufferLength / barCount);

                for (let i = 0; i < barCount; i++) {
                    const value = dataArray[i * step] / 255;
                    const barHeight = Math.max(3, value * (h - 8));
                    const x = i * (barWidth + 2);
                    const y = (h - barHeight) / 2;

                    // Teal-to-gold gradient per bar
                    const t = i / barCount;
                    const r = Math.round(0 + t * 212);
                    const g = Math.round(191 - t * 16);
                    const b = Math.round(165 - t * 110);
                    const alpha = 0.4 + value * 0.6;

                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, barHeight, 2);
                    ctx.fill();
                }
            } else {
                // Fallback animated bars
                const barCount = 24;
                const barWidth = (w / barCount) - 2;
                const time = Date.now() * 0.003;

                for (let i = 0; i < barCount; i++) {
                    const value = 0.3 + Math.sin(time + i * 0.4) * 0.3 + Math.sin(time * 1.3 + i * 0.7) * 0.2;
                    const barHeight = Math.max(3, value * (h - 8));
                    const x = i * (barWidth + 2);
                    const y = (h - barHeight) / 2;

                    const t = i / barCount;
                    ctx.fillStyle = `rgba(${Math.round(t * 212)}, ${Math.round(191 - t * 16)}, ${Math.round(165 - t * 110)}, ${0.3 + value * 0.5})`;
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, barHeight, 2);
                    ctx.fill();
                }
            }

            this.animationId = requestAnimationFrame(draw);
        };
        draw();
    }

    _stopWaveform() {
        if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }

        const ctx = this.canvasCtx;
        const w = this.canvasEl.width;
        const h = this.canvasEl.height;
        ctx.clearRect(0, 0, w, h);

        const barCount = 24;
        const barWidth = (w / barCount) - 2;
        for (let i = 0; i < barCount; i++) {
            const x = i * (barWidth + 2);
            const y = (h - 3) / 2;
            const t = i / barCount;
            ctx.fillStyle = `rgba(${Math.round(t * 212)}, ${Math.round(191 - t * 16)}, ${Math.round(165 - t * 110)}, 0.2)`;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, 3, 2);
            ctx.fill();
        }
    }

    show() {
        this.playerEl.style.display = '';
        this.playerEl.animate([
            { transform: 'translateX(-50%) translateY(100%)', opacity: 0 },
            { transform: 'translateX(-50%) translateY(0)', opacity: 1 }
        ], { duration: 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
    }

    hide() {
        this.audio.pause();
        this.isPlaying = false;
        this._setNavaRings(false);
        this._stopWaveform();
        this.playerEl.style.display = 'none';
    }

    destroy() {
        this.audio.pause();
        this.audio.src = '';
        this._stopWaveform();
        this._setNavaRings(false);
        if (this.audioContext) this.audioContext.close();
        this.playerEl.remove();
    }
}
