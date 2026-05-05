const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;
const FLOOR_Y = 590;
const GRAVITY = 0.85;
const ROUND_SECONDS = 180;

const ASSET_PATHS = {
  backgrounds: {
    moscow: "assets/backgrounds/moscow_msu.png",
    thailand: "assets/backgrounds/thailand_beach.png",
    concert: "assets/backgrounds/concert_stage.png",
  },
  title: "assets/ui/title_screen.png",
  portraits: {
    guf: "assets/portraits/guf_portrait.png",
    noize: "assets/portraits/noize_portrait.png",
  },
  effects: {
    smoke: "assets/effects/smoke_projectile.png",
    wave: "assets/effects/sound_wave_projectile.png",
    spark: "assets/effects/hit_spark.png",
    dust: "assets/effects/dust_jump.png",
    kettle: "assets/effects/kettle_projectile.png",
    guitar: "assets/effects/guitar_projectile.png",
  },
  ui: {
    hp: "assets/ui/hp_bar_frame.png",
    timer: "assets/ui/timer_frame.png",
    characterFrame: "assets/ui/character_select_frame.png",
    stageFrame: "assets/ui/stage_select_frame.png",
    buttonFrame: "assets/ui/button_frame.png",
    menuPanel: "assets/ui/menu_panel.png",
  },
  sprites: {
    guf: {
      idle: "assets/sprites/guf_idle.png",
      crouch: "assets/sprites/guf_crouch.png",
      walk_1: "assets/sprites/guf_walk_1.png",
      walk_2: "assets/sprites/guf_walk_2.png",
      jump: "assets/sprites/guf_jump.png",
      light_attack: "assets/sprites/guf_light_attack.png",
      heavy_attack: "assets/sprites/guf_heavy_attack.png",
      special: "assets/sprites/guf_special.png",
      hurt: "assets/sprites/guf_hurt.png",
      win: "assets/sprites/guf_win.png",
      lose: "assets/sprites/guf_lose.png",
    },
    noize: {
      idle: "assets/sprites/noize_idle.png",
      crouch: "assets/sprites/noize_crouch.png",
      walk_1: "assets/sprites/noize_walk_1.png",
      walk_2: "assets/sprites/noize_walk_2.png",
      jump: "assets/sprites/noize_jump.png",
      light_attack: "assets/sprites/noize_light_attack.png",
      heavy_attack: "assets/sprites/noize_heavy_attack.png",
      special: "assets/sprites/noize_special.png",
      hurt: "assets/sprites/noize_hurt.png",
      win: "assets/sprites/noize_win.png",
      lose: "assets/sprites/noize_lose.png",
    },
  },
};

const images = {};
let assetsLoaded = false;
let loadedCount = 0;
let totalCount = 0;

function flattenAssets(obj, prefix = "") {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result.push([next, value]);
    else result.push(...flattenAssets(value, next));
  }
  return result;
}

function loadAssets() {
  const list = flattenAssets(ASSET_PATHS);
  totalCount = list.length;

  for (const [key, src] of list) {
    const img = new Image();
    img.onload = () => {
      loadedCount++;
      if (loadedCount >= totalCount) assetsLoaded = true;
    };
    img.onerror = () => {
      console.warn("Asset failed:", src);
      loadedCount++;
      if (loadedCount >= totalCount) assetsLoaded = true;
    };
    img.src = src;
    images[key] = img;
  }
}

loadAssets();

// Audio is now connected via HTML <audio> tags.
// This mirrors the working reference game and avoids dynamic-path weirdness.
const audioEls = {
  hitLight: document.getElementById("sfx-hit-light"),
  hitHeavy: document.getElementById("sfx-hit-heavy"),
  specialGuf: document.getElementById("sfx-special-guf"),
  specialNoize: document.getElementById("sfx-special-noize"),
  battleMusic: document.getElementById("battle-music"),
};

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  console.log("[AUDIO] unlock via HTML audio elements");

  for (const [key, el] of Object.entries(audioEls)) {
    if (!el) {
      console.warn("[AUDIO] missing HTML audio element:", key);
      continue;
    }

    try {
      el.load();
      el.volume = key === "battleMusic" ? 0.18 : 0.85;

      if (key === "battleMusic") {
        console.log("[AUDIO] music loaded:", key, el.currentSrc || el.src);
        continue;
      }

      // unlock SFX by muted play/pause inside user gesture
      el.muted = true;
      const p = el.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          el.pause();
          el.currentTime = 0;
          el.muted = false;
          console.log("[AUDIO] ready:", key, el.currentSrc || el.src);
        }).catch((err) => {
          el.muted = false;
          console.warn("[AUDIO] unlock failed:", key, el.currentSrc || el.src, err);
        });
      } else {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
      }
    } catch (err) {
      el.muted = false;
      console.warn("[AUDIO] unlock exception:", key, err);
    }
  }
}

function playSound(name) {
  if (!audioUnlocked) {
    console.warn("[AUDIO] blocked until first click/key:", name);
    return;
  }

  const el = audioEls[name];
  if (!el) {
    console.warn("[AUDIO] missing:", name);
    return;
  }

  try {
    el.pause();
    el.currentTime = 0;
    el.volume = name === "battleMusic" ? 0.18 : 0.85;
    el.play().catch((err) => {
      console.warn("[AUDIO] play failed:", name, el.currentSrc || el.src, err);
    });
  } catch (err) {
    console.warn("[AUDIO] play exception:", name, err);
  }
}

function startBattleMusic() {
  const music = audioEls.battleMusic;
  if (!music) {
    console.warn("[AUDIO] battle music element missing");
    return;
  }
  if (!audioUnlocked) {
    console.warn("[AUDIO] battle music blocked: audio not unlocked yet");
    return;
  }

  try {
    music.loop = true;
    music.volume = 0.18;
    music.muted = false;

    if (!music.currentSrc) {
      music.load();
    }

    if (music.paused) {
      music.currentTime = 0;
    }

    console.log("[AUDIO] trying battle music:", music.currentSrc || music.src, "readyState=", music.readyState);
    music.play().then(() => {
      console.log("[AUDIO] battle music playing");
    }).catch((err) => {
      console.warn("[AUDIO] battle music failed:", music.currentSrc || music.src, err);
    });
  } catch (err) {
    console.warn("[AUDIO] battle music exception:", err);
  }
}

function stopBattleMusic() {
  const music = audioEls.battleMusic;
  if (!music) return;

  try {
    music.pause();
    music.currentTime = 0;
  } catch (err) {}
}

console.log("[BUILD] v39 HTML AUDIO — no cloneNode, original audio elements only");
console.log("[BUILD] v25 MP3 AUDIO ONLY — no fallback sounds");

document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

const GAME = {
  state: "title",
  selectedPlayer: null,
  selectedStage: null,
  winner: "",
  timeLeft: ROUND_SECONDS,
  lastTime: 0,
  roundStartedAt: 0,
  cameraShake: 0,
  koActive: false,
  koTimer: 0,
  koLoser: null,
  playerRounds: 0,
  botRounds: 0,
  roundNumber: 1,
  roundWinner: null,
  botDifficulty: null,
  quoteText: "",
  quoteOwnerId: "",
  quoteTimer: 0,
  quoteCooldown: 0,
};

const keys = {
  left: false,
  right: false,
  jump: false,
  crouch: false,
  light: false,
  heavy: false,
  special: false,
};

const justPressed = {
  jump: false,
  light: false,
  heavy: false,
  special: false,
};

function updateTouchControlsVisibility() {
  const isMobile = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const shouldShow = !!(isMobile && GAME.state === "fight");
  document.body.classList.toggle("mobile-fight", shouldShow);
}

function releaseAllControls() {
  ["left","right","jump","crouch","light","heavy","special"].forEach((k) => {
    if (keys[k] !== undefined) pressAction(k, false);
  });
}


const fighterData = {
  guf: {
    id: "guf",
    name: "ГУФ",
    color: "#e8e8dc",
    specialName: "ЧАЙ",
  },
  noize: {
    id: "noize",
    name: "НОЙЗ",
    color: "#1c2735",
    specialName: "ГИТАРА",
  },
};

const QUOTE_POOLS = {
  guf: [
    "АЛИК В УДАРЕ",
    "ЧИТАЙ СВОИ СТИШКИ",
    "КУДА СЪЕБ*ЛСЯ?",
  ],
  noize: [
    "ПРЕДУПРЕЖДАЮ, У*БЫВАЮ",
    "ЩА УСТРОЮ ДЕСТРОЙ",
    "ВЫДЫХАЙСЯ СКОРЕЙ",
  ],
};

function pickQuote(id) {
  const pool = QUOTE_POOLS[id] || [];
  return pool[Math.floor(Math.random() * pool.length)] || "";
}

const stages = {
  moscow: { id: "moscow", name: "ГОРОД ДОРОГ" },
  thailand: { id: "thailand", name: "ТАИЛАНД" },
  concert: { id: "concert", name: "КОНЦЕРТ" },
};

const AI_PRESETS = [
  { id: "easy", label: "ЛЁГКИЙ", thinkMin: 0.32, thinkRand: 0.30, attackRange: 132, attackChance: 0.40, retreatChance: 0.44, specialFarChance: 0.12, moveSpeed: 3.7, jumpChance: 0.04 },
  { id: "normal", label: "СРЕДНИЙ", thinkMin: 0.20, thinkRand: 0.24, attackRange: 150, attackChance: 0.58, retreatChance: 0.32, specialFarChance: 0.24, moveSpeed: 4.2, jumpChance: 0.08 },
  { id: "hard", label: "СЛОЖНЫЙ", thinkMin: 0.12, thinkRand: 0.16, attackRange: 164, attackChance: 0.72, retreatChance: 0.18, specialFarChance: 0.36, moveSpeed: 4.9, jumpChance: 0.11 },
];

function pickRandomBotDifficulty() {
  const preset = AI_PRESETS[Math.floor(Math.random() * AI_PRESETS.length)];
  GAME.botDifficulty = preset;
  return preset;
}

function startMatch() {
  GAME.playerRounds = 0;
  GAME.botRounds = 0;
  GAME.roundNumber = 1;
  GAME.roundWinner = null;
  GAME.winner = "";
  pickRandomBotDifficulty();
  resetRound();
}

function chooseStageAndStart(stageId) {
  unlockAudio();
  GAME.selectedStage = stageId;
  startMatch();
  GAME.state = "fight";
  startBattleMusic();
}


let player;
let bot;
let projectiles = [];
let hitSparks = [];
let dusts = [];
let damagePopups = [];

function resetRound() {
  const playerInfo = fighterData[GAME.selectedPlayer];
  const botId = GAME.selectedPlayer === "guf" ? "noize" : "guf";
  const botInfo = fighterData[botId];

  player = makeFighter(playerInfo, 260, FLOOR_Y, 1, true);
  bot = makeFighter(botInfo, 1010, FLOOR_Y, -1, false);

  const aiPreset = pickRandomBotDifficulty();
  bot.aiPreset = aiPreset;

  projectiles = [];
  hitSparks = [];
  dusts = [];
  damagePopups = [];
  GAME.timeLeft = ROUND_SECONDS;
  GAME.roundStartedAt = performance.now();
  GAME.winner = "";
  GAME.cameraShake = 0;
  GAME.koActive = false;
  GAME.koTimer = 0;
  GAME.koLoser = null;
  GAME.roundWinner = null;
  GAME.quoteText = "";
  GAME.quoteOwnerId = "";
  GAME.quoteTimer = 0;
  GAME.quoteCooldown = 5 + Math.random() * 4;
  startBattleMusic();
}

function makeFighter(data, x, y, dir, isPlayer) {
  return {
    data,
    x,
    y,
    renderX: x,
    renderY: y,
    w: 130,
    h: 190,
    vx: 0,
    targetVx: 0,
    vy: 0,
    dir,
    hp: 100,
    onGround: true,
    isCrouching: false,
    isPlayer,
    attackCooldown: 0,
    specialCooldown: 0,
    hitStun: 0,
    attackFlash: 0,
    lastAttackType: "light",
    anim: 0,
    state: "idle",
    aiThink: 0,
    aiMove: 0,
    aiAttack: 0,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawPixelText(text, x, y, size = 28, color = "#fff", align = "left") {
  ctx.save();
  ctx.font = `900 ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000";
  ctx.fillText(text, x + 4, y + 4);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawCleanText(text, x, y, size = 28, color = "#fff", align = "left") {
  ctx.save();
  ctx.font = `900 ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawButton(label, x, y, w, h, active = false) {
  ctx.save();
  ctx.fillStyle = active ? "#fff0a6" : "rgba(0,0,0,0.66)";
  ctx.strokeStyle = active ? "#ffffff" : "#e7e7e7";
  ctx.lineWidth = 5;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  drawPixelText(label, x + w / 2, y + h / 2 - 18, 30, active ? "#111" : "#fff", "center");
  ctx.restore();
}

function drawLoading() {
  ctx.fillStyle = "#08080d";
  ctx.fillRect(0, 0, W, H);
  drawPixelText("LOADING ASSETS...", W / 2, 300, 36, "#fff6b0", "center");
  drawPixelText(`${loadedCount}/${totalCount}`, W / 2, 355, 24, "#fff", "center");
}

function drawTitle() {
  const t = performance.now() * 0.001;

  if (images.title && images.title.complete && images.title.naturalWidth) {
    // small parallax: slightly enlarged title image with a subtle floating offset
    const scale = 1.06;
    const drawW = W * scale;
    const drawH = H * scale;
    const ox = Math.sin(t * 0.55) * 10;
    const oy = Math.cos(t * 0.42) * 6;
    ctx.drawImage(images.title, -(drawW - W) / 2 + ox, -(drawH - H) / 2 + oy, drawW, drawH);

    // gentle vignette so overlay text reads better
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0.06)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.02)');
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#120739';
    ctx.fillRect(0, 0, W, H);
  }

  // blinking start prompt
  const blink = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 4.2));
  ctx.save();
  ctx.globalAlpha = blink;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(W / 2 - 255, H - 110, 510, 54);
  drawPixelText('НАЖМИ, ЧТОБЫ НАЧАТЬ', W / 2, H - 96, 26, '#fff6b0', 'center');
  ctx.restore();
}

function characterScreen() {
  drawMenuBg();
  drawPixelText("ВЫБЕРИ ПЕРСОНАЖА", W / 2, 70, 48, "#fff", "center");

  drawCharacterCard("guf", 220, 155, 330, 430, GAME.selectedPlayer === "guf");
  drawCharacterCard("noize", 730, 155, 330, 430, GAME.selectedPlayer === "noize");

  drawPixelText("КЛИКНИ ПО ПЕРСОНАЖУ ИЛИ НАЖМИ 1 / 2", W / 2, 626, 24, "#fff", "center");
}

function drawCharacterCard(id, x, y, w, h, active) {
  const info = fighterData[id];

  // Card base
  ctx.fillStyle = active ? "rgba(255,240,166,0.96)" : "rgba(0,0,0,0.62)";
  ctx.fillRect(x, y, w, h);

  // Asset-pack frame
  const frame = images["ui.characterFrame"];
  if (frame && frame.complete && frame.naturalWidth) {
    ctx.drawImage(frame, x + 45, y + 28, w - 90, 278);
  } else {
    ctx.strokeStyle = active ? "#ffffff" : "#fff0a6";
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
  }

  // Portrait only — no extra battle sprite overlay
  const portrait = images[`portraits.${id}`];
  if (portrait && portrait.complete && portrait.naturalWidth) {
    ctx.drawImage(portrait, x + w / 2 - 96, y + 56, 192, 192);
  }

  drawCleanText(info.name, x + w / 2, y + 344, 46, active ? "#111" : "#fff", "center");

  ctx.strokeStyle = active ? "#ffffff" : "#fff0a6";
  ctx.lineWidth = active ? 6 : 4;
  ctx.strokeRect(x, y, w, h);
}

function stageScreen() {
  drawMenuBg();
  drawPixelText("ВЫБЕРИ ЛОКАЦИЮ", W / 2, 54, 48, "#fff", "center");

  drawStageCard("moscow", 95, 145, 320, 290);
  drawStageCard("thailand", 480, 145, 320, 290);
  drawStageCard("concert", 865, 145, 320, 290);

  drawPixelText("ТАПНИ ПО КАРТОЧКЕ ИЛИ НАЖМИ 1 / 2 / 3", W / 2, 520, 24, "#fff", "center");
  drawPixelText("ВЫБОР СРАЗУ НАЧИНАЕТ БОЙ", W / 2, 572, 28, "#fff6b0", "center");
}

function drawStageCard(id, x, y, w, h) {
  const active = GAME.selectedStage === id;
  ctx.fillStyle = active ? "rgba(255,240,166,0.96)" : "rgba(0,0,0,0.62)";
  ctx.fillRect(x, y, w, h);

  const frame = images["ui.stageFrame"];
  if (frame && frame.complete && frame.naturalWidth) {
    ctx.drawImage(frame, x + 18, y + 14, w - 36, h - 72);
  } else {
    ctx.strokeStyle = active ? "#fff" : "#fff0a6";
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
  }

  const img = images[`backgrounds.${id}`];
  if (img && img.complete && img.naturalWidth) {
    drawCoverImage(img, x + 30, y + 26, w - 60, h - 105);
  } else {
    ctx.fillStyle = "#333";
    ctx.fillRect(x + 30, y + 26, w - 60, h - 105);
  }

  drawCleanText(stages[id].name, x + w / 2, y + h - 54, 24, active ? "#111" : "#fff", "center");

  ctx.strokeStyle = active ? "#ffffff" : "#fff0a6";
  ctx.lineWidth = active ? 6 : 4;
  ctx.strokeRect(x, y, w, h);
}

function drawMenuBg() {
  const title = images["title"];
  if (title && title.complete && title.naturalWidth) {
    drawCoverImage(title, 0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(0, 0, W, H);
  } else {
    drawFallbackBackground();
  }
}

function drawFallbackBackground() {
  ctx.fillStyle = "#141421";
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 32) {
    for (let x = 0; x < W; x += 32) {
      ctx.fillStyle = (x + y) % 64 === 0 ? "#1b1b2b" : "#10101c";
      ctx.fillRect(x, y, 32, 32);
    }
  }
}

function drawFight(dt) {
  updateFight(dt);

  ctx.save();
  if (GAME.cameraShake > 0) {
    ctx.translate((Math.random() - 0.5) * GAME.cameraShake, (Math.random() - 0.5) * GAME.cameraShake);
    GAME.cameraShake *= 0.86;
    if (GAME.cameraShake < 0.3) GAME.cameraShake = 0;
  }

  drawStageBackground(GAME.selectedStage);
  drawDust();
  drawFighter(bot);
  drawFighter(player);
  drawProjectiles();
  drawHitSparks();
  drawDamagePopups();
  ctx.restore();

  drawHUD();
  drawBattleQuote();
}

function updateFight(dt) {
  GAME.timeLeft = Math.max(0, ROUND_SECONDS - Math.floor((performance.now() - GAME.roundStartedAt) / 1000));

  handlePlayerInput();
  handleBotAI(dt);

  updateFighter(player, bot, dt);
  updateFighter(bot, player, dt);
  updateProjectiles();
  updateHitSparks();
  updateDust();
  updateDamagePopups();
  updateBattleQuote(dt);

  if (!GAME.koActive && (player.hp <= 0 || bot.hp <= 0 || GAME.timeLeft <= 0)) {
    startKO();
  }

  if (GAME.koActive) {
    GAME.koTimer -= dt;
    if (GAME.koTimer <= 0) {
      releaseAllControls();
      stopBattleMusic();

      if (GAME.playerRounds >= 2 || GAME.botRounds >= 2) {
        GAME.state = "end";
      } else {
        GAME.roundNumber += 1;
        resetRound();
        GAME.state = "fight";
      }
    }
  }
}

function startKO() {
  GAME.koActive = true;
  GAME.koTimer = 1.15;

  if (player.hp === bot.hp) {
    GAME.winner = "НИЧЬЯ";
    GAME.koLoser = null;
    GAME.roundWinner = null;
    return;
  }

  const loser = player.hp <= 0 ? player : bot;
  const winner = loser === player ? bot : player;

  GAME.winner = winner.data.name;
  GAME.koLoser = loser;
  GAME.roundWinner = winner === player ? "player" : "bot";
  if (GAME.roundWinner === "player") GAME.playerRounds += 1;
  else GAME.botRounds += 1;
  loser.hp = 0;
  loser.isCrouching = false;
  loser.hitStun = 1.1;
  loser.attackFlash = 0;
  loser.state = "hurt";

  // cinematic final knockback: loser flies out of the arena
  const dir = loser.x < winner.x ? -1 : 1;
  loser.vx = dir * 16;
  loser.targetVx = dir * 16;
  loser.vy = -12;

  winner.targetVx = 0;
  winner.vx = 0;
  winner.state = "win";

  GAME.cameraShake = Math.max(GAME.cameraShake, 12);
}

function handlePlayerInput() {
  if (GAME.koActive) {
    player.targetVx = 0;
    clearJustPressed();
    return;
  }

  const speed = 5.2;
  player.targetVx = 0;

  if (player.hitStun <= 0) {
    player.isCrouching = keys.crouch && player.onGround;

    if (!player.isCrouching) {
      if (keys.left) player.targetVx = -speed;
      if (keys.right) player.targetVx = speed;

      if (justPressed.jump && player.onGround) {
        player.vy = -20;
        player.onGround = false;
        addDust(player.x, player.y);
      }

      if (justPressed.light) attack(player, bot, "light");
      if (justPressed.heavy) attack(player, bot, "heavy");
      if (justPressed.special) special(player);
    }
  } else {
    player.isCrouching = false;
  }

  if (player.hitStun > 0) player.targetVx = 0;
  clearJustPressed();
}

function handleBotAI(dt) {
  if (GAME.koActive) {
    bot.targetVx = 0;
    return;
  }

  const ai = bot.aiPreset || GAME.botDifficulty || AI_PRESETS[1];

  bot.aiThink -= dt;
  if (bot.aiThink <= 0) {
    const dist = player.x - bot.x;
    bot.aiThink = ai.thinkMin + Math.random() * ai.thinkRand;
    bot.aiMove = Math.sign(dist);

    if (Math.abs(dist) < ai.attackRange) {
      bot.aiAttack = Math.random() < ai.attackChance ? 1 : 0;
      bot.aiMove = Math.random() < ai.retreatChance ? -Math.sign(dist) : 0;
    } else if (Math.abs(dist) > 340 && Math.random() < ai.specialFarChance) {
      bot.aiAttack = 3;
    } else {
      bot.aiAttack = 0;
    }

    if (Math.random() < ai.jumpChance && bot.onGround) {
      bot.vy = -16;
      bot.onGround = false;
      addDust(bot.x, bot.y);
    }
  }

  if (bot.hitStun > 0) {
    bot.targetVx = 0;
    return;
  }

  bot.targetVx = bot.aiMove * ai.moveSpeed;

  if (bot.aiAttack === 1) {
    if (Math.random() < 0.5) attack(bot, player, "light");
    else attack(bot, player, "heavy");
    bot.aiAttack = 0;
  }

  if (bot.aiAttack === 3) {
    special(bot);
    bot.aiAttack = 0;
  }
}

function updateFighter(f, opponent, dt) {
  // Clamp dt so tab switches or lag spikes don't teleport characters.
  dt = Math.min(dt, 1 / 30);

  f.anim += dt;
  f.attackCooldown = Math.max(0, f.attackCooldown - dt);
  f.specialCooldown = Math.max(0, f.specialCooldown - dt);
  f.hitStun = Math.max(0, f.hitStun - dt);
  f.attackFlash = Math.max(0, f.attackFlash - dt);

  f.dir = opponent.x > f.x ? 1 : -1;

  // Smooth acceleration / deceleration.
  const accel = f.onGround ? 18 : 10;
  const friction = f.onGround ? 16 : 6;
  const diff = f.targetVx - f.vx;
  const step = (Math.abs(f.targetVx) > 0.01 ? accel : friction) * dt;

  if (Math.abs(diff) <= step) f.vx = f.targetVx;
  else f.vx += Math.sign(diff) * step;

  if (Math.abs(f.targetVx) < 0.01 && Math.abs(f.vx) < 0.03) f.vx = 0;

  // Frame-rate independent movement.
  f.x += f.vx * 60 * dt;
  f.y += f.vy * 60 * dt;
  f.vy += GRAVITY * 60 * dt;

  if (f.y >= FLOOR_Y) {
    if (!f.onGround && f.vy > 2) addDust(f.x, FLOOR_Y);
    f.y = FLOOR_Y;
    f.vy = 0;
    f.onGround = true;
  } else {
    f.onGround = false;
  }

  if (GAME.koActive && f === GAME.koLoser) {
    f.x = clamp(f.x, -260, W + 260);
  } else {
    f.x = clamp(f.x, 80, W - 80);
  }

  // Visual interpolation: sprite follows physics smoothly instead of snapping.
  const visualFollow = 1 - Math.pow(0.001, dt);
  f.renderX += (f.x - f.renderX) * visualFollow;
  f.renderY += (f.y - f.renderY) * visualFollow;

  if (f !== player) f.isCrouching = false;

  if (GAME.koActive && f === GAME.koLoser) f.state = "hurt";
  else if (GAME.koActive && f !== GAME.koLoser) f.state = "win";
  else if (f.hitStun > 0) f.state = "hurt";
  else if (f.isCrouching) f.state = "crouch";
  else if (f.attackFlash > 0) f.state = f.lastAttackType === "special" ? "special" : `${f.lastAttackType}_attack`;
  else if (!f.onGround) f.state = "jump";
  else if (Math.abs(f.vx) > 0.12) {
    // Slower, cleaner two-frame walk cycle.
    f.state = Math.floor(f.anim * 5) % 2 === 0 ? "walk_1" : "walk_2";
  } else {
    f.state = "idle";
  }
}

function attack(attacker, target, type) {
  if (attacker.attackCooldown > 0) return;

  const damage = type === "light" ? 5 : 10;
  // Close-combat melee range: punches/kicks should only connect near the opponent.
  const reach = type === "light" ? 86 : 104;
  const h = type === "light" ? 68 : 58;

  attacker.attackCooldown = type === "light" ? 0.34 : 0.56;
  attacker.attackFlash = type === "light" ? 0.18 : 0.25;
  attacker.lastAttackType = type;
  attacker.state = `${type}_attack`;
  playSound(type === "light" ? "hitLight" : "hitHeavy");

  const hitbox = {
    x: attacker.dir === 1 ? attacker.x + 34 : attacker.x - reach - 34,
    y: type === "light" ? attacker.y - 158 : attacker.y - 88,
    w: reach,
    h,
  };

  const targetBox = target.isCrouching ? {
    x: target.x - target.w / 2 + 6,
    y: target.y - 66,
    w: target.w - 12,
    h: 56,
  } : {
    x: target.x - target.w / 2,
    y: target.y - target.h,
    w: target.w,
    h: target.h,
  };

  if (rectsOverlap(hitbox, targetBox)) {
    const crit = Math.random() < 0.10;
    dealDamage(target, damage, attacker.dir, type === "light" ? 6 : 11, crit);
    addSpark(target.x, target.y - 86);
  }
}

function special(attacker) {
  if (attacker.specialCooldown > 0) return;
  attacker.specialCooldown = 2.4;
  attacker.attackFlash = 0.32;
  attacker.lastAttackType = "special";

  playSound(attacker.data.id === "guf" ? "specialGuf" : "specialNoize");

  const kind = attacker.data.id === "guf" ? "kettle" : "guitar";
  projectiles.push({
    owner: attacker,
    kind,
    x: attacker.x + attacker.dir * 84,
    y: attacker.y - 114,
    vx: attacker.dir * (kind === "guitar" ? 10.2 : 8.9),
    w: kind === "guitar" ? 136 : 118,
    h: kind === "guitar" ? 62 : 82,
    damage: 15,
    life: 78,
    rotation: 0,
    hit: false,
  });
}

function dealDamage(target, amount, dir, knock, crit = false) {
  const rawAmount = crit ? Math.ceil(amount * 1.7) : amount;
  const finalAmount = target.isCrouching ? Math.ceil(rawAmount / 2) : rawAmount;
  target.hp = Math.max(0, target.hp - finalAmount);
  damagePopups.push({
    x: target.x,
    y: target.y - 145,
    text: target.isCrouching ? "-" + finalAmount + " BLOCK" : "-" + finalAmount,
    life: 34,
    maxLife: 34,
    color: crit ? "#ffd15a" : "#ffef7a",
    size: 26
  });
  if (crit) {
    damagePopups.push({
      x: target.x,
      y: target.y - 182,
      text: "CRITICAL!",
      life: 42,
      maxLife: 42,
      color: "#ff7a3d",
      size: 24
    });
  }
  target.hitStun = target.isCrouching ? 0.14 : 0.24;
  target.vx = dir * (target.isCrouching ? knock * 0.45 : knock * (crit ? 1.15 : 1));
  target.vy = target.isCrouching ? -1.2 : (crit ? -5.2 : -4);
  GAME.cameraShake = Math.max(GAME.cameraShake, finalAmount * (crit ? 0.75 : 0.55));
}

function updateProjectiles() {
  const stepScale = GAME.lastDt ? Math.min(GAME.lastDt, 1 / 30) * 60 : 1;

  for (const p of projectiles) {
    p.x += p.vx * stepScale;
    if (p.kind === "kettle") {
      p.rotation = (p.rotation || 0) + 0.08 * Math.sign(p.vx) * stepScale;
      p.y += Math.sin((78 - p.life) * 0.10) * 0.9 * stepScale;
    }
    if (p.kind === "guitar") {
      p.rotation = (p.rotation || 0) + 0.045 * Math.sign(p.vx) * stepScale;
    }
    p.life -= stepScale;

    const target = p.owner === player ? bot : player;
    const pBox = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
    const tBox = target.isCrouching
      ? { x: target.x - target.w / 2 + 6, y: target.y - 66, w: target.w - 12, h: 56 }
      : { x: target.x - target.w / 2, y: target.y - target.h, w: target.w, h: target.h };

    if (!p.hit && rectsOverlap(pBox, tBox)) {
      p.hit = true;
      const crit = Math.random() < 0.10;
      dealDamage(target, p.damage, Math.sign(p.vx), 14, crit);
      addSpark(target.x, target.y - 95);
      p.life = 0;
    }
  }

  projectiles = projectiles.filter(p => p.life > 0 && p.x > -160 && p.x < W + 160);
}

function addSpark(x, y) {
  hitSparks.push({ x, y, life: 20 });
}

function updateHitSparks() {
  for (const s of hitSparks) s.life--;
  hitSparks = hitSparks.filter(s => s.life > 0);
}

function addDust(x, y) {
  dusts.push({ x, y, life: 18 });
}

function updateDust() {
  for (const d of dusts) d.life--;
  dusts = dusts.filter(d => d.life > 0);
}

function updateDamagePopups() {
  for (const p of damagePopups) {
    p.y -= 1.2;
    p.life--;
  }
  damagePopups = damagePopups.filter(p => p.life > 0);
}

function drawDamagePopups() {
  for (const p of damagePopups) {
    const maxLife = p.maxLife || 34;
    ctx.globalAlpha = clamp(p.life / maxLife, 0, 1);
    drawPixelText(p.text, p.x, p.y, p.size || 26, p.color || "#ffef7a", "center");
    ctx.globalAlpha = 1;
  }
}

function triggerBattleQuote(fighter) {
  if (!fighter) return;
  const text = pickQuote(fighter.data.id);
  if (!text) return;

  GAME.quoteText = text;
  GAME.quoteOwnerId = fighter.data.id;
  GAME.quoteTimer = 1.8;

  // Much rarer: after a phrase, wait about 11–18 seconds before another can appear.
  GAME.quoteCooldown = 8 + Math.random() * 5;
}

function updateBattleQuote(dt) {
  if (GAME.quoteTimer > 0) GAME.quoteTimer = Math.max(0, GAME.quoteTimer - dt);
  if (GAME.koActive) return;
  GAME.quoteCooldown = Math.max(0, GAME.quoteCooldown - dt);
  if (GAME.quoteCooldown <= 0 && GAME.quoteTimer <= 0 && Math.random() < dt * 0.35) {
    triggerBattleQuote(Math.random() < 0.5 ? player : bot);
  }
}

function drawBattleQuote() {
  if (!GAME.quoteText || GAME.quoteTimer <= 0) return;
  const fighter = player && player.data.id === GAME.quoteOwnerId ? player : bot && bot.data.id === GAME.quoteOwnerId ? bot : null;
  if (!fighter) return;
  const x = clamp(fighter.renderX, 230, W - 230);
  const y = clamp(fighter.renderY - 260, 120, H - 220);
  const pad = 18;
  const boxW = Math.min(560, Math.max(300, GAME.quoteText.length * 15));
  const boxH = 56;
  ctx.save();
  ctx.globalAlpha = Math.min(1, GAME.quoteTimer / 0.25, 1);
  ctx.fillStyle = "rgba(0,0,0,0.70)";
  ctx.fillRect(x - boxW / 2, y, boxW, boxH);
  ctx.strokeStyle = fighter.data.id === "guf" ? "#f0e3b0" : "#a8d1ff";
  ctx.lineWidth = 4;
  ctx.strokeRect(x - boxW / 2, y, boxW, boxH);
  drawPixelText(GAME.quoteText, x, y + pad - 4, 22, "#fff", "center");
  ctx.restore();
}

function drawStageBackground(id) {
  const img = images[`backgrounds.${id}`];
  if (img && img.complete && img.naturalWidth) {
    drawCoverImage(img, 0, 0, W, H);
  } else {
    drawFallbackBackground();
  }
  drawStageAtmosphere(id);
  // dark floor collision strip
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
}

function drawStageAtmosphere(id) {
  const t = performance.now() * 0.001;

  if (id === "moscow") {
    for (let i = 0; i < 3; i++) {
      const y = 315 + i * 70;
      const drift = Math.sin(t * (0.24 + i * 0.08) + i) * 40;
      const grad = ctx.createLinearGradient(0, y, 0, y + 36);
      grad.addColorStop(0, "rgba(220,230,240,0.00)");
      grad.addColorStop(0.45, "rgba(220,230,240,0.09)");
      grad.addColorStop(1, "rgba(220,230,240,0.00)");
      ctx.fillStyle = grad;
      ctx.fillRect(-80 + drift, y, W + 160, 36);
    }
  }

  if (id === "thailand") {
    for (let i = 0; i < 4; i++) {
      const sx = W - 120 + i * 12;
      const grad = ctx.createLinearGradient(sx, 0, sx - 320, H * 0.8);
      grad.addColorStop(0, "rgba(255,241,165,0.14)");
      grad.addColorStop(1, "rgba(255,241,165,0.00)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx - 74, 0);
      ctx.lineTo(sx - 420, H);
      ctx.lineTo(sx - 540, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (id === "concert") {
    const colors = ["rgba(189,120,255,0.14)", "rgba(110,170,255,0.12)", "rgba(255,216,120,0.10)"];
    const bases = [180, W / 2, W - 190];
    bases.forEach((base, i) => {
      const sway = Math.sin(t * (0.9 + i * 0.18) + i) * 45;
      const grad = ctx.createLinearGradient(base + sway, 0, base + sway, H * 0.8);
      grad.addColorStop(0, colors[i]);
      grad.addColorStop(1, "rgba(255,255,255,0.00)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(base + sway, 34);
      ctx.lineTo(base + sway + 54, 34);
      ctx.lineTo(base + sway + 230, H * 0.82);
      ctx.lineTo(base + sway - 230, H * 0.82);
      ctx.closePath();
      ctx.fill();
    });
  }
}

function drawCoverImage(img, x, y, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = img.naturalWidth * scale;
  const sh = img.naturalHeight * scale;
  const dx = x + (w - sw) / 2;
  const dy = y + (h - sh) / 2;
  ctx.drawImage(img, dx, dy, sw, sh);
}

function drawSprite(id, state, x, y, scale = 1, dir = 1) {
  let key = `sprites.${id}.${state}`;
  let img = images[key];

  if (!img || !img.complete || !img.naturalWidth) {
    key = `sprites.${id}.idle`;
    img = images[key];
  }

  if (img && img.complete && img.naturalWidth) {
    const size = 250 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.drawImage(img, -size / 2, -size, size, size);
    ctx.restore();
  } else {
    // fallback box
    ctx.fillStyle = id === "guf" ? "#ddd" : "#111";
    ctx.fillRect(x - 35, y - 150, 70, 150);
  }
}

function drawFighter(f) {
  const bob = f.state.startsWith("walk") ? Math.sin(f.anim * 10) * 1.2 : 0;

  ctx.save();

  // crouch should look like a bent pose, not a mini-version of the fighter
  const crouchOffsetY = f.state === "crouch" ? 10 : 0;
  const crouchScale = 1.0;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  if (f.state === "crouch") ctx.fillRect(f.renderX - 56, f.renderY + 6, 112, 12);
  else ctx.fillRect(f.renderX - 62, f.renderY + 4, 124, 14);

  if (f.hitStun > 0) ctx.translate((Math.random() - 0.5) * 5, 0);

  drawSprite(f.data.id, f.state, f.renderX, f.renderY + bob + crouchOffsetY, crouchScale, f.dir);

  ctx.restore();
}

function drawProjectiles() {
  for (const p of projectiles) {
    let key = "effects.smoke";
    if (p.kind === "wave") key = "effects.wave";
    if (p.kind === "kettle") key = "effects.kettle";
    if (p.kind === "guitar") key = "effects.guitar";
    const img = images[key];
    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === "kettle" || p.kind === "guitar") ctx.rotate(p.rotation || 0);
      if (!(p.kind === "kettle" || p.kind === "guitar")) ctx.scale(Math.sign(p.vx), 1);
      const dw = p.kind === "guitar" ? 132 : p.kind === "kettle" ? 112 : 150;
      const dh = p.kind === "guitar" ? 66 : p.kind === "kettle" ? 56 : 75;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = (p.kind === "kettle") ? "#b7b7bc" : (p.kind === "guitar") ? "#555" : p.kind === "smoke" ? "#ddd" : "#6be5ff";
      ctx.fillRect(p.x - 40, p.y - 20, 80, 40);
    }
  }
}

function drawHitSparks() {
  const img = images["effects.spark"];
  for (const s of hitSparks) {
    ctx.globalAlpha = clamp(s.life / 20, 0, 1);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, s.x - 48, s.y - 48, 96, 96);
    else {
      ctx.fillStyle = "#fff6b0";
      ctx.fillRect(s.x - 12, s.y - 12, 24, 24);
    }
    ctx.globalAlpha = 1;
  }
}

function drawDust() {
  const img = images["effects.dust"];
  for (const d of dusts) {
    ctx.globalAlpha = clamp(d.life / 18, 0, 1);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, d.x - 70, d.y - 30, 140, 62);
    ctx.globalAlpha = 1;
  }
}

function drawHUD() {
  drawHPBar(70, 36, 470, 34, player.hp, player.data.name, true);
  drawHPBar(W - 540, 36, 470, 34, bot.hp, bot.data.name, false);

  const minutes = Math.floor(GAME.timeLeft / 60);
  const seconds = String(GAME.timeLeft % 60).padStart(2, "0");

  const timerFrame = images["ui.timer"];
  if (timerFrame && timerFrame.complete && timerFrame.naturalWidth) {
    ctx.drawImage(timerFrame, W / 2 - 70, 20, 140, 64);
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(W / 2 - 72, 22, 144, 58);
    ctx.strokeStyle = "#fff0a6";
    ctx.lineWidth = 4;
    ctx.strokeRect(W / 2 - 72, 22, 144, 58);
  }

  drawPixelText(`${minutes}:${seconds}`, W / 2, 31, 36, "#fff6b0", "center");

  drawPixelText(`СПЕЦ: ${player.data.specialName} ${player.specialCooldown <= 0 ? "[D]" : "[...]"}`, 72, 114, 18, "#fff", "left");
  drawPixelText(`СПЕЦ: ${bot.data.specialName}`, W - 72, 114, 18, "#fff", "right");
  drawPixelText(`СЧЁТ ${GAME.playerRounds} : ${GAME.botRounds}   |   РАУНД ${GAME.roundNumber}`, W / 2, 86, 18, "#fff", "center");
  if (GAME.botDifficulty) drawPixelText(`БОТ: ${GAME.botDifficulty.label}`, W - 72, 138, 16, "#d6e7ff", "right");
}

function drawHPBar(x, y, w, h, hp, label, left) {
  const hpFrame = images["ui.hp"];
  if (hpFrame && hpFrame.complete && hpFrame.naturalWidth) {
    ctx.drawImage(hpFrame, x, y, w, h);
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
  }

  ctx.fillStyle = "#3a1111";
  ctx.fillRect(x + 10, y + 8, w - 20, h - 16);

  ctx.fillStyle = hp > 35 ? "#69e36f" : "#ffcc4d";
  const fillW = (w - 20) * hp / 100;
  ctx.fillRect(left ? x + 10 : x + w - 10 - fillW, y + 8, fillW, h - 16);

  drawPixelText(label, left ? x : x + w, y + h + 10, 22, "#fff", left ? "left" : "right");
}

function endScreen() {
  drawStageBackground(GAME.selectedStage);
  ctx.fillStyle = "rgba(0,0,0,0.68)";
  ctx.fillRect(0, 0, W, H);

  const winnerId = GAME.winner === "ГУФ" ? "guf" : GAME.winner === "НОЙЗ" ? "noize" : null;
  if (winnerId) drawSprite(winnerId, "win", W / 2, 395, 1.08, 1);

  let title = "НИЧЬЯ";
  if (GAME.koLoser && GAME.koLoser.data.id === "guf") title = "ГУФ УМЕР";
  else if (GAME.koLoser && GAME.koLoser.data.id === "noize") title = "НОЙЗ СДУЛСЯ";
  drawPixelText(title, W / 2, 105, 58, "#fff6b0", "center");
  drawPixelText(`МАТЧ ДО 2 ПОБЕД  |  СЧЁТ ${GAME.playerRounds} : ${GAME.botRounds}`, W / 2, 165, 22, "#fff", "center");
  drawPixelText("ENTER — СЫГРАТЬ ЕЩЁ", W / 2, 575, 30, "#fff", "center");
  drawPixelText("ESC — В МЕНЮ", W / 2, 622, 26, "#ddd", "center");
}

function clearJustPressed() {
  justPressed.jump = false;
  justPressed.light = false;
  justPressed.heavy = false;
  justPressed.special = false;
}

function pressAction(action, isDown) {
  if (isDown && !keys[action] && justPressed[action] !== undefined) justPressed[action] = true;
  keys[action] = isDown;
}

window.addEventListener("keydown", (e) => {
  unlockAudio();
  if (["KeyA","KeyS","KeyD","Space","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code) || ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
    e.preventDefault();
  }
  const k = e.key.toLowerCase();

  if (e.code === "KeyM") {
    unlockAudio();
    startBattleMusic();
    return;
  }

  if (GAME.state === "title" && e.key === "Enter") {
    GAME.state = "character";
    return;
  }

  if (GAME.state === "character") {
    if (e.code === "Digit1" || k === "1") {
      GAME.selectedPlayer = "guf";
      GAME.state = "stage";
    }
    if (e.code === "Digit2" || k === "2") {
      GAME.selectedPlayer = "noize";
      GAME.state = "stage";
    }
  }

  if (GAME.state === "stage") {
    if (e.code === "Digit1" || k === "1") {
      chooseStageAndStart("moscow");
      return;
    }
    if (e.code === "Digit2" || k === "2") {
      chooseStageAndStart("thailand");
      return;
    }
    if (e.code === "Digit3" || k === "3") {
      chooseStageAndStart("concert");
      return;
    }
    if (e.key === "Enter") {
      chooseStageAndStart(GAME.selectedStage || "moscow");
      return;
    }
  }

  if (GAME.state === "end") {
    if (e.key === "Enter") {
      unlockAudio();
      startMatch();
      GAME.state = "fight";
      startBattleMusic();
    }
    if (e.key === "Escape") {
      stopBattleMusic();
      releaseAllControls();
      GAME.state = "title";
      GAME.selectedPlayer = null;
      GAME.selectedStage = null;
      GAME.playerRounds = 0;
      GAME.botRounds = 0;
      GAME.roundNumber = 1;
      GAME.roundWinner = null;
      GAME.botDifficulty = null;
    }
  }

  if (GAME.state === "fight") {
    if (e.key === "ArrowLeft") pressAction("left", true);
    if (e.key === "ArrowRight") pressAction("right", true);
    if (e.key === "ArrowUp" || e.code === "Space") pressAction("jump", true);
    if (e.key === "ArrowDown") pressAction("crouch", true);
    if (e.code === "KeyA") pressAction("light", true);
    if (e.code === "KeyS") pressAction("heavy", true);
    if (e.code === "KeyD") pressAction("special", true);
  }
});

window.addEventListener("keyup", (e) => {
  if (["KeyA","KeyS","KeyD","Space","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code) || ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
    e.preventDefault();
  }
  const k = e.key.toLowerCase();
  if (e.key === "ArrowLeft") pressAction("left", false);
  if (e.key === "ArrowRight") pressAction("right", false);
  if (e.key === "ArrowUp" || e.code === "Space") pressAction("jump", false);
  if (e.key === "ArrowDown") pressAction("crouch", false);
  if (e.code === "KeyA") pressAction("light", false);
  if (e.code === "KeyS") pressAction("heavy", false);
  if (e.code === "KeyD") pressAction("special", false);
});

canvas.addEventListener("click", (e) => {
  unlockAudio();
  const rect = canvas.getBoundingClientRect();
  const sx = W / rect.width;
  const sy = H / rect.height;
  const x = (e.clientX - rect.left) * sx;
  const y = (e.clientY - rect.top) * sy;

  if (GAME.state === "title") {
    GAME.state = "character";
    return;
  }

  if (GAME.state === "character") {
    if (x > 220 && x < 550 && y > 155 && y < 585) {
      GAME.selectedPlayer = "guf";
      GAME.state = "stage";
    }
    if (x > 730 && x < 1060 && y > 155 && y < 585) {
      GAME.selectedPlayer = "noize";
      GAME.state = "stage";
    }
    return;
  }

  if (GAME.state === "stage") {
    if (x < W / 3) chooseStageAndStart("moscow");
    else if (x < (W * 2) / 3) chooseStageAndStart("thailand");
    else chooseStageAndStart("concert");
    return;
  }
});

document.querySelectorAll("#touch-controls button").forEach((btn) => {
  const action = btn.dataset.key;
  const down = (e) => {
    e.preventDefault();
    unlockAudio();
    pressAction(action, true);
  };
  const up = (e) => {
    e.preventDefault();
    pressAction(action, false);
  };
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointercancel", up);
  btn.addEventListener("pointerleave", up);
});

function loop(now) {
  updateTouchControlsVisibility();
  const dt = Math.min(0.033, (now - GAME.lastTime) / 1000 || 0.016);
  GAME.lastTime = now;
  GAME.lastDt = dt;

  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;

  if (!assetsLoaded) drawLoading();
  else {
    if (GAME.state === "title") drawTitle();
    if (GAME.state === "character") characterScreen();
    if (GAME.state === "stage") stageScreen();
    if (GAME.state === "fight") drawFight(dt);
    if (GAME.state === "end") endScreen();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.addEventListener("resize", updateTouchControlsVisibility);
updateTouchControlsVisibility();
