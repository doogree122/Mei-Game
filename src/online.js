// Online play between two people who have the game open at the same time.
//
// Runs where the page is a claude.ai artifact that declares the `room`
// capability, on Firebase Hosting (src/firebase-room.js), or on any other
// website through a direct link found by a room code (src/p2p-room.js). Those
// give the same room interface. Opened from disk, there is no ONLINE option.
// Everything travels as room *presence* (about 30 updates a second):
//   - lobby:  a host advertises { host: code, open: true, char }
//   - guest:  { join: code, char, in: { l, r, u, d, c: [punches, kicks, specials, shields] } }
//   - host:   { host: code, guest: <guest peer>, s: <game snapshot> }
// The host runs the only simulation; the guest sends its controls and draws
// the host's snapshots. Button presses travel as counters so none are lost
// when presence updates coalesce.

const Online = {
  room: null, // the room namespace, or null where online play is unavailable
  peers: [],
  me: null, // this tab's peer label
  role: null, // 'host' | 'guest' | null
  code: null,
  opponent: null, // the other player's peer label
  remoteIn: null, // host: the guest's latest controls
  snap: null, // guest: the host's latest snapshot
  message: '',
  joinCode: '', // room-code play: the code typed in, or from an invite link
  autoJoin: null, // room-code play: join this game as soon as it is found
};

// An invite link (?join=CODE) fills in the code and joins once the player
// picks ONLINE and a fighter.
try {
  const code = new URLSearchParams(location.search).get('join');
  if (code && /^[a-z0-9]{3,8}$/i.test(code)) {
    Online.joinCode = code.toLowerCase();
    Online.fromLink = true;
  }
} catch (err) {
  // No URL to read.
}

async function initOnline(game) {
  let room = null;
  try {
    if (window.claude && typeof window.claude.use === 'function') room = await window.claude.use('room');
    else if (typeof firebaseRoom === 'function') room = await firebaseRoom();
    if (!room && typeof p2pRoom === 'function') room = p2pRoom();
  } catch (err) {
    room = null;
  }
  if (!room) return;
  Online.room = room;
  if (room.onStatus) room.onStatus(() => renderLobby(game));
  // Invited by link: start on ONLINE in the menu.
  if (Online.fromLink && room.p2p) {
    game.refreshMenu();
    const i = game.menu.findIndex((m) => m.kind === 'lobby');
    if (i >= 0) game.menuIndex = i;
  }
  room.onPeers(
    (change) => onRoomPeers(game, change.peers),
    () => {
      // Terminal: this view can't reach the room any more.
      Online.room = null;
      if (Online.role) leaveOnline(game, 'Lost the connection.');
      game.refreshMenu();
      renderLobby(game);
    },
  );
  game.refreshMenu();
}

function setPresence(patch) {
  if (Online.room) Online.room.presence(patch).catch(() => {});
}

// Games hosted in other tabs. `sameTab`, not `isMe`: your own other tabs and
// devices are `isMe` too, and someone may host on one and join from another.
function openGames() {
  return Online.peers.filter((p) => !p.sameTab && p.presence.host && p.presence.open);
}

function onRoomPeers(game, peers) {
  Online.peers = peers;
  const me = peers.find((p) => p.sameTab);
  if (me) Online.me = me.peer;

  if (Online.role === 'host') {
    const guest = Online.opponent
      ? peers.find((p) => p.peer === Online.opponent && p.presence.join === Online.code)
      : peers.find((p) => !p.sameTab && p.presence.join === Online.code);
    if (guest && !Online.opponent) {
      Online.opponent = guest.peer;
      setPresence({ open: false, guest: guest.peer });
      hideLobby();
      const theirs = ROSTER.includes(guest.presence.char) ? guest.presence.char : 'worf';
      game.setFighters(game.lobbyChar, theirs);
      game.startMatch('online');
    } else if (!guest && Online.opponent) {
      leaveOnline(game, 'Your opponent left.');
      return;
    }
    if (guest) Online.remoteIn = guest.presence.in || null;
  } else if (Online.role === 'guest') {
    const host = peers.find((p) => p.peer === Online.opponent);
    if (!host || host.presence.host !== Online.code) {
      leaveOnline(game, 'The host left.');
      return;
    }
    // The host picked someone else for this game.
    if (host.presence.guest && host.presence.guest !== Online.me) {
      leaveOnline(game, 'That game already started.');
      return;
    }
    if (host.presence.guest === Online.me && host.presence.s) {
      Online.autoJoin = null;
      Online.snap = host.presence.s;
      if (game.mode === 'lobby') {
        hideLobby();
        game.beginGuest();
      }
    }
  }
  // Room-code play: join the game we connected to as soon as it shows up.
  if (!Online.role && Online.autoJoin && game.mode === 'lobby') {
    const g = openGames().find((p) => p.presence.host === Online.autoJoin);
    if (g) {
      Online.autoJoin = null;
      joinGame(game, g.peer);
      return;
    }
  }
  if (game.mode === 'lobby') renderLobby(game);
}

function hostGame(game) {
  Online.role = 'host';
  Online.code = Math.random().toString(36).slice(2, 6);
  Online.opponent = null;
  Online.remoteIn = null;
  Online.message = '';
  setPresence({ host: Online.code, open: true, char: game.lobbyChar, guest: null, s: null, join: null, in: null });
  renderLobby(game);
}

function joinGame(game, hostPeer) {
  const host = Online.peers.find((p) => p.peer === hostPeer);
  if (!host) return;
  Online.role = 'guest';
  Online.code = host.presence.host;
  Online.opponent = host.peer;
  Online.snap = null;
  Online.message = '';
  guestInput.counts = [0, 0, 0, 0];
  guestInput.sent = '';
  setPresence({ join: Online.code, char: game.lobbyChar, in: { l: 0, r: 0, u: 0, d: 0, c: [0, 0, 0, 0] }, host: null, open: null, s: null });
  renderLobby(game);
}

// Stop hosting or playing and go back to the lobby (or the title).
function leaveOnline(game, message, toTitle = false) {
  setPresence({ host: null, open: null, guest: null, s: null, join: null, in: null });
  Online.autoJoin = null;
  if (Online.room && Online.room.disconnect) Online.room.disconnect();
  Online.role = null;
  Online.code = null;
  Online.opponent = null;
  Online.remoteIn = null;
  Online.snap = null;
  Online.message = message || '';
  game.online = null;
  if (toTitle || !Online.room) {
    hideLobby();
    game.mode = 'title';
  } else {
    game.showLobby();
  }
}

// ---- host side ----

// The guest's controls, read like any other controller.
class RemoteController {
  constructor() {
    this.seen = [0, 0, 0, 0];
  }

  read() {
    const s = Online.remoteIn || {};
    const out = emptyInput();
    out.left = !!s.l;
    out.right = !!s.r;
    out.up = !!s.u;
    out.down = !!s.d;
    const c = Array.isArray(s.c) ? s.c : [];
    ['punch', 'kick', 'special', 'shield'].forEach((name, i) => {
      const n = Number(c[i]) || 0;
      if (n > this.seen[i]) out.pressed[name] = true;
      this.seen[i] = n;
    });
    out.pressed.up = out.up;
    return out;
  }
}

const r1 = (v) => Math.round(v * 10) / 10;

function snapshotGame(game) {
  return {
    cs: game.fighters.map((f) => f.char.id),
    sg: game.stage,
    m: game.mode,
    mt: game.modeTime,
    r: game.round,
    tm: Math.ceil(game.timer),
    rl: game.roundLabel || '',
    rw: game.roundWinner ? game.fighters.indexOf(game.roundWinner) : -1,
    ch: game.champion ? game.fighters.indexOf(game.champion) : -1,
    f: game.fighters.map((f) => ({
      x: r1(f.x), y: r1(f.y), vy: r1(f.vy), fc: f.facing,
      hp: f.hp, st: f.state,
      mv: f.move ? f.move.name : null, mf: f.move ? f.move.frame : 0,
      th: f.thrusting ? 1 : 0, tl: Math.round((f.tilt || 0) * 100) / 100, hs: f.hitstun, bs: f.blockstun, dt: f.downTime, fl: f.flash, ck: f.choked,
      w: f.wins, won: f.won ? 1 : 0, ka: f.knockedAirborne ? 1 : 0,
      hb: f.holdBack ? 1 : 0, hd: f.holdDown ? 1 : 0, nt: f.nearThreat ? 1 : 0,
      wp: r1(f.walkPhase), sh: f.shield, sc: f.shieldCooldown,
    })),
    p: game.projectiles.map((p) => [r1(p.x), r1(p.y), p.vx, game.fighters.indexOf(p.owner)]),
  };
}

// Called every frame by the host; presence coalesces to ~30 updates a second.
function sendSnapshot(game) {
  if (Online.role === 'host' && Online.opponent && game.frame % 2 === 0) {
    setPresence({ s: snapshotGame(game) });
  }
}

// ---- guest side ----

const guestInput = { counts: [0, 0, 0, 0], sent: '', keys: new KeyboardController(KEYMAPS.p1) };

function sendGuestInput() {
  const inp = guestInput.keys.read();
  ['punch', 'kick', 'special', 'shield'].forEach((name, i) => {
    if (inp.pressed[name]) guestInput.counts[i]++;
  });
  const state = { l: +inp.left, r: +inp.right, u: +inp.up, d: +inp.down, c: guestInput.counts.slice() };
  const key = JSON.stringify(state);
  if (key !== guestInput.sent) {
    guestInput.sent = key;
    setPresence({ in: state });
  }
}

// Bring the local game in line with the host's latest snapshot, adding the
// sparks and sounds the host's simulation would have made.
function applySnapshot(game) {
  const s = Online.snap;
  if (!s || !Array.isArray(s.f) || s.f.length !== 2) return;
  // Build the same two fighters the host is running.
  if (Array.isArray(s.cs) && s.cs.every((id) => ROSTER.includes(id))
    && (game.fighters[0].char.id !== s.cs[0] || game.fighters[1].char.id !== s.cs[1])) {
    game.setFighters(s.cs[0], s.cs[1]);
  }

  if (typeof s.sg === 'string' && STAGES.some((st) => st.id === s.sg)) game.stage = s.sg;
  if (s.m !== game.mode) {
    if (s.m === 'intro') {
      for (const f of game.fighters) f.reset();
      game.effects = new Effects();
      Music.newRound();
      Sfx.announce();
    }
    if (s.m === 'roundEnd' && s.rl === 'K.O.') Sfx.ko();
  }
  game.mode = String(s.m);
  game.modeTime = Number(s.mt) || 0;
  game.round = Number(s.r) || 1;
  game.timer = Number(s.tm) || 0;
  game.roundLabel = String(s.rl || '');
  game.roundWinner = game.fighters[s.rw] || null;
  game.champion = game.fighters[s.ch] || null;

  s.f.forEach((sf, i) => {
    const f = game.fighters[i];
    const hb = f.hurtbox();
    const hitAt = { x: f.x + f.facing * hb.w * 0.3, y: hb.y + hb.h * 0.3 };
    if (sf.hp < f.hp) {
      const heavy = f.hp - sf.hp >= 9;
      game.effects.spark(hitAt.x, hitAt.y, heavy ? '#ffcf4d' : '#ffffff', 14, 7);
      game.shake = heavy ? 8 : 4;
      Sfx[heavy ? 'heavy' : 'light']();
    } else if (sf.bs > 0 && f.blockstun === 0) {
      game.effects.spark(hitAt.x, hitAt.y, '#bfe9ff', 6, 4);
      Sfx.block();
    }
    if (sf.mv && (!f.move || f.move.name !== sf.mv) && MOVES[sf.mv]) {
      const def = f.moveDef(sf.mv);
      const play = () => Sfx[def.sfx || (def.projectile ? 'special' : 'whiff')]();
      // A shot sounds as it leaves the gun, a few frames into the move.
      const wait = def.projectile ? Math.max(0, def.startup - (Number(sf.mf) || 0)) : 0;
      if (wait) setTimeout(play, (wait * 1000) / 60);
      else play();
    }
    // Ease toward the host's position so 30 updates a second look smooth.
    const nx = Number(sf.x) || f.x;
    const ny = Number(sf.y) || 0;
    f.x = Math.abs(nx - f.x) > 80 ? nx : f.x + (nx - f.x) * 0.6;
    f.y = Math.abs(ny - f.y) > 80 ? ny : f.y + (ny - f.y) * 0.6;
    if (ny === 0) f.y = 0;
    f.vy = Number(sf.vy) || 0;
    f.facing = sf.fc === -1 ? -1 : 1;
    f.hp = Number(sf.hp);
    f.state = String(sf.st);
    f.move = sf.mv && MOVES[sf.mv] ? { name: sf.mv, def: f.moveDef(sf.mv), frame: Number(sf.mf) || 0, hasHit: true } : null;
    f.hitstun = Number(sf.hs) || 0;
    if (Number(sf.ck) > 0 && !(f.choked > 0)) Sfx.choke();
    f.choked = Number(sf.ck) || 0;
    f.thrusting = sf.th === 1;
    f.tilt = Number(sf.tl) || 0;
    if (f.thrusting && !(performance.now() - (f.lastThrust || 0) < 150)) {
      f.lastThrust = performance.now();
      Sfx.thrust();
    }
    f.blockstun = Number(sf.bs) || 0;
    f.downTime = Number(sf.dt) || 0;
    f.flash = Math.max(f.flash, Number(sf.fl) || 0);
    f.wins = Number(sf.w) || 0;
    f.won = !!sf.won;
    f.knockedAirborne = !!sf.ka;
    f.holdBack = !!sf.hb;
    f.holdDown = !!sf.hd;
    f.nearThreat = !!sf.nt;
    f.walkPhase = Number(sf.wp) || 0;
    const shield = Number(sf.sh) || 0;
    if (shield > f.shield + 1) Sfx.shield();
    f.shield = shield;
    f.shieldCooldown = Number(sf.sc) || 0;
  });

  // The round's winner is announced: play this player's win or lose jingle once.
  if (game.mode === 'roundEnd' && game.modeTime >= 80) {
    if (!game.resultPlayed) {
      game.resultPlayed = true;
      game.playResult();
    }
  } else {
    game.resultPlayed = false;
  }

  const owners = game.fighters;
  const before = game.projectiles;
  const after = Array.isArray(s.p) ? s.p : [];
  // A shot that vanished next to a raised force field fizzled against it.
  for (const old of before) {
    const target = owners.find((f) => f !== old.owner);
    const gone = !after.some((p) => Array.isArray(p) && owners[p[3]] === old.owner);
    if (gone && target.shield > 0 && target.field.blocks.includes('shots') && Math.abs(old.x - target.x) < 260) {
      game.effects.spark(old.x, old.y, target.field.color, 16, 6);
      Sfx.shieldHit();
    }
  }
  game.projectiles = after
    .filter((p) => Array.isArray(p) && owners[p[3]])
    .map((p) => ({ x: Number(p[0]), y: Number(p[1]), vx: Number(p[2]), owner: owners[p[3]], def: owners[p[3]].shotDef, dead: false }));
}

// ---- lobby panel (HTML over the canvas) ----

function lobbyEl() {
  return document.getElementById('online');
}

function hideLobby() {
  const el = lobbyEl();
  if (el) el.hidden = true;
}

function renderLobby(game) {
  const el = lobbyEl();
  if (!el || game.mode !== 'lobby') return;
  el.hidden = false;
  const status = el.querySelector('#online-status');
  const list = el.querySelector('#online-games');
  const hostBtn = el.querySelector('#online-host');
  el.querySelector('#online-back').textContent = Online.role ? 'Cancel' : 'Back';
  list.replaceChildren();

  const p2p = !!(Online.room && Online.room.p2p);
  // Invited by link: connect to that game as soon as the lobby opens.
  if (p2p && Online.fromLink && !Online.role) {
    Online.fromLink = false;
    joinByCode(game, Online.joinCode);
    return;
  }
  const codeBox = el.querySelector('#online-code');
  codeBox.hidden = !p2p || !!Online.role;
  el.querySelector('.online-note').textContent = p2p
    ? 'Host a game and send your friend the code or invite link, or type a friend\'s code to join theirs.'
    : 'Both players open this same page. The other player joins your game from this list.';

  if (!Online.room) {
    status.textContent = 'Online play isn\'t available here.';
    hostBtn.hidden = true;
    return;
  }
  if (Online.role === 'host') {
    const code = Online.code.toUpperCase();
    status.textContent = p2p
      ? (Online.room.status || `Your game code is ${code}. Send it (or the invite link) to a friend. Waiting for them to join as you play ${CHARACTERS[game.lobbyChar].name}…`)
      : `Hosting game ${code} as ${CHARACTERS[game.lobbyChar].name}. Waiting for someone to join…`;
    hostBtn.hidden = true;
    if (p2p) {
      const big = document.createElement('div');
      big.className = 'online-bigcode';
      big.textContent = code;
      const copy = document.createElement('button');
      copy.className = 'online-join';
      const link = `${location.origin}${location.pathname}?join=${Online.code}`;
      copy.textContent = 'Copy invite link';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(link);
          copy.textContent = 'Link copied!';
        } catch (err) {
          copy.textContent = link;
        }
      });
      list.append(big, copy);
    }
  } else if (Online.role === 'guest') {
    status.textContent = `Joining game ${Online.code.toUpperCase()} as ${CHARACTERS[game.lobbyChar].name}…`;
    hostBtn.hidden = true;
  } else {
    const games = openGames();
    status.textContent = (p2p && Online.room.status) || Online.message
      || (p2p ? 'Host a game, or enter a friend\'s game code.'
        : games.length ? 'Join a game below, or host your own.' : 'No open games yet. Host one and have a friend open this page.');
    const input = el.querySelector('#online-code-input');
    if (p2p && Online.joinCode && !input.value) input.value = Online.joinCode.toUpperCase();
    hostBtn.hidden = false;
    for (const g of games) {
      const btn = document.createElement('button');
      btn.className = 'online-join';
      const hostChar = CHARACTERS[g.presence.char] ? CHARACTERS[g.presence.char].name : 'a fighter';
      btn.textContent = `Join game ${String(g.presence.host).toUpperCase()} (host plays ${hostChar})`;
      btn.addEventListener('click', () => joinGame(game, g.peer));
      list.append(btn);
    }
  }
}

// Room-code play: connect to the game with this code and join it.
function joinByCode(game, code) {
  code = String(code || '').trim().toLowerCase();
  if (!/^[a-z0-9]{3,8}$/.test(code) || !Online.room || !Online.room.connect) return;
  Online.joinCode = code;
  Online.autoJoin = code;
  Online.message = '';
  Online.room.connect(code);
  renderLobby(game);
}

function setupLobbyPanel(game) {
  const el = lobbyEl();
  if (!el) return;
  el.querySelector('#online-host').addEventListener('click', () => hostGame(game));
  const input = el.querySelector('#online-code-input');
  el.querySelector('#online-code-join').addEventListener('click', () => joinByCode(game, input.value));
  input.addEventListener('keydown', (e) => {
    // Typing a code mustn't move the fighters.
    e.stopPropagation();
    if (e.key === 'Enter') joinByCode(game, input.value);
  });
  el.querySelector('#online-back').addEventListener('click', () => lobbyBack(game));
}

// Back out one step: cancel hosting/joining, or leave the lobby.
function lobbyBack(game) {
  if (Online.role) {
    leaveOnline(game, '');
  } else {
    Online.autoJoin = null;
    if (Online.room && Online.room.disconnect) Online.room.disconnect();
    hideLobby();
    game.mode = 'title';
  }
}
