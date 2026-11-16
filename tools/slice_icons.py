"""Slice generated icon sheets into trimmed transparent PNGs.

usage: 在放有各 sheet 子資料夾（<sheet>/<sheet>.png）的工作目錄執行
       python slice_icons.py <out_dir>
新增圖示時在 SHEETS 補一筆：(列數, 欄數, 輸出長邊像素, 由左到右由上到下的檔名)。
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

SENTINEL = (255, 0, 255)
CROPS = [('carrot', 'wheat'), ('tomato', 'strawberry'), ('corn', 'pumpkin'),
         ('eggplant', 'blueberry'), ('watermelon', 'goldapple')]
SHEETS = {
    'field': (3, 3, 192, ['seed', 'sprout', 'seedling', 'withered', 'pest', 'sprinkler', 'locked', 'fertilizer', 'star']),
    'tools': (3, 3, 128, ['hoe', 'water-can', 'basket', 'shovel', 'coin', 'shop', 'crate', 'backpack', 'workshop']),
    'ui': (3, 4, 128, ['orders', 'tasks', 'trophy', 'gear', 'sun', 'cloudy', 'rain', 'spring', 'autumn', 'winter', 'drop', 'save']),
    'scenery': (3, 3, 256, ['barn', 'scarecrow', 'cloud', 'tree-spring', 'tree-summer', 'tree-autumn', 'tree-winter', 'fence', 'bush']),
    'workshop1': (3, 3, 128, ['machine-juicer', 'machine-oven', 'machine-jampot', 'recipe-carrot_juice', 'recipe-tomato_juice',
                              'recipe-strawberry_shake', 'recipe-melon_slush', 'recipe-bread', 'recipe-corn_bread']),
    'workshop2': (2, 2, 128, ['recipe-pumpkin_pie', 'recipe-strawberry_jam', 'recipe-blueberry_jam', 'recipe-golden_honey']),
}
for n, (a, b) in enumerate(CROPS, 1):
    names = []
    for c in (a, b):
        names += [f'crop-{c}-1', f'crop-{c}-2', f'crop-{c}-3', f'crop-{c}']
    SHEETS[f'crops{n}'] = (2, 4, 192, names)


def debg(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    for x in range(0, w, 40):
        for pt in ((x, 0), (x, h - 1)):
            if sum(im.getpixel(pt)) > 720:
                ImageDraw.floodfill(im, pt, SENTINEL, thresh=40)
    for y in range(0, h, 40):
        for pt in ((0, y), (w - 1, y)):
            if sum(im.getpixel(pt)) > 720:
                ImageDraw.floodfill(im, pt, SENTINEL, thresh=40)
    a = np.asarray(im).astype(np.float32)
    bg = np.all(np.asarray(im) == SENTINEL, axis=2)
    # fringe = opaque pixels within 2px of background: un-blend them from white so no light halo survives
    near = bg.copy()
    for _ in range(2):
        n = near.copy()
        n[1:, :] |= near[:-1, :]; n[:-1, :] |= near[1:, :]
        n[:, 1:] |= near[:, :-1]; n[:, :-1] |= near[:, 1:]
        near = n
    fringe = near & ~bg
    alpha = np.where(bg, 0.0, 1.0).astype(np.float32)
    fa = 1.0 - a[..., :3].min(axis=2) / 255.0  # darkest channel decides coverage of the dark outline
    fa = np.clip(fa * 1.6, 0.0, 1.0)
    alpha[fringe] = fa[fringe]
    safe = np.maximum(alpha, 0.05)[..., None]
    rgb = np.where(fringe[..., None], (a - (1 - safe) * 255.0) / safe, a)
    rgb = np.clip(rgb, 0, 255)
    rgb[bg] = 0
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def bands(counts, expect, min_gap=14):
    idx = np.flatnonzero(counts)
    spans = []
    start = prev = idx[0]
    for i in idx[1:]:
        if i - prev > min_gap:
            spans.append((start, prev + 1))
            start = i
        prev = i
    spans.append((start, prev + 1))
    if len(spans) == expect:
        return spans
    # icons overlap in projection: cut at the emptiest line near each equal-division boundary
    lo, hi = idx[0], idx[-1] + 1
    step = (hi - lo) / expect
    cuts = [lo]
    for k in range(1, expect):
        c = int(lo + k * step)
        w = int(step * 0.3)
        cuts.append(c - w + int(np.argmin(counts[c - w:c + w])))
    cuts.append(hi)
    print('  fallback cuts', cuts)
    return list(zip(cuts[:-1], cuts[1:]))


def main(outdir):
    os.makedirs(outdir, exist_ok=True)
    total = 0
    for sheet, (rows, cols, size, names) in SHEETS.items():
        im = debg(f'{sheet}/{sheet}.png')
        alpha = np.asarray(im)[..., 3] > 40
        k = 0
        for (y0, y1) in bands(alpha.sum(axis=1), rows):
            for (x0, x1) in bands(alpha[y0:y1].sum(axis=0), cols):
                cell = im.crop((x0, y0, x1, y1))
                cell = cell.crop(cell.getbbox())
                s = size / max(cell.size)
                if s < 1:
                    cell = cell.resize((round(cell.width * s), round(cell.height * s)), Image.LANCZOS)
                q = cell.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
                p = os.path.join(outdir, names[k] + '.png')
                q.save(p, optimize=True)
                total += os.path.getsize(p)
                k += 1
        print(sheet, k)
    print('total KB', total // 1024)


main(sys.argv[1])
