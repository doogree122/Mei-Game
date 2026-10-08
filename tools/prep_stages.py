#!/usr/bin/env python3
"""Prepare level backdrop pictures for the game.

Usage: python3 tools/prep_stages.py <desert.jpg> <bridge.webp> <corridor.jpg>

Crops each picture (the corridor shot loses the logo in its bottom-left
corner), resizes it to at most 1600 pixels wide, saves it as
assets/stages/<id>.jpg, and prints the average colors of its top and bottom
edges, which fill the space around the arena on tall phone screens
(STAGES in src/stages.js).
"""
import sys

from PIL import Image

CROPS = {
    'desert': None,
    'bridge': None,
    'corridor': (0, 0, 1920, 990),  # drop the watermark along the bottom
}


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
        im.save(out, 'JPEG', quality=84, optimize=True, progressive=True)
        print(sid, im.size, 'top', edge_color(im, True), 'bottom', edge_color(im, False), out)


if __name__ == '__main__':
    main(sys.argv[1:4])
