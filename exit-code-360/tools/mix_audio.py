#!/usr/bin/env python3
"""EXIT CODE 360 — POC sound design + mix.

* Narration: sample-exact slice of the approved MP3 [START, END). Never
  time-stretched, pitched, compressed or re-levelled.
* SFX / ambience: synthesised here (numpy/scipy), so every asset is original.
* Cue times are parsed from src/scenes/poc/timeline.ts (single source of truth).
* Ambience and music beds duck under the narration (envelope follower).

Usage: python3 tools/mix_audio.py            -> public/audio/poc_mix.wav
"""
import json
import os
import re
import subprocess

import numpy as np
import soundfile as sf
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
RNG = np.random.default_rng(360)


# --------------------------------------------------------------------------- cues
def parse_timeline():
    src = open(os.path.join(ROOT, "src/scenes/poc/timeline.ts")).read()
    start = float(re.search(r"export const START = ([\d.]+)", src).group(1))
    end = float(re.search(r"export const END = ([\d.]+)", src).group(1))
    block = src[src.index("export const CUE = {"): src.index("} as const")]
    cue = {k: float(v) for k, v in re.findall(r"(\w+): ([\d.]+),", block)}
    return start, end, cue


START, END, CUE = parse_timeline()
N = int(round((END - START) * SR))


def at(t):
    """narration time -> sample index in the POC buffer"""
    return int(round((t - START) * SR))


# --------------------------------------------------------------------- helpers
def env_ad(n, attack, decay_tau):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay_tau)


def noise(n):
    return RNG.standard_normal(n)


def bandpass(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lowpass(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def highpass(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def db(x):
    return 10 ** (x / 20)


def norm_peak(x, peak_db):
    m = np.max(np.abs(x)) + 1e-12
    return x / m * db(peak_db)


def sweep_bp(n, f0, f1, q=2.0, curve=1.0):
    """Noise through a band-pass whose centre glides f0 -> f1 (block-wise)."""
    x = noise(n)
    out = np.zeros(n)
    blk = 512
    win = np.hanning(blk * 2)
    for s in range(0, n, blk):
        u = (s / max(1, n - 1)) ** curve
        fc = f0 * (f1 / f0) ** u
        lo, hi = fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 - 100)
        seg = x[max(0, s - blk): s + blk]
        y = bandpass(seg, lo, hi)
        w = win[: len(y)]
        out[max(0, s - blk): max(0, s - blk) + len(y)] += y * w
    return out


def reverb(x, seconds=0.9, mix=0.25, lp=6000):
    n = int(seconds * SR)
    ir = noise(n) * np.exp(-np.arange(n) / SR * (6.9 / seconds))
    ir = lowpass(ir, lp)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    wet = signal.fftconvolve(x, ir)[: len(x)]
    return x * (1 - mix) + wet * mix


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, x, t, gain_db=0.0, pan=0.0):
        """pan -1 (left) .. +1 (right), constant power; pan may be an array."""
        i = at(t)
        if i >= N:
            return
        if i < 0:
            x = x[-i:]
            if np.ndim(pan):
                pan = pan[-i:]
            i = 0
        x = x[: N - i] * db(gain_db)
        p = pan[: len(x)] if np.ndim(pan) else pan
        th = (np.asarray(p) + 1) * np.pi / 4
        self.L[i: i + len(x)] += x * np.cos(th)
        self.R[i: i + len(x)] += x * np.sin(th)


# ------------------------------------------------------------------- synths
def bell(double=True):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f, a, tau in [(2350, 1.0, 0.9), (3550, 0.55, 0.6), (5450, 0.35, 0.35), (6800, 0.2, 0.25), (8460, 0.12, 0.18)]:
        out += a * np.sin(2 * np.pi * f * t + RNG.uniform(0, 6)) * np.exp(-t / tau)
    out *= np.clip(t / 0.002, 0, 1)
    if double:  # clapper rattle: second strike 45 ms later
        d = int(0.045 * SR)
        out[d:] += 0.7 * out[:-d]
    return out * (1 + 0.15 * np.sin(2 * np.pi * 7 * t))  # slight beating


def thud(f=85, dur=0.12, click=0.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * f * t * (1 - 0.3 * t / dur)) * np.exp(-t / (dur * 0.35))
    tick = lowpass(noise(n), 1800) * np.exp(-t / 0.012) * click
    return body + tick


def footstep(heavy=1.0):
    return thud(f=95 + RNG.uniform(-10, 10), dur=0.1, click=0.6) * heavy


def whoosh(dur, f0, f1, curve=1.0, q=1.6, shape=0.35, n=None):
    n = n or int(round(dur * SR))
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * np.clip(t, 0, 1)) ** 1.5
    env *= np.exp(-((t - shape) ** 2) / 0.12)
    return sweep_bp(n, f0, f1, q, curve) * env


def chime(freqs, dur=1.6, tau=0.6, amps=None):
    n = int(dur * SR)
    t = np.arange(n) / SR
    amps = amps or [1.0] * len(freqs)
    out = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / (tau * (1 - 0.4 * k / len(freqs)))) for k, (f, a) in enumerate(zip(freqs, amps)))
    return out * np.clip(t / 0.004, 0, 1)


def gull_call(dur=0.42, f_shape=(1250, 2050, 1150), rough=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    f = np.interp(u, [0, 0.25, 1], f_shape)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(np.sin(k * ph) / k ** 1.2 for k in range(1, 7))
    am = 1 + rough * np.sin(2 * np.pi * 34 * t)
    breath = bandpass(noise(n), 1500, 4500) * 0.25
    env = np.clip(u / 0.06, 0, 1) * np.clip((1 - u) / 0.35, 0, 1)
    y = bandpass(tone * am + breath, 700, 5200) * env
    return y


def flap():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    return bandpass(noise(n), 250, 2200) * np.sin(np.pi * t / t[-1]) ** 2


def crunch():
    out = np.zeros(int(0.35 * SR))
    for k in range(7):
        s = int(RNG.uniform(0, 0.22) * SR)
        b = bandpass(noise(int(0.018 * SR)), 1200, 6000) * np.hanning(int(0.018 * SR))
        out[s: s + len(b)] += b * RNG.uniform(0.4, 1)
    return out


def tick(f=4200):
    n = int(0.025 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.005)


def boom():
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    f = 62 * np.exp(-t * 0.6) + 30
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    air = lowpass(noise(n), 400) * np.exp(-t / 0.25) * 0.5
    return (body + air) * np.clip(t / 0.01, 0, 1)


def riser(dur):
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    nz = sweep_bp(n, 300, 5000, q=1.4, curve=1.6) * u ** 2
    f = 180 * (4 ** u)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 * u ** 2
    return (nz + tone) * np.clip((1 - u) / 0.04, 0, 1)


# -------------------------------------------------------------- ambience beds
def sea_bed(n):
    t = np.arange(n) / SR
    surf = lowpass(np.cumsum(noise(n)) * 0.02, 700)
    surf = highpass(surf, 60)
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 6.3 + 1.0) ** 2
    wash = bandpass(noise(n), 400, 2600) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 6.3 + 2.2) ** 8) * 0.35
    wind = bandpass(noise(n), 250, 1100) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 9.1))
    return surf / (np.std(surf) + 1e-9) * swell + wash / (np.std(wash) + 1e-9) * 0.5 + wind / (np.std(wind) + 1e-9) * 0.25


def pad_bed(n):
    t = np.arange(n) / SR
    chord = [73.42, 146.83, 220.0, 329.63, 349.23, 440.0]  # D2 D3 A3 E4 F4 A4: Dm(add9)
    amps = [0.5, 0.6, 0.45, 0.25, 0.22, 0.12]
    x = np.zeros(n)
    for f, a in zip(chord, amps):
        det = 1 + RNG.uniform(-0.0015, 0.0015)
        x += a * (np.sin(2 * np.pi * f * det * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t + 1))
    x *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.18 * t)
    return lowpass(x, 1400)


def narration_envelope(x):
    a = np.abs(x)
    env = np.zeros_like(a)
    att = np.exp(-1 / (0.02 * SR))
    rel = np.exp(-1 / (0.35 * SR))
    e = 0.0
    # vectorised approximation: block peak then smooth
    blk = 256
    peaks = np.array([a[i: i + blk].max() for i in range(0, len(a), blk)])
    sm = np.zeros_like(peaks)
    for i, p in enumerate(peaks):
        c = att ** blk if p > e else rel ** blk
        e = c * e + (1 - c) * p
        sm[i] = e
    env = np.repeat(sm, blk)[: len(a)]
    return env


# ------------------------------------------------------------- Leo / Mia feet
def track(T, keys):
    if T <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if T <= t1:
            u = (T - t0) / (t1 - t0)
            e = 4 * u ** 3 if u < 0.5 else 1 - (-2 * u + 2) ** 3 / 2
            return v0 + (v1 - v0) * e
    return keys[-1][1]


def contact_times(vkeys, t0, t1, stride, phase0=0.25):
    """Return times when a foot plants (phase = 0.25 + k/2) for a speed profile."""
    dt = 1 / 600
    dist, T, times = 0.0, t0, []
    nxt = phase0
    while T < t1:
        dist += track(T, vkeys) * dt
        if dist / stride >= nxt:
            times.append(T)
            nxt += 0.5
        T += dt
    return times


def main():
    # ---- narration slice (exact samples, untouched)
    mp3 = os.path.join(ROOT, "public/audio/narration.mp3")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    narr_full = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    s0 = int(round(START * SR))
    narr = narr_full[s0: s0 + N].copy()
    assert len(narr) == N
    # 8 ms safety fades at the cut points (both land in measured pauses)
    f = int(0.008 * SR)
    narr[:f] *= np.linspace(0, 1, f)
    narr[-f:] *= np.linspace(1, 0, f)

    sfx = Bus()
    beds = Bus()

    # ---- ambience: seaside (shots A–C), pad (science shot)
    nb = at(29.6)
    sea = sea_bed(nb)
    sea = norm_peak(sea, -27)
    fade = np.ones(nb)
    fade[: int(0.4 * SR)] = np.linspace(0, 1, int(0.4 * SR))
    fade[at(28.9):] = np.linspace(1, 0, nb - at(28.9))
    beds.add(sea * fade, START, pan=0.0)
    # cut to the two-shot: slightly closer, warmer bed (no gap, just a level step)
    pad_start = 29.2
    npad = N - at(pad_start)
    pad = norm_peak(pad_bed(npad), -30)
    pfade = np.ones(npad)
    pfade[: int(1.5 * SR)] = np.linspace(0, 1, int(1.5 * SR)) ** 2
    pfade[-int(0.5 * SR):] *= np.linspace(1, 0, int(0.5 * SR))
    beds.add(pad * pfade, pad_start)
    # distant gulls in the bed
    for tg, pan in [(14.4, 0.6), (20.3, -0.4)]:
        beds.add(reverb(gull_call(0.38, (1200, 1700, 1050), 0.5), 1.2, 0.5, 3500), tg, gain_db=-30, pan=pan)

    # ---- shot A: footsteps (Leo + Mia), bell, bike pass, dancer swish
    leo_v = [(START, 190), (16.2, 190), (16.5, 95), (17.1, 26), (17.2, 14), (18.3, 14), (18.8, 190)]
    for T in contact_times(leo_v, START, 16.4, 262 * 0.82) + [tt for tt in contact_times(leo_v, START, CUE["cut1"], 262 * 0.82) if tt > 18.55]:
        sfx.add(footstep(1.0), T, gain_db=-29, pan=-0.1)
    mia_v = [(START, 190), (16.4, 190), (16.95, 0)]
    for T in contact_times(mia_v, START, 16.9, 180 * 0.79):
        sfx.add(footstep(0.6), T, gain_db=-34, pan=-0.35)
    sfx.add(bell(), CUE["bell1"], gain_db=-18, pan=-0.75)
    sfx.add(bell(), CUE["bell2"], gain_db=-19, pan=-0.7)
    # bike: tyre hum + freewheel ticks, loudest at the pass, panning L -> R
    t0b, t1b = 15.0, 18.2
    nbk = int((t1b - t0b) * SR)
    tt = t0b + np.arange(nbk) / SR
    prox = 1 / (1 + ((tt - CUE["cyclistPass"]) * 2.4) ** 2)
    hum = lowpass(bandpass(noise(nbk), 120, 900), 700) * prox
    ticks = np.zeros(nbk)
    rate = 11.0
    k = 0.0
    while k < (t1b - t0b):
        i = int(k * SR)
        tk = highpass(noise(int(0.004 * SR)), 2500) * np.hanning(int(0.004 * SR))
        ticks[i: i + len(tk)] += tk[: nbk - i]
        k += 1 / rate
    ticks *= prox * 0.6
    pass_wh = np.zeros(nbk)
    w = whoosh(0.9, 900, 380, q=1.2, shape=0.5)
    ip = int((CUE["cyclistPass"] - 0.45 - t0b) * SR)
    pass_wh[ip: ip + len(w)] += w
    bike = norm_peak(hum, 1) * 0.5 + norm_peak(ticks, 1) * 0.25 + norm_peak(pass_wh, 1) * 0.9
    pan = np.clip((tt - CUE["cyclistPass"]) * 1.1, -0.9, 0.9)
    sfx.add(bike, t0b, gain_db=-17, pan=pan)
    sfx.add(whoosh(0.55, 500, 1600, q=1.4, shape=0.45), CUE["stepStart"] + 0.1, gain_db=-24, pan=0.1)
    sfx.add(reverb(chime([2093, 3136, 4186], 1.2, 0.35, [1, 0.5, 0.3]), 1.2, 0.4), 16.98, gain_db=-31, pan=0.15)
    sfx.add(reverb(chime([2637, 3951], 1.0, 0.3, [1, 0.5]), 1.0, 0.4), CUE["flourish"], gain_db=-33, pan=0.2)

    # ---- shot B/C: Leo's last steps, Mia's hurry, gull business
    for T in contact_times([(CUE["cut1"], 150), (19.3, 150), (19.8, 0)], CUE["cut1"], 19.8, 262 * 0.82 * 0.8):
        sfx.add(footstep(0.9), T, gain_db=-30, pan=0.3)
    for T in np.arange(21.42, 22.3, 0.26):
        sfx.add(footstep(0.55), T, gain_db=-32, pan=-0.2)
    sfx.add(reverb(gull_call(0.42), 0.9, 0.35, 5000), CUE["gullAppear"] + 0.1, gain_db=-26, pan=0.7)
    sfx.add(whoosh(1.1, 400, 2600, q=1.5, curve=1.4, shape=0.7), CUE["gullSnap"] - 0.75, gain_db=-19, pan=np.linspace(0.6, -0.5, int(1.1 * SR)))
    snap = tick(2600) * 0.6
    snap[: int(0.012 * SR)] += highpass(noise(int(0.012 * SR)), 2000) * np.hanning(int(0.012 * SR))
    sfx.add(snap, CUE["gullSnap"], gain_db=-17, pan=0.2)
    sfx.add(whoosh(0.4, 300, 900, q=1.2, shape=0.5), CUE["leoLift"] - 0.05, gain_db=-28, pan=0.2)
    sfx.add(whoosh(0.4, 250, 700, q=1.0, shape=0.5), CUE["miaDuck"] - 0.1, gain_db=-29, pan=-0.3)
    for T in np.arange(25.95, 26.75, 1 / 5.2):
        sfx.add(flap(), T, gain_db=-25, pan=float(np.interp(T, [25.95, 26.3, 26.75], [0.0, -0.5, -0.05])))
    sfx.add(thud(160, 0.06, 0.8), CUE["gullLand"], gain_db=-28, pan=-0.05)
    for T in [27.05, 27.13, 27.2]:
        sfx.add(flap(), T, gain_db=-33, pan=-0.05)  # ruffle
    sfx.add(crunch(), CUE["leoBite"] + 0.05, gain_db=-24, pan=0.15)
    sfx.add(gull_call(0.22, (1500, 1700, 1250), 0.9), CUE["gullHmph"] + 0.02, gain_db=-22, pan=-0.05)
    for T in np.arange(CUE["gullTakeoff"], 29.1, 1 / 5.5):
        sfx.add(flap(), T, gain_db=-24 - (T - CUE["gullTakeoff"]) * 8, pan=float(np.clip((T - CUE["gullTakeoff"]) * 1.4, 0, 0.8)))

    # ---- transition
    sfx.add(riser(0.55), CUE["pushIn"] + 0.05, gain_db=-21)
    sfx.add(boom(), 29.32, gain_db=-16)
    sfx.add(reverb(chime([523.25, 784.0], 1.5, 0.6, [1, 0.6]), 1.6, 0.5), 29.34, gain_db=-30)

    # ---- science graphic
    sfx.add(reverb(np.sin(2 * np.pi * np.cumsum(np.linspace(300, 600, int(1.5 * SR))) / SR) * np.hanning(int(1.5 * SR)), 1.0, 0.4), CUE["fovOpen"], gain_db=-32)
    for k in range(10):  # counter ticks (ease-out spacing)
        u = 1 - (1 - (k + 1) / 10) ** (1 / 3)
        sfx.add(tick(3800), CUE["fovOpen"] + u * (CUE["fov200"] - CUE["fovOpen"]), gain_db=-31)
    sfx.add(reverb(chime([880, 1320], 1.4, 0.5, [1, 0.5]), 1.2, 0.4), CUE["fov200"], gain_db=-26)
    sfx.add(reverb(chime([1046.5], 1.0, 0.4), 1.0, 0.4), CUE["ahead"], gain_db=-28)
    sfx.add(reverb(chime([784], 0.9, 0.35), 1.0, 0.4), CUE["sides"] + 0.05, gain_db=-29, pan=-0.6)
    sfx.add(reverb(chime([784], 0.9, 0.35), 1.0, 0.4), CUE["sides"] + 0.2, gain_db=-29, pan=0.6)
    q = np.sin(2 * np.pi * np.cumsum(np.linspace(233, 196, int(0.5 * SR))) / SR) * env_ad(int(0.5 * SR), 0.02, 0.2)
    sfx.add(reverb(q, 1.0, 0.35), CUE["behind"] + 0.15, gain_db=-27)
    sfx.add(thud(58, 0.5, 0.3), CUE["nothing"], gain_db=-20)
    sfx.add(whoosh(0.6, 500, 1500, q=1.3, shape=0.45), CUE["you"] - 0.15, gain_db=-25, pan=np.linspace(0.8, 0.3, int(0.6 * SR)))
    nsw = int((CUE["sweepDone"] - CUE["sweep360"]) * SR)
    sw = np.sin(2 * np.pi * np.cumsum(np.linspace(392, 784, nsw)) / SR) * np.hanning(nsw) * 0.6
    sfx.add(reverb(sw + whoosh(0, 600, 3000, q=2, shape=0.6, n=nsw) * 0.5, 1.0, 0.35), CUE["sweep360"], gain_db=-27, pan=0.3)
    for k in range(8):
        u = k / 8
        sfx.add(tick(3200 + k * 150), CUE["sweep360"] + (0.5 - 0.5 * np.cos(np.pi * u)) * (CUE["sweepDone"] - CUE["sweep360"]), gain_db=-32, pan=0.3)
    sfx.add(reverb(chime([523.25, 659.25, 783.99, 1174.66], 2.6, 1.0, [1, 0.7, 0.6, 0.35]), 1.8, 0.45), CUE["circle"], gain_db=-22, pan=0.3)
    for k in range(16):
        tt_ = CUE["shatter"] + RNG.uniform(0, 0.45)
        sfx.add(chime([RNG.uniform(2600, 6200)], 0.4, RNG.uniform(0.05, 0.15)), tt_, gain_db=-30 + RNG.uniform(-4, 2), pan=0.3 + RNG.uniform(-0.3, 0.3))
    sfx.add(highpass(noise(int(0.25 * SR)), 3000) * env_ad(int(0.25 * SR), 0.002, 0.06), CUE["shatter"], gain_db=-27, pan=0.3)
    sfx.add(reverb(chime([110, 220], 2.0, 0.8, [1, 0.4]), 1.5, 0.4), CUE["noBack"], gain_db=-22, pan=0.2)

    # ---- ducking + sum
    env = narration_envelope(narr)
    duck = 1 - 0.45 * np.clip(env / 0.15, 0, 1)
    sfxL, sfxR = sfx.L * (1 - 0.2 * np.clip(env / 0.15, 0, 1)), sfx.R * (1 - 0.2 * np.clip(env / 0.15, 0, 1))
    L = narr + beds.L * duck + sfxL
    R = narr + beds.R * duck + sfxR
    # tail fade of beds/sfx with the picture fade-out (narration is silent here)
    fo = at(CUE["fadeOut"])
    g = np.ones(N)
    g[fo:] = np.linspace(1, 0, N - fo)
    L = narr + (L - narr) * g
    R = narr + (R - narr) * g
    peak = max(np.abs(L).max(), np.abs(R).max())
    if peak > 0.995:
        # never touch the narration: scale only the non-narration part where needed
        over = np.maximum(np.abs(L), np.abs(R)) > 0.995
        where = np.nonzero(over)[0] / SR + START
        raise SystemExit(f"mix would clip at {over.sum()} samples (peak {peak:.3f}) at narration t={where[:5]}; lower SFX levels")

    out = os.path.join(ROOT, "public/audio/poc_mix.wav")
    sf.write(out, np.stack([L, R], axis=1).astype(np.float32), SR, subtype="PCM_24")
    stems = os.path.join(ROOT, "renders/qa/stems")
    os.makedirs(stems, exist_ok=True)
    sf.write(os.path.join(stems, "narration.wav"), narr.astype(np.float32), SR)
    sf.write(os.path.join(stems, "sfx_beds.wav"), np.stack([L - narr, R - narr], axis=1).astype(np.float32), SR)

    def rms_db(x):
        return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)

    report = {
        "start": START,
        "end": END,
        "samples": N,
        "seconds": N / SR,
        "narration_rms_db": round(rms_db(narr), 2),
        "sfx_beds_rms_db": round(rms_db((L - narr + R - narr) / 2), 2),
        "mix_peak_dbfs": round(20 * np.log10(peak), 2),
        # the narration in the mix is the original decode, sample for sample
        # (except the 8 ms edge fades inside measured pauses)
        "narration_max_abs_diff_vs_source": float(np.abs(narr[f:-f] - narr_full[s0 + f: s0 + N - f]).max()),
    }
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
