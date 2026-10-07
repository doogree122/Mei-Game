// Online play between two people who have the game open at the same time.
//
// Runs only where the page is a claude.ai artifact that declares the `room`
// capability; elsewhere `window.claude` is absent and the ONLINE menu item
// never appears. Everything travels as room *presence* (anyone viewing may set
// it, about 30 updates a second):
//   - lobby:  a host advertises { host: code, open: true }
//   - guest:  { join: code, in: { l, r, u, d, c: [punches, kicks, specials] } }
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
};

async function initOnline(game) {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  let room = null;
  try {
    room = await window.claude.use('room');
  } catch (err) {
    room = null;
  }
  if (!room) return;
  Online.room = room;
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

function openGames() {
  return Online.peers.filter((p) => !p.isMe && p.presence.host && p.presence.open);
}

function onRoomPeers(game, peers) {
  Online.peers = peers;
  const me = peers.find((p) => p.sameTab);
  if (me) Online.me = me.peer;

  if (Online.role === 'host') {
    const guest = Online.opponent
      ? peers.find((p) => p.peer === Online.opponent && p.presence.join === Online.code)
      : peers.find((p) => !p.isMe && p.presence.join === Online.code);
    if (guest && !Online.opponent) {
      Online.opponent = guest.peer;
      setPresence({ open: false, guest: guest.peer });
      hideLobby();
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
      Online.snap = host.presence.s;
      if (game.mode === 'lobby') {
        hideLobby();
        game.beginGuest();
      }
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
  setPresence({ host: Online.code, open: true, guest: null, s: null, join: null, in: null });
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
  guestInput.counts = [0, 0, 0];
  guestInput.sent = '';
  setPresence({ join: Online.code, in: { l: 0, r: 0, u: 0, d: 0, c: [0, 0, 0] }, host: null, open: null, s: null });
  renderLobby(game);
}

// Stop hosting or playing and go back to the lobby (or the title).
function leaveOnline(game, message, toTitle = false) {
  setPresence({ host: null, open: null, guest: null, s: null, join: null, in: null });
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
    this.seen = [0, 0, 0];
  }

  read() {
    const s = Online.remoteIn || {};
    const out = emptyInput();
    out.left = !!s.l;
    out.right = !!s.r;
    out.up = !!s.u;
    out.down = !!s.d;
    const c = Array.isArray(s.c) ? s.c : [0, 0, 0];
    ['punch', 'kick', 'special'].forEach((name, i) => {
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
      hs: f.hitstun, bs: f.blockstun, dt: f.downTime, fl: f.flash,
      w: f.wins, won: f.won ? 1 : 0, ka: f.knockedAirborne ? 1 : 0,
      hb: f.holdBack ? 1 : 0, hd: f.holdDown ? 1 : 0, nt: f.nearThreat ? 1 : 0,
      wp: r1(f.walkPhase),
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

const guestInput = { counts: [0, 0, 0], sent: '', keys: new KeyboardController(KEYMAPS.p1) };

function sendGuestInput() {
  const inp = guestInput.keys.read();
  ['punch', 'kick', 'special'].forEach((name, i) => {
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

  if (s.m !== game.mode) {
    if (s.m === 'intro') {
      for (const f of game.fighters) f.reset();
      game.effects = new Effects();
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
      if (MOVES[sf.mv].projectile) Sfx.special();
      else Sfx.whiff();
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
    f.move = sf.mv && MOVES[sf.mv] ? { name: sf.mv, def: MOVES[sf.mv], frame: Number(sf.mf) || 0, hasHit: true } : null;
    f.hitstun = Number(sf.hs) || 0;
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
  });

  const owners = game.fighters;
  game.projectiles = (Array.isArray(s.p) ? s.p : [])
    .filter((p) => Array.isArray(p) && owners[p[3]])
    .map((p) => ({ x: Number(p[0]), y: Number(p[1]), vx: Number(p[2]), owner: owners[p[3]], dead: false }));
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

  if (!Online.room) {
    status.textContent = 'Online play isn\'t available here.';
    hostBtn.hidden = true;
    return;
  }
  if (Online.role === 'host') {
    status.textContent = `Hosting game ${Online.code.toUpperCase()} as B. FETT. Waiting for someone to join…`;
    hostBtn.hidden = true;
  } else if (Online.role === 'guest') {
    status.textContent = `Joining game ${Online.code.toUpperCase()} as WORF…`;
    hostBtn.hidden = true;
  } else {
    const games = openGames();
    status.textContent = Online.message
      || (games.length ? 'Join a game below, or host your own.' : 'No open games yet. Host one and have a friend open this page.');
    hostBtn.hidden = false;
    for (const g of games) {
      const btn = document.createElement('button');
      btn.className = 'online-join';
      btn.textContent = `Join game ${String(g.presence.host).toUpperCase()} as WORF`;
      btn.addEventListener('click', () => joinGame(game, g.peer));
      list.append(btn);
    }
  }
}

function setupLobbyPanel(game) {
  const el = lobbyEl();
  if (!el) return;
  el.querySelector('#online-host').addEventListener('click', () => hostGame(game));
  el.querySelector('#online-back').addEventListener('click', () => lobbyBack(game));
}

// Back out one step: cancel hosting/joining, or leave the lobby.
function lobbyBack(game) {
  if (Online.role) {
    leaveOnline(game, '');
  } else {
    hideLobby();
    game.mode = 'title';
  }
}
