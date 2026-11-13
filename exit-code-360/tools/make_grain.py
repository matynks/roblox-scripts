#!/usr/bin/env python3
"""Generate 8 film-grain frames (public/textures/grain_N.png), mid-grey centred
so they can be overlaid with mix-blend-mode: overlay."""
import os
import numpy as np
from PIL import Image, ImageFilter

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "textures")
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(360)
for i in range(8):
    n = rng.normal(0.0, 1.0, (540, 960))
    img = Image.fromarray(np.clip(128 + n * 38, 0, 255).astype(np.uint8), "L")
    img = img.filter(ImageFilter.GaussianBlur(0.5))  # 960x540, upscaled 2x by the browser
    img.save(os.path.join(out, f"grain_{i}.png"), optimize=True)
print("ok")
