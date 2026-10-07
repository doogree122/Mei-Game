// Online play on Firebase Hosting: a stand-in for the claude.ai artifact `room`
// with the same small interface (presence, onPeers, peers), backed by the
// Firebase Realtime Database.
//
// Firebase Hosting serves the project's settings at /__/firebase/init.json, so
// nothing needs configuring here. Anywhere else (GitHub Pages, opened from
// disk) that file is missing and online play stays off.
//
// Each player signs in anonymously and owns two entries, removed when they
// disconnect:
//   peers/<uid>    small lobby fields (hosting, joining, fighter); everyone reads these
//   streams/<uid>  the busy fields: the host's snapshots (s) and the guest's controls (in)
// A player only listens to the stream of the person they're playing, so
// several matches can run at once without everyone downloading every match.

const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const STREAM_KEYS = ['s', 'in'];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = reject;
    document.head.append(el);
  });
}

async function firebaseRoom() {
  if (!/^https?:$/.test(location.protocol)) return null;
  let config;
  try {
    const res = await fetch('/__/firebase/init.json');
    if (!res.ok) return null;
    config = await res.json();
  } catch (err) {
    return null;
  }
  if (!config || !config.projectId) return null;
  if (!config.databaseURL) config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;

  await loadScript(FIREBASE_SDK + 'firebase-app-compat.js');
  await Promise.all([
    loadScript(FIREBASE_SDK + 'firebase-auth-compat.js'),
    loadScript(FIREBASE_SDK + 'firebase-database-compat.js'),
  ]);
  const app = firebase.initializeApp(config);
  const cred = await app.auth().signInAnonymously();
  const me = cred.user.uid;
  const db = app.database();
  const myPeer = db.ref('peers/' + me);
  const myStream = db.ref('streams/' + me);
  await myPeer.onDisconnect().remove();
  await myStream.onDisconnect().remove();
  // Listing myself keeps me in the peer list even before I host or join.
  await myPeer.update({ on: 1 });

  let lobby = {}; // uid -> lobby fields
  const streams = new Map(); // uid -> { ref, data }
  const handlers = [];
  let snapshot = [];

  function rebuild() {
    snapshot = Object.entries(lobby).map(([peer, fields]) => {
      const presence = { ...fields, ...((streams.get(peer) || {}).data || {}) };
      delete presence.on;
      return { peer, presence, isMe: peer === me, sameTab: peer === me };
    });
    if (!lobby[me]) snapshot.push({ peer: me, presence: {}, isMe: true, sameTab: true });
    for (const h of handlers) h({ peers: snapshot });
  }

  // Listen to the streams of the players this one is in a game with: my guest
  // (or would-be guest) when hosting, my host when joining.
  function watchStreams() {
    const mine = lobby[me] || {};
    const wanted = new Set();
    for (const [peer, p] of Object.entries(lobby)) {
      if (peer === me) continue;
      if (p.guest === me || (mine.host && p.join === mine.host) || (mine.join && p.host === mine.join)) wanted.add(peer);
    }
    for (const [peer, w] of streams) {
      if (!wanted.has(peer)) {
        w.ref.off();
        streams.delete(peer);
      }
    }
    for (const peer of wanted) {
      if (streams.has(peer)) continue;
      const w = { ref: db.ref('streams/' + peer), data: null };
      streams.set(peer, w);
      w.ref.on('value', (snap) => {
        w.data = snap.val();
        rebuild();
      });
    }
  }

  return {
    presence(patch) {
      const lobbyPatch = {};
      const streamPatch = {};
      for (const [k, v] of Object.entries(patch)) (STREAM_KEYS.includes(k) ? streamPatch : lobbyPatch)[k] = v;
      const jobs = [];
      if (Object.keys(lobbyPatch).length) jobs.push(myPeer.update(lobbyPatch));
      if (Object.keys(streamPatch).length) jobs.push(myStream.update(streamPatch));
      return Promise.all(jobs);
    },
    onPeers(handler, onError) {
      handlers.push(handler);
      db.ref('peers').on('value', (snap) => {
        lobby = snap.val() || {};
        watchStreams();
        rebuild();
      }, () => onError && onError());
      return () => {};
    },
    peers: () => snapshot,
  };
}
