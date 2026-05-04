v17 crouch fix:
- crouch hurtbox lowered a lot:
  x += 6, y = target.y - 66, w = target.w - 12, h = 56
- projectile collision now also respects the lower crouch hurtbox
- crouch sprite is drawn lower and slightly smaller (offsetY +18, scale 0.86)
Result:
- high hand attacks should whiff over a crouching fighter
- flying specials should also pass overhead much more reliably
- heavy kick can still connect because it uses a lower attack box
