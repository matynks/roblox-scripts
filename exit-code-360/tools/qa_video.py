#!/usr/bin/env python3
"""Automated QA for a rendered MP4.

Checks: container/stream specs, duration vs expected, black frames,
frozen stretches, audio alignment against the reference mix (cross-correlation),
narration loudness, and extracts motion strips for manual review.

Usage: python3 tools/qa_video.py renders/EXIT_CODE_360_POC_v2.mp4 public/audio/poc_mix.wav renders/qa/video
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    mp4, ref_wav, outdir = sys.argv[1:4]
    os.makedirs(outdir, exist_ok=True)
    rep = {}
    pr = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", mp4]).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    a = next(s for s in pr["streams"] if s["codec_type"] == "audio")
    rep["video"] = {k: v.get(k) for k in ("codec_name", "profile", "width", "height", "r_frame_rate", "pix_fmt", "nb_frames", "duration")}
    rep["audio"] = {k: a.get(k) for k in ("codec_name", "sample_rate", "channels", "bit_rate", "duration")}
    rep["format_duration"] = pr["format"]["duration"]

    # black frames (intended: fade-in at start and fade-out at the end only)
    bd = run(["ffmpeg", "-i", mp4, "-vf", "blackdetect=d=0.05:pic_th=0.97:pix_th=0.06", "-an", "-f", "null", "-"]).stderr
    rep["black_segments"] = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", bd)
    # frozen stretches longer than 1.0 s (would indicate a static hold)
    fd = run(["ffmpeg", "-i", mp4, "-vf", "freezedetect=n=0.0008:d=1.0", "-an", "-f", "null", "-"]).stderr
    rep["frozen_segments"] = re.findall(r"freeze_start: ([\d.]+)", fd)

    # audio alignment: decode MP4 audio, compare with reference mix
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-f", "f32le", "-ac", "1", "-ar", "44100", "-"], capture_output=True).stdout
    dec = np.frombuffer(raw, dtype=np.float32)
    ref, sr = sf.read(ref_wav, dtype="float32")
    ref = ref.mean(axis=1) if ref.ndim == 2 else ref
    n = min(len(dec), len(ref), sr * 10)
    seg_d = dec[sr * 2: sr * 2 + n // 2]
    seg_r = ref[sr * 2: sr * 2 + n // 2]
    corr = np.correlate(seg_d[: sr * 2], seg_r[2000: sr * 2 - 2000], mode="valid")
    lag = int(np.argmax(corr)) - 2000
    rep["audio_offset_samples_vs_mix"] = lag
    rep["audio_offset_ms"] = round(lag / sr * 1000, 2)
    rep["decoded_audio_seconds"] = round(len(dec) / sr, 3)
    rep["decoded_peak_dbfs"] = round(20 * np.log10(np.abs(dec).max() + 1e-9), 2)

    # motion strips for manual review (10 fps)
    strips = {
        "walk_and_dodge": (0.3, 5.0),
        "flip_and_shrug": (7.9, 9.5),
        "gull_snap": (11.4, 13.4),
        "push_transition": (15.0, 16.4),
    }
    for name, (t0, t1) in strips.items():
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(t0), "-i", mp4, "-t", str(t1 - t0), "-vf", "fps=10,scale=384:-1,tile=8x6", "-frames:v", "1", os.path.join(outdir, f"strip_{name}.jpg")])
    json.dump(rep, open(os.path.join(outdir, "qa_report.json"), "w"), indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main()
