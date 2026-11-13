#!/usr/bin/env python3
"""EXIT CODE 360 — full-film sound design + mix  →  public/audio/film_mix.wav

* Narration: the approved MP3 decoded at 44.1 kHz, sample for sample. Never
  time-stretched, pitched, compressed, faded or re-levelled (verified below:
  max |mix narration − source| must be exactly 0).
* SFX, ambience beds and the score are synthesised here (tools/audio_lib.py,
  tools/score.py), so every asset is original and owned by the production.
* Music, beds and SFX duck under the voice (look-ahead envelope follower with
  hold). A protective gain rider acts only on the non-narration stem if the sum
  would get near full scale.
* Output length = film length exactly: 13192 frames × 1470 samples.

Cue times come from the narration timing map (src/data/*.json) and the scene
constants in src/film/scenes/*.tsx (quoted next to each cue).

Usage: python3 tools/mix_film.py
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio_lib import *  # noqa: E402,F401,F403
from audio_lib import RNG, SR, Bus, N, db, norm  # noqa: E402
import audio_lib as A  # noqa: E402
from score import make_score  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
FRAMES = 13192  # src/lib/timing.ts FILM_FRAMES = ceil(439.722 * 30)
TOTAL = FRAMES * SR // FPS  # 19,392,240 samples = 439.7333 s
T_END = TOTAL / SR

PHRASES = json.load(open(os.path.join(ROOT, "src/data/narration_phrases.json")))["phrases"]
WORDS = json.load(open(os.path.join(ROOT, "src/data/narration_words.json")))["words"]


def P(n):
    return PHRASES[n - 1]["start"]


def W(text, after=0.0):
    t = text.lower()
    for w in WORDS:
        if w["start"] >= after and w["word"].lower().strip(".,?!") == t:
            return w["start"]
    raise KeyError(text)


sfx = Bus(TOTAL)
beds = Bus(TOTAL)


def hit(x, t, pk, pan=0.0):
    """add a one-shot normalised to a peak level (dBFS)"""
    sfx.add(norm(x, db(pk)), t, 0.0, pan)


def rms_norm(x, rms_db):
    r = np.sqrt(np.mean(x ** 2)) + 1e-12
    return x / r * db(rms_db)


def fades(x, fin=0.5, fout=0.5):
    n = len(x)
    g = np.ones(n)
    a, b = min(n, N(fin)), min(n, N(fout))
    if a > 1:
        g[:a] = np.linspace(0, 1, a)
    if b > 1:
        g[-b:] *= np.linspace(1, 0, b)
    return x * g


def autom(t0, n, pts):
    """gain curve (linear) for a buffer starting at t0 from [(t, dB), …]"""
    t = t0 + np.arange(n) / SR
    ts, gs = zip(*pts)
    return db(np.interp(t, ts, gs))


def bed(gen, t0, t1, rms_db, fin=0.6, fout=0.6, pan=0.0, bus=None):
    x = fades(rms_norm(gen(t1 - t0), rms_db), fin, fout)
    (bus or beds).add(x, t0, 0.0, pan)
    return x


def steps(times, pk, pan=0.0, heavy=1.0, hard=False, jitter=1.5):
    for T in times:
        hit(A.footstep(heavy, hard), T, pk + RNG.uniform(-jitter, jitter), pan)


def whoosh_at(t_peak, dur, pk, f0=500, f1=1600, pan=0.0, shape=0.5):
    hit(A.whoosh(dur, f0, f1, q=1.4, shape=shape), t_peak - dur * shape, pk, pan)


def tone_glide(f0, f1, dur, tau=None):
    n = N(dur)
    x = np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f1, n)) / SR)
    return x * (np.exp(-np.arange(n) / SR / tau) if tau else np.hanning(n))


def falling_whistle(dur):
    return A.reverb(tone_glide(2600, 700, dur) * np.clip(np.linspace(0.3, 1, N(dur)), 0, 1), 0.6, 0.25)


def coo():
    t = A.tt(0.55)
    f = np.interp(t, [0, 0.15, 0.3, 0.55], [380, 520, 430, 360])
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 22 * t))
    return A.lowpass(x, 1500) * np.sin(np.pi * t / t[-1]) ** 1.5


def sad_horn(dur=0.9):
    t = A.tt(dur)
    f = np.interp(t, [0, dur * 0.2, dur], [520, 470, 260])
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 9)) * (0.7 + 0.3 * np.sin(2 * np.pi * 31 * t))
    return A.bandpass(x, 250, 3500) * np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)


def net_swish():
    n = N(0.4)
    return A.bandpass(A.noise(n), 1800, 7000) * A.env_ad(n, 0.01, 0.09)


def whisper(dur=0.9):
    t = A.tt(dur)
    am = np.clip(np.sin(2 * np.pi * 5.5 * t + 2 * np.sin(2 * np.pi * 1.7 * t)), 0, 1) ** 1.5
    return A.bandpass(A.noise(len(t)), 1500, 6500) * am * np.sin(np.pi * t / dur)


def power_down(dur=1.6):
    t = A.tt(dur)
    f = 120 * np.exp(-t * 1.6) + 25
    hum = sum(np.sin(2 * np.pi * np.cumsum(f * k) / SR) / k for k in (1, 2, 3))
    clunk = A.thud(60, 0.4, 1.2)
    x = A.lowpass(hum, 900) * np.exp(-t / 0.7) * 0.6
    x[: len(clunk)] += clunk
    return x


def spark_crackle(dur=0.8):
    n = N(dur)
    out = np.zeros(n)
    for _ in range(int(dur * 70)):
        s = RNG.integers(0, n - N(0.01))
        b = A.highpass(A.noise(N(0.006)), 2500) * np.hanning(N(0.006)) * RNG.uniform(0.2, 1)
        out[s: s + len(b)] += b
    return out * np.linspace(1, 0.2, n)


def firework():
    pop = A.thud(90, 0.25, 1.0)
    out = np.zeros(N(2.0))
    out[: len(pop)] += pop
    c = spark_crackle(1.6)
    out[N(0.18): N(0.18) + len(c)] += c * 0.8
    ch = A.reverb(A.chime([1568, 2093, 2637, 3136], 1.6, 0.6, [1, 0.7, 0.5, 0.3]), 1.4, 0.4)
    out[: len(ch)] += ch * 0.5
    return out


def cardboard():
    return A.thud(210, 0.08, 0.9) + 0.4 * A.page_flip()[: N(0.08)]


def snip():
    x = np.zeros(N(0.12))
    for s in (0, N(0.05)):
        b = A.highpass(A.noise(N(0.008)), 3000) * np.hanning(N(0.008))
        x[s: s + len(b)] += b
    m = A.metal_ping((3100, 4700), 0.12)
    return x + 0.3 * m[: len(x)]


def servo(dur=0.5):
    t = A.tt(dur)
    f = np.interp(t, [0, dur], [700, 900])
    return A.bandpass(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 500, 3000) * np.sin(np.pi * t / dur) * 0.5


def gorilla_thud():
    x = A.thud(75, 0.18, 0.5)
    y = A.thud(110, 0.12, 0.3)
    x[: len(y)] += 0.5 * y
    return x


def ui_pop():
    x = A.pop()
    c = A.chime([1760, 2637], 0.5, 0.15, [1, 0.4])
    out = np.zeros(max(len(x), len(c)))
    out[: len(x)] += x
    out[: len(c)] += 0.4 * c
    return out


def contact_times(vkeys, t0, t1, stride, phase0=0.25):
    """foot-plant times (walk phase 0.25 + k/2) for a speed profile (eased keys)"""
    def track(T):
        if T <= vkeys[0][0]:
            return vkeys[0][1]
        for (a, va), (b, vb) in zip(vkeys, vkeys[1:]):
            if T <= b:
                u = (T - a) / (b - a)
                e = 4 * u ** 3 if u < 0.5 else 1 - (-2 * u + 2) ** 3 / 2
                return va + (vb - va) * e
        return vkeys[-1][1]

    dt, dist, T, out, nxt = 1 / 600, 0.0, t0, [], phase0
    while T < t1:
        dist += track(T) * dt
        if dist / stride >= nxt:
            out.append(T)
            nxt += 0.5
        T += dt
    return out


# ============================================================== AMBIENCE BEDS
def build_beds():
    # seaside: opening (S01–S02), epilogue (S29), outro (S34)
    sea1 = bed(A.sea_bed, 0.0, 29.7, -33, fin=0.8, fout=0.6)
    bed(A.sea_bed, 352.05, 379.2, -34, fin=0.7, fout=0.5)
    bed(A.sea_bed, 427.25, T_END, -34, fin=0.6, fout=0.9)
    for tg, pan, g in [(3.0, -0.5, -33), (8.8, 0.6, -35), (14.4, 0.6, -36), (20.3, -0.4, -36), (355.2, 0.5, -35), (372.0, -0.5, -36), (431.0, 0.6, -36)]:
        beds.add(norm(A.reverb(A.gull_call(0.38, (1200, 1700, 1050), 0.5), 1.2, 0.5, 3500), db(g)), tg, 0, pan)
    # POV inside Leo's head (S04): a soft air tone
    bed(lambda d: A.lowpass(A.noise(N(d)), 500), 46.6, 58.8, -44, fin=0.8, fout=0.8)
    # rooms: party, notebook, night phone
    bed(lambda d: A.room_tone(d), 62.25, 73.75, -45, fin=0.4, fout=0.2)
    bed(lambda d: A.room_tone(d), 207.35, 251.6, -46, fin=0.6, fout=0.5)
    bed(lambda d: A.room_tone(d, hum=False), 414.1, 426.6, -46, fin=0.6, fout=0.2)
    # streets
    bed(A.city_bed, 73.6, 82.6, -36, fin=0.3, fout=0.25)
    bed(A.city_bed, 136.3, 151.2, -39, fin=0.4, fout=0.4)
    # car interior (S08)
    bed(lambda d: A.engine(d, 1.0), 82.45, 95.95, -35, fin=0.25, fout=0.3)
    # gym (S09–S10)
    bed(A.gym_bed, 95.7, 115.9, -39, fin=0.3, fout=0.3)
    bed(lambda d: A.crowd(d, 1.0), 95.7, 115.9, -43, fin=0.3, fout=0.3)
    # stadium (S11)
    bed(lambda d: A.crowd(d, 1.0, excite=lambda t: 1 + 0.25 * np.sin(2 * np.pi * t / 4.0) ** 2), 115.7, 125.8, -34, fin=0.3, fout=0.5)
    # classroom (S14) — room + low murmur
    bed(lambda d: A.room_tone(d), 150.95, 158.0, -46, fin=0.4, fout=0.3)
    bed(lambda d: A.lowpass(A.crowd(d, 1.0), 900), 150.95, 157.9, -44, fin=0.4, fout=0.3)
    # office (S15)
    bed(lambda d: A.room_tone(d), 157.85, 175.8, -47, fin=0.3, fout=0.4)

    # concert (S21–S28): crowd + muffled band, automated
    c0, c1 = 251.3, 352.6
    crowd = rms_norm(A.crowd(c1 - c0, 1.0, excite=lambda t: 1 + 0.2 * np.sin(2 * np.pi * t / 5.3) ** 2), -32)
    muff = A.lowpass(crowd, 700)
    g_dry = autom(c0, len(crowd), [(c0, -60), (c0 + 0.5, 0), (286.0, 0), (286.4, -60), (301.9, -60), (302.4, 0),
                                   (312.0, 0), (312.4, 3), (314.2, 1), (318.5, 1), (318.7, 4), (319.6, 0), (320.2, -60),
                                   (321.6, -60), (323.0, -12), (339.3, -12), (340.5, -8), (347.5, -8), (352.0, -10), (352.6, -60)])
    g_muf = autom(c0, len(crowd), [(c0, -60), (286.0, -60), (286.4, -9), (301.9, -9), (302.4, -60), (c1, -60)])
    beds.add(crowd * g_dry + muff * g_muf, c0, 0, 0.0)
    b1 = 318.56
    band = rms_norm(A.band(b1 - c0, 124), -35)
    gb = autom(c0, len(band), [(c0, -60), (c0 + 0.6, 0), (286.0, 0), (286.4, -8), (301.9, -8), (302.4, 0), (b1, 0)])
    band = band * gb
    band[-N(0.03):] *= np.linspace(1, 0, N(0.03))
    beds.add(band, c0, 0, -0.1)
    return sea1


# ================================================================ SFX CUES
def build_sfx():
    # ---------------- S01 opening (0–13.7): tiptoes, bites, wave, mask droop, pigeon
    for i, T in enumerate(np.arange(0.35, 5.1, 0.34)):
        hit(A.tiptoe(), T, -37 + RNG.uniform(-1.5, 1.5), -0.6 + T * 0.04)
    for T in (1.75, 4.6, 12.9):
        hit(A.crunch(), T, -28, 0.1)
    whoosh_at(7.35, 0.35, -35, 700, 1800, pan=0.1)
    hit(cardboard(), 8.45, -31, -0.35)
    hit(coo(), 9.9, -33, 0.55)
    for T in np.arange(9.85, 11.2, 0.42):
        hit(A.flap(), T, -33, 0.5)
    for T in np.arange(11.2, 13.2, 1 / 6.5):
        hit(A.flap(), T, -28 - 6 * abs(T - 12.02), float(np.clip((12.02 - T) * 0.7, -0.8, 0.8)))
    n = N(1.3)
    hit(A.whoosh(1.3, 500, 2200, q=1.4, curve=1.3, shape=0.62), 12.02 - 0.62 * 1.3, -23, np.linspace(0.7, -0.6, n))
    whoosh_at(11.75, 0.4, -31, 300, 800, pan=0.1)  # Leo's duck (cloth)
    # ---------------- S01–S02 (approved POC cues; absolute narration times)
    leo_v = [(13.15, 0), (13.7, 190), (16.2, 190), (16.5, 95), (17.1, 26), (17.2, 14), (18.3, 14), (18.8, 190)]
    c1 = 18.95
    for T in [t for t in contact_times(leo_v, 13.0, 16.4, 262 * 0.82) if t > 13.25] + [t for t in contact_times(leo_v, 13.0, c1, 262 * 0.82) if t > 18.55]:
        hit(A.footstep(1.0), T, -30 + RNG.uniform(-1, 1), -0.1)
    mia_v = [(13.4, 0), (13.9, 170), (16.4, 170), (16.95, 0)]
    for T in [t for t in contact_times(mia_v, 13.3, 16.9, 180 * 0.79) if t > 13.5]:
        hit(A.footstep(0.6), T, -35 + RNG.uniform(-1, 1), -0.35)
    hit(A.bell(), 14.78, -13, -0.75)
    hit(A.bell(), 15.12, -14, -0.7)
    # bike pass (tyre hum + freewheel), panning L → R
    t0b, t1b, cp = 15.0, 18.2, 16.95
    nbk = N(t1b - t0b)
    tt = t0b + np.arange(nbk) / SR
    prox = 1 / (1 + ((tt - cp) * 2.4) ** 2)
    hum = A.lowpass(A.bandpass(A.noise(nbk), 120, 900), 700) * prox
    ticks = np.zeros(nbk)
    k = 0.0
    while k < (t1b - t0b):
        i = N(k)
        tk = A.highpass(A.noise(N(0.004)), 2500) * np.hanning(N(0.004))
        ticks[i: i + len(tk)] += tk[: nbk - i]
        k += 1 / 11.0
    ticks *= prox * 0.6
    pw = np.zeros(nbk)
    w = A.whoosh(0.9, 900, 380, q=1.2, shape=0.5)
    ip = N(cp - 0.45 - t0b)
    pw[ip: ip + len(w)] += w
    bike = norm(hum) * 0.5 + norm(ticks) * 0.25 + norm(pw) * 0.9
    sfx.add(norm(bike, db(-17)), t0b, 0, np.clip((tt - cp) * 1.1, -0.9, 0.9))
    whoosh_at(16.4 + 0.25, 0.55, -24, 500, 1600, pan=0.1)
    hit(A.reverb(A.chime([2093, 3136, 4186], 1.2, 0.35, [1, 0.5, 0.3]), 1.2, 0.4), 16.98, -31, 0.15)
    hit(A.reverb(A.chime([2637, 3951], 1.0, 0.3, [1, 0.5]), 1.0, 0.4), 17.8, -33, 0.2)
    for T in contact_times([(c1, 150), (19.3, 150), (19.8, 0)], c1, 19.8, 262 * 0.82 * 0.8):
        hit(A.footstep(0.9), T, -31, 0.3)
    for T in np.arange(21.42, 22.3, 0.26):
        hit(A.footstep(0.55), T, -33, -0.2)
    hit(A.reverb(A.gull_call(0.42), 0.9, 0.35, 5000), 23.5, -25, 0.7)
    hit(A.whoosh(1.1, 400, 2600, q=1.5, curve=1.4, shape=0.7), 25.92 - 0.75, -19, np.linspace(0.6, -0.5, N(1.1)))
    snap = A.tick(2600) * 0.6
    snap[: N(0.012)] += A.highpass(A.noise(N(0.012)), 2000) * np.hanning(N(0.012))
    hit(snap, 25.92, -17, 0.2)
    hit(A.whoosh(0.4, 300, 900, q=1.2, shape=0.5), 25.45, -28, 0.2)
    hit(A.whoosh(0.4, 250, 700, q=1.0, shape=0.5), 25.8, -29, -0.3)
    for T in np.arange(25.95, 26.75, 1 / 5.2):
        hit(A.flap(), T, -25, float(np.interp(T, [25.95, 26.3, 26.75], [0.0, -0.5, -0.05])))
    hit(A.thud(160, 0.06, 0.8), 26.75, -28, -0.05)
    for T in (27.05, 27.13, 27.2):
        hit(A.flap(), T, -33, -0.05)
    hit(A.crunch(), 27.3, -24, 0.15)
    hit(A.gull_call(0.22, (1500, 1700, 1250), 0.9), 28.24, -22, -0.05)
    for T in np.arange(28.48, 29.1, 1 / 5.5):
        hit(A.flap(), T, -24 - (T - 28.48) * 8, float(np.clip((T - 28.48) * 1.4, 0, 0.8)))
    # transition into the science graphic + S03 cues
    hit(A.riser(0.55), 28.9, -21)
    hit(A.boom(), 29.32, -16)
    hit(A.reverb(A.chime([523.25, 784.0], 1.5, 0.6, [1, 0.6]), 1.6, 0.5), 29.34, -30)
    hit(A.reverb(np.sin(2 * np.pi * np.cumsum(np.linspace(300, 600, N(1.5))) / SR) * np.hanning(N(1.5)), 1.0, 0.4), 29.95, -32)
    for k in range(10):
        u = 1 - (1 - (k + 1) / 10) ** (1 / 3)
        hit(A.tick(3800), 29.95 + u * (31.45 - 29.95), -31)
    hit(A.reverb(A.chime([880, 1320], 1.4, 0.5, [1, 0.5]), 1.2, 0.4), 31.45, -26)
    hit(A.reverb(A.chime([1046.5], 1.0, 0.4), 1.0, 0.4), 32.3, -28)
    hit(A.reverb(A.chime([784], 0.9, 0.35), 1.0, 0.4), 33.55, -29, -0.6)
    hit(A.reverb(A.chime([784], 0.9, 0.35), 1.0, 0.4), 33.7, -29, 0.6)
    q = np.sin(2 * np.pi * np.cumsum(np.linspace(233, 196, N(0.5))) / SR) * A.env_ad(N(0.5), 0.02, 0.2)
    hit(A.reverb(q, 1.0, 0.35), 35.35, -27)
    hit(A.thud(58, 0.5, 0.3), 36.5, -20)
    hit(A.whoosh(0.6, 500, 1500, q=1.3, shape=0.45), 37.27, -25, np.linspace(0.8, 0.3, N(0.6)))
    nsw = N(39.35 - 38.22)
    swp = np.sin(2 * np.pi * np.cumsum(np.linspace(392, 784, nsw)) / SR) * np.hanning(nsw) * 0.6
    hit(A.reverb(swp + A.whoosh(0, 600, 3000, q=2, shape=0.6, n=nsw) * 0.5, 1.0, 0.35), 38.22, -27, 0.3)
    for k in range(8):
        hit(A.tick(3200 + k * 150), 38.22 + (0.5 - 0.5 * np.cos(np.pi * k / 8)) * (39.35 - 38.22), -32, 0.3)
    hit(A.reverb(A.chime([523.25, 659.25, 783.99, 1174.66], 2.6, 1.0, [1, 0.7, 0.6, 0.35]), 1.8, 0.45), 39.74, -22, 0.3)
    for k in range(16):
        hit(A.chime([RNG.uniform(2600, 6200)], 0.4, RNG.uniform(0.05, 0.15)), 41.38 + RNG.uniform(0, 0.45), -30 + RNG.uniform(-4, 2), 0.3 + RNG.uniform(-0.3, 0.3))
    hit(A.highpass(A.noise(N(0.25)), 3000) * A.env_ad(N(0.25), 0.002, 0.06), 41.38, -27, 0.3)
    hit(A.reverb(A.chime([110, 220], 2.0, 0.8, [1, 0.4]), 1.5, 0.4), 42.22, -22, 0.2)

    # ---------------- act transitions (soft air)
    for T in (43.25, 62.25, 125.5, 157.85, 175.7, 212.45, 251.3, 352.05, 378.75, 414.1, 427.25):
        whoosh_at(T + 0.15, 0.7, -33, 400, 1300)

    # ---------------- S04 the rule (43.34–58.95)
    hit(A.reverb(A.chime([659.25, 987.77], 1.2, 0.5, [1, 0.5]), 1.2, 0.4), P(30) + 0.05, -31)
    whoosh_at(P(31) + 0.2, 0.6, -31, 400, 1400, pan=-0.6)
    whoosh_at(P(31) + 0.3, 0.6, -31, 400, 1400, pan=0.6)
    hit(A.pop(), P(32), -29)
    hit(A.reverb(A.chime([1318.5], 0.8, 0.3), 1.0, 0.4), P(32) + 0.05, -31)
    whoosh_at(46.75, 0.5, -29, 300, 1200)  # iris
    hit(A.swish(), 47.1, -28, 0.2)  # thumb
    hit(A.reverb(A.chime([1568, 2349], 0.9, 0.3, [1, 0.4]), 1.0, 0.35), P(34) + 0.1, -29)  # sharp
    for i in range(7):
        hit(A.tick(3000 + 200 * (i % 3)), 51.53 + i * 0.32, -31, -0.4 if i % 2 else 0.4)
        whoosh_at(51.53 + i * 0.32, 0.18, -38, 1500, 3500, pan=-0.4 if i % 2 else 0.4)
    for k in range(18):
        hit(A.chime([RNG.uniform(1800, 4200)], 0.5, 0.12), P(36) + 0.1 + k * 0.07, -36 + RNG.uniform(-2, 2), RNG.uniform(-0.6, 0.6))
    hit(A.reverb(A.chime([523.25, 783.99, 1046.5], 1.8, 0.7, [1, 0.6, 0.4]), 1.5, 0.45), P(37) + 0.1, -31)
    hit(A.thud(70, 0.3, 0.6), P(38), -27)
    hit(A.reverb(A.chime([440, 880], 1.6, 0.6, [1, 0.5]), 1.4, 0.45), P(38) + 0.02, -29)

    # ---------------- S05 title
    t360 = W("three", P(39))
    hit(A.riser(0.8), t360 - 0.8, -25)
    hit(A.boom(), t360, -19)
    hit(A.reverb(A.chime([523.25, 659.25, 783.99, 1046.5, 1568], 2.8, 1.1, [1, 0.8, 0.6, 0.4, 0.25]), 2.0, 0.5), t360 + 0.02, -21)
    whoosh_at(58.95 + 0.2, 0.6, -30, 500, 1500)

    # ---------------- S06 surprise party (62.30–73.62)
    t0 = P(40)
    hit(A.click(), t0 - 0.05, -28, 0.4)
    hit(A.creak(0.6, 240, 420), t0, -32, 0.4)
    steps(np.arange(t0 + 0.35, P(43) - 0.3, 0.52), -33, 0.2)
    for k in range(40):
        hit(A.tick(2600 + RNG.uniform(0, 2400)), P(45) + RNG.uniform(0, 0.85), -37 + RNG.uniform(-3, 1), RNG.uniform(-0.8, 0.8))
    tl = 71.0
    hit(A.click(), tl, -23, 0.5)
    whoosh_at(tl + 0.25, 0.4, -33, 400, 1100)
    hit(A.pop() * 0.6 + np.pad(A.highpass(A.noise(N(0.1)), 1500) * A.env_ad(N(0.1), 0.003, 0.03), (0, N(0.12) - N(0.1))), tl + 0.3, -29, 0.2)
    hit(sad_horn(0.95), tl + 0.55, -30, 0.3)
    whoosh_at(P(46) + 0.55, 0.35, -36, 600, 1500)  # shrug

    # ---------------- S07 pickpocket (73.72–82.45)
    whoosh_at(P(49) + 0.2, 0.6, -34, 250, 700, pan=-0.3)  # sneaky hand
    hit(A.reverb(A.chime([1046.5, 1568], 0.8, 0.25, [1, 0.4]), 1.0, 0.35), P(50), -31)  # Leo sees
    hit(A.thud(320, 0.05, 1.0), P(51) + 0.12, -24, 0.1)  # tap on the shoulder
    for i, T in enumerate(np.arange(P(53) + 0.05, 82.45, 0.16)):
        hit(A.footstep(0.8), T, -28 - i * 1.6, min(0.8, 0.1 + i * 0.12))

    # ---------------- S08 driving (82.55–95.7)
    whoosh_at(84.9, 0.45, -31, 350, 900, pan=-0.5)
    whoosh_at(86.45, 0.45, -31, 350, 900, pan=0.5)
    hit(A.reverb(A.chime([880, 1318.5], 1.0, 0.4, [1, 0.5]), 1.0, 0.4), P(57), -28)
    n = N(1.6)
    hit(A.whoosh(1.6, 180, 700, q=1.0, shape=0.55) + 0.4 * A.engine(1.6, 1.6) * np.hanning(n), 89.7, -24, np.linspace(-0.85, 0.7, n))
    for T in np.arange(89.95, 91.5, 0.37):
        hit(A.indicator(), T, -32, -0.2)
    hit(A.reverb(A.chime([1318.5], 0.7, 0.25), 0.8, 0.3), P(61) + 0.05, -33)

    # ---------------- S09 dodgeball (95.86–106.85)
    throwers = [360, 520, 680, 840, 1000]
    kinds = ["head", "torso", "legs", "torso", "head", "legs", "head", "torso", "legs", "head", "torso", "head"]
    for i, kd in enumerate(kinds):
        launch = 97.05 + i * 0.31
        flight = 0.62 if i % 4 == 2 else 0.42
        pan = (throwers[i % 5] - 960) / 900
        whoosh_at(launch + 0.05, 0.25, -31, 700, 1800, pan=pan)  # throw
        whoosh_at(launch + flight, 0.3, -27, 500, 2200, pan=0.1)  # ball past Leo
        if i % 2 == 0:
            hit(A.squeak(), launch + flight - 0.08, -33, 0.1)
        hit(A.ball_bounce(140), launch + flight + 0.28, -27 + RNG.uniform(-2, 1), 0.75)  # wall
    hit(A.buzzer(0.9), P(66) + 0.25, -25, 0.3)
    hit(A.applause(1.8, 160, 0.2), P(67) - 0.05, -27, 0.0)
    whoosh_at(P(68) + 0.05, 0.3, -31, 900, 2500)
    hit(A.page_flip(), P(68) + 0.1, -31)
    hit(A.scribble(0.9), P(68) + 0.5, -33, 0.2)

    # ---------------- S10 basketball (106.99–115.7)
    for i, T in enumerate(np.arange(107.15, 111.15, 0.42)):
        hit(A.ball_bounce(165), T, -29 + RNG.uniform(-2, 1), RNG.uniform(-0.6, 0.6))
    hit(A.reverb(A.chime([880, 1318.5], 0.9, 0.35, [1, 0.5]), 1.0, 0.4), P(71) - 0.1, -30)
    whoosh_at(111.2, 0.4, -33, 400, 1200)
    relX = P(72) + 0.12
    catchT = relX + 0.55
    shotT = catchT + 0.45
    swishT = P(73) + 0.02
    whoosh_at(relX + 0.25, 0.5, -30, 600, 1500, pan=-0.2)
    hit(A.thud(210, 0.06, 1.2), catchT, -25, 0.1)
    whoosh_at(shotT + 0.15, 0.4, -33, 800, 2000, pan=0.3)
    hit(net_swish(), swishT, -23, 0.5)
    hit(A.applause(1.2, 120, 0.15), swishT + 0.15, -32)
    whoosh_at(P(74) - 0.1, 0.35, -28, 500, 1800)
    hit(A.thud(150, 0.1, 1.0), P(74) + 0.4, -26, -0.3)  # clipboard clatter
    hit(A.rattle(0.35), P(74) + 0.45, -33, -0.3)

    # ---------------- S11 football (115.83–125.5)
    whoosh_at(P(77) + 0.2, 0.6, -32, 300, 900)  # ref's cone
    hit(A.reverb(A.chime([880, 1318.5], 1.0, 0.4, [1, 0.5]), 1.0, 0.4), P(78) + 0.1, -29)
    for T in (P(79) + 0.1, P(80) + 0.15, P(81) + 0.05):
        whoosh_at(T, 0.35, -30, 400, 1200, pan=0.3)
        hit(A.whistle(0.32), T + 0.12, -28, 0.4)
        hit(A.lowpass(A.crowd(1.2, 1.0), 1200) * np.hanning(N(1.2)), T + 0.1, -33)

    # ---------------- S12 nature (125.62–136.3)
    hit(A.ping(880), P(83) + 0.1, -30, -0.3)
    hit(A.ping(1046.5), P(84) + 0.1, -30, 0.3)
    hit(A.reverb(A.chime([659.25, 987.77], 1.0, 0.4), 1.0, 0.4), P(85) + 0.1, -32)
    for k in range(3):
        whoosh_at(P(86) + 0.1 + k * 0.18, 0.35, -32, 700, 2000, pan=-0.6 + 0.6 * k)
    hit(A.reverb(A.chime([523.25, 783.99, 1046.5, 1318.5], 1.8, 0.7, [1, 0.7, 0.5, 0.3]), 1.5, 0.45), P(87) + 0.1, -27)

    # ---------------- S13 the catch (136.52–151)
    hit(A.flutter(1.5), P(90), -31, -0.3)
    for T in (P(91), P(93), P(95)):
        whoosh_at(T + 0.15, 0.35, -29, 300, 900)
    car_pass = P(92) + 0.15
    n = N(2.4)
    hit(A.whoosh(2.4, 150, 600, q=1.0, shape=0.55) + 0.3 * A.engine(2.4, 1.3) * np.hanning(n), car_pass - 1.3, -29, np.linspace(-0.8, 0.8, n))
    hit(A.horn(0.75), car_pass, -24, 0.3)
    hit(A.flag_flap(1.6), P(94), -30, 0.4)
    nn = 16
    for k in range(nn):
        u = (k / nn) ** 0.7
        hit(A.ping(RNG.choice([880, 1046.5, 1318.5, 1568, 1760])), P(96) + 0.05 + u * 1.5, -33 + k * 0.2, RNG.uniform(-0.8, 0.8))
    hit(A.riser(1.5), P(96) + 0.1, -31)

    # ---------------- S14 class (150.95–157.85)
    for k in range(6):
        hit(A.ping(1046.5 + k * 110), 151.3 + k * 0.22, -35, -0.7 + k * 0.28)
    hit(A.ping(1318.5), P(98) + 0.1, -31, -0.3)
    whoosh_at(P(99) + 0.1, 0.3, -36, 600, 1500)
    hit(whisper(0.9), P(100) + 0.1, -34, -0.5)

    # ---------------- S15 Mr. Black (157.95–175.7)
    hit(A.click(), 158.15, -27, 0.5)
    hit(A.creak(0.7, 200, 320), 158.2, -31, 0.5)
    steps(np.arange(158.65, 160.3, 0.55), -27, 0.3, heavy=1.1, hard=True)
    hit(servo(0.5), P(104) + 0.15, -33, 0.4)
    for T in (P(105), P(106), P(107)):
        whoosh_at(T + 0.05, 0.3, -31, 500, 1500)
        hit(A.thud(80, 0.2, 1.0), T + 0.12, -25)
    hit(A.reverb(A.chime([1318.5, 1760, 2637], 1.2, 0.3, [1, 0.6, 0.4]), 1.0, 0.35), P(107) + 0.2, -31)
    hit(A.click(), P(111) + 0.55, -26, 0.4)

    # ---------------- S16 the cost (175.92–184.4)
    for k in range(26):
        u = k / 26
        hit(A.ping(RNG.choice([880, 1046.5, 1318.5, 1568])), P(113) + 0.1 + 2.3 * u ** 0.8, -38 + 6 * u, RNG.uniform(-0.8, 0.8))
    for T in np.arange(P(114) + 0.05, P(116) - 0.2, 0.5):
        hit(A.tick(2200), T, -32, 0.2)
    hit(A.static(0.9, 0.6) * np.hanning(N(0.9)), P(115), -33)
    hit(A.reverb(A.chime([783.99, 1174.66], 1.2, 0.45, [1, 0.5]), 1.0, 0.4), P(116) + 0.1, -31)

    # ---------------- S17 dopamine (184.62–207.35)
    for T in (P(117), P(118), P(119), P(120)):
        whoosh_at(T + 0.1, 0.45, -31, 500, 1500)
    hit(A.pop(), P(118) + 0.4, -31)
    hit(A.reverb(A.chime([392, 587.33], 1.0, 0.4), 1.0, 0.4), P(121) + 0.1, -33)
    hit(spark_crackle(0.9), P(122) + 0.2, -29)
    hit(A.reverb(A.chime([1568, 2093, 2637], 1.4, 0.5, [1, 0.6, 0.4]), 1.2, 0.4), P(122) + 0.25, -29)
    for T in np.arange(P(123) + 0.1, P(123) + 2.0, 0.33):
        hit(A.tick(3400), T, -34, 0.2)
    hit(tone_glide(1200, 200, 0.9) * 0.5 + spark_crackle(0.9) * 0.6, P(125) + 0.1, -29)  # fizzle
    for T in np.arange(P(126) + 0.1, P(127), 0.25):
        hit(A.tick(2800), T, -34, -0.2)

    # ---------------- S18 no off switch (207.57–212.45)
    hit(A.click(), 207.57 + 1.05, -24, 0.3)
    hit(A.click(), 207.57 + 1.55, -27, 0.3)
    for k, T in enumerate(np.arange(P(130) + 0.2, 212.5, 0.42)):
        hit(A.chime([4200 + 300 * (k % 3)], 0.12, 0.03), T, -42, 0.6 * (-1) ** k)  # crickets

    # ---------------- S19–S20 Mia's notebook (212.77–251.6)
    for T in (P(134), P(137), P(139), P(141), P(146)):
        hit(A.page_flip(), T + 0.05, -30, 0.2)
    hit(A.scribble(1.0), P(135) + 0.3, -33, 0.2)
    hit(A.scribble(0.6), P(137) + 0.6, -34, 0.2)
    hit(A.scribble(0.7), P(143) + 0.3, -34, 0.2)
    hit(A.page_flip(), P(153) + 0.1, -29, -0.2)  # concert ticket
    hit(cardboard(), P(155) + 0.2, -31, -0.2)
    hit(A.click(), P(156) + 0.3, -32, 0.3)

    # ---------------- S21–S23 concert (251.61–286)
    hit(A.click(), P(164) - 0.1, -27, 0.4)
    st = A.static(2.4, 0.8) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * A.tt(2.4)))
    hit(fades(st, 0.1, 0.4), P(164), -33, 0.4)
    hit(fades(A.static(2.8, 0.6), 0.1, 0.6), P(165), -38, 0.4)
    hit(A.metal_groan(1.6), P(170) + 0.1, -26, -0.5)
    hit(A.rattle(1.3), P(172) + 0.1, -28, -0.3)
    hit(A.creak(1.0, 300, 600), P(172) + 0.2, -33, -0.3)
    hit(A.bolt_snap(), P(173) + 0.05, -22, -0.3)
    hit(A.tick(3000), P(175), -29)
    hit(A.tick(3000), P(176) + 0.1, -29)
    hit(A.reverb(A.chime([1318.5, 1760], 1.0, 0.4, [1, 0.5]), 1.0, 0.4), P(178) + 0.05, -28)
    hit(A.thud(50, 0.6, 0.2), P(180), -25)

    # ---------------- S24 physics (286–302)
    hit(A.reverb(A.chime([659.25], 0.8, 0.3), 0.8, 0.3), P(181) + 0.1, -32)
    hit(falling_whistle(1.25), P(182) + 0.3, -29)
    hit(A.thud(65, 0.3, 0.5), P(182) + 1.55, -29)
    hit(snip(), P(183) + 0.25, -29)
    hit(A.tick(2600), P(184) + 0.05, -30)
    whoosh_at(P(185) + 0.3, 0.8, -32, 400, 1400, pan=np.linspace(-0.6, 0.6, N(0.8)))
    for k in range(5):
        hit(A.footstep(0.7), P(186) + 0.2 + k * 0.2, -33, 0.0)
    for k in range(3):
        hit(A.tick(2400 + 300 * k), P(187) + k * 0.25, -29)
    hit(A.stamp(), P(189) + 0.05, -22, 0.1)

    # ---------------- S25–S26 choice, scream, rescue, crash (302.28–321.4)
    whoosh_at(P(192) + 0.1, 0.6, -27, 300, 1500, pan=np.linspace(-0.7, 0.7, N(0.6)))
    whoosh_at(P(193) + 0.05, 0.4, -30, 500, 1400)
    hit(A.lowpass(A.crowd(1.6, 1.0), 2000) * np.hanning(N(1.6)), P(197) + 0.05, -27)
    whoosh_at(P(197) + 0.2, 0.9, -28, 250, 900, pan=np.linspace(-0.8, 0.8, N(0.9)))
    hit(A.reverb(A.chime([987.77, 1318.5], 1.0, 0.4, [1, 0.6]), 1.0, 0.4), P(199) + 0.02, -31)
    whoosh_at(P(200) + 0.35, 0.5, -26, 300, 900, pan=-0.3)
    crash_t = P(201) + 0.6  # S25 CRASH = tCrash + 0.05 + 0.55
    hit(A.metal_groan(0.6), P(201) - 0.1, -30, -0.2)
    hit(falling_whistle(0.55), P(201) + 0.03, -26, -0.1)
    hit(A.crash(), crash_t, -8, 0.0)
    hit(A.reverb(A.crash(), 2.2, 0.6, 4000), crash_t + 0.02, -16, 0.2)

    # ---------------- S27–S28 aftermath (321.45–352)
    st = A.static(2.2, 0.9) * (0.6 + 0.4 * np.sin(2 * np.pi * 4 * A.tt(2.2)))
    hit(fades(st, 0.05, 0.3), P(203), -32, 0.4)
    hit(A.stamp(), P(204) + 0.05, -21, 0.2)
    for k in range(14):
        hit(A.tick(3600 - 80 * k), P(205) + 0.4 + 0.8 * (k / 14) ** 0.6, -33, 0.2)
    hit(A.thud(55, 0.5, 0.2), P(206), -27)
    whoosh_at(P(209) + 0.15, 0.4, -31, 500, 1500)
    for i in range(6):
        hit(A.metal_ping(), P(210) + 0.2 + i * 0.55, -28 + RNG.uniform(-1, 1), -0.6 + 0.24 * i)
    for k, T in enumerate(np.arange(P(213) + 0.3, P(215) - 0.3, 0.36)):
        hit(A.metal_ping((420 + 30 * (k % 4), 1100, 1700), 0.25), T, -36, RNG.uniform(-0.5, 0.5))  # engineers climbing
    hit(power_down(1.6), P(215), -24)
    hit(A.applause(5.2, 260, 1.4), P(217) - 0.1, -21)

    # ---------------- S29 epilogue (352.37–379.09)
    for T in np.arange(P(223) + 0.05, P(225) + 0.2, 0.34):
        hit(A.tiptoe(), T, -37 + RNG.uniform(-1.5, 1.5), -0.5)
    whoosh_at(P(226) - 0.05, 0.35, -29, 500, 1600, pan=-0.3)
    whoosh_at(P(227) + 0.2, 0.45, -26, 300, 1000, pan=0.1)
    whoosh_at(P(227) + 0.6, 0.6, -31, 700, 2000, pan=np.linspace(0.1, 0.7, N(0.6)))  # sandwich
    hit(A.thud(260, 0.06, 0.8), P(227) + 1.3, -32, 0.7)
    hit(firework(), P(232) + 0.05, -23)
    hit(A.page_flip(), P(233) - 0.1, -28)
    hit(A.scribble(0.35), P(235) - 0.05, -30, 0.2)
    hit(A.scribble(0.3), P(236) + 0.9, -32, 0.2)
    whoosh_at(P(238) + 0.4, 0.8, -33, 300, 900)

    # ---------------- S30–S32 reality check (379.09–414.1)
    whoosh_at(P(241) + 0.05, 0.35, -28, 500, 1500)
    hit(A.thud(90, 0.15, 1.0), P(241) + 0.2, -25)
    hit(A.stamp(), P(242) + 0.3, -27)
    whoosh_at(P(243) + 0.5, 1.0, -32, 400, 1500, pan=np.linspace(-0.6, 0.6, N(1.0)))
    hit(A.reverb(A.chime([659.25, 987.77], 1.0, 0.4, [1, 0.5]), 1.0, 0.4), P(244) + 0.1, -31)
    hit(A.click(), P(245), -29)
    for T in np.arange(P(246) + 0.6, P(247) - 0.2, 0.55):
        hit(A.ball_bounce(170), T, -36, RNG.uniform(-0.5, 0.5))
    for k in range(6):
        hit(gorilla_thud(), P(247) + 0.6 + k * 0.22 + (0.4 if k >= 3 else 0), -30, 0.3)
    hit(A.reverb(A.chime([783.99, 1174.66], 1.2, 0.45, [1, 0.5]), 1.0, 0.4), P(248) + 0.1, -30)
    hit(spark_crackle(0.6), P(249) + 0.3, -32)
    hit(A.stamp(), P(250) + 0.4, -28)
    hit(A.swish(), P(251) + 0.25, -30)
    hit(A.reverb(A.chime([523.25], 0.9, 0.35), 0.9, 0.35), P(252) + 0.1, -33)
    hit(A.reverb(A.chime([440], 0.9, 0.35), 0.9, 0.35), P(253) + 0.1, -33)
    hit(A.reverb(A.chime([392], 0.9, 0.35), 0.9, 0.35), P(254) + 0.1, -33)

    # ---------------- S33 phone (414.34–427.25)
    tb = P(256)
    for k in range(3):
        hit(A.phone_buzz(0.4), tb + k * 0.8, -24, 0.55)
    hit(A.pop(), P(258), -26, 0.0)
    hit(A.pop(), P(260), -26, 0.0)
    hit(A.reverb(A.chime([739.99, 1108.73], 2.0, 0.8, [1, 0.5]), 1.8, 0.5), 426.6, -29, 0.3)
    whoosh_at(426.6, 0.6, -31, 300, 900)

    # ---------------- S34 outro (427.49–439.72)
    hit(A.reverb(A.chime([523.25, 783.99], 1.2, 0.5, [1, 0.5]), 1.0, 0.4), P(261) + 0.1, -31)
    hit(ui_pop(), P(262), -26, -0.3)
    hit(A.ping(1318.5), P(263) + 0.1, -31, 0.1)
    hit(ui_pop(), P(264), -26, 0.0)
    hit(ui_pop(), P(265), -25, 0.3)


# ============================================================== DUCKING
def voice_activity(narr):
    """0..1 'voice present' curve with 80 ms look-ahead, 400 ms hold, smooth."""
    blk = 441  # 10 ms
    nb = len(narr) // blk + 1
    x = np.pad(np.abs(narr), (0, nb * blk - len(narr)))
    pk = x.reshape(nb, blk).max(1)
    v = np.clip((pk - 0.015) / 0.06, 0, 1)
    v = maximum_filter1d(v, size=41, origin=0)  # ±200 ms hold (no swells between words)
    v = np.roll(v, -8)  # 80 ms look-ahead
    # attack 60 ms / release 450 ms one-pole
    out = np.zeros_like(v)
    e = 0.0
    a_up, a_dn = 1 - np.exp(-1 / 6), 1 - np.exp(-1 / 45)
    for i, s in enumerate(v):
        e += (s - e) * (a_up if s > e else a_dn)
        out[i] = e
    return np.repeat(out, blk)[: len(narr)]


def level_music(L, R, windows):
    """per-section loudness: bring each window's active RMS to its target."""
    pts = []
    m = (L + R) / 2
    for t0, t1, target in windows:
        seg = m[int(t0 * SR): int(t1 * SR)]
        b = seg[: len(seg) // 4410 * 4410].reshape(-1, 4410)
        r = np.sqrt((b ** 2).mean(1))
        act = r[r > db(-60)]
        cur = 20 * np.log10(np.sqrt((act ** 2).mean()) + 1e-12) if len(act) else target
        g = float(np.clip(target - cur, -18, 18))
        pts += [(t0 + 0.2, g), (t1 - 0.2, g)]
    ts, gs = zip(*pts)
    gain = db(np.interp(np.arange(len(L)) / SR, ts, gs))
    return L * gain, R * gain, pts


MUSIC_WINDOWS = [
    (0.3, 28.9, -27), (29.0, 43.3, -28), (43.3, 58.8, -28), (58.8, 62.3, -26),
    (62.3, 125.6, -27), (125.6, 136.5, -28), (136.5, 157.9, -28), (157.9, 176.0, -27),
    (176.0, 212.6, -28), (212.7, 251.4, -28), (251.6, 286.0, -30), (286.0, 302.3, -29),
    (302.3, 318.5, -27), (321.5, 342.2, -30), (342.2, 347.0, -27), (347.0, 352.3, -28),
    (352.4, 365.8, -27), (365.8, 369.3, -26), (369.3, 379.0, -28), (379.1, 414.3, -28),
    (414.3, 427.4, -28), (427.5, 436.8, -27), (436.8, T_END, -25),
]


def main():
    mp3 = os.path.join(ROOT, "public/audio/narration.mp3")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    src = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    assert len(src) <= TOTAL, (len(src), TOTAL)
    narr = np.zeros(TOTAL)
    narr[: len(src)] = src  # untouched; zero pad of the last frame only

    print("beds…", flush=True)
    build_beds()
    print("sfx…", flush=True)
    build_sfx()
    print("score…", flush=True)
    mL, mR = make_score(TOTAL)
    mL, mR, music_pts = level_music(mL, mR, MUSIC_WINDOWS)

    print("mix…", flush=True)
    v = voice_activity(narr)
    # music ducks 6 dB below 250 Hz and 10 dB above it, clearing the speech band
    g_lo, g_hi = db(-6.0 * v), db(-10.0 * v)
    mlL, mlR = A.lowpass(mL, 250, 4), A.lowpass(mR, 250, 4)
    mL = mlL * g_lo + (mL - mlL) * g_hi
    mR = mlR * g_lo + (mR - mlR) * g_hi
    g_music = 1.0
    g_beds = db(-4.5 * v)
    g_sfx = db(-2.0 * v)
    oL = mL + beds.L * g_beds + sfx.L * g_sfx
    oR = mR + beds.R * g_beds + sfx.R * g_sfx
    # head and tail: everything except the narration follows the picture fades
    t = np.arange(TOTAL) / SR
    edge = np.clip(t / 0.8, 0, 1) * np.clip((T_END - 0.05 - t) / 0.85, 0, 1)
    oL *= edge
    oR *= edge
    # protective rider on the non-narration stem only (ceiling −1.0 dBFS)
    ceil = db(-1.0)
    rider = np.ones(TOTAL)
    for o in (oL, oR):
        s = narr + o
        over = np.abs(s) > ceil
        if over.any():
            need = np.ones(TOTAL)
            need[over] = np.clip((ceil - np.abs(narr[over])) / (np.abs(o[over]) + 1e-9), 0, 1)
            rider = np.minimum(rider, need)
    if (rider < 1).any():
        w = N(0.02)
        rider = uniform_filter1d(minimum_filter1d(rider, size=2 * w + 1), size=w)
    oL *= rider
    oR *= rider
    L = narr + oL
    R = narr + oR

    out = os.path.join(ROOT, "public/audio/film_mix.wav")
    sf.write(out, np.stack([L, R], axis=1).astype(np.float32), SR, subtype="FLOAT")
    stems = os.path.join(ROOT, "renders/qa/stems_film")
    os.makedirs(stems, exist_ok=True)
    sf.write(os.path.join(stems, "music.wav"), np.stack([mL * g_music, mR * g_music], 1).astype(np.float32), SR, subtype="PCM_16")
    sf.write(os.path.join(stems, "beds.wav"), np.stack([beds.L * g_beds, beds.R * g_beds], 1).astype(np.float32), SR, subtype="PCM_16")
    sf.write(os.path.join(stems, "sfx.wav"), np.stack([sfx.L * g_sfx, sfx.R * g_sfx], 1).astype(np.float32), SR, subtype="PCM_16")

    # ---- verification: read the written file back
    back, sr = sf.read(out, dtype="float64")
    nb = back.shape[0]
    bL, bR = back[:, 0], back[:, 1]

    def rms_db(x):
        return round(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12), 2)

    def active_rms(x, mask):
        return rms_db(x[mask]) if mask.any() else None

    speech = v > 0.5
    report = {
        "samples": nb,
        "expected_samples": TOTAL,
        "seconds": round(nb / sr, 4),
        "sample_rate": sr,
        "channels": back.shape[1],
        # the narration inside the mix is the source decode, sample for sample
        # file − non-narration stems − source narration (float32 storage rounding only)
        "narration_residual_in_file_max": float(np.abs((bL + bR) / 2 - (oL + oR) / 2 - narr)[: len(src)].max()),
        "narration_exact_float64_check": float(np.abs(narr[: len(src)] - src).max()),
        "peak_dbfs_L": round(20 * np.log10(np.abs(bL).max()), 2),
        "peak_dbfs_R": round(20 * np.log10(np.abs(bR).max()), 2),
        "rider_min_db": round(20 * np.log10(rider.min()), 2),
        "rider_engaged_ms": round(float((rider < db(-0.1)).sum() / SR * 1000), 1),
        "narration_active_rms_db": active_rms(narr, speech),
        "music_rms_under_voice_db": active_rms((mL * g_music + mR * g_music) / 2, speech),
        "music_rms_in_gaps_db": active_rms((mL * g_music + mR * g_music) / 2, ~speech & (np.abs(mL) > 1e-4)),
        "beds_rms_under_voice_db": active_rms((beds.L * g_beds + beds.R * g_beds) / 2, speech),
        "sfx_peak_dbfs": round(20 * np.log10(np.abs(np.concatenate([sfx.L, sfx.R])).max()), 2),
        "music_section_gains_db": [round(g, 1) for _, g in music_pts[::2]],
    }
    print(json.dumps(report, indent=1))
    assert nb == TOTAL
    assert report["narration_exact_float64_check"] == 0.0
    assert report["narration_residual_in_file_max"] < 1e-6
    assert max(report["peak_dbfs_L"], report["peak_dbfs_R"]) < -0.5
    with open(os.path.join(ROOT, "renders/qa/film_mix_report.json"), "w") as f:
        json.dump(report, f, indent=1)


if __name__ == "__main__":
    main()
