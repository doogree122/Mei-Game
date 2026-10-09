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
    loadSamples(ctx);
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

  // Recorded sound effects (assets/sfx/; the single-file build embeds them as
  // SFX_DATA). Each is decoded once into a buffer the first time sound is
  // allowed; until it's ready (or if it can't load) the synthesized version plays.
  const SAMPLE_SRC = typeof SFX_DATA !== 'undefined' ? SFX_DATA : { phaser: 'assets/sfx/phaser.mp3' };
  const samples = {};
  let samplesRequested = false;
  function loadSamples(ac) {
    if (samplesRequested) return;
    samplesRequested = true;
    for (const [name, src] of Object.entries(SAMPLE_SRC)) {
      // Embedded data is decoded directly (no fetch, which a host page may block).
      const bytes = src.startsWith('data:')
        ? Promise.resolve(Uint8Array.from(atob(src.slice(src.indexOf(',') + 1)), (c) => c.charCodeAt(0)).buffer)
        : fetch(src).then((r) => r.arrayBuffer());
      bytes
        .then((data) => new Promise((ok, fail) => ac.decodeAudioData(data, ok, fail)))
        .then((buf) => { samples[name] = buf; })
        .catch(() => { /* keep the synthesized sound */ });
    }
  }
  function playSample(name, gain = 1) {
    const ac = ensure();
    if (!ac || !samples[name]) return false;
    const src = ac.createBufferSource();
    src.buffer = samples[name];
    const g = ac.createGain();
    g.gain.value = gain;
    src.connect(g).connect(ac.destination);
    src.start();
    return true;
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
    // Force choke: a low strained rumble and a choked gasp.
    choke: () => { tone('sawtooth', 70, 55, 0.9, 0.09); noise(0.5, 900, 0.18); tone('triangle', 520, 260, 0.35, 0.05); },
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
    // Lightsaber swing: the low two-motor hum swelling and bending in pitch as
    // the blade passes (a Doppler sweep), with a breathy whoosh on top.
    saber: () => {
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      const dur = 0.42;
      const out = ac.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.16, t + 0.12);
      out.gain.exponentialRampToValueAtTime(0.05, t + 0.26);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
      lp.frequency.exponentialRampToValueAtTime(400, t + dur);
      lp.connect(out).connect(ac.destination);
      for (const [type, f] of [['sawtooth', 88], ['sawtooth', 91.5], ['triangle', 176]]) {
        const o = ac.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.12);
        o.frequency.exponentialRampToValueAtTime(f * 0.8, t + dur);
        o.connect(lp);
        o.start(t);
        o.stop(t + dur);
      }
      // The whoosh: noise through a band that sweeps up and back down.
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 2.5;
      bp.frequency.setValueAtTime(600, t);
      bp.frequency.exponentialRampToValueAtTime(2600, t + 0.13);
      bp.frequency.exponentialRampToValueAtTime(500, t + dur);
      const wg = ac.createGain();
      wg.gain.setValueAtTime(0.0001, t);
      wg.gain.exponentialRampToValueAtTime(0.3, t + 0.11);
      wg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(wg).connect(ac.destination);
      src.start(t);
    },
    // Jetpack thrust: a short rushing roar, repeated while flying.
    thrust: () => {
      noise(0.2, 700, 0.12);
      noise(0.12, 2600, 0.04);
    },
    // Bat'leth swing: a heavy, low whoosh of a big blade cutting the air,
    // then a bright metal ring.
    batleth: () => {
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      const dur = 0.5;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.6;
      bp.frequency.setValueAtTime(260, t);
      bp.frequency.exponentialRampToValueAtTime(1300, t + 0.22);
      bp.frequency.exponentialRampToValueAtTime(300, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(ac.destination);
      src.start(t);
      // The blade's ring: a few inharmonic partials, like struck steel.
      for (const [f, gain] of [[1180, 0.05], [1730, 0.035], [2610, 0.025]]) note('sine', f, 0.18, 0.5, gain);
    },
    // Force lightning: a buzzing arc full of sharp, random electric snaps.
    lightning: () => {
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      const dur = 0.7;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      // Crackle: mostly silence with dense, random spikes and short bursts.
      let burst = 0;
      for (let i = 0; i < len; i++) {
        if (burst <= 0 && Math.random() < 0.0016) burst = Math.floor(ac.sampleRate * (0.002 + Math.random() * 0.012));
        const fade = 1 - (i / len) * 0.6;
        if (burst > 0) {
          burst--;
          d[i] = (Math.random() * 2 - 1) * fade;
        } else {
          d[i] = (Math.random() < 0.02 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.05) * fade;
        }
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.setValueAtTime(0.5, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(hp).connect(g).connect(ac.destination);
      src.start(t);
      // The electric buzz under it, jittering in pitch.
      const buzz = ac.createOscillator();
      buzz.type = 'sawtooth';
      buzz.frequency.value = 120;
      const jitter = ac.createOscillator();
      jitter.type = 'square';
      jitter.frequency.value = 37;
      const jd = ac.createGain();
      jd.gain.value = 45;
      jitter.connect(jd).connect(buzz.frequency);
      const bf = ac.createBiquadFilter();
      bf.type = 'bandpass';
      bf.frequency.value = 900;
      bf.Q.value = 1.5;
      const bg = ac.createGain();
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
      bg.gain.setValueAtTime(0.12, t + dur * 0.7);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      buzz.connect(bf).connect(bg).connect(ac.destination);
      for (const o of [buzz, jitter]) {
        o.start(t);
        o.stop(t + dur);
      }
    },
    // Blaster: the classic "pew", a bright metallic ring dropping fast in
    // pitch, with a short crack at the muzzle.
    blaster: () => {
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      const dur = 0.24;
      const out = ac.createGain();
      out.gain.setValueAtTime(0.16, t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out.connect(ac.destination);
      // A carrier with a fast frequency modulator gives the springy, metallic ring.
      const car = ac.createOscillator();
      car.type = 'sawtooth';
      car.frequency.setValueAtTime(2400, t);
      car.frequency.exponentialRampToValueAtTime(160, t + dur);
      const mod = ac.createOscillator();
      mod.frequency.setValueAtTime(1100, t);
      mod.frequency.exponentialRampToValueAtTime(90, t + dur);
      const md = ac.createGain();
      md.gain.setValueAtTime(900, t);
      md.gain.exponentialRampToValueAtTime(40, t + dur);
      mod.connect(md).connect(car.frequency);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5000;
      car.connect(lp).connect(out);
      const sub = ac.createOscillator();
      sub.type = 'square';
      sub.frequency.setValueAtTime(1200, t);
      sub.frequency.exponentialRampToValueAtTime(110, t + dur * 0.8);
      const sg = ac.createGain();
      sg.gain.value = 0.35;
      sub.connect(sg).connect(out);
      for (const o of [car, mod, sub]) {
        o.start(t);
        o.stop(t + dur);
      }
      noise(0.04, 6000, 0.25);
    },
    // Phaser: the recorded TNG phaser (assets/sfx/phaser.mp3). Until it has
    // loaded, a synthesized whining beam with a fast warble.
    phaser: () => {
      if (playSample('phaser', 0.9)) return;
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      const dur = 0.55;
      const out = ac.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.1, t + 0.04);
      out.gain.setValueAtTime(0.1, t + dur * 0.65);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500;
      bp.Q.value = 0.8;
      bp.connect(out).connect(ac.destination);
      const warble = ac.createOscillator();
      warble.frequency.value = 28;
      const wd = ac.createGain();
      wd.gain.value = 60;
      warble.connect(wd);
      const oscs = [['sawtooth', 820], ['square', 1236], ['sine', 1650]].map(([type, f]) => {
        const o = ac.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f * 0.85, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
        wd.connect(o.frequency);
        o.connect(bp);
        return o;
      });
      for (const o of [...oscs, warble]) {
        o.start(t);
        o.stop(t + dur);
      }
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
