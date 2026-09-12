"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SoundType =
  | "tick"
  | "tickUrgent"
  | "correct"
  | "wrong"
  | "join"
  | "start"
  | "victory";

const STORAGE_KEY = "kahoot_sound_enabled";

type Note = {
  /** seconds from when play() was called */
  start: number;
  /** seconds */
  duration: number;
  freq: number;
  /** if set, the oscillator glides from `freq` to `freqEnd` over `duration` */
  freqEnd?: number;
  type?: OscillatorType;
  gain?: number;
  /** adds a wobble to the pitch for a comic/wobbly effect */
  vibratoHz?: number;
  vibratoDepth?: number;
};

/**
 * Small Web Audio synth for game sounds, ported (and jazzed up) from the
 * original single-device quiz. These are short procedurally-generated
 * jingles, not samples of the real Kahoot music (which is licensed) —
 * built to feel similarly game-show-y: a bouncy "ta-da" for correct
 * answers, a sad-trombone slide for wrong ones, a whoosh to kick off a
 * question, and a little fanfare for the podium.
 *
 * Browsers require a user gesture before audio can play, so call `play()`
 * (or `unlock()`) from inside a click handler at least once — after that,
 * interval-driven calls (e.g. the per-second tick) work fine too.
 */
export function useSound() {
  const [enabled, setEnabled] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage needs an effect (not available during render/SSR)
      if (saved !== null) setEnabled(saved === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      ctxRef.current = new Ctx();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const playNote = useCallback((ctx: AudioContext, base: number, n: Note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "triangle";
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t0 = base + n.start;
    const t1 = t0 + n.duration;
    const peakGain = n.gain ?? 0.2;

    osc.frequency.setValueAtTime(n.freq, t0);
    if (n.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, n.freqEnd), t1);
    }
    if (n.vibratoHz) {
      // Approximate vibrato by stepping the frequency a few times per note
      // (cheap and avoids spinning up a second modulator oscillator).
      const steps = Math.max(2, Math.round(n.duration * n.vibratoHz));
      for (let i = 0; i <= steps; i++) {
        const t = t0 + (n.duration * i) / steps;
        const wobble = Math.sin(i) * (n.vibratoDepth ?? 8);
        osc.frequency.setValueAtTime(n.freq + wobble, t);
      }
    }

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peakGain, t0 + Math.min(0.015, n.duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.start(t0);
    osc.stop(t1 + 0.02);
  }, []);

  const playNoiseWhoosh = useCallback(
    (ctx: AudioContext, base: number, start: number, duration: number) => {
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 0.8;
      const t0 = base + start;
      const t1 = t0 + duration;
      filter.frequency.setValueAtTime(300, t0);
      filter.frequency.exponentialRampToValueAtTime(3500, t1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.15, t0 + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t0);
      noise.stop(t1 + 0.02);
    },
    []
  );

  const play = useCallback(
    (type: SoundType) => {
      if (!enabled) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === "tick") {
        playNote(ctx, now, { start: 0, duration: 0.05, freq: 700, type: "square", gain: 0.05 });
      } else if (type === "tickUrgent") {
        // Faster double-tick, higher pitch — "hurry up!"
        playNote(ctx, now, { start: 0, duration: 0.045, freq: 900, type: "square", gain: 0.08 });
        playNote(ctx, now, { start: 0.07, duration: 0.045, freq: 900, type: "square", gain: 0.08 });
      } else if (type === "correct") {
        // Bouncy "ta-da!": a quick ascending major arpeggio that overshoots
        // slightly past the octave for extra pep, plus a shimmering top note.
        playNote(ctx, now, { start: 0, duration: 0.12, freq: 523.25, type: "triangle", gain: 0.22 }); // C5
        playNote(ctx, now, { start: 0.09, duration: 0.12, freq: 659.25, type: "triangle", gain: 0.22 }); // E5
        playNote(ctx, now, { start: 0.18, duration: 0.12, freq: 783.99, type: "triangle", gain: 0.22 }); // G5
        playNote(ctx, now, {
          start: 0.27,
          duration: 0.35,
          freq: 1046.5,
          type: "triangle",
          gain: 0.24,
          vibratoHz: 18,
          vibratoDepth: 10,
        }); // C6 shimmer
      } else if (type === "wrong") {
        // Sad trombone: three descending glides, each sliding down a bit —
        // the classic comedic "wah... wah... waaah".
        playNote(ctx, now, { start: 0, duration: 0.28, freq: 330, freqEnd: 262, type: "sawtooth", gain: 0.18 });
        playNote(ctx, now, { start: 0.3, duration: 0.28, freq: 294, freqEnd: 233, type: "sawtooth", gain: 0.18 });
        playNote(ctx, now, { start: 0.6, duration: 0.55, freq: 262, freqEnd: 165, type: "sawtooth", gain: 0.2 });
      } else if (type === "join") {
        // Cheerful two-note "pop-in" chime.
        playNote(ctx, now, { start: 0, duration: 0.09, freq: 660, type: "sine", gain: 0.12 });
        playNote(ctx, now, { start: 0.08, duration: 0.14, freq: 990, type: "sine", gain: 0.14 });
      } else if (type === "start") {
        // Rising whoosh + a bright final "go!" note, like a game show reveal.
        playNoiseWhoosh(ctx, now, 0, 0.4);
        playNote(ctx, now, { start: 0, duration: 0.4, freq: 200, freqEnd: 800, type: "sawtooth", gain: 0.1 });
        playNote(ctx, now, { start: 0.38, duration: 0.2, freq: 1046.5, type: "triangle", gain: 0.2 });
      } else if (type === "victory") {
        // Short triumphant fanfare for the podium screen.
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C E G C E (major)
        notes.forEach((freq, i) => {
          playNote(ctx, now, {
            start: i * 0.12,
            duration: i === notes.length - 1 ? 0.6 : 0.15,
            freq,
            type: "triangle",
            gain: 0.2,
          });
        });
      }
    },
    [enabled, ensureCtx, playNote, playNoiseWhoosh]
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const unlock = useCallback(() => {
    ensureCtx();
  }, [ensureCtx]);

  return { enabled, toggle, play, unlock };
}
