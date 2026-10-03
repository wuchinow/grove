#!/usr/bin/env python3
"""Cut Grove's tree paintings out of their plain backgrounds for the Home scene.

Each stage painting (one tree on a flat grey-blue gradient) becomes a trimmed
WebP with real alpha at public/scenes/<species>/stage-N.webp, and the stage
sizes and foot points go to app/lib/scene-art.js for app/lib/scene.js (a
module rather than JSON, so the unit tests can import it under plain Node).
The scene plates are converted to WebP alongside.

Steps per stage:
  1. rembg (isnet-general-use, with alpha matting) gives the alpha.
  2. The background colour is fitted across the image from its border (a
     plane per channel). Gaps in the canopy that rembg filled in as tree
     (background seen between branches) are keyed out against it, above
     the grass patch only, since the patch's rocks are grey too. Then the
     background is unmixed from every semi-transparent pixel, so leaf edges
     carry no grey fringe or pale halo onto the meadow.
  3. The painted grass patch under the tree is feathered at its rim, so it
     blends into the meadow instead of reading as a pedestal.
  4. Trim to the alpha box, resize to 2x the largest size the scene draws
     it at, and write WebP, lowering quality until it fits the budget.

Source paintings stay outside the repo. Run it with the venv that has rembg:

    python3 -m venv ~/Developer/grove-art-venv
    ~/Developer/grove-art-venv/bin/pip install "rembg[cpu]" pillow
    ~/Developer/grove-art-venv/bin/python scripts/cutout-trees.py \\
        --src ~/Desktop/grove --species oak \\
        --plate public/scenes/peter/meadow-empty.png \\
        --plate ~/Desktop/grove/"narrow grove path.png"=public/scenes/peter/meadow-portrait.webp \\
        --path-plate ~/Desktop/grove/"narrow grove path.png"

A plate is SRC (written beside itself as meadow.webp) or SRC=DEST, with DEST
relative to the repo. --plates-only skips the trees. --path-plate traces the
tan path on the portrait plate and writes app/lib/scene-path.js, which
app/lib/scene.js uses to keep trees off the path.

The first run downloads the isnet-general-use model (about 170MB) to ~/.u2net.
"""
import argparse
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

REPO = Path(__file__).resolve().parent.parent

# Which source file is which stage (0 Planted ... 7 Full grown), checked by
# eye against the stage names in app/lib/growth.js.
SOURCES = {"oak": {0: "8.png", 1: "7.png", 2: "6.png", 3: "4.png", 4: "2.png", 5: "5.png", 6: "3.png", 7: "1.png"}}

# Keep in step with app/lib/scene.js: a tree's drawn height is plate height x
# FULL_HEIGHT x depth x STAGE_CURVE[stage]. The plate is as tall as the
# viewport, so MAX_PLATE_H is the tallest phone viewport (430x932); depth tops
# out at 1. Each stage is written at 2x that largest drawn height. A 1080p
# desktop draws the full-grown oak about 450px tall, which this still covers
# at about 1.7x.
FULL_HEIGHT = 0.40
STAGE_CURVE = [0.12, 0.17, 0.26, 0.38, 0.52, 0.66, 0.82, 1.0]
MAX_PLATE_H = 932

# Bytes, read strictly (150KB = 150,000 bytes).
TREE_BUDGET = 150_000
PLATE_BUDGET = 400_000

# Per stage: how far up from the bottom of the trimmed image the trunk meets
# the ground (the point that stands on an anchor), and where the grass
# patch's feather starts, as a fraction of the patch's half-width (1 = rim).
FOOT_FROM_BOTTOM = {0: 0.30, 1: 0.16, 2: 0.10, 3: 0.09, 4: 0.08, 5: 0.08, 6: 0.07, 7: 0.08}
FEATHER_INNER = {0: 0.62, 1: 0.5, 2: 0.42, 3: 0.4, 4: 0.4, 5: 0.4, 6: 0.4, 7: 0.42}

# Colour distance (0-441) from the fitted background: under KEY_NEAR a canopy
# pixel is background showing through, over KEY_FAR it is tree.
KEY_NEAR, KEY_FAR = 12, 38


def fit_background(rgb, alpha):
    """A plane a + b*x + c*y per channel, fitted to clear pixels near the border."""
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w]
    border = np.zeros((h, w), bool)
    m = 48
    border[:m, :] = border[-m:, :] = border[:, :m] = border[:, -m:] = True
    sel = border & (alpha < 0.02)
    A = np.stack([np.ones(sel.sum()), xx[sel] / w, yy[sel] / h], 1)
    coef = [np.linalg.lstsq(A, rgb[..., c][sel], rcond=None)[0] for c in range(3)]
    full = np.stack([np.ones(h * w), xx.ravel() / w, yy.ravel() / h], 1)
    return np.stack([(full @ coef[c]).reshape(h, w) for c in range(3)], -1)


def unmix(rgb, alpha, bg):
    """Foreground colour from observed = a*F + (1-a)*B. Low-alpha pixels are
    clamped so the division can't blow up; they're nearly invisible anyway."""
    a = np.clip(alpha, 0.0, 1.0)[..., None]
    f = (rgb - (1 - a) * bg) / np.maximum(a, 0.18)
    return np.clip(f, 0, 255)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def patch_geometry(alpha, stage):
    """Centre, half-width, foot row and vertical radius of the grass patch."""
    rows = np.where(alpha.max(1) > 0.5)[0]
    bottom = rows.max()
    band = alpha[int(bottom - (bottom - rows.min()) * 0.06):bottom + 1] > 0.5
    cols = np.where(band.any(0))[0]
    cx, half = (cols.min() + cols.max()) / 2, max(8, (cols.max() - cols.min()) / 2)
    fy = bottom - (bottom - rows.min()) * FOOT_FROM_BOTTOM[stage]
    return cx, half, fy, half * 0.34


def key_canopy_gaps(rgb, alpha, bg, stage):
    """Background-coloured pixels above the patch lose their alpha: a pixel
    within KEY_NEAR of the fitted background is clear, beyond KEY_FAR it
    keeps what rembg gave it. Sunlit leaves are yellow and bark is brown, so
    both sit well clear of the grey-blue."""
    cx, half, fy, ry = patch_geometry(alpha, stage)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    keyed = np.minimum(alpha, smoothstep(KEY_NEAR, KEY_FAR, dist))
    above = (np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]][0] < fy - ry * 1.2)
    return np.where(above, keyed, alpha)


def feather_patch(alpha, stage):
    """Fades the rim of the painted grass patch: an ellipse around the foot,
    full strength inside FEATHER_INNER of the patch's half-width, gone at the
    rim. Only the patch's band is touched; the trunk and canopy above it
    are left alone."""
    h, w = alpha.shape
    cx, half, fy, ry = patch_geometry(alpha, stage)
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - cx) / half) ** 2 + ((yy - fy) / ry) ** 2)
    keep = 1 - smoothstep(FEATHER_INNER[stage], 1.0, d)
    # Blend in from just above the foot, so the trunk is never faded.
    weight = smoothstep(fy - ry * 1.2, fy - ry * 0.2, yy)
    return alpha * (1 - weight * (1 - keep))


# (colour quality, alpha quality), best first. A leafy edge makes the alpha
# a large share of the file, so both step down together.
LADDER = ((86, 90), (82, 90), (78, 85), (74, 80), (70, 75), (66, 70), (62, 65), (58, 60), (54, 60), (50, 55))


def save_webp(img, path, budget):
    for q, aq in LADDER:
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, alpha_quality=aq, method=6) if img.mode == "RGBA" else img.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= budget:
            path.write_bytes(buf.getvalue())
            return f"q{q}" + (f"/a{aq}" if img.mode == "RGBA" else ""), buf.tell()
    raise SystemExit(f"{path.name}: {buf.tell()} bytes at q{q}/a{aq}, over the {budget}-byte budget")


def cut_stage(session, src, stage):
    im = Image.open(src).convert("RGB")
    rgb = np.asarray(im).astype(np.float64)
    cut = remove(im, session=session, alpha_matting=True, alpha_matting_foreground_threshold=235,
                 alpha_matting_background_threshold=12, alpha_matting_erode_size=8, post_process_mask=True)
    alpha = np.asarray(cut)[..., 3].astype(np.float64) / 255
    bg = fit_background(rgb, alpha)
    alpha = key_canopy_gaps(rgb, alpha, bg, stage)
    fg = unmix(rgb, alpha, bg)
    alpha = feather_patch(alpha, stage)
    alpha[alpha < 0.015] = 0
    ys, xs = np.where(alpha > 0)
    pad = 4
    y0, y1 = max(0, ys.min() - pad), min(alpha.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(alpha.shape[1], xs.max() + pad + 1)
    rgba = np.dstack([fg, alpha * 255])[y0:y1, x0:x1]
    out = Image.fromarray(rgba.round().astype(np.uint8), "RGBA")
    target_h = round(2 * FULL_HEIGHT * MAX_PLATE_H * STAGE_CURVE[stage])
    if out.height > target_h:
        out = out.resize((round(out.width * target_h / out.height), target_h), Image.LANCZOS)
    # The foot: trunk base, centred over the patch, FOOT_FROM_BOTTOM up from the bottom.
    a = np.asarray(out)[..., 3] > 128
    rows = np.where(a.any(1))[0]
    bottom_cols = np.where(a[rows.max() - max(2, len(rows) // 16):rows.max() + 1].any(0))[0]
    foot_x = (bottom_cols.min() + bottom_cols.max()) / 2 / out.width
    foot_y = 1 - (out.height - 1 - rows.max() + (rows.max() - rows.min()) * FOOT_FROM_BOTTOM[stage]) / out.height
    return out, round(foot_x, 4), round(foot_y, 4)


def trace_path(src):
    """The path on the portrait plate, as rows of [y, left, right] in fractions
    of the plate. The tan pixels (red well above green, blue high; grass has
    little blue) that connect to the path at the bottom of the plate, where it
    is widest: following the connection keeps out patches of sunlit grass.
    Where the path doubles back, one height crosses it more than once and
    gets a row for each crossing."""
    from PIL import ImageFilter
    im = Image.open(src).convert("RGB").filter(ImageFilter.GaussianBlur(2))
    a = np.asarray(im).astype(int)
    h, w, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    tan = (r > g + 28) & (b > 105) & (r > 150)
    tan[:, : int(w * 0.08)] = False
    tan[:, int(w * 0.93):] = False
    # Flood fill on a quarter-size grid, from the widest run near the bottom.
    q = 4
    small = tan[: h // q * q, : w // q * q].reshape(h // q, q, w // q, q).mean((1, 3)) > 0.4
    sy = int(h * 0.9) // q
    xs = np.where(small[sy])[0]
    seed = (sy, int(xs[len(xs) // 2]))
    seen = np.zeros_like(small)
    stack = [seed]
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= small.shape[0] or x >= small.shape[1] or seen[y, x] or not small[y, x]:
            continue
        seen[y, x] = True
        # Two cells in every direction, so a thin stretch of path stays connected.
        stack += [(y + dy, x + dx) for dy in (-2, -1, 0, 1, 2) for dx in (-2, -1, 0, 1, 2) if dy or dx]
    rows = []
    for y in range(int(h * 0.155) // q, int(h * 0.93) // q, 2):
        xs = np.where(seen[y])[0]
        if not len(xs):
            continue
        start = last = xs[0]
        runs = []
        for x in xs[1:]:
            if x - last > 3:
                runs.append((start, last))
                start = x
            last = x
        runs.append((start, last))
        for x0, x1 in runs:
            rows.append([round(y * q / h, 4), round(float(x0 * q) / w, 4), round(float((x1 + 1) * q) / w, 4)])
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", help="folder holding the stage paintings")
    ap.add_argument("--species", default="oak")
    ap.add_argument("--plate", action="append", default=[], help="scene plate to convert to WebP: SRC, or SRC=DEST (DEST relative to the repo)")
    ap.add_argument("--plates-only", action="store_true", help="convert the plates and leave the trees alone")
    ap.add_argument("--path-plate", help="portrait plate to trace the path on; writes app/lib/scene-path.js")
    args = ap.parse_args()

    if args.path_plate:
        rows = trace_path(Path(args.path_plate).expanduser())
        (REPO / "app" / "lib" / "scene-path.js").write_text(
            "// Written by scripts/cutout-trees.py; don't edit by hand. The path on the\n"
            "// portrait plate: rows of [y, left edge, right edge], as fractions of the\n"
            "// plate's height and width, top to bottom.\n"
            "export const PORTRAIT_PATH = [\n" + "".join(f"  {json.dumps(row)},\n" for row in rows) + "];\n")
        print(f"scene-path.js  {len(rows)} rows, y {rows[0][0]} to {rows[-1][0]}")

    for spec in args.plate:
        src, _, dest = spec.partition("=")
        src = Path(src).expanduser()
        dest = REPO / dest if dest else src.with_name("meadow.webp")
        plate = Image.open(src).convert("RGB")
        q, size = save_webp(plate, dest, PLATE_BUDGET)
        print(f"{dest.name}  {plate.width}x{plate.height}  {q}  {size / 1000:.0f}KB")
    if args.plates_only:
        return

    out_dir = REPO / "public" / "scenes" / args.species
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = REPO / "app" / "lib" / "scene-art.js"
    marker = "export const SCENE_ART = "
    manifest = json.loads(manifest_path.read_text().split(marker, 1)[1].rstrip().rstrip(";")) if manifest_path.exists() else {}
    session = new_session("isnet-general-use")
    stages = []
    for stage, name in sorted(SOURCES[args.species].items()):
        img, fx, fy = cut_stage(session, Path(args.src).expanduser() / name, stage)
        q, size = save_webp(img, out_dir / f"stage-{stage}.webp", TREE_BUDGET)
        stages.append({"w": img.width, "h": img.height, "footX": fx, "footY": fy})
        print(f"stage-{stage}.webp  {name:6} {img.width}x{img.height}  foot {fx},{fy}  {q}  {size / 1000:.0f}KB")
    manifest[args.species] = stages
    manifest_path.write_text(
        "// Written by scripts/cutout-trees.py; don't edit by hand. Per species, per\n"
        "// stage (0 Planted ... 7 Full grown): the cut-out's pixel size and its foot,\n"
        "// the point that stands on an anchor, as fractions of width and height.\n"
        + marker + json.dumps(manifest, indent=2) + ";\n")


if __name__ == "__main__":
    main()
