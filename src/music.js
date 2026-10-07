// Background music:
//   menu   - "Hyperspace Jump", looping: start screen, title, character select, lobby
//   fights - "Arcade March" and "Arcade March 2", alternating: each new round
//            starts the other song from the top, and a round that outlasts one
//            song rolls on into the other.
// Returning to the menus resumes the menu track where it left off.
// The music stops when a win or lose jingle plays, until the next round
// starts or the player is back on the menus.
//
// Browsers only allow sound after the player interacts, so music starts on the
// first key press or tap (or right away where autoplay is allowed). It plays
// quieter while paused, stops while the tab is hidden, and the on/off choice is
// remembered in this browser. The single-file build sets MUSIC_DATA to the
// tracks as data URIs; otherwise they load from assets/music/.

const Music = (() => {
  const VOLUME = 0.45;
  const PAUSED_VOLUME = 0.15;
  const SOURCES = typeof MUSIC_DATA !== 'undefined' ? MUSIC_DATA : {
    menu: 'assets/music/hyperspace_jump.mp3',
    fight1: 'assets/music/arcade_march.mp3',
    fight2: 'assets/music/arcade_march_2.mp3',
  };
  const FIGHT_SONGS = ['fight1', 'fight2'];
  const tracks = {};
  let current = 'menu';
  let fightIndex = -1; // which fight song played last
  let started = false;
  let paused = false;
  let stopped = false; // silenced by a jingle until the next menu
  let on = true;
  try {
    on = localStorage.getItem('meiFighter.music') !== 'off';
  } catch (err) {
    // Storage blocked: default to on.
  }

  function element(name) {
    if (!tracks[name]) {
      const a = new Audio(SOURCES[name]);
      // The menu song loops; a fight song hands over to the other when it ends.
      a.loop = !FIGHT_SONGS.includes(name);
      a.volume = VOLUME;
      if (!a.loop) a.addEventListener('ended', () => {
        if (current === name) nextFightSong();
      });
      tracks[name] = a;
    }
    return tracks[name];
  }

  // Start the other fight song from the top.
  function nextFightSong() {
    if (tracks[current]) tracks[current].pause();
    fightIndex = (fightIndex + 1) % FIGHT_SONGS.length;
    current = FIGHT_SONGS[fightIndex];
    element(current).currentTime = 0;
    if (started) play();
  }

  function volume() {
    return paused ? PAUSED_VOLUME : VOLUME;
  }

  function play() {
    if (!on || stopped || document.hidden) return;
    const a = element(current);
    a.volume = volume();
    a.play().catch(() => {
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
    } else {
      for (const a of Object.values(tracks)) a.pause();
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
    if (document.hidden) {
      for (const a of Object.values(tracks)) a.pause();
    } else if (on && started) {
      play(); // does nothing while stopped
    }
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
    // 'menu' resumes the menu song; 'fight' starts the next fight song.
    setTrack(name) {
      const inFight = FIGHT_SONGS.includes(current);
      if (name === 'fight') {
        if (!inFight) nextFightSong();
        return;
      }
      if (name !== 'menu') return;
      const wasStopped = stopped;
      stopped = false;
      if (current === 'menu' && !wasStopped) return;
      if (tracks[current]) tracks[current].pause();
      current = 'menu';
      if (started) play();
    },
    get track() {
      return current;
    },
    // Quieter under the pause screen.
    setPaused(value) {
      paused = value;
      if (tracks[current]) tracks[current].volume = volume();
    },
    // A new round: the next fight song, from the top.
    newRound() {
      stopped = false;
      nextFightSong();
    },
    // Stop for a win or lose jingle; newRound() or setTrack('menu') starts it again.
    stop() {
      stopped = true;
      for (const a of Object.values(tracks)) a.pause();
    },
    toggle: () => setOn(!on),
    // Try to start right away. Resolves true when the music is playing (or is
    // switched off), false when the browser wants a tap or key press first.
    tryAutoplay() {
      if (!on) return Promise.resolve(true);
      return element(current).play().then(() => {
        started = true;
        return true;
      }, () => false);
    },
  };
})();
