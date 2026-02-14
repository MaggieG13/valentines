
/* Kinky Enchanted Quest — single-page app
   - Fullscreen-friendly
   - D20 visualization via Three.js
   - No browser popups; uses in-app modal only
*/

const GAME = JSON.parse(document.getElementById("GAME_DATA").textContent);
const LS_KEY = "kq_progress_v3";

// Custom dice audio (add your own file: dice-roll.mp3 in the same folder)
const diceAudio = new Audio("dice-roll.mp3");
diceAudio.preload = "auto";
diceAudio.volume = 0.9;

function playCustomDice(){
  // Mobile-safe: must be called from a user gesture (Roll button click)
  try{
    diceAudio.currentTime = 0;
    const p = diceAudio.play();
    if(p && typeof p.catch === "function"){ p.catch(()=>{}); }
  }catch(e){
    // If the file is missing or playback is blocked, fail silently (no popups).
  }
}


const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function hashSeed(str){
  // simple deterministic hash to seed a PRNG
  let h = 2166136261;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}
function seededRand(seed){
  // xorshift32
  let x = seed || 123456789;
  return function(){
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

function revealByRoll(txt, roll, levelId){
  const s = String(txt || "");
  if(!s.trim()) return "—";
  if(!roll) return "Roll the d20 to sharpen the words.\n\n" + maskWords(s, 0.15, levelId, 0);
  if(roll > 16) return s;
  if(roll >= 7) return maskWords(s, 0.55, levelId, roll);
  return maskWords(s, 0.22, levelId, roll);
}

function maskWords(txt, keepRatio, levelId, roll){
  // Keep a % of words visible; mask the rest with veil glyphs, preserving punctuation & spacing.
  const seed = hashSeed((levelId||"lvl") + "|" + String(roll));
  const rnd = seededRand(seed);

  // Split into tokens: words vs whitespace vs punctuation
  const tokens = [];
  const reTok = /([A-Za-zÀ-ž0-9’']+)|(\s+)|([^A-Za-zÀ-ž0-9’'\s]+)/g;
  let m;
  while((m = reTok.exec(txt)) !== null){
    tokens.push({ word: m[1] || null, ws: m[2] || null, punc: m[3] || null });
  }

  const wordIdx = tokens.map((t,i)=>t.word?i:-1).filter(i=>i>=0);
  const n = wordIdx.length;
  const keepN = Math.max( Math.floor(n * keepRatio), Math.min(3, n) ); // keep at least a few if possible

  // pick which words to keep (deterministic)
  const picks = new Set();
  while(picks.size < keepN && picks.size < n){
    const j = Math.floor(rnd() * n);
    picks.add(wordIdx[j]);
  }

  return tokens.map((t,i)=>{
    if(t.ws) return t.ws;
    if(t.punc) return t.punc;
    if(t.word){
      if(picks.has(i)) return t.word;
      // mask word with dots roughly matching length
      const len = t.word.length;
      if(len <= 2) return "•".repeat(len);
      return "•".repeat(Math.min(len, 8));
    }
    return "";
  }).join("");
}

// Reveal state: directions clarity resets when you switch levels.
function ensureRevealState(levelId){
  if(state.reveal.levelId !== levelId){
    state.reveal.levelId = levelId;
    state.reveal.unlocked = false;
  }
}
function unlockRevealFor(levelId){
  state.reveal.levelId = levelId;
  state.reveal.unlocked = true;
}
function isRevealedFor(levelId){
  return state.reveal.levelId === levelId && state.reveal.unlocked === true;
}


function loadProgress(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return { completed:{}, notes:{}, wordHunt:{ lettersFound:[] }, convergence:{ chosen:[], stillnessDone:false, stillnessBroken:false } };
    const p = JSON.parse(raw);
    return {
      completed: p.completed || {},
      notes: p.notes || {},
      wordHunt: p.wordHunt || { lettersFound:[] },
      convergence: p.convergence || { chosen:[], stillnessDone:false, stillnessBroken:false }
    };
  }catch{
    return { completed:{}, notes:{}, wordHunt:{ lettersFound:[] }, convergence:{ chosen:[], stillnessDone:false, stillnessBroken:false } };
  }
}
function saveProgress(){
  localStorage.setItem(LS_KEY, JSON.stringify(PROGRESS));
}

let PROGRESS = loadProgress();

let state = {
  chapterIndex: 0,
  levelIndex: 0,
  lastRoll: null,
  rollMode: "Normal",
  reveal: { levelId: null, unlocked: false }
};

function getChapter(ci){ return GAME.chapters[ci]; }
function getLevel(ci, li){ return GAME.chapters[ci].levels[li]; }

function isLevelComplete(levelId){
  return !!PROGRESS.completed[levelId];
}

function chapterCompletion(ci){
  const ch = getChapter(ci);
  const done = ch.levels.filter(l => isLevelComplete(l.id)).length;
  return { done, total: ch.levels.length };
}

function renderChapters(){
  const wrap = $("#chapters");
  wrap.innerHTML = "";
  GAME.chapters.forEach((ch, ci) => {
    const {done,total} = chapterCompletion(ci);
    const btn = document.createElement("button");
    btn.className = "chapterBtn";
    btn.type = "button";
    btn.innerHTML = `
      <div class="chapterBtn__title">${ch.title}</div>
      <div class="chapterBtn__dir">${ch.direction}</div>
      <div class="chapterBtn__meta">
        <span class="pill">${done}/${total} cleared</span>
        <span class="pill">${ci === state.chapterIndex ? "Active" : "Open"}</span>
      </div>
    `;
    btn.addEventListener("click", () => {
      state.chapterIndex = ci;
      state.levelIndex = 0;
      renderAll();
    });
    wrap.appendChild(btn);
  });
}

function renderLevel(){
  const ch = getChapter(state.chapterIndex);
  const lvl = getLevel(state.chapterIndex, state.levelIndex);

  // Each turn requires a fresh roll to sharpen the directions.
  ensureRevealState(lvl.id);

  $("#crumb").textContent = `${state.chapterIndex+1}/${GAME.chapters.length} • ${state.levelIndex+1}/${ch.levels.length}`;
  $("#chapterTitle").textContent = ch.title;
  $("#levelTitle").textContent = lvl.title;
  $("#chapterDirection").textContent = isRevealedFor(lvl.id) ? revealByRoll(ch.direction, state.lastRoll, lvl.id) : revealByRoll(ch.direction, null, lvl.id);
  $("#action").textContent = lvl.action || "—";
  $("#direction").textContent = isRevealedFor(lvl.id) ? revealByRoll((lvl.direction || "—"), state.lastRoll, lvl.id) : revealByRoll((lvl.direction || "—"), null, lvl.id);

  $("#btnPrev").disabled = (state.chapterIndex===0 && state.levelIndex===0);
  $("#btnNext").disabled = !revealed;

  const isDone = isLevelComplete(lvl.id);
  const revealed = isRevealedFor(lvl.id);
  $("#btnComplete").textContent = isDone ? "Completed ✓" : "Mark level complete";
  $("#btnComplete").disabled = isDone || !revealed;

  renderMechanics(lvl);
}

function renderMechanics(level){
  const box = $("#mechanics");
  box.innerHTML = "";
  const m = level.mechanics || null;
  if(!m) return;

  const addCard = (title, sub, innerEl) => {
    const c = document.createElement("div");
    c.className = "mCard";
    c.innerHTML = `<div class="mTitle">${title}</div>${sub?`<div class="mSub">${sub}</div>`:""}`;
    if(innerEl) c.appendChild(innerEl);
    box.appendChild(c);
  };

  if(m.type === "word_hunt"){
    // Shared word-hunt state regardless of where stored in GAME_DATA
    const word = m.word || "PINEAPPLE";
    if(!PROGRESS.wordHunt.word) PROGRESS.wordHunt.word = word;

    const wrap = document.createElement("div");
    const found = new Set((PROGRESS.wordHunt.lettersFound || []).map(x => String(x).toUpperCase()));
    wrap.innerHTML = `
      <div class="mSub">Collar rule: it may be removed only when every letter is found.</div>
      <div class="row" style="margin-bottom:10px;">
        <div class="pill">Word length: ${word.length}</div>
        <div class="pill">Found: ${found.size}/${word.length}</div>
        <div class="pill" id="collarStatus">${found.size===word.length ? "Collar: Released" : "Collar: Bound"}</div>
      </div>
      <div class="row" style="gap:8px; align-items:stretch;">
        <input id="letterInput" type="text" maxlength="1" placeholder="Letter"/>
        <button id="addLetter" class="btn btn--primary" type="button">Add</button>
        <button id="undoLetter" class="btn" type="button">Undo</button>
      </div>
      <div style="margin-top:10px;" class="text" id="lettersView"></div>
      <div style="margin-top:10px;" class="row">
        <input id="guessInput" type="text" placeholder="Optional guess the full word…"/>
        <button id="guessBtn" class="btn" type="button">Check guess</button>
      </div>
      <div style="margin-top:10px;" class="mSub" id="guessResult"></div>
    `;

    addCard("Word Hunt", "Track found letters here. The game stays strict, but the tracking stays simple.", wrap);

    const lettersView = $("#lettersView", wrap);
    const renderLetters = () => {
      const out = [...word].map(ch => (found.has(ch) ? ` ${ch} ` : ` _ `)).join("");
      lettersView.textContent = out;
      $("#collarStatus", wrap).textContent = (found.size===word.length ? "Collar: Released" : "Collar: Bound");
      saveProgress();
    };
    renderLetters();

    $("#addLetter", wrap).addEventListener("click", () => {
      const v = ($("#letterInput", wrap).value || "").trim().toUpperCase();
      $("#letterInput", wrap).value = "";
      if(!v || v.length!==1) return;
      // only allow letters that exist in the word
      if(!word.includes(v)) return;
      found.add(v);
      PROGRESS.wordHunt.lettersFound = [...found];
      renderLetters();
    });

    $("#undoLetter", wrap).addEventListener("click", () => {
      const arr = [...found];
      arr.pop();
      found.clear();
      arr.forEach(x => found.add(x));
      PROGRESS.wordHunt.lettersFound = [...found];
      renderLetters();
    });

    $("#guessBtn", wrap).addEventListener("click", () => {
      const g = ($("#guessInput", wrap).value || "").trim().toUpperCase();
      const ok = (g === word);
      $("#guessResult", wrap).textContent = ok ? "Correct. Certainty is earned." : (g ? "Not yet. The word resists you." : "");
      if(ok){
        // auto-fill all letters if guessed correctly
        for(const ch of word) found.add(ch);
        PROGRESS.wordHunt.lettersFound = [...found];
        renderLetters();
      }
    });
  }

  if(m.type === "dice_draw"){
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="mSub">Roll the d20. Then draw one card from the deck.</div>
      <div class="row">
        <button class="btn btn--primary" id="drawBtn" type="button">Draw from “${m.deck}”</button>
        <button class="btn" id="reshuffleBtn" type="button">Reshuffle</button>
      </div>
      <div style="margin-top:10px;" class="text" id="drawOut">—</div>
    `;
    addCard("Fate Draw", "Chance chooses. You execute when the stars align.", wrap);

    const deckKey = m.deck;
    const deck = GAME.decks[deckKey] || [];
    if(!PROGRESS.notes[`deck_${deckKey}`]){
      PROGRESS.notes[`deck_${deckKey}`] = { order: shuffle([...deck]), idx: 0 };
      saveProgress();
    }

    const drawOut = $("#drawOut", wrap);
    const updateOut = () => {
      const d = PROGRESS.notes[`deck_${deckKey}`];
      if(d.idx <= 0) drawOut.textContent = "—";
    };
    updateOut();

    $("#drawBtn", wrap).addEventListener("click", () => {
      const d = PROGRESS.notes[`deck_${deckKey}`];
      if(d.idx >= d.order.length){
        drawOut.textContent = "The deck is empty. Reshuffle to tempt fate again.";
        return;
      }
      const card = d.order[d.idx];
      d.idx += 1;
      drawOut.textContent = card;
      saveProgress();
    });

    $("#reshuffleBtn", wrap).addEventListener("click", () => {
      PROGRESS.notes[`deck_${deckKey}`] = { order: shuffle([...deck]), idx: 0 };
      drawOut.textContent = "—";
      saveProgress();
    });
  }

  if(m.type === "prompt"){
    const key = `note_${level.id}`;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="mSub">${m.input || "Write your response here."}</div>
      <textarea id="noteArea" placeholder="Write here…"></textarea>
      <div class="row" style="margin-top:10px; justify-content:flex-end;">
        <button id="saveNote" class="btn btn--primary" type="button">Save</button>
      </div>
      <div class="mSub" id="saveMsg" style="margin-top:8px;"></div>
    `;
    addCard("Write It Down", "This is for you — saved locally on this device.", wrap);
    const area = $("#noteArea", wrap);
    area.value = PROGRESS.notes[key] || "";
    $("#saveNote", wrap).addEventListener("click", () => {
      PROGRESS.notes[key] = area.value;
      saveProgress();
      $("#saveMsg", wrap).textContent = "Saved.";
      setTimeout(()=>{ $("#saveMsg", wrap).textContent = ""; }, 1200);
    });
  }

  
  if(m.type === "riddle"){
    const wrap = document.createElement("div");
    const src = m.imageData || m.image || "";
    const img = src ? `<img src="${src}" alt="Riddle image" style="width:100%;border-radius:16px;border:1px solid rgba(255,255,255,.10);margin:10px 0;display:block;">` : "";
    wrap.innerHTML = `
      <div class="mSub">${m.caption ? escapeHtml(m.caption) : "A riddle waits. Read it carefully."}</div>
      ${img}
      <div class="row" style="gap:8px;align-items:stretch;">
        <input id="riddleIn" type="text" placeholder="Your answer…"/>
        <button id="riddleCheck" class="btn btn--primary" type="button">Check</button>
      </div>
      <div class="mSub" id="riddleOut" style="margin-top:8px;"></div>
    `;
    addCard("Riddle", "Prove you have been paying attention all along.", wrap);

    const key = `riddle_${level.id}`;
    $("#riddleIn", wrap).value = PROGRESS.notes[key] || "";
    $("#riddleCheck", wrap).addEventListener("click", () => {
      const v = ($("#riddleIn", wrap).value || "").trim();
      PROGRESS.notes[key] = v;
      saveProgress();
      const sol = (m.solution || "").toLowerCase().trim();
      const ok = v.toLowerCase().trim() === sol;
      $("#riddleOut", wrap).textContent = ok ? "Correct. The path opens." : (v ? "Not yet. Look closer." : "");
    });
  }

if(m.type === "guess"){
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="mSub">Declare your guess before the box is opened. (This tracker doesn’t judge — it records.)</div>
      <input id="guessBox" type="text" placeholder="Your guess…"/>
      <div class="row" style="margin-top:10px; justify-content:flex-end;">
        <button id="saveGuess" class="btn btn--primary" type="button">Lock it in</button>
      </div>
      <div class="mSub" id="guessSaved" style="margin-top:8px;"></div>
    `;
    addCard("Mystery Box", "Speak your belief before truth is revealed.", wrap);
    const key = `guess_${level.id}`;
    $("#guessBox", wrap).value = PROGRESS.notes[key] || "";
    $("#saveGuess", wrap).addEventListener("click", () => {
      PROGRESS.notes[key] = ($("#guessBox", wrap).value || "").trim();
      saveProgress();
      $("#guessSaved", wrap).textContent = "Locked.";
      setTimeout(()=>{ $("#guessSaved", wrap).textContent = ""; }, 1200);
    });
  }

  if(m.type === "redeemables"){
    const wrap = document.createElement("div");
    const key = `coupons_${level.id}`;
    if(!PROGRESS.notes[key]){
      PROGRESS.notes[key] = Array.from({length: m.count || 8}, (_,i)=>({name:`Coupon ${i+1}`, used:false, note:""}));
      saveProgress();
    }
    const coupons = PROGRESS.notes[key];

    wrap.innerHTML = `<div class="mSub">Tap a coupon to mark it redeemed. Add a note if you want.</div>`;
    const list = document.createElement("div");
    coupons.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "mCard";
      row.style.margin = "10px 0 0 0";
      row.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <div><strong>${escapeHtml(c.name)}</strong><div class="mSub" style="margin:4px 0 0 0;">${c.used ? "Redeemed" : "Unused"}</div></div>
          <button class="btn ${c.used ? "" : "btn--primary"}" type="button">${c.used ? "Undo" : "Redeem"}</button>
        </div>
        <div style="margin-top:10px;">
          <input type="text" placeholder="Note (optional)…" value="${escapeAttr(c.note || "")}"/>
        </div>
      `;
      const btn = $("button", row);
      const inp = $("input", row);
      btn.addEventListener("click", () => {
        coupons[idx].used = !coupons[idx].used;
        saveProgress();
        renderAll();
      });
      inp.addEventListener("change", () => {
        coupons[idx].note = inp.value;
        saveProgress();
      });
      list.appendChild(row);
    });
    wrap.appendChild(list);
    addCard("Coupons", "Promises to be redeemed when you desire.", wrap);
  }

  if(m.type === "checklist"){
    const wrap = document.createElement("div");
    const key = `check_${level.id}`;
    if(!PROGRESS.notes[key]){
      PROGRESS.notes[key] = (m.steps || []).map(s => ({ step:s, done:false }));
      saveProgress();
    }
    const steps = PROGRESS.notes[key];
    wrap.innerHTML = `<div class="mSub">Mark each step as you complete it.</div>`;
    steps.forEach((s, idx) => {
      const line = document.createElement("div");
      line.className = "row";
      line.style.margin = "8px 0";
      line.innerHTML = `
        <button class="btn ${s.done ? "btn--primary" : ""}" type="button">${s.done ? "✓" : " "}</button>
        <div class="text" style="flex:1;">${escapeHtml(s.step)}</div>
      `;
      $("button", line).addEventListener("click", () => {
        steps[idx].done = !steps[idx].done;
        saveProgress();
        renderAll();
      });
      wrap.appendChild(line);
    });
    addCard("Checklist", "Precision matters. Take your time.", wrap);
  }

  if(m.type === "convergence"){
    const wrap = document.createElement("div");
    const items = gatherItemNames();
    const key = `convergence_${level.id}`;
    if(!PROGRESS.convergence) PROGRESS.convergence = { chosen:[], stillnessDone:false, stillnessBroken:false };
    const conv = PROGRESS.convergence;

    wrap.innerHTML = `
      <div class="mSub">This is the closing ritual. No props to find — only what has already been earned.</div>
      <div class="row" style="margin:10px 0;">
        <div class="pill">Stillness: ${m.stillnessSeconds || 120}s</div>
        <div class="pill">Choose: ${m.chooseCount || 3} items</div>
        <div class="pill" id="stillnessState">${conv.stillnessDone ? (conv.stillnessBroken ? "Stillness: Broken" : "Stillness: Held") : "Stillness: Not started"}</div>
      </div>

      <div class="mCard">
        <div class="mTitle">1) Choose your position</div>
        <div class="mSub">Kneeling, standing, or seated upright.</div>
        <select id="posSelect">
          <option value="">Select…</option>
          <option value="kneeling">Kneeling</option>
          <option value="standing">Standing</option>
          <option value="seated">Seated upright</option>
        </select>
      </div>

      <div class="mCard">
        <div class="mTitle">2) Stillness timer</div>
        <div class="mSub">Start the timer when posture is chosen. If stillness breaks, mark it.</div>
        <div class="row">
          <button id="startStill" class="btn btn--primary" type="button">Start ${m.stillnessSeconds || 120}s</button>
          <button id="breakStill" class="btn" type="button">Mark broken</button>
          <div class="pill" id="timerOut">—</div>
        </div>
      </div>

      <div class="mCard">
        <div class="mTitle">3) Choose your three</div>
        <div class="mSub">Available only after the stillness ends. If broken, one item becomes active by the controller’s choice.</div>
        <div id="pickArea"></div>
        <div class="row" style="margin-top:10px; justify-content:flex-end;">
          <button id="savePicks" class="btn btn--primary" type="button">Lock choices</button>
        </div>
        <div class="mSub" id="pickMsg" style="margin-top:8px;"></div>
      </div>
    `;
    addCard("The Convergence", "The game condenses. It becomes deliberate.", wrap);

    // restore position
    const posKey = `pos_${level.id}`;
    $("#posSelect", wrap).value = PROGRESS.notes[posKey] || "";
    $("#posSelect", wrap).addEventListener("change", (e) => {
      PROGRESS.notes[posKey] = e.target.value;
      saveProgress();
    });

    // timer
    const timerOut = $("#timerOut", wrap);
    let timer = null;
    const stillKey = `still_${level.id}`;
    const now = Date.now();
    const still = PROGRESS.notes[stillKey] || null;

    function renderTimer(){
      const statePill = $("#stillnessState", wrap);
      if(conv.stillnessDone){
        statePill.textContent = conv.stillnessBroken ? "Stillness: Broken" : "Stillness: Held";
      }else{
        statePill.textContent = "Stillness: Not started";
      }

      const stillLocal = PROGRESS.notes[stillKey] || null;
      if(!stillLocal){
        timerOut.textContent = "—";
        return;
      }
      const end = stillLocal.endAt;
      const left = Math.max(0, Math.ceil((end - Date.now())/1000));
      timerOut.textContent = left>0 ? `${left}s` : "Done";
      if(left<=0 && !conv.stillnessDone){
        conv.stillnessDone = true;
        saveProgress();
        renderPicks();
        renderTimer();
      }
    }

    function startTimer(){
      const pos = ($("#posSelect", wrap).value || "");
      if(!pos) return; // must choose a position first
      if(conv.stillnessDone) return;
      const seconds = m.stillnessSeconds || 120;
      PROGRESS.notes[stillKey] = { startAt: Date.now(), endAt: Date.now() + seconds*1000 };
      saveProgress();
      if(timer) clearInterval(timer);
      timer = setInterval(renderTimer, 250);
      renderTimer();
    }

    $("#startStill", wrap).addEventListener("click", startTimer);

    $("#breakStill", wrap).addEventListener("click", () => {
      conv.stillnessBroken = true;
      // allow completion immediately if they want; timer continues, but state is marked
      saveProgress();
      renderTimer();
      renderPicks();
    });

    // picks
    const pickArea = $("#pickArea", wrap);

    function renderPicks(){
      pickArea.innerHTML = "";
      const canPick = conv.stillnessDone; // only after timer done
      const chosen = new Set(conv.chosen || []);
      const limit = m.chooseCount || 3;

      const list = document.createElement("div");
      list.className = "row";
      list.style.gap = "8px";

      items.forEach(name => {
        const b = document.createElement("button");
        b.type = "button";
        const active = chosen.has(name);
        b.className = "btn " + (active ? "btn--primary" : "");
        b.textContent = name;
        b.disabled = !canPick;
        b.addEventListener("click", () => {
          if(!canPick) return;
          if(chosen.has(name)){
            chosen.delete(name);
          }else{
            if(chosen.size >= limit) return;
            chosen.add(name);
          }
          conv.chosen = [...chosen];
          saveProgress();
          renderPicks();
        });
        list.appendChild(b);
      });

      pickArea.appendChild(list);

      const msg = $("#pickMsg", wrap);
      if(!canPick){
        msg.textContent = "Hold stillness first. Then choose by intention.";
      }else{
        msg.textContent = `Chosen: ${chosen.size}/${limit}.`;
      }
    }

    renderPicks();
    renderTimer();
    if(PROGRESS.notes[stillKey] && !conv.stillnessDone){
      if(timer) clearInterval(timer);
      timer = setInterval(renderTimer, 250);
    }

    $("#savePicks", wrap).addEventListener("click", () => {
      const canPick = conv.stillnessDone;
      if(!canPick) return;
      const limit = m.chooseCount || 3;
      const chosen = conv.chosen || [];
      if(chosen.length !== limit) {
        $("#pickMsg", wrap).textContent = `Choose exactly ${limit} items.`;
        return;
      }
      $("#pickMsg", wrap).textContent = "Locked.";
      saveProgress();
      setTimeout(()=>{ $("#pickMsg", wrap).textContent = ""; }, 1200);
    });
  }
}

function gatherItemNames(){
  const names = new Set();
  for(const ch of GAME.chapters){
    for(const l of ch.levels){
      if(l.item && l.item !== "None. Only what has already been earned." && l.item !== "None."){
        names.add(l.item);
      }
    }
  }
  // include "Dice" as a symbolic item for convergence
  names.add("Dice");
  return [...names];
}

function renderAll(){
  renderChapters();
  renderLevel();
  renderDiceMeta();
}

function nextLevel(){
  const ch = getChapter(state.chapterIndex);
  if(state.levelIndex < ch.levels.length - 1){
    state.levelIndex += 1;
    renderAll();
    return;
  }
  // next chapter
  if(state.chapterIndex < GAME.chapters.length - 1){
    state.chapterIndex += 1;
    state.levelIndex = 0;
    renderAll();
  }
}

function prevLevel(){
  if(state.levelIndex > 0){
    state.levelIndex -= 1;
    renderAll();
    return;
  }
  if(state.chapterIndex > 0){
    state.chapterIndex -= 1;
    const ch = getChapter(state.chapterIndex);
    state.levelIndex = ch.levels.length - 1;
    renderAll();
  }
}

$("#btnNext").addEventListener("click", nextLevel);
$("#btnPrev").addEventListener("click", prevLevel);

$("#btnComplete").addEventListener("click", () => {
  const lvl = getLevel(state.chapterIndex, state.levelIndex);
  PROGRESS.completed[lvl.id] = true;
  saveProgress();
  renderAll();
});

$("#btnReset").addEventListener("click", () => {
  openModal("Reset progress", `
    <div class="text">This clears local progress on this device.</div>
    <div class="text" style="margin-top:8px;color:var(--muted);">No data leaves the device.</div>
  `, [
    { label:"Cancel", kind:"ghost", onClick: closeModal },
    { label:"Reset", kind:"primary", onClick: () => {
        localStorage.removeItem(LS_KEY);
        PROGRESS = loadProgress();
        state.chapterIndex = 0;
        state.levelIndex = 0;
        closeModal();
        renderAll();
      }
    }
  ]);
});

$("#btnHint").addEventListener("click", () => {
  const lvl = getLevel(state.chapterIndex, state.levelIndex);
  const suggestion = hintForLevel(lvl);
  openModal("Hint (pay the price)", `
    <div class="text">${escapeHtml(suggestion.hint)}</div>
    <div class="mCard" style="margin-top:12px;">
      <div class="mTitle">Choose the price</div>
      <div class="mSub">Pick one consequence before you receive the hint.</div>
      <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap;">
        <button class="btn" data-price="freeze">Freeze: 30s stillness</button>
        <button class="btn" data-price="confess">Confess: one honest truth</button>
        <button class="btn" data-price="task">Task: do a small service</button>
      </div>
      <div class="mSub" id="priceOut" style="margin-top:8px;"></div>
    </div>
  `, [
    { label:"Close", kind:"ghost", onClick: closeModal }
  ]);

  const priceOut = $("#priceOut");
  $$(".modal__body button[data-price]").forEach(b => {
    b.addEventListener("click", () => {
      const p = b.getAttribute("data-price");
      const line = (p==="freeze") ? "Price chosen: 30 seconds of stillness." :
                   (p==="confess") ? "Price chosen: one honest truth, no jokes." :
                   "Price chosen: a small act of service.";
      priceOut.textContent = line + " Now take your hint.";
    });
  });
});

function hintForLevel(lvl){
  // Keep hints gentle, non-explicit, and practical
  if(lvl.mechanics?.type === "word_hunt") return { hint: "Hide letter pieces in obvious-yet-mean places: under a mug, inside a book, taped behind a remote, under a pillow corner. Make the last letter feel like a reveal." };
  if(lvl.mechanics?.type === "dice_draw") return { hint: "Keep the deck nearby. After the roll lands, draw once—no rerolls. Commit to the first available night." };
  if(lvl.mechanics?.type === "convergence") return { hint: "Set the bed as the altar. Gather everything, pick a posture, start the stillness, and let the silence do the work. After, choose three items with intention." };
  if(lvl.mechanics?.type === "guess") return { hint: "Make the box feel impossible to read. Texture and weight are clues. Ask for a single confident answer before opening." };
  if(lvl.mechanics?.type === "prompt") return { hint: "Write it down immediately. Sincerity beats poetry; clarity beats perfection." };
  return { hint: "Slow down. Read the direction again. The clue is often closer than it feels." };
}

/* Modal (no alerts, no confirm popups) */
const modal = $("#modal");
const modalTitle = $("#modalTitle");
const modalBody = $("#modalBody");
const modalFoot = $("#modalFoot");

function openModal(title, bodyHtml, actions=[]){
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalFoot.innerHTML = "";
  actions.forEach(a => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn " + (a.kind==="primary" ? "btn--primary" : (a.kind==="ghost" ? "btn--ghost" : ""));
    b.textContent = a.label;
    b.addEventListener("click", a.onClick);
    modalFoot.appendChild(b);
  });
  modal.setAttribute("aria-hidden", "false");
}
function closeModal(){
  modal.setAttribute("aria-hidden", "true");
}
modal.addEventListener("click", (e) => {
  const t = e.target;
  if(t && t.getAttribute && t.getAttribute("data-close")==="1") closeModal();
});

/* Dice: Three.js D20-like (icosahedron) with landing number */
let diceScene, diceCamera, diceRenderer, diceMesh, diceLight, diceAnimating=false;
let diceCanvas = $("#diceCanvas");
let diceResultEl = $("#diceResult");

function setupDice(){
  const w = diceCanvas.clientWidth || 300;
  const h = diceCanvas.clientHeight || 300;

  diceRenderer = new THREE.WebGLRenderer({ canvas: diceCanvas, antialias:true, alpha:true });
  diceRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  diceRenderer.setSize(w, h, false);

  diceScene = new THREE.Scene();
  diceCamera = new THREE.PerspectiveCamera(40, w/h, 0.1, 100);
  diceCamera.position.set(0, 0, 4.2);

  diceLight = new THREE.DirectionalLight(0xffffff, 1.1);
  diceLight.position.set(2, 3, 4);
  diceScene.add(diceLight);
  diceScene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const geo = new THREE.IcosahedronGeometry(1.2, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2c0b44,
    metalness: 0.35,
    roughness: 0.25,
    emissive: 0x12051f,
    emissiveIntensity: 0.35
  });
  diceMesh = new THREE.Mesh(geo, mat);
  diceScene.add(diceMesh);

  // subtle outline
  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xb78cff, transparent:true, opacity:0.55 }));
  diceMesh.add(line);

  function render(){
    if(!diceRenderer) return;
    diceRenderer.render(diceScene, diceCamera);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

function resizeDice(){
  if(!diceRenderer) return;
  const w = diceCanvas.clientWidth || 300;
  const h = diceCanvas.clientHeight || 300;
  diceRenderer.setSize(w, h, false);
  diceCamera.aspect = w/h;
  diceCamera.updateProjectionMatrix();
}

window.addEventListener("resize", () => {
  resizeDice();
  resizeFire();
});

function renderDiceMeta(){
  $("#lastRoll").textContent = state.lastRoll ?? "—";
  $("#rollMode").textContent = state.rollMode;
}

function rollD20(){
  if(diceAnimating) return;
  diceAnimating = true;

  // Sound should only play on roll click
  playCustomDice();

  const target = 1 + Math.floor(Math.random()*20);
  state.lastRoll = target;
  renderDiceMeta();

  diceResultEl.textContent = "Rolling…";

  // animate rotation with easing
  const duration = 1300 + Math.random()*500;
  const start = performance.now();
  const startRot = diceMesh.rotation.clone();
  const spins = 10 + Math.floor(Math.random()*8);

  // pick a "landing" rotation that is stable
  const endRot = new THREE.Euler(
    Math.random()*Math.PI*2,
    Math.random()*Math.PI*2,
    Math.random()*Math.PI*2
  );

  const animate = (t) => {
    const p = clamp((t - start)/duration, 0, 1);
    const ease = 1 - Math.pow(1-p, 3);
    diceMesh.rotation.x = startRot.x + (endRot.x - startRot.x + spins)*ease;
    diceMesh.rotation.y = startRot.y + (endRot.y - startRot.y + spins*0.9)*ease;
    diceMesh.rotation.z = startRot.z + (endRot.z - startRot.z + spins*0.7)*ease;

    if(p < 1){
      requestAnimationFrame(animate);
    }else{
      diceAnimating = false;
      diceResultEl.textContent = String(target);
      // Rolling grants clarity for the current level.
      try{
        const lvl = getLevel(state.chapterIndex, state.levelIndex);
        unlockRevealFor(lvl.id);
        renderLevel();
      }catch(e){}
    }
  };
  requestAnimationFrame(animate);

  return target;
}

$("#btnRoll").addEventListener("click", rollD20);



function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* Helpers */
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}
function escapeAttr(s){
  return escapeHtml(s).replaceAll('"',"&quot;");
}

/* Purple fire background (canvas) */
const fire = $("#fire");
let fireCtx = fire.getContext("2d");
let fireW=0, fireH=0;
let t0=0;

function resizeFire(){
  fireW = fire.width = Math.floor(window.innerWidth * Math.min(window.devicePixelRatio||1, 2));
  fireH = fire.height = Math.floor(window.innerHeight * Math.min(window.devicePixelRatio||1, 2));
}
function noise2(x,y){
  // cheap deterministic noise
  const s = Math.sin(x*12.9898 + y*78.233) * 43758.5453;
  return s - Math.floor(s);
}
function drawFire(ts){
  if(!fireCtx) return;
  if(!fireW || !fireH) resizeFire();
  const ctx = fireCtx;
  const time = (ts||0) * 0.00025;
  ctx.clearRect(0,0,fireW,fireH);

  // base glow
  const g = ctx.createRadialGradient(fireW*0.5, fireH*0.15, fireH*0.08, fireW*0.5, fireH*0.2, fireH*0.9);
  g.addColorStop(0, "rgba(183,140,255,0.20)");
  g.addColorStop(0.35, "rgba(109,44,255,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,fireW,fireH);

  // flame wisps
  for(let i=0;i<140;i++){
    const x = (i/140) * fireW;
    const n = noise2(i*0.21, time*2.4);
    const yBase = fireH*0.95;
    const rise = (0.15 + n*0.85) * fireH*0.65;
    const yTop = yBase - rise;
    const sway = Math.sin(time*3 + i*0.25) * (12 + n*32) * (window.devicePixelRatio||1);
    const w = (8 + n*18) * (window.devicePixelRatio||1);

    const grad = ctx.createLinearGradient(x, yBase, x+sway, yTop);
    grad.addColorStop(0, "rgba(109,44,255,0)");
    grad.addColorStop(0.15, "rgba(109,44,255,0.10)");
    grad.addColorStop(0.55, "rgba(183,140,255,0.18)");
    grad.addColorStop(1, "rgba(242,238,254,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, yBase);
    ctx.bezierCurveTo(x+sway*0.2, yBase-rise*0.35, x+sway*0.8, yBase-rise*0.65, x+sway, yTop);
    ctx.stroke();
  }

  requestAnimationFrame(drawFire);
}

/* Init */
function init(){
  resizeFire();
  requestAnimationFrame(drawFire);

  setupDice();
  resizeDice();

  renderAll();
}
init();
