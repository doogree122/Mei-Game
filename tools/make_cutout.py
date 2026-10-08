#!/usr/bin/env python3
"""Cut a full-body character picture into body parts for the cut-out renderer.

Usage: python3 tools/make_cutout.py <character id> <picture> <out.js>
  e.g. python3 tools/make_cutout.py seven seven.webp src/cutout-seven.js

Each part is a polygon on the source picture plus two points on it: `pivot`,
the joint it hangs from, and `tip`, the joint at its other end. The game lines
pivot -> tip up with the matching bone of its skeleton every frame, so the
parts move with the existing animations. Coordinates in CONFIGS are for the
pictures each character was cut from. The script writes a JS file with the
parts embedded as data URIs.
"""
import base64
import io
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

CONFIGS = {
    # 329x1024 front-view drawing on white.
    'worf': {
        'background': 'white',
        'width': 0.19,  # skeleton units per source pixel, across each part
        'head': 1.3,  # head drawn bigger than the picture's proportions
        'resize': 1.0,
        # Where the hand holding the phaser covers the body.
        'fill': [((62, 322, 142, 400), (200, 150, 12)), ((62, 400, 142, 420), (10, 10, 12))],
        'parts': {
            # The figure's own right arm hangs straight, so it serves for both arms.
            'upperArm': {'poly': [(246, 186), (300, 205), (318, 260), (326, 330), (328, 440), (266, 440), (262, 330), (254, 262)],
                         'pivot': (282, 215), 'tip': (296, 432)},
            'forearm': {'poly': [(264, 424), (329, 424), (329, 520), (322, 590), (282, 598), (272, 520)],
                        'pivot': (296, 432), 'tip': (300, 572)},
            'torso': {'poly': [(66, 160), (240, 160), (258, 196), (262, 330), (262, 440), (258, 610), (62, 610), (66, 330)],
                      'pivot': (160, 592), 'tip': (162, 178)},
            'head': {'poly': [(86, 0), (244, 0), (244, 120), (214, 172), (110, 172), (86, 120)],
                     'pivot': (162, 170), 'tip': (162, 20)},
            # The figure's left leg, whose boot points to the right: both legs.
            'thigh': {'poly': [(160, 575), (268, 575), (266, 800), (180, 800), (164, 700)],
                      'pivot': (210, 600), 'tip': (222, 790)},
            'shin': {'poly': [(178, 780), (266, 780), (268, 945), (329, 975), (329, 1012), (196, 1012), (186, 900)],
                     'pivot': (222, 790), 'tip': (226, 985)},
        },
    },
    # 2000x1116 side-view render on a gray studio backdrop, facing right.
    'seven': {
        'background': 'studio',
        'keep': (980, 600),  # a point on the body; anything not joined to it is dropped
        # Backdrop enclosed between the arm and the back, between the legs, and
        # grid-line scraps along the arm.
        'gaps': [(905, 318, 968, 528), (988, 820, 1006, 968), (845, 380, 874, 500)],
        'width': 0.185,
        'head': 1.25,
        'resize': 0.6,  # the picture is far bigger than the game needs
        # The far hand resting on her stomach: covered with suit copied from just behind it.
        'copy': [((1028, 392, 1048, 474), (-24, 0))],
        'parts': {
            # The near arm hangs straight beside her, so it serves for both arms.
            'upperArm': {'poly': [(918, 200), (962, 212), (962, 300), (944, 330), (930, 405), (866, 412), (866, 330), (892, 238)],
                         'pivot': (928, 245), 'tip': (888, 402)},
            'forearm': {'poly': [(862, 388), (934, 392), (918, 470), (910, 520), (940, 545), (936, 598), (890, 600), (866, 560), (856, 480)],
                        'pivot': (888, 402), 'tip': (906, 566)},
            'torso': {'poly': [(945, 195), (1000, 182), (1040, 190), (1062, 250), (1070, 300), (1052, 360), (1046, 400), (1046, 470),
                               (1060, 540), (1050, 585), (962, 585), (946, 520), (936, 460), (940, 330), (958, 300), (960, 230)],
                      'pivot': (1000, 570), 'tip': (1002, 205)},
            'head': {'poly': [(936, 30), (1046, 30), (1074, 90), (1074, 150), (1050, 176), (1044, 205), (982, 210), (958, 172), (936, 120)],
                     'pivot': (1004, 204), 'tip': (1006, 112)},
            # The near leg, whose toe points to the right: both legs.
            'thigh': {'poly': [(962, 530), (1062, 530), (1066, 600), (1062, 700), (1050, 822), (978, 822), (966, 700), (958, 600)],
                      'pivot': (1008, 575), 'tip': (1018, 810)},
            'shin': {'poly': [(995, 798), (1060, 798), (1052, 960), (1060, 1010), (1152, 1064), (1154, 1090), (1090, 1094),
                              (1056, 1066), (1054, 1097), (1024, 1097), (1010, 1040), (998, 960)],
                     'pivot': (1018, 810), 'tip': (1034, 1040)},
        },
    },
}


def flood(cand, seeds):
    """Pixels of `cand` joined to any True pixel of `seeds`."""
    reach = seeds & cand
    while True:
        n = reach.copy()
        n[1:] |= reach[:-1]
        n[:-1] |= reach[1:]
        n[:, 1:] |= reach[:, :-1]
        n[:, :-1] |= reach[:, 1:]
        n &= cand
        if (n == reach).all():
            return reach
        reach = n


def cut_out(im, cfg):
    """RGBA picture with the background transparent."""
    a = np.asarray(im.convert('RGB')).astype(int)
    mx, mn = a.max(2), a.min(2)
    if cfg['background'] == 'white':
        cand = (a > 228).all(2)
    else:
        cand = (mx > 165) & (mx - mn < 30)  # light, unsaturated studio gray and its grid
    edge = np.zeros_like(cand)
    edge[0, :] = edge[-1, :] = True
    edge[:, 0] = edge[:, -1] = True
    bg = flood(cand, edge)
    for x0, y0, x1, y1 in cfg.get('gaps', []):
        bg[y0:y1, x0:x1] |= cand[y0:y1, x0:x1]
        # Thin leftovers (darker grid lines) inside the gap.
        for y in range(y0, y1):
            row = ~bg[y, x0:x1]
            x = 0
            while x < row.size:
                if not row[x]:
                    x += 1
                    continue
                s = x
                while x < row.size and row[x]:
                    x += 1
                if x - s < 8 and s > 0 and x < row.size:
                    bg[y, x0 + s:x0 + x] = True
    fg = ~bg
    if 'keep' in cfg:
        seed = np.zeros_like(fg)
        seed[cfg['keep'][1], cfg['keep'][0]] = True
        fg = flood(fg, seed)
    return Image.fromarray(np.dstack([a, fg * 255]).astype(np.uint8), 'RGBA')


def main(char_id, src, out):
    cfg = CONFIGS[char_id]
    im = cut_out(Image.open(src), cfg)
    d = ImageDraw.Draw(im)
    for box, color in cfg.get('fill', []):
        d.rectangle(box, fill=color + (255,))
    for (x0, y0, x1, y1), (dx, dy) in cfg.get('copy', []):
        im.paste(im.crop((x0 + dx, y0 + dy, x1 + dx, y1 + dy)), (x0, y0))
    k = cfg['resize']
    parts = {}
    for name, spec in cfg['parts'].items():
        mask = Image.new('L', im.size, 0)
        ImageDraw.Draw(mask).polygon(spec['poly'], fill=255)
        cut = Image.new('RGBA', im.size, (0, 0, 0, 0))
        cut.paste(im, (0, 0), mask)
        box = cut.getbbox()
        cut = cut.crop(box)
        if k != 1:
            cut = cut.resize((round(cut.width * k), round(cut.height * k)), Image.LANCZOS)
        buf = io.BytesIO()
        if k != 1:
            cut.save(buf, 'WEBP', quality=88)
            mime = 'image/webp'
        else:
            cut.save(buf, 'PNG', optimize=True)
            mime = 'image/png'
        parts[name] = {
            'src': f'data:{mime};base64,' + base64.b64encode(buf.getvalue()).decode(),
            'pivot': [round((spec['pivot'][0] - box[0]) * k, 1), round((spec['pivot'][1] - box[1]) * k, 1)],
            'tip': [round((spec['tip'][0] - box[0]) * k, 1), round((spec['tip'][1] - box[1]) * k, 1)],
        }
    data = {'width': cfg['width'] / k, 'head': cfg['head'], 'parts': parts}
    with open(out, 'w') as f:
        f.write(f'// Generated by tools/make_cutout.py: body parts cut from a picture of {char_id}.\n')
        f.write('var CUTOUTS = window.CUTOUTS || {};\n')
        f.write(f'CUTOUTS.{char_id} = ' + json.dumps(data) + ';\n')
    print(out, sum(len(p['src']) for p in parts.values()) // 1024, 'KB')


if __name__ == '__main__':
    main(*sys.argv[1:4])
