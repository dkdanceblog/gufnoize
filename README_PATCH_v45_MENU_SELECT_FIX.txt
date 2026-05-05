v45:
- Special move volume reduced further:
  special_guf / special_noize = 0.32
- menu_select volume increased to 0.82.
- Added dedicated playMenuSelect() with console diagnostics.
- Simplified unlockAudio(): removed muted play/pause loop that could interfere with immediate menu sound on mobile.
- If menu select still does not play, check direct URL:
  /assets/audio/menu_select.mp3
