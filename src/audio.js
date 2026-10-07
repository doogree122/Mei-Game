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
    shield: () => { tone('sine', 220, 660, 0.25, 0.1); tone('triangle', 330, 990, 0.2, 0.05); },
    shieldHit: () => { tone('sine', 1200, 300, 0.18, 0.12); noise(0.08, 3000, 0.15); },
  };
})();
