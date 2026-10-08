#!/usr/bin/env python3
"""Prepare level backdrop pictures for the game.

Usage: python3 tools/prep_stages.py <desert.jpg> <bridge.webp> <corridor.jpg>

Crops each picture (the corridor shot loses the logo in its bottom-left
corner), resizes it to at most 1600 pixels wide, saves it as
assets/stages/<id>.jpg (plus <id>-front.png, the parts the fighters walk
behind, for pictures listed in FRONT), and prints the average colors of its top and bottom
edges, which fill the space around the arena on tall phone screens
(STAGES in src/stages.js).
"""
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

CROPS = {
    'desert': None,
    'bridge': None,
    'corridor': (0, 0, 1920, 990),  # drop the watermark along the bottom
}


# Things in the front of a picture that the fighters walk behind: polygons in
# the saved picture's pixels, cut into assets/stages/<id>-front.png.
FRONT = {
    'bridge': [
        # The left chair and the console corner in front of it.
        [(165, 500), (200, 486), (255, 488), (272, 505), (270, 560), (292, 600), (306, 640), (302, 713), (0, 713),
         (0, 620), (100, 616), (128, 598), (148, 560), (158, 520)],
        # The right chair and the console along the bottom right.
        [(864, 505), (885, 488), (950, 488), (972, 500), (976, 550), (1000, 580), (1022, 622), (1277, 622),
         (1277, 713), (824, 713), (828, 640), (843, 590), (858, 555)],
    ],
}


def cut_front(im, polys, out):
    # Inside each area, keep only the chairs' and consoles' beige (warm and
    # light), leaving the gray floor, the maroon carpet and the darker wooden
    # rail behind, then tidy the mask's speckles and soften its edge by a pixel.
    area = Image.new('L', im.size, 0)
    for poly in polys:
        ImageDraw.Draw(area).polygon(poly, fill=255)
    beige = im.point(lambda v: v).convert('RGB')
    r, g, b = [np.asarray(c).astype(int) for c in beige.split()]
    lum = (r * 3 + g * 6 + b) // 10
    warm = (lum > 112) & (r - b > 22) & (g - b > 8)
    mask = Image.fromarray((warm * 255).astype(np.uint8), 'L')
    mask = ImageChops.multiply(mask, area)
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))  # close small gaps
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # drop specks
    mask = ImageChops.multiply(mask, area)
    mask = fill_holes(mask)
    hard = mask
    mask = mask.filter(ImageFilter.GaussianBlur(0.8))
    # Fully transparent pixels are blanked so the file compresses well.
    front = Image.composite(im.convert('RGBA'), Image.new('RGBA', im.size, (0, 0, 0, 0)), mask.point(lambda v: 255 if v else 0))
    front.putalpha(mask)
    front.save(out, 'PNG', optimize=True)
    print(' ', out)
    # The background must not keep the chairs: paint them out (a little past
    # their edges) with the floor around them, so nothing of them shows at the
    # cut-out's soft edge.
    return inpaint(im, hard.filter(ImageFilter.MaxFilter(7)))


def fill_holes(mask):
    """Fill enclosed gaps (the dark seam between a headrest and its back)."""
    m = np.asarray(mask) > 127
    outside = np.zeros_like(m)
    outside[0, :] = ~m[0, :]
    outside[-1, :] = ~m[-1, :]
    outside[:, 0] = ~m[:, 0]
    outside[:, -1] = ~m[:, -1]
    while True:
        n = outside.copy()
        n[1:] |= outside[:-1]
        n[:-1] |= outside[1:]
        n[:, 1:] |= outside[:, :-1]
        n[:, :-1] |= outside[:, 1:]
        n &= ~m
        if (n == outside).all():
            break
        outside = n
    return Image.fromarray(((~outside) * 255).astype(np.uint8), 'L')


def inpaint(im, hole):
    """Fill the hole from its surroundings, growing inward a pixel at a time
    (each new pixel the average of its known neighbors), then smooth it."""
    a = np.asarray(im).astype(float)
    known = np.asarray(hole) < 128
    while not known.all():
        acc = np.zeros_like(a)
        cnt = np.zeros(known.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            k = np.roll(np.roll(known, dy, 0), dx, 1)
            v = np.roll(np.roll(a, dy, 0), dx, 1)
            acc += v * k[..., None]
            cnt += k
        grow = (~known) & (cnt > 0)
        a[grow] = acc[grow] / cnt[grow][:, None]
        known = known | grow
    filled = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGB')
    soft = filled.filter(ImageFilter.GaussianBlur(3))
    return Image.composite(soft, im, hole.filter(ImageFilter.GaussianBlur(2)))


def edge_color(im, top):
    h = im.height
    band = im.crop((0, 0, im.width, h // 12)) if top else im.crop((0, h - h // 12, im.width, h))
    r, g, b = band.resize((1, 1), Image.BOX).getpixel((0, 0))
    return '#%02x%02x%02x' % (r, g, b)


def main(paths):
    for (sid, crop), path in zip(CROPS.items(), paths):
        im = Image.open(path).convert('RGB')
        if crop:
            im = im.crop(crop)
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        out = f'assets/stages/{sid}.jpg'
        if sid in FRONT:
            im = cut_front(im, FRONT[sid], f'assets/stages/{sid}-front.png')
        im.save(out, 'JPEG', quality=84, optimize=True, progressive=True)
        print(sid, im.size, 'top', edge_color(im, True), 'bottom', edge_color(im, False), out)


if __name__ == '__main__':
    main(sys.argv[1:4])
