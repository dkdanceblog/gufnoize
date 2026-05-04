v9 audio debug/fix

Код ждёт реальные файлы:

assets/audio/hit_light.wav
assets/audio/hit_heavy.wav
assets/audio/special_guf.wav
assets/audio/special_noize.wav

Важно:
1. Эти WAV-файлы нужно физически положить в assets/audio/.
2. Если открыть игру и звука нет — нажми F12 → Console.
3. Нажми T в игре: это тест всех 4 звуков.
4. В консоли должно быть:
   [audio loaded] ...
   [audio unlocked] ...
5. Если видишь [audio failed] — файл не найден, не там лежит или название отличается.
6. Если запускаешь локально, лучше через:
   python -m http.server 8000
   и открыть http://localhost:8000
