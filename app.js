/* ===============================
   CONFIG — EDIT THESE
================================ */

const ROOMS = {
  "The Great Hall of Indulgence": {
    actions: [
      { id:"gh_a1", title:"Action — Inventory of Desire", text:"Find the items hidden in this chamber. Choose the one that calls to you most, and tell me why." },
      { id:"gh_a2", title:"Action — Offering", text:"Select one item and place it somewhere visible. Leave it there." },
      { id:"gh_a3", title:"Action — Confession", text:"Tell me one thing you enjoy but don’t often admit." }
    ],
    rewards: {
      small:{ title:"Room Cleared", text:"The hall hums softly. You may proceed." },
      big:{ title:"Critical Success", text:"The hall approves. A stronger desire awakens." },
      nat20:{ title:"NAT 20 — Favor of Indulgence", text:"Reality bends. The ritual deepens." }
    },
    paidHint: "Look where items are usually kept nearby. Don’t overthink it."
  },

  "The Passage of Submission": {
    actions: [
      { id:"ps_a1", title:"Action — Oath", text:"Speak a single sentence committing yourself to this night." },
      { id:"ps_a2", title:"Action — Stillness", text:"Hold still for ten slow breaths. No fidgeting." },
      { id:"ps_a3", title:"Action — Token", text:"Bring an object from another room and place it here." }
    ],
    rewards: {
      small:{ title:"Room Cleared", text:"The passage opens further." },
      big:{ title:"Critical Success", text:"The walls whisper approval." },
      nat20:{ title:"NAT 20 — Chosen Path", text:"A secret route reveals itself where none existed." }
    },
    paidHint: "Stand at the entrance and scan left-to-right; the clue is meant to be noticed fast."
  },

  "The Royal Chamber": {
    actions: [
      { id:"rc_a1", title:"Action — Claim", text:"Stand or sit where you feel most powerful. Hold it." },
      { id:"rc_a2", title:"Action — Command", text:"Say one clear instruction for what you want later." },
      { id:"rc_a3", title:"Action — Confession", text:"Tell me what makes you feel most desired." }
    ],
    rewards: {
      small:{ title:"Room Cleared", text:"The chamber yields." },
      big:{ title:"Critical Success", text:"The chamber offers more." },
      nat20:{ title:"NAT 20 — Crowned", text:"The throne recognizes you." }
    },
    paidHint: "Focus on the place you naturally reach for first in that room."
  },

  "The Secret Chamber": {
    actions: [
      { id:"sc_a1", title:"Action — Discovery", text:"Find something hidden in this room and bring it out." },
      { id:"sc_a2", title:"Action — Choice", text:"Choose one item you will use later and set it aside." },
      { id:"sc_a3", title:"Action — Whisper", text:"Tell me what excites you about secrets." }
    ],
    rewards: {
      small:{ title:"Room Cleared", text:"The secret is acknowledged." },
      big:{ title:"Critical Success", text:"A deeper secret stirs." },
      nat20:{ title:"NAT 20 — Beyond the Veil", text:"The hidden reveals itself willingly." }
    },
    paidHint: "Check the most ‘private’ storage spot in that room."
  },

  "The Sanctum of Purification": {
    actions: [
      { id:"sp_a1", title:"Action — Preparation", text:"Wash your hands slowly and deliberately." },
      { id:"sp_a2", title:"Action — Ritual", text:"Dry your hands. Breathe once, fully." },
      { id:"sp_a3", title:"Action — Mark", text:"Look at yourself briefly and acknowledge what you see." }
    ],
    rewards: {
      small:{ title:"Room Cleared", text:"You are prepared." },
      big:{ title:"Critical Success", text:"You are more than prepared." },
      nat20:{ title:"NAT 20 — Transcendence", text:"The rite exceeds its limit." }
    },
    paidHint: "The clue is near where you start your routine."
  }
};

const ROUTE = [
  "The Great Hall of Indulgence",
  "The Passage of Submission",
  "The Royal Chamber",
  "The Sanctum of Purification",
  "The Secret Chamber"
];

function directionText(roomName, tier) {
  if (tier === "low")  return "The air turns thick with omen. Seek the chamber by instinct.";
  if (tier === "mid")  return `Go to ${roomName}. Watch what your eyes skip.`;
  return `${roomName}. Go there now — without hesitation.`;
}

const SHAKE_THRESHOLD = 18;
const SHAKE_COOLDOWN_MS = 900;

const STORAGE_KEY = "dark_valentine_v3";

const STARTING_OBOLS = 3;
const HINT_COST = 1;

/* ===============================
   ENGINE
================================ */

const ui = document.getElementById("ui");

/* --- Sound --- */
const clackEl = document.getElementById("clack");
let audioUnlocked = false;

function unlockAudioOnce(){
  // Call this from a user gesture (tap). After this, play() will work during shake rolls.
  if (audioUnlocked) return;
  if (!clackEl) { audioUnlocked = true; return; }

  // Try a silent-ish priming play/pause
  clackEl.volume = 0.85;
  clackEl.currentTime = 0;

  const p = clackEl.play();
  if (p && typeof p.then === "function") {
    p.then(() => {
      clackEl.pause();
      clackEl.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => {
      // If it fails, we’ll keep trying on next tap
      audioUnlocked = false;
    });
  } else {
    audioUnlocked = true;
  }
}

function playClack(){
  if (!clackEl) return;
  // Even after unlocking, some browsers want currentTime reset for rapid replays
  try {
    clackEl.currentTime = 0;
    clackEl.play().catch(()=>{});
  } catch {}
}

let state = safeLoad() ?? {
  stepIndex: 0,
  lastRoll: null,
  armed: false,
  completed: [],
  obols: STARTING_OBOLS,
  paidHintUsedAtStep: {}
};

function safeLoad(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function clarityTier(r){ if (r <= 7) return "low"; if (r <= 14) return "mid"; return "high"; }
function rewardTierFromRoll(r){ if (r === 20) return "nat20"; return r >= 15 ? "big" : "small"; }
function nextRoomName(){ return ROUTE[state.stepIndex % ROUTE.length]; }

function pickNextAction(roomName){
  const room = ROOMS[roomName];
  if (!room) return null;
  return room.actions.find(a => !state.completed.includes(a.id)) ?? null;
}
function roomCleared(roomName){
  const room = ROOMS[roomName];
  if (!room) return false;
  return room.actions.every(a => state.completed.includes(a.id));
}

function rollD20(){
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return (a[0] % 20) + 1;
}

/* ----- Fullscreen best-effort ----- */
async function tryFullscreen(){
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  try { if (fn) await fn.call(el); } catch {}
}

/* ----- Motion permission (iOS) ----- */
async function requestMotionPermission(){
  if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
    return DeviceMotionEvent.requestPermission();
  }
  return "granted";
}

/* ----- Shake listener ----- */
let shakeListenerInstalled = false;
let lastShakeAt = 0;

function installShakeListener(onShake){
  if (shakeListenerInstalled) return;
  shakeListenerInstalled = true;

  window.addEventListener("devicemotion", (e) => {
    const now = Date.now();
    if (now - lastShakeAt < SHAKE_COOLDOWN_MS) return;

    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    const x = acc.x || 0, y = acc.y || 0, z = acc.z || 0;
    const magnitude = Math.sqrt(x*x + y*y + z*z);

    if (magnitude > SHAKE_THRESHOLD) {
      lastShakeAt = now;
      onShake();
    }
  }, { passive: true });
}

/* ----- Dice animation ----- */
function animateDiceToResult(result){
  const d20 = document.getElementById("d20");
  const num = document.getElementById("d20num");
  if (!d20 || !num) return;

  d20.classList.add("rolling");

  // play a few clacks while it rolls (works after audio unlock)
  playClack();
  setTimeout(playClack, 180);
  setTimeout(playClack, 380);
  setTimeout(playClack, 650);

  let tick = 0;
  const interval = setInterval(() => {
    tick++;
    num.textContent = String(((tick * 7) % 20) + 1);
  }, 55);

  setTimeout(() => {
    clearInterval(interval);
    num.textContent = String(result);
    d20.classList.remove("rolling");
    // final “settle” clack
    setTimeout(playClack, 40);
  }, 1100);
}

/* ===============================
   SCREENS
================================ */

function renderHome(){
  const room = nextRoomName();

  ui.innerHTML = `
    <h2>Dark Valentine Quest</h2>
    <p class="muted">Next destination:</p>
    <p class="room">${escapeHtml(room)}</p>

    <div class="diceArea">
      <div class="d20" id="d20" role="img" aria-label="Twenty-sided die">
        <div class="shape"></div>
        <div class="num" id="d20num">${state.lastRoll ?? "20"}</div>
      </div>
    </div>

    <div class="row">
      <span class="badge mono">Obols: ${state.obols}</span>
      <span class="badge mono">Hint price: ${HINT_COST}</span>
      ${audioUnlocked ? `<span class="badge mono">Audio: ON</span>` : `<span class="badge mono">Audio: tap to enable</span>`}
    </div>

    <div class="spacer"></div>

    <div class="row">
      <button id="shakeBtn">Roll (shake)</button>
      <button id="tapBtn" class="secondary">Roll (tap)</button>
      <button id="fsBtn" class="secondary">Fullscreen</button>
      <button id="resetBtn" class="danger">Reset</button>
    </div>

    <div class="spacer"></div>
    <p class="muted">iPhone: tap “Roll (shake)” once → allow Motion access → shake. Android: usually just works.</p>
  `;

  document.getElementById("fsBtn").onclick = () => {
    unlockAudioOnce(); // user gesture; also unlock sound
    tryFullscreen();
  };

  document.getElementById("shakeBtn").onclick = async () => {
    unlockAudioOnce(); // IMPORTANT: unlock audio before any shake roll
    const perm = await requestMotionPermission();
    if (perm !== "granted") {
      ui.insertAdjacentHTML("beforeend", `<div class="hr"></div><p style="color: var(--danger);">Motion permission denied. Use “Roll (tap)”.</p>`);
      return;
    }

    state.armed = true;
    save();

    installShakeListener(() => {
      if (!state.armed) return;
      const r = rollD20();
      state.lastRoll = r;
      state.armed = false;
      save();
      animateDiceToResult(r);
      setTimeout(renderDirection, 950);
    });

    ui.insertAdjacentHTML("beforeend", `<div class="hr"></div><p class="mono">Armed. Shake to roll…</p>`);
  };

  document.getElementById("tapBtn").onclick = () => {
    unlockAudioOnce();
    const r = rollD20();
    state.lastRoll = r;
    save();
    animateDiceToResult(r);
    setTimeout(renderDirection, 950);
  };

  document.getElementById("resetBtn").onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };
}

function renderDirection(){
  const room = nextRoomName();
  const roll = state.lastRoll ?? 1;
  const tier = clarityTier(roll);

  const text = directionText(room, tier);
  const paidUsed = !!state.paidHintUsedAtStep[state.stepIndex];
  const canBuyHint = !paidUsed && state.obols >= HINT_COST;
  const paidHintText = ROOMS[room]?.paidHint ?? "The dungeon offers nothing more.";

  ui.innerHTML = `
    <h3>Direction</h3>
    <p class="clarity-${tier}">${escapeHtml(text)}</p>

    <div class="row">
      <span class="badge mono">d20: ${roll}</span>
      <span class="badge mono">clarity: ${tier.toUpperCase()}</span>
      <span class="badge mono">Obols: ${state.obols}</span>
    </div>

    <div class="spacer"></div>

    <div class="row">
      <button id="thereBtn">I’m there</button>
      <button id="rerollBtn" class="secondary">Re-roll</button>
      <button id="hintBtn" class="secondary" ${canBuyHint ? "" : "disabled"}>
        Pay the price (-${HINT_COST})
      </button>
    </div>

    ${paidUsed ? `
      <div class="hr"></div>
      <p class="muted"><span class="mono">Price paid.</span> ${escapeHtml(paidHintText)}</p>
    ` : ""}
  `;

  document.getElementById("thereBtn").onclick = () => renderAction();

  document.getElementById("rerollBtn").onclick = () => {
    state.lastRoll = null;
    save();
    renderHome();
  };

  document.getElementById("hintBtn").onclick = () => {
    if (!canBuyHint) return;
    unlockAudioOnce();
    playClack(); // small “payment” clack
    state.obols -= HINT_COST;
    state.paidHintUsedAtStep[state.stepIndex] = true;
    save();
    renderDirection();
  };
}

function renderAction(){
  const room = nextRoomName();
  const action = pickNextAction(room);

  if (!action) return renderReward(room);

  ui.innerHTML = `
    <h3>${escapeHtml(action.title)}</h3>
    <p class="muted">Chamber:</p>
    <p class="room">${escapeHtml(room)}</p>
    <p>${escapeHtml(action.text)}</p>

    <div class="row">
      <button id="doneBtn">Done</button>
      <button id="backBtn" class="secondary">Back</button>
    </div>
  `;

  document.getElementById("doneBtn").onclick = () => {
    unlockAudioOnce();
    playClack();
    if (!state.completed.includes(action.id)) state.completed.push(action.id);
    save();
    if (roomCleared(room)) renderReward(room);
    else advance();
  };

  document.getElementById("backBtn").onclick = () => renderDirection();
}

function renderReward(room){
  const roll = state.lastRoll ?? 1;
  const tier = rewardTierFromRoll(roll);
  const reward = ROOMS[room]?.rewards?.[tier] ?? { title: "Reward", text: "A reward is granted." };

  ui.innerHTML = `
    <h2>${escapeHtml(reward.title)}</h2>
    <p class="muted">Room cleared:</p>
    <p class="room">${escapeHtml(room)}</p>
    <p>${escapeHtml(reward.text)}</p>
    <div class="row">
      <button id="contBtn">Continue</button>
    </div>
  `;

  document.getElementById("contBtn").onclick = () => {
    unlockAudioOnce();
    playClack();
    advance();
  };
}

function advance(){
  state.stepIndex += 1;
  state.lastRoll = null;
  save();
  renderHome();
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* Boot */
renderHome();
