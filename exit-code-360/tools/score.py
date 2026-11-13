"""Original procedural score for EXIT CODE 360 (generated, no third-party material).

Instruments: Karplus-Strong plucks, felt-piano additive tones, detuned pads, soft
percussion, drones. 14 mood sections follow the story; they crossfade and the music
cuts to silence at "Silence." (320.25 s)."""
import numpy as np
from scipy import signal

from audio_lib import SR, N, RNG, db, lowpass, highpass, bandpass, noise, reverb, tt

NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name):
    """'A4' → 440.0"""
    n, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[n] + (o - 4) * 12 - 9) / 12)


def chord(root, kind="maj", octave=3):
    r = hz(f"{root}{octave}")
    iv = {"maj": [0, 4, 7], "min": [0, 3, 7], "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10], "add9": [0, 4, 7, 14], "madd9": [0, 3, 7, 14], "sus2": [0, 2, 7]}[kind]
    return [r * 2 ** (i / 12) for i in iv]


# ---------------------------------------------------------------- instruments
def pluck(f, dur, bright=0.5):
    n = N(dur)
    L = max(2, int(round(SR / f)))
    exc = np.zeros(n)
    burst = RNG.uniform(-1, 1, L)
    burst = lowpass(burst, 1500 + bright * 5000) if L > 12 else burst
    exc[:L] = burst
    a = np.zeros(L + 2)
    a[0] = 1
    a[L] = -0.4985
    a[L + 1] = -0.4985
    y = signal.lfilter([1.0], a, exc)
    y *= np.clip((dur - np.arange(n) / SR) / 0.08, 0, 1)
    return y


def piano(f, dur, vel=1.0):
    t = tt(dur)
    out = np.zeros(len(t))
    for k, a in enumerate([1.0, 0.45, 0.25, 0.12, 0.06, 0.03], start=1):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        out += a * np.sin(2 * np.pi * fk * t) * np.exp(-t * (1.2 + k * 0.9))
    hammer = lowpass(noise(N(0.01)), 2500) * 0.05
    out[: len(hammer)] += hammer
    return out * np.clip(t / 0.004, 0, 1) * vel * np.clip((dur - t) / 0.1, 0, 1)


def pad(freqs, dur, cutoff=1200, attack=1.2, release=1.2):
    t = tt(dur)
    L = np.zeros(len(t))
    R = np.zeros(len(t))
    for f in freqs:
        for det, side in [(0.997, 0), (1.003, 1), (1.0, 2)]:
            ph = 2 * np.pi * f * det * t + RNG.uniform(0, 6)
            saw = sum(np.sin(k * ph) / k for k in range(1, 6))
            if side in (0, 2):
                L += saw
            if side in (1, 2):
                R += saw
    env = np.clip(t / attack, 0, 1) * np.clip((dur - t) / release, 0, 1)
    return lowpass(L, cutoff) * env, lowpass(R, cutoff) * env


def kick(soft=1.0):
    t = tt(0.3)
    return np.sin(2 * np.pi * np.cumsum(100 * np.exp(-t * 20) + 42) / SR) * np.exp(-t / 0.13) * soft


def shaker():
    return highpass(noise(N(0.05)), 5000) * np.exp(-np.arange(N(0.05)) / SR / 0.015)


def drone(f, dur):
    t = tt(dur)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t + 1) + 0.2 * lowpass(noise(len(t)), 200)
    return x * np.clip(t / 2, 0, 1) * np.clip((dur - t) / 2, 0, 1)


def shimmer(f, dur):
    t = tt(dur)
    return np.sin(2 * np.pi * f * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t)) * np.clip(t / 1.5, 0, 1) * np.clip((dur - t) / 1.5, 0, 1)


# ---------------------------------------------------------------- section renderers
class Track:
    def __init__(self, n):
        self.L = np.zeros(n)
        self.R = np.zeros(n)
        self.n = n

    def put(self, x, t, g=0.0, pan=0.0):
        i = int(round(t * SR))
        if i >= self.n or i < 0:
            return
        x = x[: self.n - i] * db(g)
        th = (pan + 1) * np.pi / 4
        self.L[i: i + len(x)] += x * np.cos(th)
        self.R[i: i + len(x)] += x * np.sin(th)

    def put2(self, L, R, t, g=0.0):
        i = int(round(t * SR))
        if i >= self.n or i < 0:
            return
        n = min(len(L), self.n - i)
        self.L[i: i + n] += L[:n] * db(g)
        self.R[i: i + n] += R[:n] * db(g)


def sec_playful(tr, t0, t1, prog, bpm, shaker_on=False, g=0.0):
    beat = 60 / bpm
    t = t0
    k = 0
    while t < t1:
        root, kind = prog[k % len(prog)]
        ch = chord(root, kind, 3)
        bar = beat * 4
        L, R = pad(ch, min(bar + 0.6, t1 - t + 0.6), cutoff=900, attack=0.3, release=0.5)
        tr.put2(L * 0.05, R * 0.05, t, g)
        tr.put(pluck(ch[0] / 2, beat * 2) * 0.5, t, g, -0.1)
        arp = [ch[0] * 2, ch[1] * 2, ch[2] * 2, ch[1] * 2, ch[0] * 4, ch[2] * 2, ch[1] * 2, ch[2] * 2]
        for j in range(8):
            tj = t + j * beat / 2
            if tj >= t1:
                break
            tr.put(pluck(arp[j], beat * 0.9, 0.6) * (0.32 if j % 2 else 0.4), tj, g, 0.25 if j % 2 else -0.25)
            if shaker_on and j % 2 == 1:
                tr.put(shaker() * 0.12, tj, g, 0.3)
        if shaker_on:
            tr.put(kick(0.35), t, g)
            tr.put(kick(0.25), t + beat * 2, g)
        t += bar
        k += 1


def sec_curious(tr, t0, t1, chords, g=0.0, density=0.7):
    span = (t1 - t0) / len(chords)
    for i, (root, kind) in enumerate(chords):
        ch = chord(root, kind, 3)
        L, R = pad(ch, span + 1.2, cutoff=1100)
        tr.put2(L * 0.06, R * 0.06, t0 + i * span, g)
        tt_ = t0 + i * span + 0.4
        while tt_ < t0 + (i + 1) * span:
            f = ch[RNG.integers(0, len(ch))] * (4 if RNG.random() > 0.4 else 2)
            tr.put(reverb(piano(f, 2.0, 0.5), 1.2, 0.35), tt_, g, RNG.uniform(-0.4, 0.4))
            tt_ += RNG.uniform(0.9, 1.8) / density


def sec_nervous(tr, t0, t1, chords, bpm, g=0.0):
    sec_curious(tr, t0, t1, chords, g - 3, density=0.4)
    beat = 60 / bpm
    t = t0
    i = 0
    while t < t1:
        f = chord(*chords[int((t - t0) / ((t1 - t0) / len(chords))) % len(chords)], 4)[0]
        tr.put(pluck(f, 0.18, 0.8) * 0.25, t, g, 0.2 if i % 2 else -0.2)
        t += beat / 2
        i += 1


def sec_mystery(tr, t0, t1, root_hz, g=0.0, shimmer_hz=None):
    tr.put(drone(root_hz, t1 - t0 + 1.5) * 0.25, t0, g)
    if shimmer_hz:
        tr.put(shimmer(shimmer_hz, t1 - t0) * 0.05, t0, g, 0.3)
    t = t0 + 0.5
    while t < t1 - 1:
        tr.put(reverb(piano(root_hz * RNG.choice([2, 2.4, 3, 4.5]), 2.5, 0.45), 1.5, 0.45), t, g, RNG.uniform(-0.5, 0.5))
        t += RNG.uniform(1.4, 2.6)


def sec_tension(tr, t0, t1, bpm0, bpm1, root_hz, g=0.0):
    tr.put(drone(root_hz, t1 - t0 + 1.0) * 0.3, t0, g)
    t = t0
    while t < t1:
        u = (t - t0) / max(1e-6, t1 - t0)
        bpm = bpm0 + (bpm1 - bpm0) * u
        beat = 60 / bpm
        tr.put(kick(0.55), t, g)
        tr.put(kick(0.35), t + beat * 0.28, g)
        t += beat


def sec_tender(tr, t0, t1, prog, bpm, melody, g=0.0):
    beat = 60 / bpm
    bar = beat * 4
    t = t0
    k = 0
    while t < t1:
        root, kind = prog[k % len(prog)]
        ch = chord(root, kind, 3)
        L, R = pad(ch, bar + 1.0, cutoff=900, attack=0.8, release=1.0)
        tr.put2(L * 0.05, R * 0.05, t, g)
        tr.put(piano(ch[0], bar, 0.5), t, g, -0.2)
        for j, deg in enumerate(melody[k % len(melody)]):
            if deg is None:
                continue
            tj = t + j * beat
            if tj < t1:
                tr.put(reverb(piano(chord(root, kind, 4)[deg % len(ch)] * (2 if deg >= len(ch) else 1), beat * 1.8, 0.55), 1.2, 0.3), tj, g, 0.15)
        t += bar
        k += 1


def sec_swell(tr, t0, dur, ch_freqs, g=0.0):
    L, R = pad(ch_freqs, dur, cutoff=1800, attack=dur * 0.45, release=dur * 0.45)
    tr.put2(L * 0.07, R * 0.07, t0, g)


def make_score(total_samples):
    tr = Track(total_samples)
    # M1 promenade comedy + FOV science
    sec_playful(tr, 0.3, 28.9, [("C", "maj"), ("A", "min"), ("F", "maj"), ("G", "maj")], 100, g=-1)
    sec_curious(tr, 29.0, 43.3, [("C", "maj7"), ("F", "maj7"), ("A", "min7")], g=-2)
    # M2 the rule + POV + title
    sec_curious(tr, 43.3, 59.0, [("D", "madd9"), ("A#", "maj7"), ("F", "maj7"), ("C", "add9")], g=-2)
    sec_swell(tr, 58.8, 3.6, chord("C", "add9", 3) + chord("C", "add9", 4), g=0)
    # M3 perks montage
    sec_playful(tr, 62.3, 125.6, [("F", "maj"), ("D", "min"), ("A#", "maj"), ("C", "maj")], 112, shaker_on=True, g=-2)
    # M4 nature (curious) → catch + class (nervous)
    sec_curious(tr, 125.6, 136.5, [("A", "min7"), ("F", "maj7")], g=-2)
    sec_nervous(tr, 136.5, 157.9, [("A", "min"), ("F", "maj"), ("C", "maj"), ("G", "maj")], 120, g=-3)
    # M5 Mr. Black
    sec_mystery(tr, 157.9, 176.0, hz("D2"), g=-1, shimmer_hz=hz("A5"))
    # M6 the cost, dopamine, no off switch
    sec_curious(tr, 176.0, 212.6, [("E", "min7"), ("C", "maj7"), ("G", "maj"), ("D", "sus2"), ("E", "min7"), ("C", "maj7")], g=-3, density=0.5)
    # M7 notebook (tender)
    mel = [[4, None, 2, None], [1, None, 0, None], [2, 1, 0, None], [0, None, None, None]]
    sec_tender(tr, 212.7, 251.4, [("C", "maj"), ("G", "maj"), ("A", "min"), ("F", "maj")], 72, mel, g=-3)
    # M8 concert tension, M9 choice/rescue (accelerating) → hard stop at "Silence."
    sec_tension(tr, 251.6, 302.3, 66, 84, hz("A1"), g=-4)
    sec_tension(tr, 302.3, 318.5, 90, 140, hz("A1"), g=-2)
    # M10 aftermath → applause swell → tender
    sec_mystery(tr, 321.5, 342.2, hz("D2"), g=-4)
    sec_swell(tr, 342.2, 5.0, chord("D", "add9", 3) + chord("D", "maj", 4), g=-1)
    sec_tender(tr, 346.8, 352.3, [("D", "maj"), ("A", "maj")], 72, [[2, None, 1, None], [0, None, None, None]], g=-3)
    # M11 epilogue (warm) with the spark
    sec_playful(tr, 352.4, 365.8, [("G", "maj"), ("E", "min"), ("C", "maj"), ("D", "maj")], 96, g=-2)
    sec_swell(tr, 365.9, 3.4, chord("G", "add9", 3) + chord("G", "maj", 4), g=0)
    sec_tender(tr, 369.0, 379.0, [("G", "maj"), ("C", "maj"), ("E", "min"), ("D", "maj")], 80, [[2, None, 4, None], [1, None, 0, None]], g=-3)
    # M12 reality check (curious science)
    sec_curious(tr, 379.1, 414.3, [("F", "maj7"), ("D", "min7"), ("A#", "maj7"), ("C", "add9"), ("F", "maj7"), ("A", "min7")], g=-3)
    # M13 cliffhanger (eerie)
    sec_mystery(tr, 414.3, 427.4, hz("B1"), g=-2, shimmer_hz=hz("F#5"))
    # M14 outro
    sec_playful(tr, 427.5, 437.0, [("C", "maj"), ("A", "min"), ("F", "maj"), ("G", "maj")], 100, g=-2)
    sec_swell(tr, 436.8, 3.0, chord("C", "add9", 3) + chord("C", "maj", 4), g=0)
    L, R = tr.L, tr.R
    # hard silence at "Silence." and release after the crash
    s0, s1 = int(318.53 * SR), int(321.4 * SR)
    L[s0:s1] = 0
    R[s0:s1] = 0
    return highpass(L, 35), highpass(R, 35)
