#!/usr/bin/env python3
"""EXIT CODE 360 — mystery teaser v2 soundtrack  →  public/audio/teaser_mystery_mix.wav

Exactly 30.000 s (1,323,000 samples, 44.1 kHz stereo). Same rules as tools/teaser_mix.py:
narration lines are sample-exact slices of the approved MP3 (cut only in silence), the film's
own SFX/ambience buses are sliced at the film times the picture shows, plus a new mystery cue
(braam hook, ticking pulse, heartbeat build, hard stop at the crash, eerie phone bed, ring
sweep and title hit) built from the film's instrument library.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio_lib as A  # noqa: E402
from audio_lib import SR, db, norm  # noqa: E402
import score as S  # noqa: E402
from teaser_mix import Bus2, edge, hit, voice_activity  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, "src/teaser/mystery.json")))
FPS = D["fps"]
NT = int(round(D["frames"] / FPS * SR))
assert NT == 1323000


def fr(f):
    return f / FPS


def braam(dur=2.4, f=36.71):
    """low brass-like trailer hit: detuned saws + sub, lowpassed, slow decay"""
    t = A.tt(dur)
    x = np.zeros(len(t))
    for det in (0.995, 1.0, 1.006):
        ph = 2 * np.pi * f * det * t
        x += sum(np.sin(k * ph) / k for k in range(1, 12))
    x = A.lowpass(x, 900) * 0.5 + np.sin(2 * np.pi * f / 2 * t) * 0.8
    env = np.clip(t / 0.02, 0, 1) * np.exp(-t / (dur * 0.38))
    return A.reverb(x * env, 2.0, 0.35, 3000)


def music():
    tr = S.Track(NT)
    # --- hook: braam on frame 0, impact on the first cut
    tr.put(braam(2.6), 0.0, 0)
    tr.put(S.drone(S.hz("D2"), 9.0) * 0.4, 0.3, -3)
    # --- curious pulse 0.47–8.67: bass ostinato + clock tick (100 BPM) + sparse bell notes
    beat = 0.6
    bass = [S.hz(n) for n in ("D2", "D2", "F2", "E2")]
    for i, tt in enumerate(np.arange(0.47, 8.6, beat / 2)):
        tr.put(S.pluck(bass[(i // 2) % 4], 0.35, 0.3) * 0.5, tt, 0, -0.1)
    for i, tt in enumerate(np.arange(0.47, 8.6, beat)):
        tr.put(S.pluck(S.hz("A5"), 0.08, 0.9) * (0.22 if i % 2 else 0.3), tt, 0, 0.35 if i % 2 else -0.35)
    for tt, n in [(1.4, "A4"), (2.6, "F5"), (3.9, "E5"), (5.3, "D5"), (6.6, "C5"), (7.8, "A4")]:
        tr.put(A.reverb(S.piano(S.hz(n), 1.8, 0.5), 1.6, 0.5), tt, 0, 0.2)
    L, R = S.pad(S.chord("D", "min", 3), 8.4, cutoff=900, attack=1.0, release=0.8)
    tr.put2(L * 0.05, R * 0.05, 0.4, 0)
    # --- darker 8.67–16.57: drone, slow heartbeat, braams at the stranger and the earpiece
    tr.put(S.drone(S.hz("A1"), 8.2) * 0.5, 8.6, 0)
    L, R = S.pad(S.chord("A#", "maj", 2) + S.chord("D", "min", 3), 8.0, cutoff=700, attack=1.5, release=0.6)
    tr.put2(L * 0.05, R * 0.05, 8.7, 0)
    t = 8.67
    while t < 16.5:
        bpm = 70 + 25 * (t - 8.67) / 7.9
        tr.put(S.kick(0.5), t, 0)
        tr.put(S.kick(0.3), t + 0.24, 0)
        t += 60 / bpm
    tr.put(braam(2.0, 43.65), fr(302), -3)
    tr.put(braam(1.8, 41.2), fr(371), -5)
    # --- build 16.57–20.07: heartbeat 110→170 BPM, 16th ticks, riser into the crash
    t = 16.57
    while t < 20.0:
        u = (t - 16.57) / 3.5
        b = 60 / (110 + 60 * u ** 1.3)
        tr.put(S.kick(0.8), t, 0)
        tr.put(S.kick(0.5), t + b * 0.27, 0)
        t += b
    for i, tt in enumerate(np.arange(16.57, 20.0, 0.125)):
        tr.put(S.pluck(S.hz("D6"), 0.07, 0.9) * 0.16, tt, 0, 0.3 if i % 2 else -0.3)
    tr.put(braam(1.6, 36.71), fr(533), -2)
    tr.put(A.riser(3.4), 16.67, -8)
    tr.put(S.drone(S.hz("D2"), 3.6) * 0.5, 16.5, 0)
    # --- after the crash: only a low, ominous tone under "WHAT WOULD YOU DO?"
    t_ow = 21.5
    tr.put(np.sin(2 * np.pi * S.hz("D1") * A.tt(1.6)) * np.hanning(A.N(1.6)) * 0.6, t_ow, 0)
    tr.put(A.reverb(S.piano(S.hz("D4"), 2.0, 0.45), 2.0, 0.55), fr(652), 0)
    # --- phone 23.0–25.0: eerie drone + shimmer + slow heartbeat
    tr.put(S.drone(S.hz("B1"), 2.4) * 0.45, 22.95, 0)
    tr.put(S.shimmer(S.hz("F#5"), 2.1) * 0.14, 22.95, 0, 0.3)
    for tt in (23.35, 24.25):
        tr.put(S.kick(0.5), tt, 0)
        tr.put(S.kick(0.3), tt + 0.22, 0)
    # --- title 25.0–30.0: ring sweep glide, title hit, dark-warm resolve
    n = A.N(1.4)
    glide = np.sin(2 * np.pi * np.cumsum(np.geomspace(220, 880, n)) / SR) * np.hanning(n) ** 0.5 * 0.35
    tr.put(A.reverb(glide, 1.2, 0.4), 25.1, 0)
    tr.put(braam(3.0, 36.71), 26.62, 0)
    tr.put(A.reverb(A.chime([587.33, 880, 1174.66, 1760], 2.6, 1.1, [1, 0.7, 0.5, 0.3]), 2.0, 0.5), 26.64, -2)
    L, R = S.pad(S.chord("D", "madd9", 3) + S.chord("D", "min", 4), 3.5, cutoff=1600, attack=0.4, release=1.4)
    tr.put2(L * 0.07, R * 0.07, 26.66, 0)
    tr.put(A.reverb(S.piano(S.hz("D3"), 2.5, 0.6), 2.0, 0.5), 27.45, 0)
    L, R = A.highpass(tr.L, 30), A.highpass(tr.R, 30)
    # hard stop at the crash; the black belongs to the crash and the voice
    s0, s1 = int(fr(602) * SR), int(t_ow * SR)
    L[s0:s1] = 0
    R[s0:s1] = 0
    secs = [(0.0, 0.47, -16), (0.47, 8.67, -21.5), (8.67, 16.57, -20.5), (16.57, 20.07, -18.5), (21.5, 22.95, -28), (22.95, 25.0, -24), (25.0, 30.0, -18)]
    pts = []
    m = (L + R) / 2
    for a, b, tgt in secs:
        seg = m[int(a * SR): int(b * SR)]
        r = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)
        g = float(np.clip(tgt - r, -20, 20))
        pts += [(a + 0.03, g), (b - 0.03, g)]
    ts, gs = zip(*pts)
    gain = db(np.interp(np.arange(NT) / SR, ts, gs))
    L, R = L * gain, R * gain
    L[s0:s1] = 0
    R[s0:s1] = 0
    k = A.N(0.5)
    L[-k:] *= np.linspace(1, 0, k) ** 1.5
    R[-k:] *= np.linspace(1, 0, k) ** 1.5
    return L, R


def accents(bus):
    for f in (14, 48, 96, 135, 162, 227, 260, 338, 401, 434, 497, 515, 557, 587, 690):  # cut whooshes
        hit(bus, A.whoosh(0.4, 400, 1500, q=1.3, shape=0.6), fr(f) - 0.24, -33)
    hit(bus, A.boom(), 0.0, -17)
    hit(bus, A.thud(60, 0.4, 1.0), fr(14), -19)
    for x in D["text"]:  # text cards: soft rise into a low tick
        hit(bus, A.whoosh(0.5, 2500, 600, q=1.0, shape=0.8), fr(x["f0"]) - 0.38, -31)
        hit(bus, A.thud(80, 0.18, 0.6), fr(x["f0"]) + 0.02, -27)
    hit(bus, A.riser(0.5), 25.0, -24)
    hit(bus, A.boom(), 26.62, -15)


def main():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "public/audio/narration.mp3"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    src = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    words = json.load(open(os.path.join(ROOT, "src/data/narration_words.json")))["words"]

    def silent_at(tsec):
        i = int(tsec * SR)
        seg = src[max(0, i - A.N(0.01)): i + A.N(0.01)]
        return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12) < -45

    vo = np.zeros(NT)
    placed = []
    vos = sorted(D["vo"], key=lambda v: v["at"])
    for k, v in enumerate(vos):
        a, b = int(round(v["src0"] * SR)), int(round(v["src1"] * SR))
        i = int(round(v["at"] * SR))
        n = b - a
        if k + 1 < len(vos):
            n = min(n, int(round(vos[k + 1]["at"] * SR)) - i)
        n = min(n, NT - i)
        for cut in (a / SR, (a + n) / SR):  # never cut a word: ASR span must be real silence here
            for w in words:
                if w["start"] < cut < w["end"]:
                    assert silent_at(cut), f"cut at {cut:.3f} inside '{w['word']}'"
        assert np.abs(vo[i: i + n]).max() == 0
        vo[i: i + n] = edge(src[a: a + n])
        placed.append((i, a, n))

    print("building film buses…", flush=True)
    import mix_film as M
    M.build_beds()
    M.build_sfx()
    fx, beds = Bus2(), Bus2()
    for s in D["shots"]:
        if s.get("layout") == "title":
            continue
        t0 = fr(s["f0"])
        a, n = int(round(s["src"] * SR)), int(round(fr(s["f1"] - s["f0"]) * SR))
        tail = 0.4 if s.get("layout") == "black" else 0.012
        fx.put2(*[edge(x[a: a + n], 0.008, tail) for x in (M.sfx.L, M.sfx.R)], t0)
        beds.put2(*[edge(x[a: a + n], 0.03, 0.03) for x in (M.beds.L, M.beds.R)], t0, -5)
    accents(fx)

    print("music…", flush=True)
    mL, mR = music()
    act = voice_activity(vo)
    lo_L, lo_R = A.lowpass(mL, 250, 4), A.lowpass(mR, 250, 4)
    mL = lo_L * db(-8 * act) + (mL - lo_L) * db(-12 * act)
    mR = lo_R * db(-8 * act) + (mR - lo_R) * db(-12 * act)
    oL = mL + beds.L * db(-4 * act) + fx.L * db(-2 * act)
    oR = mR + beds.R * db(-4 * act) + fx.R * db(-2 * act)
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    ceil = db(-1.0)
    rider = np.ones(NT)
    for o in (oL, oR):
        over = np.abs(vo + o) > ceil
        if over.any():
            need = np.ones(NT)
            need[over] = np.clip((ceil - np.abs(vo[over])) / (np.abs(o[over]) + 1e-9), 0, 1)
            rider = np.minimum(rider, need)
    if (rider < 1).any():
        w = A.N(0.02)
        rider = uniform_filter1d(minimum_filter1d(rider, size=2 * w + 1), size=w)
    oL *= rider
    oR *= rider
    L, R = vo + oL, vo + oR

    out = os.path.join(ROOT, "public/audio/teaser_mystery_mix.wav")
    sf.write(out, np.stack([L, R], 1).astype(np.float32), SR, subtype="FLOAT")
    d = os.path.join(ROOT, "renders/teaser_v2")
    os.makedirs(d, exist_ok=True)
    sf.write(os.path.join(d, "stem_vo.wav"), vo.astype(np.float32), SR, subtype="FLOAT")
    sf.write(os.path.join(d, "stem_bg.wav"), np.stack([oL, oR], 1).astype(np.float32), SR, subtype="FLOAT")
    back, sr = sf.read(out, dtype="float64")
    e = A.N(0.006)
    exact = max(float(np.abs(vo[i + e: i + n - e] - src[a + e: a + n - e]).max()) for i, a, n in placed)
    eb = subprocess.run(["ffmpeg", "-nostats", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    eb = eb[eb.rfind("Summary:"):]
    rep = {
        "samples": back.shape[0],
        "seconds": back.shape[0] / sr,
        "vo_slices": len(placed),
        "vo_max_diff_vs_source": exact,
        "integrated_lufs": float(re.search(r"I:\s+(-?[\d.]+) LUFS", eb).group(1)),
        "true_peak_dbtp": float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", eb).group(1)),
        "rider_engaged_ms": round(float((rider < db(-0.1)).sum() / SR * 1000), 1),
    }
    print(json.dumps(rep, indent=1))
    json.dump(rep, open(os.path.join(d, "mix_report.json"), "w"), indent=1)
    assert rep["samples"] == NT and exact == 0.0


if __name__ == "__main__":
    main()
