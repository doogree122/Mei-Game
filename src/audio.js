// Tiny synthesized sound effects (no asset files needed).
const Sfx = (() => {
  let ctx = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noise(duration, freq, gain) {
    const ac = ensure();
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * duration);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const g = ac.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(ac.destination);
    src.start();
  }

  function tone(type, from, to, duration, gain) {
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, ac.currentTime + duration);
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  }

  // One scheduled note, `start` seconds from now, with optional vibrato and a
  // low-pass filter (for brassy tones).
  function note(type, freq, start, dur, gain, { vibrato = 0, cutoff = 0, slideTo = 0 } = {}) {
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime + start;
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.setValueAtTime(gain, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = osc;
    if (cutoff) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      osc.connect(f);
      out = f;
    }
    out.connect(g).connect(ac.destination);
    if (vibrato) {
      const lfo = ac.createOscillator();
      lfo.frequency.value = 6;
      const depth = ac.createGain();
      depth.gain.value = vibrato;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }
    osc.start(t);
    osc.stop(t + dur);
  }

  // Note frequencies used by the jingles.
  const N = { C3: 130.8, E3: 164.8, F3: 174.6, Fs3: 185, G3: 196, C4: 261.6, Eb4: 311.1, E4: 329.6, G4: 392, C5: 523.3, E5: 659.3, G5: 784, C6: 1046.5 };

  // Force field hum: a buzzing chord with a fast wobble, held for `duration` seconds.
  function hum(duration) {
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.Q.value = 6;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.06);
    g.gain.setValueAtTime(0.12, t + Math.max(0.1, duration - 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const wobble = ac.createOscillator();
    wobble.frequency.value = 14;
    const depth = ac.createGain();
    depth.gain.value = 0.05;
    wobble.connect(depth).connect(g.gain);
    const oscs = [['sawtooth', 110], ['sine', 222], ['triangle', 331]].map(([type, f]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      o.connect(filter);
      return o;
    });
    filter.connect(g).connect(ac.destination);
    for (const o of [...oscs, wobble]) {
      o.start(t);
      o.stop(t + duration);
    }
  }

  return {
    unlock: ensure,
    whiff: () => noise(0.08, 2500, 0.08),
    light: () => { noise(0.1, 1800, 0.35); tone('square', 220, 90, 0.08, 0.08); },
    heavy: () => { noise(0.18, 1200, 0.5); tone('square', 160, 50, 0.15, 0.12); },
    block: () => tone('triangle', 900, 600, 0.06, 0.15),
    special: () => tone('sawtooth', 300, 900, 0.25, 0.08),
    jump: () => tone('sine', 300, 500, 0.08, 0.05),
    ko: () => { noise(0.5, 600, 0.5); tone('sawtooth', 200, 40, 0.8, 0.15); },
    announce: () => tone('square', 440, 880, 0.2, 0.06),
    // Force field up: a rising power-up whoosh, then a hum for as long as it lasts.
    shield: (seconds = SHIELD_FRAMES / 60) => {
      tone('sine', 180, 900, 0.3, 0.16);
      tone('triangle', 270, 1350, 0.25, 0.07);
      noise(0.25, 4000, 0.12);
      hum(seconds);
    },
    // Winning: a bright rising arpeggio for a round; a fanfare for the match.
    win: (match) => {
      if (!match) {
        [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => note('square', f, i * 0.09, i === 3 ? 0.4 : 0.12, 0.07));
        [N.C4, N.G4].forEach((f, i) => note('triangle', f, i * 0.18, 0.3, 0.1));
        return;
      }
      [N.G4, N.C5, N.E5, N.G5].forEach((f, i) => note('square', f, i * 0.1, 0.12, 0.07));
      note('square', N.C6, 0.42, 0.25, 0.06);
      note('square', N.G5, 0.62, 0.12, 0.06);
      // Held major chord with a shimmer on top.
      for (const f of [N.C5, N.E5, N.G5, N.C6]) note('sawtooth', f, 0.78, 1.0, 0.035, { cutoff: 3000, vibrato: 3 });
      note('triangle', N.C3, 0.78, 1.0, 0.16);
      [N.C6 * 1.5, N.C6 * 2, N.C6 * 2.5].forEach((f, i) => note('sine', f, 0.8 + i * 0.12, 0.25, 0.03));
    },
    // Losing: a falling minor phrase for a round; a sad trombone for the match.
    lose: (match) => {
      if (!match) {
        [N.G4, N.Eb4, N.C4].forEach((f, i) => note('triangle', f, i * 0.16, i === 2 ? 0.5 : 0.18, 0.12));
        note('sawtooth', N.C3, 0.32, 0.5, 0.05, { cutoff: 600 });
        return;
      }
      const brass = { cutoff: 900 };
      note('sawtooth', N.G3, 0, 0.42, 0.11, brass);
      note('sawtooth', N.Fs3, 0.45, 0.42, 0.11, brass);
      note('sawtooth', N.F3, 0.9, 0.42, 0.11, brass);
      note('sawtooth', N.E3, 1.35, 1.1, 0.12, { cutoff: 900, vibrato: 5, slideTo: N.E3 * 0.94 });
    },
    // Lightsaber swing: a humming swoosh.
    saber: () => {
      tone('sawtooth', 110, 190, 0.28, 0.09);
      tone('sine', 220, 360, 0.25, 0.08);
      noise(0.22, 1600, 0.12);
    },
    // Force lightning: rapid electric crackles.
    lightning: () => {
      for (let i = 0; i < 5; i++) setTimeout(() => noise(0.05, 8000, 0.22), i * 45);
      tone('square', 900, 1800, 0.25, 0.05);
    },
    // Heavy laser blast: a big descending zap.
    laser: () => {
      tone('square', 1600, 220, 0.3, 0.1);
      tone('sawtooth', 800, 110, 0.3, 0.07);
      noise(0.1, 5000, 0.15);
    },
    // A shot fizzling against the force field: crackling zap plus a low thump.
    shieldHit: () => {
      tone('square', 1800, 180, 0.22, 0.12);
      noise(0.14, 7000, 0.3);
      tone('sine', 90, 40, 0.18, 0.2);
    },
  };
})();
