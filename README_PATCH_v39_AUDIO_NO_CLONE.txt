v39 audio fix:
- playSound() no longer uses cloneNode().
- SFX now play through the original HTML <audio> elements:
  pause -> currentTime = 0 -> play().
- This is more reliable on mobile browsers and Safari.
- Battle music remains a separate original HTML audio element.
