v20 REAL AUDIO ONLY

Исправление проблемы «игра берёт какие-то 8-битные звуки».

Что сделано:
- полностью удалён fallbackTone / WebAudio oscillator;
- удалены все встроенные .wav/.mp3/.ogg из assets/audio/;
- код играет только реальные файлы из assets/audio/;
- к URL добавляется cache-busting;
- в консоли при запуске должно быть:
  [BUILD] v20 REAL AUDIO ONLY — no 8bit fallback sounds

Если после этого слышишь 8-битный звук — ты открыл старую папку или старый GitHub Pages деплой.
