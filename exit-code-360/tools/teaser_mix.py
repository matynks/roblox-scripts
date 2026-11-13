#!/usr/bin/env python3
"""EXIT CODE 360 — YouTube Shorts teaser soundtrack  →  public/audio/teaser_mix.wav

* Exactly 30.000 s (1,323,000 samples @ 44.1 kHz, stereo).
* Narration: sample-exact slices of the approved MP3 (src/teaser/shots.json "vo"),
  never stretched, pitched or re-levelled; 6 ms edge fades in measured pauses.
* SFX + ambience: the full film's own synchronised buses (tools/mix_film.py), sliced per
  shot at the same film time the picture shows, so every effect stays locked to picture.
* Music: a new, energetic but subtle cue built from the film's instrument library
  (tools/score.py) — hook impact, 120 BPM drive, accelerating tension, hard stop at the
  crash, eerie phone beat, warm end-card resolve.
* Teaser accents: cut whooshes, text-slam hits, CTA pop.
* Ducking under the voice; loudness aimed at Shorts (−14 LUFS), peaks ≤ −1.5 dBFS on the
  non-voice stem rider (the voice is never touched).
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio_lib as A  # noqa: E402
from audio_lib import SR, db, norm  # noqa: E402
import score as S  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, "src/teaser/shots.json")))
FPS = D["fps"]
DUR = D["frames"] / FPS  # 30.0
NT = int(round(DUR * SR))  # 1,323,000
assert NT == 1323000


def fr(f):
    return f / FPS


def edge(x, a=0.006, b=0.006):
    x = x.copy()
    na, nb = min(len(x), A.N(a)), min(len(x), A.N(b))
    if x.ndim == 1:
        x[:na] *= np.linspace(0, 1, na)
        x[len(x) - nb:] *= np.linspace(1, 0, nb)
    else:
        x[:na] *= np.linspace(0, 1, na)[:, None]
        x[len(x) - nb:] *= np.linspace(1, 0, nb)[:, None]
    return x


class Bus2:
    def __init__(self):
        self.L = np.zeros(NT)
        self.R = np.zeros(NT)

    def put(self, x, t, g=0.0, pan=0.0):
        i = int(round(t * SR))
        if i >= NT:
            return
        if i < 0:
            x = x[-i:]
            i = 0
        x = x[: NT - i] * db(g)
        th = (pan + 1) * np.pi / 4
        self.L[i: i + len(x)] += x * np.cos(th)
        self.R[i: i + len(x)] += x * np.sin(th)

    def put2(self, L, R, t, g=0.0):
        i = int(round(t * SR))
        n = min(len(L), NT - i)
        if n <= 0:
            return
        self.L[i: i + n] += L[:n] * db(g)
        self.R[i: i + n] += R[:n] * db(g)


def hit(bus, x, t, pk, pan=0.0):
    bus.put(norm(x, db(pk)), t, 0.0, pan)


# =================================================================== music
def music():
    tr = S.Track(NT)
    beat = 0.5  # 120 BPM

    # --- hook 0–2.6: impact, pulse, riser
    tr.put(S.drone(S.hz("D2"), 3.0) * 0.5, 0.0, -2)
    L, R = S.pad(S.chord("D", "madd9", 3), 2.8, cutoff=1400, attack=0.05, release=0.6)
    tr.put2(L * 0.08, R * 0.08, 0.0, 0)
    for k in range(5):
        tr.put(S.kick(0.6 if k else 1.0), k * beat, 0)
    tr.put(A.riser(0.7), 1.9, -12)

    # --- drive 2.6–10.37: i–VI–III–VII in D minor, plucks + bass + kick + shaker
    prog = [("D", "min"), ("A#", "maj"), ("F", "maj"), ("C", "maj")]
    t, k = 2.6, 0
    while t < 10.35:
        root, kind = prog[k % 4]
        ch = S.chord(root, kind, 3)
        bar = beat * 4
        L, R = S.pad(ch, bar + 0.4, cutoff=1100, attack=0.2, release=0.4)
        tr.put2(L * 0.05, R * 0.05, t, 0)
        tr.put(S.pluck(ch[0] / 2, beat * 1.8) * 0.6, t, 0, -0.05)
        tr.put(S.pluck(ch[0] / 2, beat * 1.8) * 0.5, t + beat * 2, 0, -0.05)
        arp = [ch[0] * 2, ch[2] * 2, ch[1] * 4, ch[2] * 2, ch[0] * 4, ch[2] * 2, ch[1] * 4, ch[2] * 2]
        for j in range(8):
            tj = t + j * beat / 2
            if tj >= 10.35:
                break
            tr.put(S.pluck(arp[j], beat * 0.8, 0.7) * (0.34 if j % 2 else 0.42), tj, 0, 0.3 if j % 2 else -0.3)
            if j % 2:
                tr.put(S.shaker() * 0.16, tj, 0, 0.35)
        for b in range(4):
            if t + b * beat < 10.35:
                tr.put(S.kick(0.55 if b % 2 == 0 else 0.3), t + b * beat, 0)
        t += bar
        k += 1

    # --- tension 10.37–21.2: drone + heartbeat accelerating 100 → 170 BPM, rising pad
    t0, t1 = 10.37, 21.2
    tr.put(S.drone(S.hz("A1"), t1 - t0 + 0.5) * 0.45, t0, 0)
    for i, (root, kind) in enumerate([("A", "min"), ("F", "maj"), ("D", "min"), ("E", "maj")]):
        seg = (t1 - t0) / 4
        L, R = S.pad(S.chord(root, kind, 3), seg + 0.6, cutoff=900 + 300 * i, attack=0.6, release=0.4)
        tr.put2(L * 0.05, R * 0.05, t0 + i * seg, 0)
    t = t0
    while t < t1 - 0.05:
        u = (t - t0) / (t1 - t0)
        bpm = 100 + 70 * u ** 1.4
        b = 60 / bpm
        tr.put(S.kick(0.75), t, 0)
        tr.put(S.kick(0.45), t + b * 0.27, 0)
        t += b
    for i, tt in enumerate(np.arange(18.37, t1, 0.125)):  # ticking 16ths into the fall
        tr.put(S.pluck(S.hz("A5"), 0.1, 0.9) * 0.18, tt, 0, 0.3 if i % 2 else -0.3)
    tr.put(A.riser(1.9), 19.3, -10)

    # --- eerie 21.93–25.23: phone + rooftop
    tr.put(S.drone(S.hz("B1"), 3.8) * 0.45, 21.93, 0)
    tr.put(S.shimmer(S.hz("F#5"), 3.4) * 0.12, 21.93, 0, 0.3)
    for tt, n in [(22.1, "B4"), (22.9, "D5"), (23.7, "F#4"), (24.4, "C5")]:
        tr.put(A.reverb(S.piano(S.hz(n), 1.6, 0.5), 1.4, 0.45), tt, 0, -0.2)
    for tt in (22.6, 23.6, 24.6):  # slow heartbeat
        tr.put(S.kick(0.5), tt, 0)
        tr.put(S.kick(0.3), tt + 0.2, 0)

    # --- end card 25.233–30: impact + warm resolve + bright arpeggio, ring-out
    te = fr(757)
    L, R = S.pad(S.chord("D", "add9", 3) + S.chord("D", "maj", 4), 30.0 - te, cutoff=2200, attack=0.08, release=1.4)
    tr.put2(L * 0.08, R * 0.08, te, 0)
    tr.put(S.drone(S.hz("D2"), 30.0 - te) * 0.35, te, 0)
    arp = [S.hz(n) for n in ("D5", "F#5", "A5", "E5", "D5", "A5", "F#5", "B5")]
    for j, tt in enumerate(np.arange(te + 0.5, 29.2, beat / 2)):
        tr.put(S.pluck(arp[j % 8], beat * 0.9, 0.7) * 0.32, tt, 0, 0.3 if j % 2 else -0.3)
    for b, tt in enumerate(np.arange(te + 0.5, 29.0, beat)):
        tr.put(S.kick(0.45 if b % 2 == 0 else 0.25), tt, 0)
    tr.put(A.reverb(A.chime([587.33, 739.99, 880.0, 1174.66], 2.0, 0.9, [1, 0.7, 0.6, 0.4]), 1.6, 0.45), 29.0, -4)

    L, R = A.highpass(tr.L, 35), A.highpass(tr.R, 35)
    # hard stop at the crash; silence through the black
    s0, s1 = int(fr(636) * SR), int(fr(658) * SR)
    L[s0:s1] = 0
    R[s0:s1] = 0
    # section levels (RMS targets before ducking)
    secs = [(0.0, 2.6, -24), (2.6, 10.37, -26), (10.37, 21.2, -27), (21.93, 25.23, -28), (25.23, 30.0, -23)]
    pts = []
    m = (L + R) / 2
    for a, b, tgt in secs:
        seg = m[int(a * SR): int(b * SR)]
        r = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)
        g = float(np.clip(tgt - r, -20, 20))
        pts += [(a + 0.05, g), (b - 0.05, g)]
    ts, gs = zip(*pts)
    gain = db(np.interp(np.arange(NT) / SR, ts, gs))
    L, R = L * gain, R * gain
    L[s0:s1] = 0
    R[s0:s1] = 0
    # final ring-out fade (last 0.45 s)
    n = A.N(0.45)
    L[-n:] *= np.linspace(1, 0, n) ** 1.5
    R[-n:] *= np.linspace(1, 0, n) ** 1.5
    return L, R


# =================================================================== accents
def accents(bus):
    whoosh = lambda t, pk=-31, pan=0.0: hit(bus, A.whoosh(0.45, 400, 1500, q=1.3, shape=0.6), t - 0.27, pk, pan)  # noqa: E731
    for f in (39, 78, 192, 311, 389, 426, 512, 552, 608, 711):
        whoosh(fr(f))
    hit(bus, A.boom(), 0.0, -17)  # hook impact
    hit(bus, A.reverb(A.chime([587.33, 880, 1174.66], 1.6, 0.6, [1, 0.6, 0.4]), 1.4, 0.4), 0.05, -24)
    for f in (257, 275, 293):  # montage cuts + text slam
        hit(bus, A.thud(70, 0.25, 1.2), fr(f), -18)
        hit(bus, A.whoosh(0.3, 2500, 700, q=1.1, shape=0.3), fr(f) - 0.09, -27)
    hit(bus, A.thud(90, 0.2, 1.0), fr(311), -22)  # job headline
    hit(bus, A.whoosh(0.35, 300, 1800, q=1.2, shape=0.6), 11.617 - 0.21, -25, 0.3)  # whip pan
    # split screen: panels slide in, then OR
    hit(bus, A.whoosh(0.4, 600, 2000, q=1.2, shape=0.5), fr(456) - 0.05, -25, -0.5)
    hit(bus, A.whoosh(0.4, 600, 2000, q=1.2, shape=0.5), fr(456) + 0.03, -25, 0.5)
    hit(bus, A.stamp(), 15.2 + (306.52 - 305.4), -22)
    # end card
    hit(bus, A.boom(), fr(757), -16)
    hit(bus, A.reverb(A.chime([587.33, 739.99, 880, 1174.66], 2.2, 1.0, [1, 0.7, 0.6, 0.35]), 1.8, 0.45), fr(757) + 0.03, -20)
    hit(bus, A.pop(), fr(757) + 1.02, -20)  # CTA
    hit(bus, A.reverb(A.chime([1760, 2637], 0.6, 0.2, [1, 0.4]), 0.8, 0.3), fr(757) + 1.04, -27)


# =================================================================== main
def voice_activity(v):
    blk = 441
    nb = len(v) // blk + 1
    x = np.pad(np.abs(v), (0, nb * blk - len(v)))
    pk = x.reshape(nb, blk).max(1)
    a = np.clip((pk - 0.015) / 0.06, 0, 1)
    from scipy.ndimage import maximum_filter1d
    a = maximum_filter1d(a, size=41)
    a = np.roll(a, -8)
    out = np.zeros_like(a)
    e = 0.0
    up, dn = 1 - np.exp(-1 / 6), 1 - np.exp(-1 / 40)
    for i, s in enumerate(a):
        e += (s - e) * (up if s > e else dn)
        out[i] = e
    return np.repeat(out, blk)[: len(v)]


def main():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "public/audio/narration.mp3"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    src = np.frombuffer(raw, dtype=np.float32).astype(np.float64)

    # --- narration slices (exact samples)
    vo = np.zeros(NT)
    placed = []
    words = json.load(open(os.path.join(ROOT, "src/data/narration_words.json")))["words"]
    vos = sorted(D["vo"], key=lambda v: v["at"])
    for k, v in enumerate(vos):
        a, b = int(round(v["src0"] * SR)), int(round(v["src1"] * SR))
        i = int(round(v["at"] * SR))
        n = b - a
        if k + 1 < len(vos):  # never run into the next slice
            n = min(n, int(round(vos[k + 1]["at"] * SR)) - i)
        n = min(n, NT - i)
        s0, s1 = a / SR, (a + n) / SR
        for w in words:  # no cut may fall inside a word
            assert not (w["start"] < s0 < w["end"] or w["start"] < s1 < w["end"]), f"slice {v} cuts '{w['word']}'"
        assert np.abs(vo[i: i + n]).max() == 0
        vo[i: i + n] = edge(src[a: a + n])
        placed.append((i, a, n))

    # --- film SFX + ambience, sliced to the picture
    print("building film buses…", flush=True)
    import mix_film as M
    M.build_beds()
    M.build_sfx()
    fx = Bus2()
    beds = Bus2()
    for s in D["shots"]:
        if s.get("layout") == "endcard" or s.get("speed", 1) != 1:
            continue
        t0 = fr(s["f0"])
        dur = fr(s["f1"] - s["f0"])
        a, n = int(round(s["src"] * SR)), int(round(dur * SR))
        fade_out = 0.25 if s.get("layout") == "black" else 0.012
        fx.put2(*[edge(x[a: a + n], 0.008, fade_out) for x in (M.sfx.L, M.sfx.R)], t0)
        beds.put2(*[edge(x[a: a + n], 0.03, 0.03) for x in (M.beds.L, M.beds.R)], t0, -4)
    accents(fx)

    print("music…", flush=True)
    mL, mR = music()

    # --- ducking + sum
    act = voice_activity(vo)
    lo_L, lo_R = A.lowpass(mL, 250, 4), A.lowpass(mR, 250, 4)
    gl, gh = db(-6 * act), db(-10 * act)
    mL = lo_L * gl + (mL - lo_L) * gh
    mR = lo_R * gl + (mR - lo_R) * gh
    gb, gs = db(-4 * act), db(-2 * act)
    oL = mL + beds.L * gb + fx.L * gs
    oR = mR + beds.R * gb + fx.R * gs
    # rider on the non-voice stem only (ceiling −1.0 dBFS; the narration itself peaks at −1.05)
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

    out = os.path.join(ROOT, "public/audio/teaser_mix.wav")
    sf.write(out, np.stack([L, R], 1).astype(np.float32), SR, subtype="FLOAT")
    os.makedirs(os.path.join(ROOT, "renders/teaser"), exist_ok=True)
    sf.write(os.path.join(ROOT, "renders/teaser/stem_vo.wav"), vo.astype(np.float32), SR, subtype="FLOAT")
    sf.write(os.path.join(ROOT, "renders/teaser/stem_bg.wav"), np.stack([oL, oR], 1).astype(np.float32), SR, subtype="FLOAT")

    back, sr = sf.read(out, dtype="float64")
    # every slice is the source decode, sample for sample (checked away from the 6 ms edge fades
    # and from the few-ms silent joins between neighbouring slices)
    e = A.N(0.006)
    exact = max(float(np.abs(vo[i + e: i + n - e] - src[a + e: a + n - e]).max()) for i, a, n in placed)
    lufs = subprocess.run(["ffmpeg", "-nostats", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summ = lufs[lufs.rfind("Summary:"):]
    import re
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1))
    TP = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ).group(1))
    rep = {
        "samples": back.shape[0],
        "seconds": back.shape[0] / sr,
        "channels": back.shape[1],
        "vo_slices": len(placed),
        "vo_max_diff_vs_source": exact,
        "vo_residual_in_file": float(np.abs((back[:, 0] + back[:, 1]) / 2 - (oL + oR) / 2 - vo).max()),
        "peak_dbfs": [round(20 * np.log10(np.abs(back[:, c]).max()), 2) for c in (0, 1)],
        "integrated_lufs": I,
        "true_peak_dbtp": TP,
        "rider_engaged_ms": round(float((rider < db(-0.1)).sum() / SR * 1000), 1),
    }
    print(json.dumps(rep, indent=1))
    json.dump(rep, open(os.path.join(ROOT, "renders/teaser/teaser_mix_report.json"), "w"), indent=1)
    assert rep["samples"] == NT and exact == 0.0 and rep["vo_residual_in_file"] < 1e-6


if __name__ == "__main__":
    main()
