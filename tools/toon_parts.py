#!/usr/bin/env python3
"""Give cut-out body parts a drawn, video-game look (cel shading and ink lines).

Usage: python3 tools/toon_parts.py <in folder> <out folder> [light|medium|strong]

For each RGBA part:
  1. Smooth away photo grain while keeping edges (bilateral filter, a few passes).
  2. Cel shading: brightness is snapped toward a few tone bands (soft
     transitions), so light and shadow read as painted shapes.
  3. Slightly bolder color: saturation and contrast up.
  4. Ink: dark lines along strong edges inside the part (plate edges, folds),
     and a heavier outline around the silhouette.
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

LEVELS = {
    #          smoothing, bands, band softness, saturation, inner ink, outline px
    'light': (2, 6, 0.35, 1.12, 0.45, 2),
    'medium': (3, 5, 0.22, 1.2, 0.65, 3),
    'strong': (4, 4, 0.12, 1.28, 0.85, 4),
    # Arcade: brighter, warmer, like 90s fighting-game portraits (lifted
    # shadows, bright lit planes, clean ink on the main forms only).
    'arcade': (3, 4, 0.2, 1.3, 0.5, 3),
}


def toon(rgba, level):
    passes, bands, soft, sat, ink, outline = LEVELS[level]
    rgb = rgba[..., :3].copy()
    alpha = rgba[..., 3]
    scale = max(rgb.shape[:2]) / 400  # parts are 150-520 px; keep strokes proportional
    for _ in range(passes):
        rgb = cv2.bilateralFilter(rgb, 7, 40, 5)

    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    v = hsv[..., 2] / 255
    if level == 'arcade':
        # Open up the dark costume first: lift shadows, then stretch to full range.
        v = np.clip(v, 0, 1) ** 0.62
        lo, hi = np.percentile(v[alpha > 128], [2, 99.5])
        v = np.clip((v - lo) / max(hi - lo, 1e-3), 0, 1)
    # Snap brightness to bands with a smooth step between them.
    x = v * bands
    f = x - np.floor(x)
    step = np.clip((f - 0.5) / max(soft, 1e-3) + 0.5, 0, 1)
    step = step * step * (3 - 2 * step)
    vq = (np.floor(x) + step) / bands
    vq = np.clip((vq - 0.5) * 1.12 + 0.5, 0, 1)  # a little more contrast
    if level == 'arcade':
        vq = 0.16 + vq * 0.84  # no pure-black shadow bands; ink does the darkest work
    hsv[..., 2] = vq * 255
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
    out = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
    if level == 'arcade':
        # Warm the lit planes slightly, cool the shadows (classic painted game art).
        t = vq[..., None]
        out = out * (1 + (t - 0.5) * np.array([0.10, 0.03, -0.08], np.float32))

    # Inner ink lines: edges of the smoothed image.
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    lo_t, hi_t = (70, 160) if level == 'arcade' else (40, 110)
    edges = cv2.Canny(gray, lo_t, hi_t).astype(np.float32) / 255
    edges = cv2.GaussianBlur(edges, (0, 0), 0.6 * max(1, scale))
    edges = np.clip(edges * 1.6, 0, 1) * ink
    ink_color = np.array([18, 14, 16], np.float32)
    out = out * (1 - edges[..., None]) + ink_color * edges[..., None]

    # Outline: a dark band just inside the silhouette.
    solid = (alpha > 128).astype(np.uint8)
    k = max(1, int(round(outline * max(1, scale))))
    inner = cv2.erode(solid, np.ones((3, 3), np.uint8), iterations=k)
    rim = cv2.GaussianBlur((solid - inner).astype(np.float32), (0, 0), 0.7)
    out = out * (1 - rim[..., None]) + ink_color * rim[..., None]

    res = rgba.copy()
    res[..., :3] = np.clip(out, 0, 255).astype(np.uint8)
    return res


def main(src, dst, level='medium'):
    os.makedirs(dst, exist_ok=True)
    for name in sorted(os.listdir(src)):
        if not name.endswith('.png'):
            continue
        a = np.asarray(Image.open(os.path.join(src, name)).convert('RGBA'))
        Image.fromarray(toon(a, level)).save(os.path.join(dst, name))
    print(dst, level)


if __name__ == '__main__':
    main(*sys.argv[1:4])
