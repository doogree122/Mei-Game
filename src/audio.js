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
    shield: () => {
      tone('sine', 180, 900, 0.3, 0.16);
      tone('triangle', 270, 1350, 0.25, 0.07);
      noise(0.25, 4000, 0.12);
      hum(SHIELD_FRAMES / 60);
    },
    // A shot fizzling against the force field: crackling zap plus a low thump.
    shieldHit: () => {
      tone('square', 1800, 180, 0.22, 0.12);
      noise(0.14, 7000, 0.3);
      tone('sine', 90, 40, 0.18, 0.2);
    },
  };
})();
