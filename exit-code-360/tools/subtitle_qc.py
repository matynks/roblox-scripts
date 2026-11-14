#!/usr/bin/env python3
"""Subtitle QC for EXIT CODE 360.

zones  — measure the subtitle zone (x 300–1620, y 860–1026) in the ORIGINAL frames behind every cue
         (3 samples per cue): mean luma, share of bright pixels (eyes, labels, paper), texture.
         Written to renders/subtitles/zone_metrics.json; tools/subtitles.py uses it to switch on the
         semi-transparent backing only where the background needs it.
sheets — burn the current ASS onto the cue mid-frames and tile the lower half of every frame
         (cue number, time) into review sheets: renders/subtitles/review/sheet_XX.jpg

Usage: python3 tools/subtitle_qc.py zones|sheets [video]
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30


def frames_for(cues, qs):
    return [[int(round((c["in"] + (c["out"] - c["in"]) * q) * FPS)) for q in qs] for c in cues]


def decode(video, frames, vf_pre="", size=(960, 540), gray=False):
    uniq = sorted(set(frames))
    sel = "+".join(f"eq(n\\,{f})" for f in uniq)
    vf = (vf_pre + "," if vf_pre else "") + f"select='{sel}',scale={size[0]}:{size[1]}" + (",format=gray" if gray else ",format=rgb24")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", vf, "-vsync", "vfr", "-f", "rawvideo", "-"], capture_output=True, cwd=ROOT).stdout
    ch = 1 if gray else 3
    arr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, size[1], size[0], ch) if ch == 3 else np.frombuffer(raw, dtype=np.uint8).reshape(-1, size[1], size[0])
    assert len(arr) == len(uniq), (len(arr), len(uniq))
    return {f: arr[i] for i, f in enumerate(uniq)}


def zones(video):
    C = json.load(open(os.path.join(ROOT, "renders/subtitles/cues.json")))
    fs = frames_for(C, (0.25, 0.5, 0.75))
    F = decode(video, [f for x in fs for f in x], gray=True)
    out = {}
    for c, f3 in zip(C, fs):
        z = np.stack([F[f][430:513, 150:810].astype(np.float32) for f in f3])
        out[f"{c['in']:.2f}"] = {"mean": round(float(z.mean()), 1), "bright": round(float((z > 150).mean() * 100), 2), "tex": round(float(np.abs(np.diff(z, axis=2)).mean()), 2)}
    json.dump(out, open(os.path.join(ROOT, "renders/subtitles/zone_metrics.json"), "w"), indent=1)
    print(f"zone metrics for {len(out)} cues")


def sheets(video):
    C = json.load(open(os.path.join(ROOT, "renders/subtitles/cues.json")))
    mids = [x[0] for x in frames_for(C, (0.5,))]
    ass = "ass=subtitles/EXIT_CODE_360_EN.ass:fontsdir=renders/subtitles/fonts"
    F = decode(video, mids, vf_pre=ass)
    d = os.path.join(ROOT, "renders/subtitles/review")
    os.makedirs(d, exist_ok=True)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
    tiles = []
    for k, (c, f) in enumerate(zip(C, mids), 1):
        im = Image.fromarray(F[f]).crop((0, 250, 960, 540)).resize((480, 145))
        dr = ImageDraw.Draw(im)
        dr.rectangle([0, 0, 92, 19], fill=(0, 0, 0))
        dr.text((3, 1), f"{k} {c['in']:.1f}", fill=(255, 220, 0), font=font)
        tiles.append(im)
    per = 30
    for s in range(0, len(tiles), per):
        group = tiles[s:s + per]
        sheet = Image.new("RGB", (3 * 480 + 8, ((len(group) + 2) // 3) * 149), (40, 40, 40))
        for i, t in enumerate(group):
            sheet.paste(t, ((i % 3) * 484, (i // 3) * 149))
        sheet.save(os.path.join(d, f"sheet_{s // per:02d}.jpg"), quality=88)
    print(f"{len(tiles)} cues → {(len(tiles) + per - 1) // per} sheets in {d}")


if __name__ == "__main__":
    mode = sys.argv[1]
    video = sys.argv[2] if len(sys.argv) > 2 else "renders/EXIT_CODE_360_FULL.mp4"
    {"zones": zones, "sheets": sheets}[mode](video)
