#!/usr/bin/env python3
"""Narration-clarity QA for the film mix.

Compares short-term (200 ms) RMS of the narration against everything else
(music + beds + SFX, read from renders/qa/stems_film) wherever the voice is
active, and lists every moment where the background comes within MARGIN dB of
the voice. Also prints a per-scene level table.

Usage: python3 tools/qa_audio.py [margin_db=8]
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
MARGIN = float(sys.argv[1]) if len(sys.argv) > 1 else 8.0
WIN = int(0.2 * SR)


def blocks_rms(x):
    n = len(x) // WIN
    return np.sqrt((x[: n * WIN].reshape(n, WIN) ** 2).mean(1)) + 1e-9


def dbv(x):
    return 20 * np.log10(x)


def main():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "public/audio/narration.mp3"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    narr = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    stems = {k: sf.read(os.path.join(ROOT, f"renders/qa/stems_film/{k}.wav"))[0].mean(1) for k in ("music", "beds", "sfx")}
    T = len(stems["music"])
    nr = np.zeros(T)
    nr[: len(narr)] = narr
    v = blocks_rms(nr)
    bg = {k: blocks_rms(x) for k, x in stems.items()}
    other = blocks_rms(sum(stems.values()))
    active = dbv(v) > -32
    gap = dbv(v) - dbv(other)
    bad = np.nonzero(active & (gap < MARGIN))[0]
    print(f"voice-active blocks: {active.sum()} of {len(v)}; background within {MARGIN} dB of voice: {len(bad)}")
    for i in bad:
        loud = max(bg, key=lambda k: bg[k][i])
        print(f"  {i * 0.2:7.1f}s  voice {dbv(v[i]):6.1f}  bg {dbv(other[i]):6.1f}  (gap {gap[i]:4.1f} dB, mostly {loud})")
    print(f"median gap voice→background while speaking: {np.median(gap[active]):.1f} dB; 5th percentile {np.percentile(gap[active], 5):.1f} dB")

    src = open(os.path.join(ROOT, "src/film/scenes/index.ts")).read()
    scenes = [(m.group(1), float(m.group(2))) for m in re.finditer(r'id: "([^"]+)", t0: ([\d.]+)', src)]
    rows = []
    for (name, t0), nxt in zip(scenes, scenes[1:] + [("end", T / SR)]):
        a, b = int(t0 / 0.2), int(nxt[1] / 0.2)
        sl = slice(a, b)
        act = active[sl]

        def lvl(x):
            return round(float(dbv(np.sqrt((x[sl] ** 2).mean()))), 1)

        rows.append({"scene": name, "t0": t0, "voice": lvl(v), "music": lvl(bg["music"]), "beds": lvl(bg["beds"]), "sfx": lvl(bg["sfx"]), "min_gap_speaking": round(float(gap[sl][act].min()), 1) if act.any() else None})
    print(f"{'scene':28s} {'voice':>6s} {'music':>6s} {'beds':>6s} {'sfx':>6s} {'min gap':>8s}")
    for r in rows:
        print(f"{r['scene']:28s} {r['voice']:6.1f} {r['music']:6.1f} {r['beds']:6.1f} {r['sfx']:6.1f} {str(r['min_gap_speaking']):>8s}")
    json.dump({"margin_db": MARGIN, "flagged": [round(i * 0.2, 1) for i in bad], "scenes": rows}, open(os.path.join(ROOT, "renders/qa/audio_clarity.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
