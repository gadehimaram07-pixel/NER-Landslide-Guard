// Web Audio API Disaster Early Warning Siren Engine
// Pure native synthesizer: 100% offline, zero network latency, no external mp3 assets required.

class SirenAudioManager {
  constructor() {
    this.audioCtx = null;
    this.activeNodes = null;
    this.isPlayingState = false;
    this.isMutedState = typeof window !== 'undefined' && localStorage.getItem('ner_siren_muted') === 'true';
    this.volume = 0.22; // Comfortable, clear, non-deafening volume level
    this.listeners = new Set();
    this.stopTimer = null;
    this.currentMode = 'wail'; // 'wail' (municipal undulating) | 'klaxon' (rapid two-tone)

    // Eagerly bind interaction listeners so the AudioContext is unlocked
    // the very first time the user touches or clicks anywhere on the page.
    this.initInteractionUnlock();
  }

  initInteractionUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.ensureContext();
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('pointerdown', unlock, true);
    };

    window.addEventListener('click', unlock, { capture: true, once: true });
    window.addEventListener('keydown', unlock, { capture: true, once: true });
    window.addEventListener('touchstart', unlock, { capture: true, once: true });
    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.audioCtx) {
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Initial emit
    listener({ isPlaying: this.isPlayingState, isMuted: this.isMutedState, mode: this.currentMode });
    return () => this.listeners.delete(listener);
  }

  notify() {
    const payload = {
      isPlaying: this.isPlayingState,
      isMuted: this.isMutedState,
      mode: this.currentMode
    };
    this.listeners.forEach(cb => {
      try { cb(payload); } catch (e) { console.error(e); }
    });
  }

  isMuted() {
    return this.isMutedState;
  }

  isPlaying() {
    return this.isPlayingState;
  }

  setMuted(muted) {
    this.isMutedState = !!muted;
    try {
      localStorage.setItem('ner_siren_muted', this.isMutedState ? 'true' : 'false');
    } catch (e) {}

    if (this.isMutedState && this.isPlayingState) {
      this.stop();
    }
    this.notify();
  }

  toggleMute() {
    this.setMuted(!this.isMutedState);
    return this.isMutedState;
  }

  setVolume(val) {
    this.volume = Math.max(0.01, Math.min(1.0, val));
    if (this.activeNodes?.masterGain && this.audioCtx) {
      this.activeNodes.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  /**
   * Start the Siren Sound.
   * @param {Object} options
   * @param {'wail' | 'klaxon'} [options.mode='wail'] Siren tone mode
   * @param {number} [options.duration=8000] Auto-stop duration in ms (set 0 or false for continuous)
   * @param {boolean} [options.force=false] Force play even if already playing
   */
  play({ mode = 'wail', duration = 8000, force = false } = {}) {
    if (this.isMutedState) {
      console.log('Siren is currently muted by user.');
      return false;
    }

    const ctx = this.ensureContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(err => console.warn('AudioContext resume was blocked:', err));
    }

    if (this.isPlayingState && !force && this.currentMode === mode) {
      // Refresh auto-stop timer if called again
      if (duration && duration > 0) {
        if (this.stopTimer) clearTimeout(this.stopTimer);
        this.stopTimer = setTimeout(() => this.stop(), duration);
      }
      return true;
    }

    // Stop existing nodes cleanly if switching or restarting
    this.stopNodesOnly();

    try {
      this.currentMode = mode;
      const now = ctx.currentTime;

      // Master Gain with smooth fade-in to prevent harsh audio pop
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.25);
      masterGain.connect(ctx.destination);

      // Primary tone oscillator
      const osc1 = ctx.createOscillator();
      // Secondary harmonic overtone oscillator
      const osc2 = ctx.createOscillator();
      // Low Frequency Oscillator for undulating pitch sweep
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      if (mode === 'klaxon') {
        // High Hazard Alert Klaxon (rapid alternating 620Hz <-> 860Hz two-tone)
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(740, now);
        osc2.frequency.setValueAtTime(740, now);

        lfo.type = 'square'; // sharp klaxon alternation
        lfo.frequency.setValueAtTime(2.2, now); // 2.2Hz rapid alternating pulse
        lfoGain.gain.setValueAtTime(120, now); // +/- 120Hz

        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);
      } else {
        // Authentic Undulating Municipal Early Warning Siren (520Hz - 960Hz)
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(740, now);
        osc2.frequency.setValueAtTime(745, now);

        lfo.type = 'sine'; // smooth sinusoidal rising & falling wail
        lfo.frequency.setValueAtTime(0.65, now); // ~1.5s wave cycle
        lfoGain.gain.setValueAtTime(220, now); // +/- 220Hz deviation

        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);
      }

      osc1.connect(masterGain);
      osc2.connect(masterGain);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      this.activeNodes = { masterGain, osc1, osc2, lfo };
      this.isPlayingState = true;
      this.notify();

      if (this.stopTimer) clearTimeout(this.stopTimer);
      if (duration && duration > 0) {
        this.stopTimer = setTimeout(() => {
          this.stop();
        }, duration);
      }

      return true;
    } catch (err) {
      console.error('Failed to play siren sound:', err);
      this.isPlayingState = false;
      this.notify();
      return false;
    }
  }

  stopNodesOnly() {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (this.activeNodes) {
      try {
        const { masterGain, osc1, osc2, lfo } = this.activeNodes;
        if (this.audioCtx) {
          const now = this.audioCtx.currentTime;
          masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.2);
          setTimeout(() => {
            try {
              osc1.stop();
              if (osc2) osc2.stop();
              if (lfo) lfo.stop();
            } catch (e) {}
          }, 250);
        } else {
          osc1.stop();
          if (osc2) osc2.stop();
          if (lfo) lfo.stop();
        }
      } catch (e) {
        console.warn('Error silencing siren nodes:', e);
      }
      this.activeNodes = null;
    }
  }

  stop() {
    this.stopNodesOnly();
    if (this.isPlayingState) {
      this.isPlayingState = false;
      this.notify();
    }
  }

  /**
   * Quick test function to demonstrate siren immediately
   */
  testSiren(mode = 'wail') {
    if (this.isMutedState) {
      this.setMuted(false);
    }
    this.ensureContext();
    return this.play({ mode, duration: 4500, force: true });
  }
}

// Singleton instance shared across the entire frontend application
export const sirenAudio = new SirenAudioManager();
export default sirenAudio;
