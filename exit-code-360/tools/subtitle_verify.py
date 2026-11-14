#!/usr/bin/env python3
"""Final verification of the subtitled master.

1. Specs of the subtitled MP4 = original (codec, 1920×1080, 30 fps CFR, 13,192 frames, duration).
2. Audio stream bit-identical to the original (packet MD5 of the copied AAC stream).
3. Original master unchanged (SHA-256 recorded before the job).
4. Burn-in sync, every frame: both videos are decoded side by side (480×270 luma) and a frame
   "has a subtitle" when a cluster of pixels differs strongly from the original. The on/off
   frame ranges found in the picture are compared with the cue list (exact frame match).
5. Cue/timing rules from renders/subtitles/cues.json: no overlaps, each cue covers its speech,
   ≤ 2 lines, ≤ 42 characters per line, reading speed.

Usage: python3 tools/subtitle_verify.py <original.mp4> <subtitled.mp4> <expected_sha256>
"""
import hashlib
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
W, H = 480, 270


def probe(p):
    r = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", p], capture_output=True, text=True).stdout)
    v = next(s for s in r["streams"] if s["codec_type"] == "video")
    a = next(s for s in r["streams"] if s["codec_type"] == "audio")
    return {"codec": v["codec_name"], "profile": v.get("profile"), "w": v["width"], "h": v["height"], "fps": v["r_frame_rate"], "avg_fps": v["avg_frame_rate"],
            "pix_fmt": v["pix_fmt"], "frames": int(v["nb_read_frames"]), "v_dur": float(v["duration"]), "a_codec": a["codec_name"], "a_rate": a["sample_rate"],
            "a_ch": a["channels"], "a_dur": float(a["duration"]), "size_mb": round(os.path.getsize(p) / 1e6, 1), "v_kbps": round(int(v.get("bit_rate", 0)) / 1000)}


def audio_md5(p):
    return subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-map", "0:a", "-c", "copy", "-f", "md5", "-"], capture_output=True, text=True).stdout.strip()


def frame_stream(p):
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", p, "-vf", f"scale={W}:{H}:flags=area,format=gray", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    n = W * H
    while True:
        b = proc.stdout.read(n)
        if len(b) < n:
            break
        yield np.frombuffer(b, dtype=np.uint8).astype(np.int16)


def main():
    orig, subd, sha = sys.argv[1:4]
    rep, issues = {}, []
    rep["original_sha256_unchanged"] = hashlib.sha256(open(orig, "rb").read()).hexdigest() == sha
    if not rep["original_sha256_unchanged"]:
        issues.append("original master changed")
    po, ps = probe(orig), probe(subd)
    rep["original"], rep["subtitled"] = po, ps
    for k in ("codec", "w", "h", "fps", "avg_fps", "pix_fmt", "frames", "a_codec", "a_rate", "a_ch"):
        if po[k] != ps[k]:
            issues.append(f"spec {k}: {po[k]} → {ps[k]}")
    if abs(po["v_dur"] - ps["v_dur"]) > 1e-3 or abs(po["a_dur"] - ps["a_dur"]) > 1e-3:
        issues.append("duration changed")
    rep["audio_bit_identical"] = audio_md5(orig) == audio_md5(subd)
    if not rep["audio_bit_identical"]:
        issues.append("audio stream differs")

    # ---- per-frame subtitle presence
    present = []
    for a, b in zip(frame_stream(orig), frame_stream(subd)):
        d = np.abs(a - b)
        present.append(int((d > 60).sum()))
    present = np.array(present)
    on = present > 25  # a subtitle line at 480×270 changes hundreds of pixels; encode noise ~0
    C = json.load(open(os.path.join(ROOT, "renders/subtitles/cues.json")))
    expect = np.zeros(len(on), dtype=bool)
    for c in C:
        expect[int(round(c["in"] * FPS)): int(round(c["out"] * FPS))] = True
    mism = np.nonzero(on != expect)[0]
    rep["frames_checked"] = int(len(on))
    rep["frames_with_subtitle"] = int(on.sum())
    rep["frames_expected"] = int(expect.sum())
    rep["frame_mismatches"] = int(len(mism))
    rep["mismatch_frames_first"] = [int(x) for x in mism[:20]]
    rep["noise_max_off_frames"] = int(present[~expect].max()) if (~expect).any() else 0
    rep["signal_min_on_frames"] = int(present[expect].min()) if expect.any() else 0
    if len(mism):
        issues.append(f"{len(mism)} frames where on-screen subtitles differ from the cue list")

    # ---- cue rules
    P = json.load(open(os.path.join(ROOT, "src/data/narration_phrases.json")))["phrases"]
    bad = []
    for k, c in enumerate(C):
        if k + 1 < len(C) and c["out"] > C[k + 1]["in"] - 1 / FPS - 1e-6:
            bad.append(f"cue {k + 1} overlaps / touches next")
        if c["in"] > c["speech"][0] + 0.034 or c["out"] < c["speech"][1] - 1e-6:
            bad.append(f"cue {k + 1} does not cover its speech")
        if len(c["lines"]) > 2 or max(len(l) for l in c["lines"]) > 42:
            bad.append(f"cue {k + 1} layout")
    cps = [len(" ".join(c["lines"])) / (c["out"] - c["in"]) for c in C]
    rep["cues"] = len(C)
    rep["cue_rule_violations"] = bad
    rep["reading_speed_cps"] = {"median": round(float(np.median(cps)), 1), "p95": round(float(np.percentile(cps, 95)), 1), "max": round(max(cps), 1)}
    rep["speech_coverage"] = f"{P[0]['start']:.2f}–{P[-1]['end']:.2f} s"
    issues += bad
    rep["issues"] = issues
    json.dump(rep, open(os.path.join(ROOT, "renders/subtitles/verify_report.json"), "w"), indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main()
