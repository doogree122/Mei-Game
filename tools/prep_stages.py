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

from PIL import Image, ImageDraw, ImageFilter

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
    mask = Image.new('L', im.size, 0)
    for poly in polys:
        ImageDraw.Draw(mask).polygon(poly, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    # Fully transparent pixels are blanked so the file compresses well.
    front = Image.composite(im.convert('RGBA'), Image.new('RGBA', im.size, (0, 0, 0, 0)), mask.point(lambda v: 255 if v else 0))
    front.putalpha(mask)
    front.save(out, 'PNG', optimize=True)
    print(' ', out)


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
        if sid in FRONT:
            cut_front(im, FRONT[sid], f'assets/stages/{sid}-front.png')


if __name__ == '__main__':
    main(sys.argv[1:4])
