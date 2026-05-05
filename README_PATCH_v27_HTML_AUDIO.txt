v27 HTML audio patch

Звук переписан по логике рабочей игры-примера:
- аудиоэлементы добавлены прямо в index.html:
  <audio id="sfx-hit-light" src="assets/audio/hit_light.mp3">
  ...
  <audio id="battle-music" src="assets/audio/battle_music.mp3" loop>
- game.js теперь берёт их через document.getElementById().
- встроенных fallback/8-bit звуков нет.
- музыка боя тихая: volume 0.18.
