#!/usr/bin/env python3
"""QC for the YouTube Shorts teaser.

Checks: H.264 / yuv420p / 1080×1920 / 30 fps CFR / 900 frames / 30.000 s; AAC stereo;
PTS continuity; one-frame blips; black stretches (only the planned crash black);
every detected cut lands on a planned edit point (src/teaser/shots.json); A/V sync vs the
master teaser mix; loudness; contact sheet with the Shorts UI zones overlaid.

Usage: python3 tools/qa_teaser.py renders/teaser/EXIT_CODE_360_TEASER_SHORTS.mp4 public/audio/teaser_mix.wav renders/teaser/qa
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = json.load(open(os.path.join(ROOT, "src/teaser/shots.json")))
FPS, FRAMES, W, H, SR = 30, SHOTS["frames"], 1080, 1920, 44100


def run(cmd, text=True):
    return subprocess.run(cmd, capture_output=True, text=text)


def main():
    mp4, ref, outdir = sys.argv[1:4]
    os.makedirs(outdir, exist_ok=True)
    rep, issues = {"size_mb": round(os.path.getsize(mp4) / 1e6, 1)}, []
    pr = json.loads(run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", mp4]).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    a = next(s for s in pr["streams"] if s["codec_type"] == "audio")
    rep["video"] = {k: v.get(k) for k in ("codec_name", "profile", "width", "height", "r_frame_rate", "avg_frame_rate", "pix_fmt", "nb_read_frames", "duration", "bit_rate")}
    rep["audio"] = {k: a.get(k) for k in ("codec_name", "profile", "sample_rate", "channels", "bit_rate", "duration")}
    rep["format_duration"] = float(pr["format"]["duration"])
    for k, val in {"codec_name": "h264", "width": W, "height": H, "r_frame_rate": "30/1", "pix_fmt": "yuv420p"}.items():
        if v.get(k) != val:
            issues.append(f"video {k}={v.get(k)} expected {val}")
    if int(v["nb_read_frames"]) != FRAMES or abs(float(v["duration"]) - FRAMES / FPS) > 1e-3:
        issues.append(f"frames/duration {v['nb_read_frames']}/{v['duration']}")
    if a.get("codec_name") != "aac" or int(a["channels"]) != 2:
        issues.append("audio not stereo AAC")

    pts = np.array(sorted(float(x) for x in run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time", "-of", "csv=p=0", mp4]).stdout.split() if x and x != "N/A"))
    bad = np.nonzero(np.abs(np.diff(pts) - 1 / FPS) > 0.25 / FPS)[0]
    rep["pts"] = {"packets": len(pts), "first": float(pts[0]), "last": float(pts[-1]), "irregular_steps": int(len(bad))}
    if len(bad):
        issues.append(f"{len(bad)} irregular PTS steps")

    raw = run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", "scale=54:96:flags=area,format=gray", "-f", "rawvideo", "-"], text=False).stdout
    fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 96, 54).astype(np.float32)
    d = np.abs(np.diff(fr, axis=0)).mean((1, 2))
    skip = np.abs(fr[2:] - fr[:-2]).mean((1, 2))
    planned = sorted({s["f0"] for s in SHOTS["shots"]} | {s["f1"] for s in SHOTS["shots"]})
    near_cut = lambda f: any(abs(f - p) <= 1 for p in planned)  # noqa: E731
    blips = [int(i) + 1 for i in range(len(fr) - 2) if d[i] > 6 and d[i + 1] > 6 and skip[i] < 0.35 * min(d[i], d[i + 1]) and not near_cut(i + 1)]
    rep["one_frame_blips"] = blips
    if blips:
        issues.append(f"one-frame blips at frames {blips}")
    cuts = [int(i) + 1 for i in np.nonzero(d > 9)[0]]
    unplanned = [c for c in cuts if not near_cut(c)]
    rep["detected_cuts"] = cuts
    rep["cuts_off_plan"] = unplanned
    lum = fr.mean((1, 2))
    dark = [int(i) for i in range(len(lum)) if lum[i] < 4]
    rep["black_frames"] = [dark[0], dark[-1]] if dark else []
    black_shot = next(s for s in SHOTS["shots"] if s.get("layout") == "black")
    if dark and (dark[0] < black_shot["f0"] or dark[-1] >= black_shot["f1"] + 1):
        issues.append(f"black outside the planned crash cut: {dark[:5]}…")

    dec = np.frombuffer(run(["ffmpeg", "-v", "error", "-i", mp4, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], text=False).stdout, dtype=np.float32).reshape(-1, 2)
    m, sr = sf.read(ref, dtype="float32")
    rep["decoded_audio_seconds"] = round(len(dec) / SR, 4)
    rep["master_seconds"] = round(len(m) / sr, 4)
    dm, rm = dec.mean(1), m.mean(1)
    sync = []
    for t in (2, 8, 14, 20, 26):
        a0 = int(t * SR)
        seg_r = rm[a0 + 2205: a0 + SR - 2205]
        c = np.correlate(dm[a0: a0 + SR], seg_r, mode="valid")
        sync.append({"t": t, "offset_ms": round((int(np.argmax(c)) - 2205) / SR * 1000, 2)})
    rep["audio_sync_vs_master"] = sync
    if any(abs(s["offset_ms"]) > 5 for s in sync):
        issues.append(f"A/V offset {sync}")
    eb = run(["ffmpeg", "-nostats", "-i", mp4, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    eb = eb[eb.rfind("Summary:"):]
    mm = re.search(r"I:\s+(-?[\d.]+) LUFS.*?LRA:\s+([\d.]+) LU.*?Peak:\s+(-?[\d.]+) dBFS", eb, re.S)
    rep["loudness"] = {"integrated_lufs": float(mm.group(1)), "lra_lu": float(mm.group(2)), "true_peak_dbtp": float(mm.group(3))}
    if rep["loudness"]["true_peak_dbtp"] > -0.9:
        issues.append("true peak above -1 dBTP")

    # contact sheet (4 fps) with Shorts UI zones: top bar, right action column, bottom title/channel overlay
    run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vf",
         "fps=4,scale=216:384,drawbox=x=0:y=0:w=216:h=46:color=red@0.25:t=fill,drawbox=x=188:y=180:w=28:h=160:color=red@0.25:t=fill,"
         "drawbox=x=0:y=300:w=216:h=84:color=red@0.25:t=fill,tile=15x8", "-frames:v", "1", "-q:v", "3", os.path.join(outdir, "contact_4fps.jpg")])
    rep["issues"] = issues
    json.dump(rep, open(os.path.join(outdir, "qa_teaser.json"), "w"), indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main()
