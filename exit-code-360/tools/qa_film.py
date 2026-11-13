#!/usr/bin/env python3
"""Full-film QC for EXIT CODE 360.

1. Specs: H.264 / yuv420p / 1920×1080 / 30 fps CFR / AAC stereo; frame count
   and duration against the composition (13192 frames).
2. Frame continuity: every PTS step is exactly one frame (no drops or dupes,
   including at the 600-frame segment joins).
3. Picture: black stretches, frozen stretches, hard cuts (listed with the
   nearest scene boundary), and one-frame blips (a frame unlike both neighbours
   whose neighbours match each other) = glitch candidates.
4. Audio: sync of the muxed AAC vs the master mix at 8 points across the film
   (cross-correlation), duration, per-channel peak, integrated loudness.
5. Review sheets: one contact sheet per scene (3 fps) in <outdir>/sheets.

Usage: python3 tools/qa_film.py renders/EXIT_CODE_360_FULL.mp4 public/audio/film_mix.wav renders/qa/film
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
FRAMES = int(os.environ.get("QA_FRAMES", 13192))
SR = 44100


def run(cmd, text=True):
    return subprocess.run(cmd, capture_output=True, text=text)


def scene_table():
    src = open(os.path.join(ROOT, "src/film/scenes/index.ts")).read()
    return [(m.group(1), float(m.group(2))) for m in re.finditer(r'id: "([^"]+)", t0: ([\d.]+)', src)]


def main():
    mp4, ref_wav, outdir = sys.argv[1:4]
    os.makedirs(os.path.join(outdir, "sheets"), exist_ok=True)
    rep = {"file": os.path.relpath(mp4, ROOT), "size_mb": round(os.path.getsize(mp4) / 1e6, 1)}
    issues = []

    # ---- 1. specs
    pr = json.loads(run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", mp4]).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    a = next(s for s in pr["streams"] if s["codec_type"] == "audio")
    rep["video"] = {k: v.get(k) for k in ("codec_name", "profile", "width", "height", "display_aspect_ratio", "r_frame_rate", "avg_frame_rate", "pix_fmt", "nb_read_frames", "duration", "bit_rate")}
    rep["audio"] = {k: a.get(k) for k in ("codec_name", "profile", "sample_rate", "channels", "bit_rate", "duration")}
    rep["format_duration"] = float(pr["format"]["duration"])
    expect = {"codec_name": "h264", "width": 1920, "height": 1080, "r_frame_rate": "30/1", "pix_fmt": "yuv420p"}
    for k, val in expect.items():
        if v.get(k) != val:
            issues.append(f"video {k} = {v.get(k)} (expected {val})")
    if int(v["nb_read_frames"]) != FRAMES:
        issues.append(f"frame count {v['nb_read_frames']} != {FRAMES}")
    if a.get("codec_name") != "aac" or int(a.get("channels", 0)) != 2:
        issues.append("audio is not stereo AAC")

    # ---- 2. PTS continuity
    pts = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time", "-of", "csv=p=0", mp4]).stdout.split()
    p = np.sort(np.array([float(x) for x in pts if x and x != "N/A"]))
    d = np.diff(p)
    bad = np.nonzero(np.abs(d - 1 / FPS) > 0.25 / FPS)[0]
    rep["pts"] = {"packets": len(p), "first": float(p[0]), "last": float(p[-1]), "irregular_steps": len(bad)}
    if len(bad):
        issues.append(f"{len(bad)} irregular PTS steps, first at {p[bad[0]]:.3f}s")

    # ---- 3. picture analysis on 96×54 luma
    raw = run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", "scale=96:54:flags=area,format=gray", "-f", "rawvideo", "-"], text=False).stdout
    fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 54, 96).astype(np.float32)
    n = len(fr)
    luma = fr.mean((1, 2))
    diff = np.abs(np.diff(fr, axis=0)).mean((1, 2))  # diff[i] = |f[i+1] − f[i]|
    skip = np.abs(fr[2:] - fr[:-2]).mean((1, 2))  # |f[i+2] − f[i]|
    # one-frame blip at i+1: unlike both neighbours, neighbours alike
    blips = [i + 1 for i in range(n - 2) if diff[i] > 6 and diff[i + 1] > 6 and skip[i] < 0.35 * min(diff[i], diff[i + 1])]
    rep["one_frame_blips"] = [round(b / FPS, 3) for b in blips]
    if blips:
        issues.append(f"{len(blips)} one-frame blip(s) at {rep['one_frame_blips'][:10]}")
    # black: mean luma < 6 for > 3 frames
    dark = luma < 6
    blacks, i = [], 0
    while i < n:
        if dark[i]:
            j = i
            while j < n and dark[j]:
                j += 1
            if j - i > 3:
                blacks.append((round(i / FPS, 2), round(j / FPS, 2)))
            i = j
        else:
            i += 1
    rep["black_stretches"] = blacks
    # intended dips: S18 "no off switch" fades to night before Mia's scene (212.45 dissolve)
    intended = [(211.8, 212.9)]
    for s, e in blacks:
        if not (s < 0.1 or e > FRAMES / FPS - 0.1 or any(a <= s and e <= b for a, b in intended)):
            issues.append(f"unexpected black {s}-{e}s")
    # frozen: < 0.15 mean abs change for > 1.5 s
    still = diff < 0.15
    frozen, i = [], 0
    while i < len(still):
        if still[i]:
            j = i
            while j < len(still) and still[j]:
                j += 1
            if j - i > 45:
                frozen.append((round(i / FPS, 2), round(j / FPS, 2)))
            i = j
        else:
            i += 1
    rep["frozen_over_1_5s"] = frozen
    # hard cuts, with nearest scene boundary
    scenes = scene_table()
    cuts = [round((i + 1) / FPS, 3) for i in np.nonzero(diff > 9)[0]]
    rep["hard_cuts"] = [{"t": c, "nearest_scene": min(scenes, key=lambda s: abs(s[1] - c))[0]} for c in cuts]
    rep["segment_join_diffs"] = {f"{k * 600}": round(float(diff[k * 600 - 1]), 2) for k in range(1, (n - 1) // 600 + 1)}
    rep["median_frame_diff"] = round(float(np.median(diff)), 3)

    # ---- 4. audio
    raw = run(["ffmpeg", "-v", "error", "-i", mp4, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], text=False).stdout
    dec = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    ref, sr = sf.read(ref_wav, dtype="float32")
    rep["decoded_audio_seconds"] = round(len(dec) / SR, 4)
    rep["master_mix_seconds"] = round(len(ref) / sr, 4)
    dm, rm = dec.mean(1), ref.mean(1)
    offs = []
    for t in [t for t in (5, 60, 120, 180, 240, 300, 360, 420) if t < len(ref) / sr - 3]:
        a0 = int(t * SR)
        seg_r = rm[a0 + 2205: a0 + SR * 2 - 2205]
        seg_d = dm[a0: a0 + SR * 2]
        c = np.correlate(seg_d, seg_r, mode="valid")
        offs.append({"t": t, "offset_ms": round((int(np.argmax(c)) - 2205) / SR * 1000, 2), "corr": round(float(c.max() / (np.linalg.norm(seg_r) * np.linalg.norm(seg_d[np.argmax(c): np.argmax(c) + len(seg_r)]) + 1e-9)), 3)})
    rep["audio_sync_vs_master"] = offs
    if any(abs(o["offset_ms"]) > 22 for o in offs):  # AAC priming is ≈ 0; flag > ⅔ frame
        issues.append(f"audio offset vs master: {[o['offset_ms'] for o in offs]}")
    rep["decoded_peak_dbfs"] = [round(float(20 * np.log10(np.abs(dec[:, c]).max() + 1e-9)), 2) for c in (0, 1)]
    eb = run(["ffmpeg", "-nostats", "-i", mp4, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    eb = eb[eb.rfind("Summary:"):]
    m = re.search(r"I:\s+(-?[\d.]+) LUFS.*?LRA:\s+([\d.]+) LU.*?Peak:\s+(-?[\d.]+) dBFS", eb, re.S)
    if m:
        rep["loudness"] = {"integrated_lufs": float(m.group(1)), "lra_lu": float(m.group(2)), "true_peak_dbtp": float(m.group(3))}
    if abs(rep["decoded_audio_seconds"] - FRAMES / FPS) > 0.05:
        issues.append(f"audio duration {rep['decoded_audio_seconds']} vs picture {FRAMES / FPS:.3f}")

    # ---- 5. contact sheets per scene (3 fps, 8 columns)
    for k, (name, t0) in enumerate(scenes):
        t1 = scenes[k + 1][1] if k + 1 < len(scenes) else FRAMES / FPS
        rows = int(np.ceil((t1 - t0) * 3 / 8))
        slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.3f}", "-i", mp4, "-t", f"{t1 - t0:.3f}", "-vf", f"fps=3,scale=320:-1,tile=8x{rows}", "-frames:v", "1", "-q:v", "4", os.path.join(outdir, "sheets", f"{k:02d}_{slug}.jpg")])

    rep["issues"] = issues
    json.dump(rep, open(os.path.join(outdir, "qa_film.json"), "w"), indent=1)
    print(json.dumps({k: rep[k] for k in rep if k not in ("hard_cuts",)}, indent=1))
    print(f"hard cuts: {len(rep['hard_cuts'])}")


if __name__ == "__main__":
    main()
