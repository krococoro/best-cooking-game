// Tiny synthesised sound effects: no audio files, every sound is an oscillator through a gain
// envelope, created lazily on the first user gesture so the browser allows it. Nothing here
// throws when sound is unavailable; the game simply plays silent.

export function createSound() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** One short note: `freq` in Hz, `duration` in seconds, `type` the oscillator shape. */
  function tone(freq, duration, type, volume, delay, slideTo) {
    if (muted) return;
    const audio = ensure();
    if (audio === null) return;
    try {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + (delay || 0);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, start);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    } catch {
      // A sound that cannot play is skipped, never allowed to break the game.
    }
  }

  return {
    /** Call on the first click or key press so later sounds are allowed to play. */
    unlock() {
      const audio = ensure();
      if (audio !== null && audio.state === 'suspended') {
        audio.resume().catch(() => {});
      }
    },
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
    click() {
      tone(660, 0.06, 'triangle', 0.1);
    },
    add() {
      tone(520, 0.07, 'sine', 0.14);
      tone(780, 0.06, 'sine', 0.09, 0.05);
    },
    serve() {
      tone(523, 0.1, 'triangle', 0.16);
      tone(659, 0.1, 'triangle', 0.16, 0.09);
      tone(784, 0.18, 'triangle', 0.18, 0.18);
    },
    expire() {
      tone(220, 0.28, 'sawtooth', 0.1, 0, 110);
    },
    start() {
      tone(392, 0.09, 'triangle', 0.14);
      tone(523, 0.09, 'triangle', 0.14, 0.08);
      tone(659, 0.14, 'triangle', 0.16, 0.16);
    },
    over() {
      tone(392, 0.16, 'triangle', 0.14);
      tone(330, 0.16, 'triangle', 0.14, 0.14);
      tone(262, 0.3, 'triangle', 0.14, 0.28);
    },
  };
}
