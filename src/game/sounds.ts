// Web Audio sound effects for mascot clicks + end-screen celebrations.
// Lazily creates a single AudioContext on first call (browsers block
// audio before a user gesture), and resumes it if it gets suspended.
// All sounds are synthesized inline — no audio assets to load.

import type { ModeId } from '../lib/modes';

type AudioCtxConstructor = typeof AudioContext;
interface WebkitWindow {
  AudioContext?: AudioCtxConstructor;
  webkitAudioContext?: AudioCtxConstructor;
}

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    const w = window as unknown as WebkitWindow;
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return null;
    try {
      _ctx = new Ctx();
    } catch {
      return null;
    }
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {
      /* swallow — non-fatal */
    });
  }
  return _ctx;
}

/* Per-mode mascot click sound. Each mode has a distinct profile so
   tapping a different mascot reads differently. */
export function playMascotSound(modeId: ModeId): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (modeId === 'soyboy') {
    // Bean's squeaky non-verbal "hello" — two playful syllables (hel-lo)
    // with rising-falling-rising pitch and a brief envelope dip in the middle.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    osc.type = 'triangle';
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    // Syllable 1 "hel": rising
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
    // Syllable 2 "lo": dip then up again
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.28);
    // Two-bump envelope so it reads as two syllables
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.11);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.start(now);
    osc.stop(now + 0.34);
    return;
  }

  if (modeId === 'thisthat') {
    // Squiggly slide-whistle with vibrato — pitch wobbles up-down-up-down,
    // an LFO adds fine vibrato on top for that "squiggly line" quality.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.23);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.32);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 16;
    lfoGain.gain.value = 28;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.36);
    lfo.start(now);
    lfo.stop(now + 0.36);
    return;
  }

  // Classic — pig oink: two-syllable "uh-OINK" with sawtooth body +
  // lowpass for a buzzy, nasal grunt. Filter sweep opens up on the
  // main hit so it pops, then closes back down for the snorty tail.
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 4;
  filter.frequency.setValueAtTime(700, now);
  filter.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
  filter.frequency.exponentialRampToValueAtTime(900, now + 0.26);
  osc.type = 'sawtooth';
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(190, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(270, now + 0.13);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.26);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.03, now + 0.07);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.11);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  osc.start(now);
  osc.stop(now + 0.3);
}

/* Flower click sounds — four whimsical synth voices that share the
   character of the mascot sounds (filter sweeps, pitch arpeggios,
   envelope dips, vibrato). Each is short and distinct so the four
   flowers feel like a tiny instrument the user can play. */
export function playFlowerSound(index: number): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const variant = ((index % 4) + 4) % 4;

  if (variant === 0) {
    // Bouncy "boi-oing" — triangle slides up + down + up with a soft
    // lowpass filter that opens during the bounce. Two-bump envelope
    // sells the bounce rhythm.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.1);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.32);
    osc.type = 'triangle';
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(940, now + 0.3);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.13);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    osc.start(now);
    osc.stop(now + 0.38);
    return;
  }

  if (variant === 1) {
    // Sparkle arpeggio — three quick sine notes (E5, A5, C#6) with
    // gentle vibrato on the last note for a "twinkle" tail.
    const notes = [659, 880, 1109];
    notes.forEach((freq, i) => {
      const t = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      if (i === notes.length - 1) {
        // Vibrato LFO on the last note
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 12;
        lfoGain.gain.value = 14;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + 0.4);
      }
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === notes.length - 1 ? 0.4 : 0.25));
      osc.start(t);
      osc.stop(t + 0.42);
    });
    return;
  }

  if (variant === 2) {
    // Cartoony slide-whistle — sine swooping up an octave with a slight
    // lowpass + heavy vibrato (the squiggly mascot sound, sweeter).
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4000;
    osc.type = 'sine';
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.24);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.32);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 18;
    lfoGain.gain.value = 22;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.17, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    osc.start(now);
    osc.stop(now + 0.38);
    lfo.start(now);
    lfo.stop(now + 0.38);
    return;
  }

  // variant 3 — Plucky two-syllable bell ("dee-doo"): triangle hits
  // at C6 and G5 with a lowpass envelope that mimics a struck bell.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(2400, now);
  filter.frequency.exponentialRampToValueAtTime(900, now + 0.4);
  filter.connect(ctx.destination);
  [1046, 784].forEach((freq, i) => {
    const t = now + i * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(filter);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    osc.start(t);
    osc.stop(t + 0.36);
  });
}

/* End-screen celebration sounds — ascending fanfare for a new
   personal best, sparkle chime for ladder shortest-path solves. */
export type CelebrationKind = 'shortest' | 'personalBest';
export function playCelebrationSound(kind: CelebrationKind): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (kind === 'shortest') {
    // Magical sparkle — four ascending notes (G5, B5, D6, G6) with
    // an octave shimmer layered on top.
    const notes = [784, 988, 1175, 1568];
    notes.forEach((freq, i) => {
      const t = now + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.13, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.4);
      // Octave shimmer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0.0001, t);
      gain2.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc2.start(t);
      osc2.stop(t + 0.35);
    });
    return;
  }

  // Personal best — warm ascending fanfare (C major arpeggio:
  // C5, E5, G5, C6).
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => {
    const t = now + i * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.start(t);
    osc.stop(t + 0.32);
  });
}
