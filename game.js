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

const AUDIO_VERSION = "v25_mp3_audio_only_" + Date.now();

const AUDIO_PATHS = {
  hitLight: "assets/audio/hit_light.mp3",
  hitHeavy: "assets/audio/hit_heavy.mp3",
  specialGuf: "assets/audio/special_guf.mp3",
  specialNoize: "assets/audio/special_noize.mp3",
  battleMusic: "assets/audio/battle_music.mp3",
};

const sounds = {};
let audioUnlocked = false;

function loadSounds() {
  for (const [key, src] of Object.entries(AUDIO_PATHS)) {
    const audio = new Audio(src + "?cache=" + AUDIO_VERSION);
    audio.preload = "auto";
    audio.volume = key === "battleMusic" ? 0.22 : 0.9;
    audio.loop = key === "battleMusic";

    audio.addEventListener("canplaythrough", () => {
      console.log("[REAL AUDIO LOADED]", key, audio.src);
    }, { once: true });

    audio.addEventListener("error", () => {
      console.error("[REAL AUDIO FAILED — file not found or bad wav]", key, audio.src);
    });

    sounds[key] = audio;
  }
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  console.log("[AUDIO UNLOCKED — real files only]");
  for (const [key, audio] of Object.entries(sounds)) {
    try {
      audio.load();
      console.log("[AUDIO FILE REQUESTED]", key, audio.src);
    } catch (e) {
      console.error("[AUDIO LOAD EXCEPTION]", key, e);
    }
  }
}

function playSound(name) {
  if (!audioUnlocked) {
    console.warn("[AUDIO BLOCKED UNTIL CLICK/KEY]", name);
    return;
  }

  const base = sounds[name];
  if (!base) {
    console.error("[AUDIO OBJECT MISSING]", name);
    return;
  }

  try {
    const audio = base.cloneNode();
    audio.volume = base.volume;
    audio.play().catch((err) => {
      console.error("[REAL AUDIO PLAY FAILED]", name, base.src, err);
    });
  } catch (err) {
    console.error("[REAL AUDIO EXCEPTION]", name, err);
  }
}

function startBattleMusic() {
  if (!audioUnlocked) return;
  const music = sounds.battleMusic;
  if (!music) return;

  try {
    music.volume = 0.22;
    music.loop = true;
    music.play().catch((err) => {
      console.warn("[BATTLE MUSIC PLAY FAILED]", music.src, err);
    });
  } catch (err) {
    console.warn("[BATTLE MUSIC EXCEPTION]", err);
  }
}

function stopBattleMusic() {
  const music = sounds.battleMusic;
  if (!music) return;

  try {
    music.pause();
    music.currentTime = 0;
  } catch (err) {}
}

loadSounds();
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

const fighterData = {
  guf: {
    id: "guf",
    name: "ГУФ",
    color: "#e8e8dc",
    specialName: "ЧАЙНИК",
  },
  noize: {
    id: "noize",
    name: "НОЙЗ",
    color: "#1c2735",
    specialName: "ГИТАРА",
  },
};

const stages = {
  moscow: { id: "moscow", name: "МОСКВА / МГУ" },
  thailand: { id: "thailand", name: "ТАИЛАНД / БЕРЕГ" },
};

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

  projectiles = [];
  hitSparks = [];
  dusts = [];
  damagePopups = [];
  GAME.timeLeft = ROUND_SECONDS;
  GAME.roundStartedAt = performance.now();
  GAME.winner = "";
  GAME.cameraShake = 0;
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
    ctx.drawImage(frame, x + 55, y + 35, w - 110, 250);
  } else {
    ctx.strokeStyle = active ? "#ffffff" : "#fff0a6";
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
  }

  // Portrait from asset pack
  const portrait = images[`portraits.${id}`];
  if (portrait && portrait.complete && portrait.naturalWidth) {
    ctx.drawImage(portrait, x + w / 2 - 76, y + 78, 152, 152);
  } else {
    drawSprite(id, "idle", x + w / 2, y + 255, 1.1, 1);
  }

  // Small in-game sprite preview below portrait
  drawSprite(id, "idle", x + w / 2, y + 300, 0.58, 1);

  drawCleanText(info.name, x + w / 2, y + 330, 46, active ? "#111" : "#fff", "center");

  ctx.strokeStyle = active ? "#ffffff" : "#fff0a6";
  ctx.lineWidth = active ? 6 : 4;
  ctx.strokeRect(x, y, w, h);
}

function stageScreen() {
  drawMenuBg();
  drawPixelText("ВЫБЕРИ ЛОКАЦИЮ", W / 2, 60, 48, "#fff", "center");

  drawStageCard("moscow", 120, 145, 470, 310);
  drawStageCard("thailand", 690, 145, 470, 310);

  drawPixelText("КЛИКНИ ПО ЛОКАЦИИ ИЛИ НАЖМИ 1 / 2", W / 2, 555, 24, "#fff", "center");
  drawPixelText("ENTER — НАЧАТЬ БОЙ", W / 2, 610, 28, "#fff6b0", "center");
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

  if (player.hp <= 0 || bot.hp <= 0 || GAME.timeLeft <= 0) {
    if (player.hp === bot.hp) GAME.winner = "НИЧЬЯ";
    else GAME.winner = player.hp > bot.hp ? player.data.name : bot.data.name;
    stopBattleMusic();
    GAME.state = "end";
  }
}

function handlePlayerInput() {
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
  bot.aiThink -= dt;
  if (bot.aiThink <= 0) {
    const dist = player.x - bot.x;
    bot.aiThink = 0.20 + Math.random() * 0.30;
    bot.aiMove = Math.sign(dist);

    if (Math.abs(dist) < 150) {
      bot.aiAttack = Math.random() < 0.58 ? 1 : 0;
      bot.aiMove = Math.random() < 0.32 ? -Math.sign(dist) : 0;
    } else if (Math.abs(dist) > 340 && Math.random() < 0.25) {
      bot.aiAttack = 3;
    } else {
      bot.aiAttack = 0;
    }

    if (Math.random() < 0.08 && bot.onGround) {
      bot.vy = -16;
      bot.onGround = false;
      addDust(bot.x, bot.y);
    }
  }

  if (bot.hitStun > 0) { bot.targetVx = 0; return; }
  bot.targetVx = bot.aiMove * 4.2;

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

  f.x = clamp(f.x, 80, W - 80);

  // Visual interpolation: sprite follows physics smoothly instead of snapping.
  const visualFollow = 1 - Math.pow(0.001, dt);
  f.renderX += (f.x - f.renderX) * visualFollow;
  f.renderY += (f.y - f.renderY) * visualFollow;

  if (f !== player) f.isCrouching = false;

  if (f.hitStun > 0) f.state = "hurt";
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
    dealDamage(target, damage, attacker.dir, type === "light" ? 6 : 11);
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
    x: attacker.x + attacker.dir * 76,
    y: attacker.y - 110,
    vx: attacker.dir * (kind === "guitar" ? 11.2 : 9.5),
    w: kind === "guitar" ? 96 : 84,
    h: kind === "guitar" ? 42 : 52,
    damage: 15,
    life: 78,
    rotation: 0,
    hit: false,
  });
}

function dealDamage(target, amount, dir, knock) {
  const finalAmount = target.isCrouching ? Math.ceil(amount / 2) : amount;
  target.hp = Math.max(0, target.hp - finalAmount);
  damagePopups.push({
    x: target.x,
    y: target.y - 145,
    text: target.isCrouching ? "-" + finalAmount + " BLOCK" : "-" + finalAmount,
    life: 34
  });
  target.hitStun = target.isCrouching ? 0.14 : 0.24;
  target.vx = dir * (target.isCrouching ? knock * 0.45 : knock);
  target.vy = target.isCrouching ? -1.2 : -4;
  GAME.cameraShake = Math.max(GAME.cameraShake, finalAmount * 0.55);
}

function updateProjectiles() {
  const stepScale = GAME.lastDt ? Math.min(GAME.lastDt, 1 / 30) * 60 : 1;

  for (const p of projectiles) {
    p.x += p.vx * stepScale;
    if (p.kind === "kettle") {
      p.rotation = (p.rotation || 0) + 0.12 * Math.sign(p.vx) * stepScale;
      p.y += Math.sin((78 - p.life) * 0.12) * 1.2 * stepScale;
    }
    if (p.kind === "guitar") {
      p.rotation = (p.rotation || 0) + 0.18 * Math.sign(p.vx) * stepScale;
    }
    p.life -= stepScale;

    const target = p.owner === player ? bot : player;
    const pBox = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
    const tBox = target.isCrouching
      ? { x: target.x - target.w / 2 + 6, y: target.y - 66, w: target.w - 12, h: 56 }
      : { x: target.x - target.w / 2, y: target.y - target.h, w: target.w, h: target.h };

    if (!p.hit && rectsOverlap(pBox, tBox)) {
      p.hit = true;
      dealDamage(target, p.damage, Math.sign(p.vx), 14);
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
    ctx.globalAlpha = clamp(p.life / 34, 0, 1);
    drawPixelText(p.text, p.x, p.y, 26, "#ffef7a", "center");
    ctx.globalAlpha = 1;
  }
}

function drawStageBackground(id) {
  const img = images[`backgrounds.${id}`];
  if (img && img.complete && img.naturalWidth) {
    drawCoverImage(img, 0, 0, W, H);
  } else {
    drawFallbackBackground();
  }
  // dark floor collision strip
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
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

  drawPixelText(`СПЕЦ: ${player.data.specialName} ${player.specialCooldown <= 0 ? "[L]" : "[...]"}`, 72, 114, 18, "#fff", "left");
  drawPixelText(`СПЕЦ: ${bot.data.specialName}`, W - 72, 114, 18, "#fff", "right");
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

  const title = GAME.winner === "НИЧЬЯ" ? "НИЧЬЯ" : `${GAME.winner} ПОБЕДИЛ`;
  drawPixelText(title, W / 2, 105, 58, "#fff6b0", "center");
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
  if (["KeyA","KeyD","KeyW","KeyS","KeyJ","KeyK","KeyL","Space","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","ArrowDown"].includes(e.code) || ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
    e.preventDefault();
  }
  const k = e.key.toLowerCase();

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
    if (e.code === "Digit1" || k === "1") GAME.selectedStage = "moscow";
    if (e.code === "Digit2" || k === "2") GAME.selectedStage = "thailand";
    if (e.key === "Enter" && GAME.selectedStage) {
      resetRound();
      GAME.state = "fight";
    }
  }

  if (GAME.state === "end") {
    if (e.key === "Enter") {
      resetRound();
      GAME.state = "fight";
    }
    if (e.key === "Escape") {
      stopBattleMusic();
      GAME.state = "title";
      GAME.selectedPlayer = null;
      GAME.selectedStage = null;
    }
  }

  if (GAME.state === "fight") {
    if (e.code === "KeyA" || e.key === "ArrowLeft") pressAction("left", true);
    if (e.code === "KeyD" || e.key === "ArrowRight") pressAction("right", true);
    if (e.code === "KeyW" || e.key === "ArrowUp" || e.code === "Space") pressAction("jump", true);
    if (e.code === "KeyS" || e.key === "ArrowDown") pressAction("crouch", true);
    if (e.code === "KeyJ") pressAction("light", true);
    if (e.code === "KeyK") pressAction("heavy", true);
    if (e.code === "KeyL") pressAction("special", true);
  }
});

window.addEventListener("keyup", (e) => {
  if (["KeyA","KeyD","KeyW","KeyS","KeyJ","KeyK","KeyL","Space","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","ArrowDown"].includes(e.code) || ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
    e.preventDefault();
  }
  const k = e.key.toLowerCase();
  if (e.code === "KeyA" || e.key === "ArrowLeft") pressAction("left", false);
  if (e.code === "KeyD" || e.key === "ArrowRight") pressAction("right", false);
  if (e.code === "KeyW" || e.key === "ArrowUp" || e.code === "Space") pressAction("jump", false);
  if (e.code === "KeyS" || e.key === "ArrowDown") pressAction("crouch", false);
  if (e.code === "KeyJ") pressAction("light", false);
  if (e.code === "KeyK") pressAction("heavy", false);
  if (e.code === "KeyL") pressAction("special", false);
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
    if (x > 120 && x < 590 && y > 145 && y < 455) GAME.selectedStage = "moscow";
    if (x > 690 && x < 1160 && y > 145 && y < 455) GAME.selectedStage = "thailand";
    if (GAME.selectedStage) {
      resetRound();
      GAME.state = "fight";
    }
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
