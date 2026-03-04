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
        // Do NOT set crossOrigin='anonymous' — cdn.islamic.network does not send
        // Access-Control-Allow-Origin, so setting it blocks every request.
        // The waveform analyser will fall back to animated bars gracefully.
        this.audio.preload = 'auto';
        this.audio.controls = false;
        this.isPlaying = false;
        this.currentSurah = null;
        this.currentSurahAyahs = [];
        this.audioContext = null;
        this.analyser = null;
        this.canvasEl = null;
        this.canvasCtx = null;
        this.animationId = null;
        this.playBtn = null;
        this.playerEl = null;
        this.navaRings = [];
        this.activeVerseIndex = 0;
        this.totalVerses = 0;
        this.verseAudioUrls = [];
        this.onVerseChange = null;
        this.onPlaybackFrame = null;
        this._syncRafId = null;
        this._advanceLock = false;
        this._userPaused = false;
        this._prefetchedAudio = null;
        this._prefetchedIndex = -1;
        this.onPlayStateChange = null; // (isPlaying: boolean) => void
        this.currentSurahNumber = 1;  // stored for everyayah.com URL padding

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

        // GAPLESS CHAIN — single synchronous-style handler, no async race
        this.audio.addEventListener('ended', () => this._playNextVerse());

        this.audio.addEventListener('error', (e) => {
            // Only skip-and-advance if we're actively playing, not on initial load failure
            if (this.isPlaying && !this._userPaused && !this.audio.paused) {
                console.warn('[AudioPlayer] Audio error during playback, skipping verse', this.activeVerseIndex + 1, e);
                this._playNextVerse();
            } else {
                console.warn('[AudioPlayer] Audio load error (not playing):', e);
                this.subtitleEl.textContent = 'Audio unavailable';
            }
        });

        this.audio.addEventListener('timeupdate', () => this._checkPrefetch());
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
        console.log('[AudioPlayer] togglePlay called. isPlaying:', this.isPlaying, 'totalVerses:', this.totalVerses);

        if (this.isPlaying) {
            this._userPaused = true;
            this.audio.pause();
            this._setPlayingState(false);
        } else {
            if (this.totalVerses === 0) {
                console.error('[AudioPlayer] No surah loaded');
                this.subtitleEl.textContent = 'No audio loaded';
                return;
            }

            this._userPaused = false;

            // Always force-set the src to the correct verse URL.
            // This guarantees the audio element has a valid, fresh source
            // pointing at everyayah.com regardless of prior state.
            const url = this.verseAudioUrls[this.activeVerseIndex];
            this.audio.src = url;

            console.log('[AudioPlayer] Starting playback — verse', this.activeVerseIndex + 1, url);

            // Notify UI immediately so it scrolls/highlights the verse now
            this._safeNotifyVerseChange(this.activeVerseIndex);

            // load() inside the trusted user-click event chain = CORS allowed.
            // play() returns a promise that resolves once enough data is buffered.
            this.audio.load();
            this.audio.play()
                .then(() => {
                    console.log('[AudioPlayer] Play started successfully');
                    this._setPlayingState(true);
                })
                .catch((err) => {
                    console.error('[AudioPlayer] play() failed:', err);
                    this.subtitleEl.textContent = 'Tap again to play';
                });
        }
    }

    // Central playing-state manager — all visual + callback updates go here
    _setPlayingState(playing) {
        this.isPlaying = playing;
        if (playing) {
            morphIcon(this.playBtn.querySelector('svg'), 'pause');
            this._setNavaRings(true);
            this._initAudioContext();
            this._startWaveform();
            this._startSyncLoop();
        } else {
            morphIcon(this.playBtn.querySelector('svg'), 'play');
            this._setNavaRings(false);
            this._stopWaveform();
            this._stopSyncLoop();
        }
        if (this.onPlayStateChange) {
            try { this.onPlayStateChange(playing); } catch (e) { /* ignore */ }
        }
    }

    _setNavaRings(active) {
        this.navaRings.forEach(ring => {
            ring.classList.toggle('active', active);
        });
    }

    _initAudioContext() {
        // IMPORTANT: Do NOT call createMediaElementSource(this.audio) here.
        //
        // createMediaElementSource() hijacks the <audio> element's output and
        // routes ALL sound through the Web Audio API graph. When the audio is
        // cross-origin (everyayah.com) without CORS headers on the element,
        // the Web Audio API security model ZEROES OUT the entire audio signal.
        // Result: currentTime advances, 'ended' fires, but the user hears
        // COMPLETE SILENCE.
        //
        // The waveform visualizer uses the animated fallback bars instead,
        // which look great and don't require Web Audio API at all.
        this.analyser = null;
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
        this._advanceLock = false;
        this._userPaused = false;
        this._stopSyncLoop();
        this._destroyPrefetch();
        this._setNavaRings(false);
        this._stopWaveform();
        this.playerEl.style.display = 'none';
    }

    loadSurahForPlayback(surahData) {
        console.log('[AudioPlayer] Loading Surah for playback:', surahData.arabic.englishName);

        this.currentSurah = surahData.arabic.englishName;
        this.currentSurahNumber = surahData.arabic.number; // stored for URL padding
        this.currentSurahAyahs = surahData.arabic.ayahs;
        this.totalVerses = surahData.arabic.ayahs.length;
        this.activeVerseIndex = 0;
        this._advanceLock = false;
        this._userPaused = false;
        this._destroyPrefetch();

        // ── CDN: everyayah.com — serves all files with Access-Control-Allow-Origin: *
        // URL format: /{surah_3digits}{verse_3digits}.mp3
        // e.g. Al-Fatiha v1 = 001001.mp3  |  Al-Kahf v1 = 018001.mp3
        const sNum = String(surahData.arabic.number).padStart(3, '0');
        this.verseAudioUrls = surahData.arabic.ayahs.map(ayah => {
            const vNum = String(ayah.numberInSurah).padStart(3, '0');
            return `https://everyayah.com/data/Alafasy_128kbps/${sNum}${vNum}.mp3`;
        });

        // Set src only — do NOT call load() here.
        // load() outside a user-gesture context can still be blocked by some browsers.
        // togglePlay() will call load() inside the trusted click event chain.
        this.audio.src = this.verseAudioUrls[0];

        console.log('[AudioPlayer] First verse URL:', this.verseAudioUrls[0]);

        this.titleEl.textContent = this.currentSurah;
        this.subtitleEl.textContent = `Verse 1 of ${this.totalVerses} · Al-Afasy`;
        this.isPlaying = false;
        this._stopSyncLoop();
        morphIcon(this.playBtn.querySelector('svg'), 'play');
        this._setNavaRings(false);
        this._stopWaveform();

        console.log('[AudioPlayer] Surah loaded. Ready to play:', this.totalVerses, 'verses (everyayah.com)');
    }

    destroy() {
        this.audio.pause();
        this.audio.src = '';
        this._advanceLock = false;
        this._userPaused = false;
        this._destroyPrefetch();
        this._stopSyncLoop();
        this._stopWaveform();
        this._setNavaRings(false);
        this.playerEl.remove();
    }

    _destroyPrefetch() {
        if (this._prefetchedAudio) {
            this._prefetchedAudio.src = '';
            this._prefetchedAudio = null;
        }
        this._prefetchedIndex = -1;
    }

    // ── Gapless Verse Chain ──────────────────────────────────────────────────
    //
    // Bulletproof design: synchronous src swap + immediate .play() call.
    // No async/await, no _advanceLock races, no retry loops on the critical path.
    // Browser autoplay is guaranteed here because 'ended' is classified as a
    // trusted event (same gesture chain as the original user-initiated play).
    _playNextVerse() {
        if (this._userPaused) return;

        const nextIndex = this.activeVerseIndex + 1;

        if (nextIndex >= this.totalVerses) {
            // Reached the end of the Surah
            this._setPlayingState(false);
            this.titleEl.textContent = this.currentSurah;
            this.subtitleEl.textContent = `Completed · ${this.totalVerses} verses`;
            this._safeNotifyVerseChange(-1);
            return;
        }

        const url = this.verseAudioUrls[nextIndex];
        if (!url) return;

        // Stop the rAF loop during src swap to avoid stale-time reads
        this._stopSyncLoop();

        // Swap src — if prefetched, the browser HTTP cache makes this instant
        this.audio.src = url;
        this._destroyPrefetch();

        // Update state IMMEDIATELY so the UI stays in sync
        this.activeVerseIndex = nextIndex;
        const ayah = this.currentSurahAyahs[nextIndex];
        this.subtitleEl.textContent = `Verse ${ayah.numberInSurah} of ${this.totalVerses} · Al-Afasy`;

        // Fire verse change NOW — don't wait for play() to resolve.
        // This eliminates the 100-300ms lag where the old verse was still shown.
        this._safeNotifyVerseChange(nextIndex);

        // Immediate play — 'ended' is a trusted event, autoplay is allowed
        this.audio.play()
            .then(() => {
                // Restart the rAF sync loop once audio is flowing
                this._setPlayingState(true);
                console.log('[AudioPlayer] Gapless advance to verse', nextIndex + 1);
            })
            .catch((err) => {
                console.error('[AudioPlayer] Autoplay prevented on advance:', err);
                this._setPlayingState(false);
                this.subtitleEl.textContent = `Tap to continue · Verse ${nextIndex + 1}`;
            });
    }

    _checkPrefetch() {
        if (!this.isPlaying || this._userPaused) return;
        const duration = this.audio.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;

        const progress = this.audio.currentTime / duration;
        if (progress >= 0.8) {
            const nextIndex = this.activeVerseIndex + 1;
            if (nextIndex < this.totalVerses && this._prefetchedIndex !== nextIndex) {
                this._prefetchNextVerse(nextIndex);
            }
        }
    }

    _prefetchNextVerse(index) {
        const url = this.verseAudioUrls[index];
        if (!url) return;

        // Clean up previous prefetch
        if (this._prefetchedAudio) {
            this._prefetchedAudio.src = '';
            this._prefetchedAudio = null;
        }

        this._prefetchedIndex = index;
        const prefetch = new Audio();
        prefetch.preload = 'auto';
        // No crossOrigin — same CDN CORS restriction as main audio element
        prefetch.src = url;
        this._prefetchedAudio = prefetch;
        console.log('[AudioPlayer] Prefetching verse', index + 1);
    }

    _safeNotifyVerseChange(verseIndex) {
        if (!this.onVerseChange) return;
        try {
            this.onVerseChange(verseIndex);
        } catch (err) {
            console.error('[AudioPlayer] onVerseChange callback failed:', err);
        }
    }

    _startSyncLoop() {
        if (this._syncRafId) return;

        const tick = () => {
            if (!this.isPlaying || !this.audio || this.audio.paused) {
                this._syncRafId = null;
                return;
            }

            if (this.onPlaybackFrame) {
                const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
                const currentTime = this.audio.currentTime || 0;
                const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

                try {
                    this.onPlaybackFrame({
                        verseIndex: this.activeVerseIndex,
                        currentTime,
                        duration,
                        progress
                    });
                } catch (err) {
                    console.error('[AudioPlayer] onPlaybackFrame callback failed:', err);
                }
            }

            this._syncRafId = requestAnimationFrame(tick);
        };

        this._syncRafId = requestAnimationFrame(tick);
    }

    _stopSyncLoop() {
        if (!this._syncRafId) return;
        cancelAnimationFrame(this._syncRafId);
        this._syncRafId = null;
    }

    async _playWithRetry(maxAttempts = 3) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await this.audio.play();
                return true;
            } catch (err) {
                if (attempt >= maxAttempts) {
                    console.error('[AudioPlayer] play() failed after retries:', err);
                    return false;
                }
                await new Promise(resolve => setTimeout(resolve, 120 * attempt));
            }
        }
        return false;
    }
}
