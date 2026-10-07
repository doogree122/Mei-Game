// Background music: "Hyperspace Jump", looping.
//
// Browsers only allow sound after the player interacts, so it starts on the
// first key press or tap. It plays quieter while paused, stops while the tab is
// hidden, and the on/off choice is remembered in this browser. The single-file
// build sets MUSIC_DATA to the track as a data URI; otherwise it loads the file.

const Music = (() => {
  const VOLUME = 0.45;
  const PAUSED_VOLUME = 0.15;
  const src = typeof MUSIC_DATA !== 'undefined' ? MUSIC_DATA : 'assets/music/hyperspace_jump.mp3';
  let audio = null;
  let started = false;
  let ducking = false;
  let duckTimer = 0;
  let on = true;
  try {
    on = localStorage.getItem('meiFighter.music') !== 'off';
  } catch (err) {
    // Storage blocked: default to on.
  }

  function element() {
    if (!audio) {
      audio = new Audio(src);
      audio.loop = true;
      audio.volume = VOLUME;
    }
    return audio;
  }

  function play() {
    if (!on || document.hidden) return;
    element().play().catch(() => {
      // Not allowed yet (no gesture) or unsupported; the next gesture retries.
      started = false;
    });
  }

  function start() {
    if (started) return;
    started = true;
    play();
  }

  function setOn(value) {
    on = value;
    try {
      localStorage.setItem('meiFighter.music', on ? 'on' : 'off');
    } catch (err) {
      // Storage blocked: the choice lasts for this visit only.
    }
    if (on) {
      started = true;
      play();
    } else if (audio) {
      audio.pause();
    }
    updateButtons();
  }

  function updateButtons() {
    for (const btn of document.querySelectorAll('[data-music-toggle]')) {
      btn.setAttribute('aria-pressed', String(on));
      btn.classList.toggle('off', !on);
      if (btn.dataset.musicToggle === 'label') btn.textContent = on ? '♪ Music: on' : '♪ Music: off';
    }
  }

  window.addEventListener('keydown', start);
  window.addEventListener('pointerdown', start);
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) audio.pause();
    else if (on && started) play();
  });

  return {
    setup() {
      for (const btn of document.querySelectorAll('[data-music-toggle]')) {
        btn.addEventListener('click', () => setOn(!on));
        // Keep a button press from also counting as a game input.
        btn.addEventListener('pointerdown', (e) => e.stopPropagation());
      }
      updateButtons();
    },
    // Duck the music under the pause screen, or briefly under a jingle.
    setPaused(paused) {
      if (audio && !ducking) audio.volume = paused ? PAUSED_VOLUME : VOLUME;
    },
    duck(ms) {
      if (!audio) return;
      ducking = true;
      audio.volume = PAUSED_VOLUME;
      clearTimeout(duckTimer);
      duckTimer = setTimeout(() => {
        ducking = false;
        audio.volume = VOLUME;
      }, ms);
    },
    toggle: () => setOn(!on),
  };
})();
