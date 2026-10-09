"""Cut out generated parts (white background), grade metal to dark gunmetal and leather darker, trim and resize.
torso's arm hole, and save trimmed RGBA parts."""
import numpy as np, cv2
from PIL import Image, ImageFilter
from scipy import ndimage

PARTS = {  # name: (source, long side in pixels)
    'upperArm': ('mando/upperArm.png', 360), 'forearm': ('mando/forearm.png', 360),
    'glove': ('mando/glove.png', 220), 'thigh': ('mando/thigh.png', 420), 'shin': ('mando/shin.png', 420),
    'foot': ('mando/foot.png', 260), 'torso': ('mando/torso.png', 520), 'jetpack': ('mando/jetpack.png', 420),
    'helmet': ('refs/helmet-ref.png', 300),
}

def solid_alpha(a):
    m = a > 110
    lab, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        m = lab == (1 + int(np.argmax(sizes)))
    m = ndimage.binary_fill_holes(m)
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9)))

def grade_metal(rgb):
    # Low-saturation, fairly bright pixels are metal: darken them toward
    # gunmetal and cool them slightly, keeping the brightest highlights.
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    s, v = hsv[..., 1] / 255, hsv[..., 2] / 255
    metal = np.clip((0.22 - s) / 0.12, 0, 1) * np.clip((v - 0.25) / 0.2, 0, 1)
    v2 = v * 0.5 + (v ** 4) * 0.32  # darker mid-tones, highlights survive
    out = rgb.astype(np.float32)
    k = (v2 / np.maximum(v, 1e-3))[..., None]
    graded = out * k
    graded[..., 2] *= 1.04
    graded[..., 0] *= 0.97
    return np.clip(out * (1 - metal[..., None]) + graded * metal[..., None], 0, 255).astype(np.uint8)

for name, (src, size) in PARTS.items():
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im).copy()
    if name != 'helmet':
        # Generated on pure white: everything reachable from the edges through
        # near-white is background.
        rgb0 = a[..., :3].astype(int)
        white = (rgb0.min(2) > 232) & (rgb0.max(2) - rgb0.min(2) < 18)
        lab, n = ndimage.label(white)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg = np.isin(lab, list(edge))
        a[..., 3] = np.where(bg, 0, 255).astype(np.uint8)
        # Shave the light fringe.
        a[..., 3] = ndimage.binary_erosion(a[..., 3] > 0, iterations=2) * 255
    a[..., 3] = solid_alpha(a[..., 3])
    rgb = a[..., :3].copy()
    if name not in ('foot', 'glove'):
        rgb = grade_metal(rgb)
    if name in ('foot', 'shin'):
        # Darker brown leather boots, as in the reference.
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
        leather = ((hsv[..., 0] > 4) & (hsv[..., 0] < 24) & (hsv[..., 1] > 80)).astype(np.float32)
        leather = cv2.GaussianBlur(leather, (0, 0), 1.5)
        hsv[..., 2] *= 1 - 0.42 * leather
        hsv[..., 1] *= 1 - 0.18 * leather
        rgb = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2RGB)
    a[..., :3] = rgb
    out = Image.fromarray(a)
    out = out.crop(out.getbbox())
    k = size / max(out.size)
    out = out.resize((round(out.width * k), round(out.height * k)), Image.LANCZOS)
    out.save(f'cut/{name}.png')
    print(name, out.size)
