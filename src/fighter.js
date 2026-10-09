// Fighter state machine, physics, move data and skeletal poses.

const W = 960;
const H = 540;
const GROUND = 468;
const WORLD_W = 1800; // stage width; the camera scrolls across it
const STAGE_LEFT = 90;
const STAGE_RIGHT = WORLD_W - 90;
const GRAVITY = 0.75;
const MAX_HP = 100;
const BUFFER_FRAMES = 6;
// Force field: stops blaster shots (not punches or kicks) for a moment, then recharges.
const SHIELD_FRAMES = 45;
const SHIELD_COOLDOWN = 90;
// A character's force field: `field` in characters.js over these defaults.
// `blocks` lists what it stops: 'shots', 'punches' (punch, low punch,
// uppercut), 'kicks' (kick, sweep, jump kick). With `repel` it shoves the
// opponent back while up. `style` picks its look in render.js.
const DEFAULT_FIELD = { color: '#6fd8ff', style: 'bubble', frames: SHIELD_FRAMES, cooldown: SHIELD_COOLDOWN, blocks: ['shots'], repel: false, size: 1 };
const PUNCHES = ['punch', 'lowPunch', 'uppercut'];
// How high the Force choke holds its victim off the floor.
const CHOKE_LIFT = 70;
// Vader's Force push: launch speed sideways and up.
const FORCE_PUSH = { vx: 19, vy: 12 };

// Move strength ratings (characters.js `ratings`, 1 weak, 2 normal, 3 strong).
const RATING = {
  1: { damage: 0.75, push: 0.85, hitstun: -2, shotSize: 0.8 },
  2: { damage: 1, push: 1, hitstun: 0, shotSize: 1 },
  3: { damage: 1.35, push: 1.3, hitstun: 3, shotSize: 1.25 },
};
// Which rating each move uses.
const RATED_MOVES = { punch: 'punch', kick: 'kick', sweep: 'lowKick', uppercut: 'uppercut' };


// Limb lengths in pixels.
const BODY = { thigh: 34, shin: 34, torso: 48, neck: 6, ua: 25, fa: 25, head: 15 };

// Move data in frames (60 fps). `limb` is the skeleton joint used as the hit point.
// height: 'mid' (block high or low), 'low' (must crouch-block), 'high' (must stand-block).
// Frames after letting go of crouch in which punch becomes an uppercut.
const UPPERCUT_WINDOW = 10;

const MOVES = {
  punch: {
    pose: 'punch', startup: 4, active: 3, recovery: 9,
    damage: 6, hitstun: 14, blockstun: 9, push: 5,
    limb: 'handF', radius: 14, height: 'mid', sound: 'light', duckable: true,
  },
  kick: {
    pose: 'kick', startup: 7, active: 4, recovery: 15,
    damage: 10, hitstun: 18, blockstun: 11, push: 8,
    limb: 'footF', radius: 22, height: 'mid', sound: 'heavy', duckable: true, // high kick: wide foot zone keeps its reach
  },
  lowPunch: {
    pose: 'lowPunch', startup: 4, active: 3, recovery: 9,
    damage: 5, hitstun: 13, blockstun: 8, push: 4,
    limb: 'handF', radius: 14, height: 'low', sound: 'light', crouching: true,
  },
  sweep: {
    pose: 'sweep', startup: 8, active: 5, recovery: 20,
    damage: 9, hitstun: 0, blockstun: 12, push: 6,
    limb: 'footF', radius: 18, height: 'low', sound: 'heavy', crouching: true, knockdown: true,
  },
  // Crouch, then press punch just as you stand up. Hits crouching opponents
  // too and launches into a knockdown.
  uppercut: {
    pose: 'uppercut', startup: 6, active: 5, recovery: 20, lunge: 2.5,
    // Launches the opponent up and back: they fly across the floor and skid.
    damage: 12, hitstun: 0, blockstun: 12, push: 3, launch: 13, launchX: 9,
    limb: 'handF', radius: 18, height: 'mid', sound: 'heavy', knockdown: true,
  },
  airKick: {
    pose: 'airKick', startup: 5, active: 14, recovery: 4,
    damage: 9, hitstun: 16, blockstun: 10, push: 6,
    limb: 'footF', radius: 17, height: 'high', sound: 'heavy', air: true,
  },
  special: {
    pose: 'special', startup: 14, active: 2, recovery: 22, projectile: true,
  },
  // Hidden move (Vader: back, back, down, punch): the Force grips the
  // opponent's throat from anywhere in front, lifting them off the floor.
  forceChoke: {
    // Vader holds his hand out for the whole 3-second grip (`hold`), letting go
    // as the victim drops; a miss ends it early (Game.forceChoke).
    pose: 'forceChoke', startup: 14, active: 1, recovery: 186, choke: true, hold: 12,
    damage: 4, hitstun: 180, blockstun: 0, push: 0, height: 'unblockable', sound: 'light',
  },
};

const FIREBALL = {
  damage: 12, hitstun: 20, blockstun: 14, push: 7, chip: 2,
  height: 'mid', sound: 'heavy', speed: 7.5, radius: 15,
};

// Pose = absolute limb angles in radians, in a facing-right local space.
// Legs/arms: 0 points straight down, PI/2 points forward, PI points up.
// Torso: 0 is upright, positive leans forward.
const GUARD = { uaF: 0.75, faF: 2.55, uaB: 0.45, faB: 2.35 };
const STANCE = { thF: 0.38, shF: -0.08, thB: -0.32, shB: -0.02 };
const CROUCH_LEGS = { thF: 1.35, shF: -0.15, thB: 0.35, shB: -1.35 };

const POSES = {
  idle: { torso: 0.12, head: -0.05, ...GUARD, ...STANCE },
  crouch: { torso: 0.45, head: -0.3, ...GUARD, ...CROUCH_LEGS },
  jump: { torso: 0.1, head: 0, uaF: 1.0, faF: 2.2, uaB: 0.2, faB: 1.5, thF: 1.3, shF: -0.3, thB: 0.5, shB: -0.9 },
  block: { torso: -0.08, head: 0.15, uaF: 0.35, faF: 2.95, uaB: 0.25, faB: 2.85, ...STANCE },
  crouchBlock: { torso: 0.3, head: -0.1, uaF: 0.35, faF: 2.95, uaB: 0.25, faB: 2.85, ...CROUCH_LEGS },
  hit: { torso: -0.45, head: -0.4, uaF: 0.2, faF: 1.3, uaB: -0.5, faB: 0.5, thF: 0.3, shF: 0.1, thB: -0.2, shB: 0 },
  lying: { torso: 0, head: 0.1, uaF: 0.25, faF: 0.4, uaB: -0.2, faB: -0.1, thF: 0.06, shF: 0.04, thB: -0.06, shB: -0.04 },
  victory: { torso: -0.05, head: -0.25, uaF: 2.7, faF: 3.05, uaB: 0.3, faB: 1.9, ...STANCE },
  armsCrossed: { torso: -0.06, head: -0.12, uaF: 0.2, faF: 1.75, uaB: 0.12, faB: 1.85, ...STANCE },

  punch_windup: { torso: 0.05, head: 0, uaF: 0.4, faF: 2.6, uaB: 0.5, faB: 2.4, ...STANCE },
  punch: { torso: 0.28, head: -0.2, uaF: 1.62, faF: 1.58, uaB: 0.5, faB: 2.5, thF: 0.55, shF: -0.05, thB: -0.45, shB: -0.1 },

  kick_windup: { torso: -0.15, head: 0.1, ...GUARD, thF: 1.45, shF: -0.3, thB: -0.1, shB: 0 },
  kick: { torso: -0.5, head: 0.3, uaF: 0.6, faF: 2.4, uaB: -0.3, faB: 0.6, thF: 2.05, shF: 2.1, thB: -0.12, shB: 0 },

  lowPunch_windup: { torso: 0.4, head: -0.3, uaF: 0.5, faF: 2.4, uaB: 0.45, faB: 2.35, ...CROUCH_LEGS },
  lowPunch: { torso: 0.55, head: -0.45, uaF: 1.62, faF: 1.6, uaB: 0.45, faB: 2.35, ...CROUCH_LEGS },

  sweep_windup: { torso: 0.5, head: -0.3, ...GUARD, ...CROUCH_LEGS, thF: 0.6, shF: -0.4 },
  sweep: { torso: 0.6, head: -0.4, uaF: 0.9, faF: 2.2, uaB: -0.2, faB: 0.3, thF: 1.15, shF: 1.5, thB: 0.4, shB: -1.4 },

  // Uppercut: fist low from the crouch, then driven up as the legs straighten.
  uppercut_windup: { torso: 0.5, head: -0.3, uaF: 0.25, faF: 0.9, uaB: 0.45, faB: 2.35, ...CROUCH_LEGS },
  uppercut: { torso: 0.15, head: -0.3, uaF: 1.95, faF: 2.55, uaB: 0.35, faB: 2.1, thF: 0.5, shF: -0.1, thB: -0.4, shB: -0.1 },

  airKick_windup: { torso: 0, head: 0, ...GUARD, thF: 1.4, shF: -0.2, thB: 0.6, shB: -1.2 },
  airKick: { torso: -0.2, head: 0.1, ...GUARD, thF: 1.05, shF: 1.0, thB: 0.4, shB: -1.6 },

  special_windup: { torso: -0.1, head: 0, uaF: -0.5, faF: 0.2, uaB: -0.7, faB: 0, thF: 0.5, shF: -0.05, thB: -0.4, shB: -0.1 },
  special: { torso: 0.3, head: -0.2, uaF: 1.5, faF: 1.55, uaB: 1.35, faB: 1.5, thF: 0.55, shF: -0.05, thB: -0.45, shB: -0.1 },

  // Saber swing: raised over the shoulder, then slashed down and forward.
  saberSwing_windup: { torso: -0.15, head: 0.05, uaF: 2.9, faF: 3.5, uaB: 0.5, faB: 2.3, ...STANCE },
  saberSwing: { torso: 0.3, head: -0.2, uaF: 1.5, faF: 1.1, uaB: 0.4, faB: 2.2, thF: 0.6, shF: -0.05, thB: -0.5, shB: -0.1 },
  // Force lightning: the free (back) hand thrusts forward; the saber hangs low.
  forceLightning_windup: { torso: -0.1, head: 0, uaF: 0.4, faF: 0.9, uaB: -0.5, faB: 0.2, thF: 0.5, shF: -0.05, thB: -0.4, shB: -0.1 },
  // Force choke: the free hand reaches out and pinches; the saber hangs low.
  forceChoke_windup: { torso: -0.05, head: 0, uaF: 0.35, faF: 0.5, uaB: 1.0, faB: 1.4, thF: 0.5, shF: -0.05, thB: -0.4, shB: -0.1 },
  forceChoke: { torso: 0.1, head: -0.1, uaF: 0.3, faF: 0.55, uaB: 1.85, faB: 2.05, thF: 0.5, shF: -0.05, thB: -0.4, shB: -0.1 },
  // Being choked: both hands clawing at the throat, head back, feet dangling.
  choked: { torso: -0.15, head: -0.45, uaF: 1.15, faF: 3.55, uaB: 1.0, faB: 3.45, thF: 0.15, shF: 0.05, thB: -0.1, shB: 0.15 },
  forceLightning: { torso: 0.25, head: -0.15, uaF: 0.5, faF: 1.0, uaB: 1.55, faB: 1.6, thF: 0.55, shF: -0.05, thB: -0.45, shB: -0.1 },
  // Very high kick: the foot rises to head height.
  highKick_windup: { torso: -0.2, head: 0.1, ...GUARD, thF: 1.9, shF: 0.6, thB: -0.1, shB: 0 },
  highKick: { torso: -0.75, head: 0.4, uaF: 0.9, faF: 2.2, uaB: -0.6, faB: 0.2, thF: 2.3, shF: 2.35, thB: -0.15, shB: 0 },
};

const POSE_KEYS = Object.keys(POSES.idle);

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpPose(a, b, t) {
  const out = {};
  for (const k of POSE_KEYS) out[k] = lerp(a[k], b[k], t);
  return out;
}

// Joint positions in local space (origin at hip, +x forward, +y down).
// `base` is how far below the hip the lowest foot sits, used to stand on the ground.
function skeleton(p) {
  const limb = (from, angle, len) => ({ x: from.x + Math.sin(angle) * len, y: from.y + Math.cos(angle) * len });
  const hip = { x: 0, y: 0 };
  const neck = { x: Math.sin(p.torso) * BODY.torso, y: -Math.cos(p.torso) * BODY.torso };
  const shoulder = { x: neck.x * 0.88, y: neck.y * 0.88 };
  const headAngle = p.torso + p.head;
  const headDist = BODY.neck + BODY.head;
  const head = { x: neck.x + Math.sin(headAngle) * headDist, y: neck.y - Math.cos(headAngle) * headDist };
  const kneeF = limb(hip, p.thF, BODY.thigh);
  const footF = limb(kneeF, p.shF, BODY.shin);
  const kneeB = limb(hip, p.thB, BODY.thigh);
  const footB = limb(kneeB, p.shB, BODY.shin);
  const elbowF = limb(shoulder, p.uaF, BODY.ua);
  const handF = limb(elbowF, p.faF, BODY.fa);
  const elbowB = limb(shoulder, p.uaB, BODY.ua);
  const handB = limb(elbowB, p.faB, BODY.fa);
  const base = Math.max(footF.y, footB.y) + 4;
  return { hip, neck, shoulder, head, kneeF, footF, kneeB, footB, elbowF, handF, elbowB, handB, base };
}

// Knockback multiplier: bigger attackers shove further so spacing still resets.
function pushScale(attacker) {
  return Math.max(1, attacker.scale * 0.75);
}

// A lightsaber held in the front hand points along the forearm, tipped a
// little further over; SABER_LENGTH is in skeleton units.
const SABER_LENGTH = 46;
function saberAngle(sk) {
  return Math.atan2(sk.handF.y - sk.elbowF.y, sk.handF.x - sk.elbowF.x) - 0.35;
}
function saberTip(sk) {
  const a = saberAngle(sk);
  return { x: sk.handF.x + Math.cos(a) * SABER_LENGTH, y: sk.handF.y + Math.sin(a) * SABER_LENGTH };
}

class Fighter {
  constructor({ char, x, facing, side }) {
    this.char = char;
    this.side = side; // 0 = left HUD, 1 = right HUD
    this.startX = x;
    this.startFacing = facing;
    this.wins = 0;
    this.reset();
  }

  reset() {
    this.x = this.startX;
    this.y = 0; // height above ground
    this.vx = 0;
    this.vy = 0;
    this.facing = this.startFacing;
    this.hp = MAX_HP;
    this.displayHp = MAX_HP;
    this.state = 'idle';
    this.move = null;
    this.hitstun = 0;
    this.blockstun = 0;
    this.downTime = 0;
    this.invuln = 0;
    this.airAttackUsed = false;
    this.holdBack = false;
    this.holdDown = false;
    this.nearThreat = false;
    this.knockedAirborne = false;
    this.crouchHeld = false;
    this.uppercutWindow = 0;
    this.dirs = []; // recent direction presses, for hidden moves
    this.wasBack = this.wasFwd = this.wasDown = false;
    this.choked = 0;
    this.buffer = { punch: 0, kick: 0, special: 0, shield: 0 };
    this.shield = 0; // frames of force field left
    this.shieldCooldown = 0; // frames until it can be used again
    this.time = 0;
    this.walkPhase = 0;
    this.flash = 0;
    this.pose = { ...POSES.idle };
    this.won = false;
  }

  get grounded() {
    return this.y <= 0 && this.vy <= 0;
  }

  get isKO() {
    return this.state === 'ko';
  }

  // Free = can act on new input.
  get isFree() {
    return !this.move && this.hitstun === 0 && this.blockstun === 0 && this.downTime === 0
      && this.state !== 'ko' && !this.won;
  }

  update(input, opp, game) {
    this.time++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    for (const k of Object.keys(this.buffer)) {
      if (input.pressed[k]) this.buffer[k] = BUFFER_FRAMES;
      else if (this.buffer[k] > 0) this.buffer[k]--;
    }

    if (this.shield > 0) {
      this.shield--;
      if (this.shield === 0) this.shieldCooldown = this.field.cooldown;
    } else if (this.shieldCooldown > 0) {
      this.shieldCooldown--;
    }
    if (this.isFree && this.shield === 0 && this.shieldCooldown === 0 && this.consume('shield')) {
      this.shield = this.field.frames;
      this.repelled = false;
      Sfx.shield(this.field.frames / 60);
    }
    // Skidding along the floor after being launched.
    if (this.downTime > 0 && Math.abs(this.vx) > 2.5 && this.time % 3 === 0) game.effects.dust(this.x, GROUND, -Math.sign(this.vx));

    const back = this.facing === 1 ? input.left : input.right;
    const fwd = this.facing === 1 ? input.right : input.left;
    this.holdBack = back && !fwd;
    this.holdDown = input.down;
    this.recordDirections(back, fwd, input.down);
    // Choked: held a little off the floor until it lets go.
    if (this.choked > 0) {
      this.choked--;
      if (this.hitstun > 0) {
        this.y += (CHOKE_LIFT - this.y) * 0.12;
        this.vy = 0;
        this.vx = 0;
      } else {
        this.choked = 0;
      }
    }

    if (this.state === 'ko' || this.won) {
      // Fall to the ground and stay there (or celebrate).
    } else if (this.downTime > 0) {
      this.downTime--;
      this.state = 'down';
      if (this.downTime === 0) {
        this.state = 'idle';
        this.invuln = 20;
      }
    } else if (this.hitstun > 0) {
      // Airborne knockdowns stay in hitstun until they land.
      if (!(this.knockedAirborne && !this.grounded)) this.hitstun--;
      this.state = 'hit';
    } else if (this.blockstun > 0) {
      this.blockstun--;
      this.state = 'block';
    } else if (this.move) {
      this.updateMove(game);
    } else {
      this.updateFree(input, fwd, back, opp, game);
    }

    this.physics(game);
    this.updatePose();
  }

  updateFree(input, fwd, back, opp, game) {
    if (this.grounded) {
      this.faceOpponent(opp);
      this.airAttackUsed = false;
      const s = this.char.stats;

      if (input.up) {
        this.vy = s.jumpV;
        this.vx = fwd ? s.jumpVX * this.facing : back ? -s.jumpVX * this.facing : 0;
        this.y = 0.01;
        this.state = 'jump';
        game.effects.dust(this.x, GROUND);
        Sfx.jump();
        return;
      }

      // No attacking from inside the force field.
      const canAttack = this.shield === 0;
      // Hidden moves: a direction sequence finished with a button.
      const secret = canAttack && this.secretMove();
      if (secret) return this.startMove(secret);
      if (input.down) {
        this.vx = 0;
        this.state = 'crouch';
        this.crouchHeld = true;
        if (canAttack && this.consume('kick')) return this.startMove('sweep');
        if (canAttack && this.consume('punch')) return this.startMove('lowPunch');
        return;
      }
      // Standing up from a crouch opens a short window for the uppercut.
      if (this.crouchHeld) {
        this.crouchHeld = false;
        this.uppercutWindow = UPPERCUT_WINDOW;
      } else if (this.uppercutWindow > 0) {
        this.uppercutWindow--;
      }

      if (canAttack) {
        if (this.uppercutWindow > 0 && this.consume('punch')) {
          this.uppercutWindow = 0;
          return this.startMove('uppercut');
        }
        if (this.consume('special') && !game.hasProjectile(this)) return this.startMove('special');
        if (this.consume('kick')) return this.startMove('kick');
        if (this.consume('punch')) return this.startMove('punch');
      }

      if (fwd) {
        this.vx = s.walk * this.facing;
        this.state = 'walk';
        this.walkPhase += 0.2 * (s.walk / 5); // stride rate follows walking speed
      } else if (back) {
        this.vx = -s.backWalk * this.facing;
        this.state = 'walk';
        this.walkPhase -= 0.16 * (s.walk / 5);
      } else {
        this.vx = 0;
        this.state = 'idle';
      }
    } else {
      this.state = 'jump';
      if (this.shield === 0 && !this.airAttackUsed && (this.consume('kick') || this.consume('punch'))) {
        this.airAttackUsed = true;
        this.startMove('airKick');
      }
    }
  }

  // Remember when back, forward and down are first pressed, for hidden moves.
  recordDirections(back, fwd, down) {
    const now = this.time;
    if (back && !this.wasBack) this.dirs.push({ k: 'b', t: now });
    if (fwd && !this.wasFwd) this.dirs.push({ k: 'f', t: now });
    if (down && !this.wasDown) this.dirs.push({ k: 'd', t: now });
    this.wasBack = back;
    this.wasFwd = fwd;
    this.wasDown = down;
    if (this.dirs.length > 8) this.dirs.shift();
  }

  // A hidden move whose sequence (characters.js `secrets`) was just entered:
  // the directions in order, the whole thing within about ¾ of a second,
  // ending with the button. Returns the move's name.
  secretMove() {
    for (const s of this.char.secrets || []) {
      if (!(this.buffer[s.button] > 0)) continue;
      const tail = this.dirs.slice(-s.input.length);
      if (tail.length < s.input.length || tail.some((d, i) => d.k !== s.input[i])) continue;
      if (this.time - tail[0].t > 45) continue;
      this.buffer[s.button] = 0;
      this.dirs = [];
      return s.move;
    }
    return null;
  }

  consume(name) {
    if (this.buffer[name] > 0) {
      this.buffer[name] = 0;
      return true;
    }
    return false;
  }

  // A move's data: the shared MOVES entry with this character's overrides
  // (e.g. a saber swing in place of a punch) merged on top.
  // Then scaled by the character's rating for it.
  moveDef(name) {
    const own = this.char.moves && this.char.moves[name];
    const def = own ? { ...MOVES[name], ...own } : MOVES[name];
    const key = RATED_MOVES[name];
    if (!key) return { ...def, name };
    const rating = (this.char.ratings && this.char.ratings[key]) || 2;
    const k = RATING[rating];
    return {
      ...def,
      name,
      rating,
      damage: Math.round(def.damage * k.damage),
      push: def.push * k.push,
      hitstun: def.hitstun ? def.hitstun + k.hitstun : 0,
      launch: def.launch && def.launch * (0.75 + 0.25 * rating) / 1.25,
      launchX: def.launchX && def.launchX * k.push,
      sound: rating === 3 ? 'heavy' : rating === 1 ? 'light' : def.sound,
    };
  }

  // This character's projectile: FIREBALL with its own tuning merged on top,
  // scaled by its shot rating (damage and size).
  get shotDef() {
    const def = this.char.shot ? { ...FIREBALL, ...this.char.shot } : FIREBALL;
    const rating = (this.char.ratings && this.char.ratings.shot) || 2;
    const k = RATING[rating];
    return { ...def, rating, damage: Math.round(def.damage * k.damage), radius: def.radius * k.shotSize, push: def.push * k.push };
  }

  // Gripped by the Force choke: no blocking it, a few points of damage, and
  // held up clawing at the throat for a moment.
  takeChoke(def, attacker, game) {
    const damage = Math.round(def.damage * attacker.char.stats.power);
    this.hp = Math.max(game.training ? 1 : 0, this.hp - damage);
    this.move = null;
    this.flash = 6;
    this.vx = 0;
    game.shake = 4;
    Sfx.choke();
    if (this.hp <= 0) {
      this.state = 'ko';
      this.vy = 6;
      this.y = Math.max(this.y, 0.01);
      this.vx = (attacker.x < this.x ? 1 : -1) * 4;
      this.hitstun = 0;
      this.choked = 0;
      game.onKO(this);
      return 'hit';
    }
    this.hitstun = def.hitstun;
    this.choked = def.hitstun;
    this.blockstun = 0;
    this.state = 'hit';
    return 'hit';
  }

  // Thrown by the Force: lifted off the feet and flung across the screen in
  // direction `dir`, landing in a skid. No damage.
  forcePush(dir, game) {
    if (this.isKO || this.downTime > 0 || this.knockedAirborne) return;
    this.move = null;
    this.blockstun = 0;
    this.vx = dir * FORCE_PUSH.vx;
    this.vy = FORCE_PUSH.vy;
    this.y = Math.max(this.y, 0.01);
    this.knockedAirborne = true;
    this.hitstun = 30;
    this.state = 'hit';
    this.flash = 4;
    game.shake = 9;
    game.hitstop = 4;
    Sfx.shieldHit();
  }

  // Whether this fighter's force field stops an attack: a shot (has a speed)
  // or a punch or kick (by move name).
  fieldBlocks(def) {
    const blocks = this.field.blocks;
    if (def.speed) return blocks.includes('shots');
    return blocks.includes(PUNCHES.includes(def.name) ? 'punches' : 'kicks');
  }

  get field() {
    return this.char.field ? { ...DEFAULT_FIELD, ...this.char.field } : DEFAULT_FIELD;
  }

  startMove(name) {
    const def = this.moveDef(name);
    this.move = { name, def, frame: 0, hasHit: false };
    this.state = 'attack';
    if (!def.air) this.vx = (def.lunge || 0) * this.facing;
    Sfx[def.sfx || (def.projectile ? 'special' : 'whiff')]();
  }

  updateMove(game) {
    const m = this.move;
    const d = m.def;
    m.frame++;
    if (d.projectile && m.frame === d.startup) game.spawnProjectile(this);
    if (d.choke && m.frame === d.startup) game.forceChoke(this, d);
    if (d.air && this.grounded) {
      // Landing cancels the air attack.
      this.move = null;
      this.state = 'idle';
      return;
    }
    if (m.frame >= d.startup + d.active + d.recovery) {
      this.move = null;
      this.state = this.grounded ? (d.crouching ? 'crouch' : 'idle') : 'jump';
    }
  }

  get attackActive() {
    if (!this.move || this.move.hasHit) return false;
    const d = this.move.def;
    return !d.projectile && !d.choke && this.move.frame >= d.startup && this.move.frame < d.startup + d.active;
  }

  faceOpponent(opp) {
    if (Math.abs(opp.x - this.x) > 4) this.facing = opp.x > this.x ? 1 : -1;
  }

  physics(game) {
    if (this.y > 0 || this.vy > 0) {
      this.vy -= GRAVITY * (this.char.stats.gravity || 1);
      this.y += this.vy;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        game.effects.dust(this.x, GROUND);
        if (this.state === 'jump') this.state = 'idle';
        if (this.hitstun > 0 && this.knockedAirborne) {
          this.knockedAirborne = false;
          this.hitstun = 0;
          this.downTime = 40;
        }
      }
    }
    this.x += this.vx;
    const sliding = this.hitstun > 0 || this.blockstun > 0 || this.downTime > 0
      || this.state === 'ko' || this.move;
    if (this.grounded && sliding) this.vx *= 0.82;
    this.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, this.x));
    this.displayHp += (this.hp - this.displayHp) * (this.hitstun > 0 ? 0.02 : 0.08);
  }

  // Whether an incoming attack of the given height is blocked.
  canBlock(height) {
    if (height === 'unblockable') return false;
    if (!this.grounded || !this.holdBack) return false;
    if (!(this.isFree || this.blockstun > 0)) return false;
    if (height === 'low') return this.holdDown;
    if (height === 'high') return !this.holdDown;
    return true;
  }

  // Returns 'hit', 'block' or null.
  takeHit(def, attacker, game, hitPoint) {
    if (this.invuln > 0 || this.downTime > 0 || this.state === 'ko') return null;
    const dir = attacker.x < this.x ? 1 : -1;

    // The Force choke ignores force fields.
    if (def.choke) return this.takeChoke(def, attacker, game);

    // Vader's Force field turns any punch or kick that reaches it into a Force
    // push that throws the attacker across the screen.
    if (this.shield > 0 && this.field.repel && !def.speed) {
      attacker.forcePush(-dir, game);
      game.effects.spark(hitPoint.x, hitPoint.y, this.field.color, 22, 8, 50);
      return 'block';
    }
    // A force field that blocks this kind of attack stops it cold.
    if (this.shield > 0 && this.fieldBlocks(def)) {
      game.effects.spark(hitPoint.x, hitPoint.y, this.field.color, 18, 7);
      game.hitstop = 4;
      Sfx.shieldHit();
      return 'block';
    }

    if (this.canBlock(def.height)) {
      this.hp = Math.max(1, this.hp - (def.chip || 0));
      this.blockstun = def.blockstun;
      this.vx = dir * def.push * 0.8 * pushScale(attacker);
      this.state = 'block';
      game.effects.spark(hitPoint.x, hitPoint.y, '#bfe9ff', 6, 4);
      game.hitstop = 4;
      Sfx.block();
      return 'block';
    }

    const damage = Math.round(def.damage * attacker.char.stats.power);
    this.hp = Math.max(game.training ? 1 : 0, this.hp - damage);
    this.move = null;
    this.flash = 6;
    this.choked = 0; // a real hit breaks the Force's grip
    this.vx = dir * def.push * pushScale(attacker);
    // Strong moves (rating 3) hit with a bigger burst, a longer freeze and more shake.
    const rating = def.rating || 2;
    const color = rating === 3 ? attacker.char.colors.energy || '#ffcf4d' : def.sound === 'heavy' ? '#ffcf4d' : '#ffffff';
    game.effects.spark(hitPoint.x, hitPoint.y, color, [8, 14, 24][rating - 1], [5, 7, 10][rating - 1], [18, 28, 46][rating - 1]);
    if (rating === 3) game.effects.spark(hitPoint.x, hitPoint.y, '#ffffff', 6, 4, 64);
    game.hitstop = [4, def.sound === 'heavy' ? 8 : 5, 11][rating - 1];
    game.shake = [3, def.sound === 'heavy' ? 8 : 4, 13][rating - 1];
    Sfx[def.sound || 'light']();

    if (this.hp <= 0) {
      this.state = 'ko';
      this.vy = def.launch || 8;
      this.y = Math.max(this.y, 0.01);
      this.vx = dir * (def.launchX || 6);
      this.hitstun = 0;
      game.onKO(this);
    } else if (def.knockdown || !this.grounded) {
      this.hitstun = 30;
      this.vy = this.grounded ? def.launch || 6 : Math.max(this.vy, def.launch || 4);
      if (def.launchX) this.vx = dir * def.launchX;
      this.y = Math.max(this.y, 0.01);
      this.knockedAirborne = true;
      this.state = 'hit';
    } else {
      this.hitstun = def.hitstun;
      this.state = 'hit';
    }
    return 'hit';
  }

  // A character holding a two-handed weapon (char.armPose) keeps their arms on
  // it except while punching; legs and torso still follow the move.
  targetPose() {
    const pose = this.basePose();
    const hold = this.char.armPose;
    const lying = pose === POSES.lying;
    const punching = this.move && /punch|uppercut/i.test(this.move.name);
    if (!hold || lying || this.hitstun > 0 || this.won || punching) return pose;
    const aiming = this.move && this.move.def.projectile && this.char.aimPose;
    return { ...pose, ...(aiming ? this.char.aimPose : hold) };
  }

  basePose() {
    if (this.state === 'ko' || this.state === 'down') return POSES.lying;
    if (this.won) return POSES[this.char.victoryPose] || POSES.victory;
    if (this.hitstun > 0) return this.knockedAirborne ? POSES.lying : this.choked > 0 ? POSES.choked : POSES.hit;
    if (this.blockstun > 0 || (this.state !== 'attack' && this.isFree && this.grounded && this.holdBack && this.nearThreat)) {
      return this.holdDown ? POSES.crouchBlock : POSES.block;
    }
    if (this.move) return this.movePose();
    switch (this.state) {
      case 'crouch': return POSES.crouch;
      case 'jump': return POSES.jump;
      case 'walk': return this.walkPose();
      default: return this.idlePose();
    }
  }

  movePose() {
    const { def, frame } = this.move;
    const windup = POSES[def.pose + '_windup'];
    const hit = POSES[def.pose];
    const base = def.air ? POSES.jump : def.crouching ? POSES.crouch : POSES.idle;
    if (frame < def.startup) return lerpPose(windup, hit, Math.max(0, frame / def.startup - 0.4) / 0.6);
    if (frame < def.startup + def.active) return hit;
    // A held move keeps its pose until its last `hold` frames, then eases back.
    const after = frame - def.startup - def.active;
    if (def.hold) return lerpPose(hit, base, Math.max(0, after - (def.recovery - def.hold)) / def.hold);
    const t = after / def.recovery;
    return lerpPose(hit, base, t);
  }

  // Pose used for hit detection: the fully extended pose during active frames.
  hitPose() {
    return POSES[this.move.def.pose];
  }

  idlePose() {
    const b = Math.sin(this.time * 0.08);
    const p = { ...POSES.idle };
    p.torso += b * 0.02;
    p.uaF += b * 0.05;
    p.uaB += b * 0.05;
    p.thF += b * 0.03;
    p.thB -= b * 0.03;
    return p;
  }

  walkPose() {
    const ph = this.walkPhase;
    const p = { ...POSES.idle };
    p.thF = 0.08 + 0.42 * Math.sin(ph);
    p.shF = p.thF - 0.45 * Math.max(0, Math.cos(ph));
    p.thB = 0.08 - 0.42 * Math.sin(ph);
    p.shB = p.thB - 0.45 * Math.max(0, -Math.cos(ph));
    p.torso = 0.16;
    return p;
  }

  updatePose() {
    const target = this.targetPose();
    const speed = this.move ? 0.6 : this.hitstun > 0 ? 0.5 : 0.3;
    this.pose = lerpPose(this.pose, target, speed);
  }

  // Characters share one skeleton; `scale` makes some taller (with longer reach).
  get scale() {
    return this.char.scale || 1;
  }

  // World transform helpers.
  toWorld(pt, sk) {
    const s = this.scale;
    return { x: this.x + pt.x * this.facing * s, y: GROUND - this.y - (sk.base - pt.y) * s };
  }

  hurtbox() {
    const sk = skeleton(this.pose);
    const s = this.scale;
    const height = (sk.base - Math.min(sk.head.y - BODY.head, sk.handF.y, sk.handB.y)) * s;
    return {
      x: this.x - 22 * s,
      y: GROUND - this.y - height,
      w: 44 * s,
      h: height,
    };
  }

  // Crouched on the ground: standing punches and kicks pass overhead.
  get isDucking() {
    if (!this.grounded || this.state === 'ko' || this.downTime > 0) return false;
    return this.state === 'crouch' || !!(this.move && this.move.def.crouching)
      || (this.blockstun > 0 && this.holdDown);
  }

  // The force field bubble around the body, in world coordinates.
  shieldEllipse() {
    const hb = this.hurtbox();
    const k = this.field.size;
    return { cx: this.x, cy: hb.y + hb.h / 2, rx: (hb.w / 2 + 34 * this.scale) * k, ry: (hb.h / 2 + 14 * this.scale) * (0.85 + 0.15 * k) };
  }

  // Hit radius of the current attack, grown with the character.
  get hitRadius() {
    return this.move.def.radius * this.scale;
  }

  hitPoint() {
    const sk = skeleton(this.hitPose());
    const limb = this.move.def.limb;
    return this.toWorld(limb === 'saberTip' ? saberTip(sk) : sk[limb], sk);
  }
}
