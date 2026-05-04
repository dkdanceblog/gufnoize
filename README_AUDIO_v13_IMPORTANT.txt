v13 AUDIO CACHE FIX

Теперь код добавляет ?cache=v13_real_audio_only_<timestamp> к каждому audio src.
Это заставляет браузер брать свежие файлы именно из assets/audio/, а не старые из кэша.

Положи сюда свои 4 файла:
assets/audio/hit_light.wav
assets/audio/hit_heavy.wav
assets/audio/special_guf.wav
assets/audio/special_noize.wav

Если звук всё равно не тот:
1. Удали старую распакованную папку игры полностью.
2. Распакуй этот архив в новую папку.
3. Положи свои wav в assets/audio/.
4. Запусти через python -m http.server 8000.
5. Открой F12 → Console.
6. При ударе консоль покажет:
   [audio ready — exact file] ...
   [audio play failed — exact file] ... если файл не проигрался.

Если в exact file видишь не v13 или не assets/audio/ — значит открыта старая версия игры.
