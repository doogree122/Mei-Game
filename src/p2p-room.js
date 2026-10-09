// Online play anywhere else (GitHub Pages, any website): a direct
// browser-to-browser link with PeerJS (WebRTC), found by a short room code.
//
// It gives src/online.js the same small room interface as claude.ai's `room`
// and src/firebase-room.js (presence, onPeers, peers), for exactly two people:
//   - Hosting registers this browser with the PeerJS server under the game's
//     code ("wvt-" + code). PeerJS's free public server only introduces the
//     two browsers; the match itself travels directly between them.
//   - Joining connects to that code; then each side sends its presence
//     patches over the link and sees the other as the one other peer.
// Extra members for the lobby: `p2p`, `connect(code)`, `disconnect()`,
// `onStatus(fn)` (connection messages), and `status`.

const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const P2P_PREFIX = 'wvt-';

function loadPeerJs() {
  if (window.Peer) return Promise.resolve();
  if (!loadPeerJs.promise) {
    loadPeerJs.promise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = PEERJS_URL;
      el.onload = resolve;
      el.onerror = () => {
        loadPeerJs.promise = null;
        reject(new Error('load'));
      };
      document.head.append(el);
    });
  }
  return loadPeerJs.promise;
}

function p2pRoom() {
  if (!/^https?:$/.test(location.protocol)) return null;
  // Peers are labeled by their PeerJS ids, so both sides agree on who is who
  // (the host's `guest` field names the guest's id).
  let me = 'me';
  let them = null;
  let mine = {}; // this browser's presence
  let theirs = null; // the other player's presence, or null when not linked
  let peer = null; // PeerJS peer, made when hosting or joining
  let conn = null; // the data link to the other player
  let hostingCode = null;
  const handlers = [];
  const statusHandlers = [];
  let snapshot = [];

  // Deliver the room to the handlers once, after the current work finishes
  // (like the other rooms), never from inside a presence() call.
  let queued = false;
  function rebuild() {
    snapshot = [{ peer: me, presence: { ...mine }, isMe: true, sameTab: true }];
    if (theirs) snapshot.push({ peer: them, presence: { ...theirs }, isMe: false, sameTab: false });
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      for (const h of handlers) h({ peers: snapshot });
    }, 0);
  }

  function setStatus(text) {
    room.status = text;
    for (const h of statusHandlers) h(text);
  }

  function dropLink() {
    if (conn) {
      try { conn.close(); } catch (err) { /* already closed */ }
    }
    conn = null;
    if (theirs) {
      theirs = null;
      rebuild();
    }
  }

  function closePeer() {
    dropLink();
    if (peer) {
      try { peer.destroy(); } catch (err) { /* already gone */ }
    }
    peer = null;
    hostingCode = null;
  }

  // Wire up a data link: presence patches in both directions.
  function attach(c) {
    conn = c;
    them = c.peer;
    // Handshake: each side sends its whole presence when the link opens and
    // answers the other's with its own, so neither side misses the other's
    // state if one message arrives before that side is listening.
    c.on('open', () => {
      theirs = theirs || {};
      c.send({ full: mine });
      setStatus('');
      rebuild();
    });
    c.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.full && typeof msg.full === 'object') {
        theirs = { ...msg.full };
        if (!msg.reply) c.send({ full: mine, reply: true });
      }
      else if (msg.patch && typeof msg.patch === 'object') {
        theirs = theirs || {};
        for (const [k, v] of Object.entries(msg.patch)) {
          if (v === null) delete theirs[k];
          else theirs[k] = v;
        }
      }
      rebuild();
    });
    const lost = () => {
      if (conn !== c) return;
      conn = null;
      theirs = null;
      rebuild();
    };
    c.on('close', lost);
    c.on('error', lost);
  }

  function errorText(err) {
    const type = err && err.type;
    if (type === 'peer-unavailable') return 'No game with that code right now. Check the code, and that the host is still waiting.';
    if (type === 'unavailable-id') return 'That code is taken. Try hosting again.';
    if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') return 'Can\'t reach the online server. Check the internet connection and try again.';
    if (type === 'browser-incompatible') return 'This browser can\'t play online.';
    return 'The connection failed. Try again.';
  }

  async function makePeer(id) {
    setStatus('Connecting…');
    try {
      await loadPeerJs();
    } catch (err) {
      setStatus('Can\'t load the online module. Check the internet connection.');
      throw err;
    }
    return new Promise((resolve, reject) => {
      const p = id ? new window.Peer(id) : new window.Peer();
      p.on('open', (openId) => {
        me = openId || p.id;
        rebuild();
        resolve(p);
      });
      p.on('error', (err) => {
        setStatus(errorText(err));
        reject(err);
      });
    });
  }

  async function host(code) {
    closePeer();
    hostingCode = code;
    try {
      const p = await makePeer(P2P_PREFIX + code);
      if (hostingCode !== code) {
        p.destroy();
        return;
      }
      peer = p;
      setStatus('');
      // One opponent at a time; anyone else who tries is turned away.
      p.on('connection', (c) => {
        if (conn) {
          c.on('open', () => c.close());
          return;
        }
        attach(c);
      });
    } catch (err) {
      hostingCode = null;
    }
  }

  // Closing the tab ends the link at once, so the other player hears of it
  // right away instead of after the connection times out.
  window.addEventListener('pagehide', () => closePeer());

  const room = {
    p2p: true,
    status: '',
    presence(patch) {
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete mine[k];
        else mine[k] = v;
      }
      // Hosting starts and stops with the `host` field.
      if (typeof patch.host === 'string' && patch.host !== hostingCode) host(patch.host);
      else if ('host' in patch && patch.host === null && hostingCode) closePeer();
      if (conn && conn.open) conn.send({ patch });
      rebuild();
      return Promise.resolve();
    },
    onPeers(handler) {
      handlers.push(handler);
      rebuild();
      return () => {};
    },
    peers: () => snapshot,
    onStatus(fn) {
      statusHandlers.push(fn);
    },
    // Find a hosted game by its code.
    async connect(code) {
      closePeer();
      try {
        const p = await makePeer(null);
        peer = p;
        setStatus('Looking for game ' + code.toUpperCase() + '…');
        attach(p.connect(P2P_PREFIX + code, { reliable: true }));
      } catch (err) {
        // Status already says why.
      }
    },
    disconnect() {
      closePeer();
      setStatus('');
    },
  };
  return room;
}
