"""Original synthesized sound library for EXIT CODE 360 (all assets generated here,
so no third-party licensing applies). 44.1 kHz float64 mono buffers unless noted."""
import numpy as np
from scipy import signal

SR = 44100
RNG = np.random.default_rng(360)


# ---------------------------------------------------------------- basics
def secs(n):
    return n / SR


def N(d):
    return max(1, int(round(d * SR)))


def tt(d):
    return np.arange(N(d)) / SR


def noise(n):
    return RNG.standard_normal(n)


def _sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def lowpass(x, f, order=2):
    return signal.sosfilt(_sos("low", min(f, SR / 2 - 100), order), x)


def highpass(x, f, order=2):
    return signal.sosfilt(_sos("high", f, order), x)


def bandpass(x, lo, hi, order=2):
    return signal.sosfilt(_sos("band", [lo, min(hi, SR / 2 - 100)], order), x)


def db(x):
    return 10 ** (x / 20)


def env_ad(n, attack, tau):
    t = np.arange(n) / SR
    return np.clip(t / max(attack, 1e-4), 0, 1) * np.exp(-np.maximum(t - attack, 0) / tau)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-12
    return x / m * peak


def reverb(x, seconds=0.9, mix=0.25, lp=6000):
    n = N(seconds)
    ir = noise(n) * np.exp(-np.arange(n) / SR * (6.9 / seconds))
    ir = lowpass(ir, lp)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    wet = signal.fftconvolve(x, ir)[: len(x)]
    return x * (1 - mix) + wet * mix


def sweep_bp(n, f0, f1, q=2.0, curve=1.0):
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
        out[max(0, s - blk): max(0, s - blk) + len(y)] += y * win[: len(y)]
    return out


class Bus:
    """Stereo bus over a fixed-length timeline (seconds → samples)."""

    def __init__(self, n):
        self.n = n
        self.L = np.zeros(n)
        self.R = np.zeros(n)

    def add(self, x, t, gain_db=0.0, pan=0.0):
        i = int(round(t * SR))
        if i >= self.n or len(x) == 0:
            return
        if i < 0:
            x = x[-i:]
            if np.ndim(pan):
                pan = pan[-i:]
            i = 0
        x = x[: self.n - i] * db(gain_db)
        p = pan[: len(x)] if np.ndim(pan) else pan
        th = (np.asarray(p) + 1) * np.pi / 4
        self.L[i: i + len(x)] += x * np.cos(th)
        self.R[i: i + len(x)] += x * np.sin(th)

    def add_stereo(self, L, R, t, gain_db=0.0):
        i = int(round(t * SR))
        n = min(len(L), self.n - i)
        if n <= 0:
            return
        self.L[i: i + n] += L[:n] * db(gain_db)
        self.R[i: i + n] += R[:n] * db(gain_db)


# ---------------------------------------------------------------- SFX
def bell(double=True):
    t = tt(1.6)
    out = np.zeros(len(t))
    for f, a, tau in [(2350, 1.0, 0.9), (3550, 0.55, 0.6), (5450, 0.35, 0.35), (6800, 0.2, 0.25), (8460, 0.12, 0.18)]:
        out += a * np.sin(2 * np.pi * f * t + RNG.uniform(0, 6)) * np.exp(-t / tau)
    out *= np.clip(t / 0.002, 0, 1)
    if double:
        d = N(0.045)
        out[d:] += 0.7 * out[:-d]
    return out * (1 + 0.15 * np.sin(2 * np.pi * 7 * t))


def thud(f=85, dur=0.12, click=0.4):
    t = tt(dur)
    body = np.sin(2 * np.pi * f * t * (1 - 0.3 * t / dur)) * np.exp(-t / (dur * 0.35))
    tick = lowpass(noise(len(t)), 1800) * np.exp(-t / 0.012) * click
    return body + tick


def footstep(heavy=1.0, hard=False):
    x = thud(f=95 + RNG.uniform(-10, 10), dur=0.1, click=1.2 if hard else 0.6) * heavy
    return x


def whoosh(dur, f0, f1, curve=1.0, q=1.6, shape=0.35, n=None):
    n = n or N(dur)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * t) ** 1.5 * np.exp(-((t - shape) ** 2) / 0.12)
    return sweep_bp(n, f0, f1, q, curve) * env


def chime(freqs, dur=1.6, tau=0.6, amps=None):
    t = tt(dur)
    amps = amps or [1.0] * len(freqs)
    out = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / (tau * (1 - 0.4 * k / len(freqs)))) for k, (f, a) in enumerate(zip(freqs, amps)))
    return out * np.clip(t / 0.004, 0, 1)


def ping(f=1046.5):
    return reverb(chime([f, f * 1.5], 0.9, 0.3, [1, 0.35]), 0.8, 0.35)


def gull_call(dur=0.42, f_shape=(1250, 2050, 1150), rough=0.6):
    t = tt(dur)
    u = t / dur
    f = np.interp(u, [0, 0.25, 1], f_shape)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(np.sin(k * ph) / k ** 1.2 for k in range(1, 7))
    am = 1 + rough * np.sin(2 * np.pi * 34 * t)
    breath = bandpass(noise(len(t)), 1500, 4500) * 0.25
    env = np.clip(u / 0.06, 0, 1) * np.clip((1 - u) / 0.35, 0, 1)
    return bandpass(tone * am + breath, 700, 5200) * env


def flap():
    t = tt(0.09)
    return bandpass(noise(len(t)), 250, 2200) * np.sin(np.pi * t / t[-1]) ** 2


def crunch():
    out = np.zeros(N(0.35))
    for _ in range(7):
        s = N(RNG.uniform(0, 0.22))
        b = bandpass(noise(N(0.018)), 1200, 6000) * np.hanning(N(0.018))
        out[s: s + len(b)] += b * RNG.uniform(0.4, 1)
    return out


def tick(f=4200):
    t = tt(0.025)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.005)


def click():
    x = np.zeros(N(0.06))
    for s in (0, N(0.03)):
        b = highpass(noise(N(0.004)), 2000) * np.hanning(N(0.004))
        x[s: s + len(b)] += b
    return x


def boom():
    t = tt(2.2)
    f = 62 * np.exp(-t * 0.6) + 30
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    air = lowpass(noise(len(t)), 400) * np.exp(-t / 0.25) * 0.5
    return (body + air) * np.clip(t / 0.01, 0, 1)


def riser(dur):
    n = N(dur)
    u = np.linspace(0, 1, n)
    nz = sweep_bp(n, 300, 5000, q=1.4, curve=1.6) * u ** 2
    tone = np.sin(2 * np.pi * np.cumsum(180 * (4 ** u)) / SR) * 0.25 * u ** 2
    return (nz + tone) * np.clip((1 - u) / 0.04, 0, 1)


def stamp():
    return thud(70, 0.25, 1.4) + 0.4 * lowpass(noise(N(0.25)), 900) * env_ad(N(0.25), 0.002, 0.04)


def squeak():
    t = tt(0.12)
    f = np.interp(t / t[-1], [0, 0.5, 1], [1800, 3200, 2600])
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.sin(np.pi * t / t[-1]) ** 2 * 0.6


def ball_bounce(f=150):
    return bandpass(thud(f, 0.14, 0.8), 80, 2500)


def swish():
    return whoosh(0.45, 3000, 900, q=1.2, shape=0.4)


def whistle(dur=0.5):
    t = tt(dur)
    tone = np.sin(2 * np.pi * 2900 * t) * (1 + 0.6 * np.sin(2 * np.pi * 28 * t))
    breath = bandpass(noise(len(t)), 2000, 6000) * 0.3
    env = np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.06, 0, 1)
    return (tone + breath) * env


def horn(dur=0.5):
    t = tt(dur)
    sq = np.sign(np.sin(2 * np.pi * 410 * t)) + np.sign(np.sin(2 * np.pi * 515 * t))
    return lowpass(sq, 2400) * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)


def buzzer(dur=0.9):
    t = tt(dur)
    return lowpass(np.sign(np.sin(2 * np.pi * 220 * t)), 1800) * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)


def creak(dur=0.9, f0=260, f1=520):
    t = tt(dur)
    f = np.interp(t / dur, [0, 1], [f0, f1]) * (1 + 0.05 * np.sin(2 * np.pi * 9 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 6)) * (1 + 0.8 * (RNG.random(len(t)) > 0.97))
    return bandpass(x, 150, 3000) * np.sin(np.pi * t / dur)


def metal_groan(dur=1.6):
    t = tt(dur)
    mod = 1 + 0.5 * np.sin(2 * np.pi * (3 + 4 * t / dur) * t)
    f = 70 * mod
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph + 3 * np.sin(2 * np.pi * 113 * t)) + 0.4 * bandpass(noise(len(t)), 200, 1200)
    return lowpass(x, 1600) * np.sin(np.pi * t / dur) ** 0.7


def rattle(dur=1.4):
    out = np.zeros(N(dur))
    k = 0.0
    while k < dur - 0.02:
        b = bandpass(noise(N(0.012)), 900, 5000) * np.hanning(N(0.012)) * RNG.uniform(0.4, 1)
        i = N(k)
        out[i: i + len(b)] += b[: len(out) - i]
        k += RNG.uniform(0.03, 0.08)
    return out


def metal_ping(fs=(620, 1013, 1590, 2380), dur=1.2):
    return chime(list(fs), dur, 0.35, [1, 0.7, 0.5, 0.3])


def bolt_snap():
    crack = highpass(noise(N(0.03)), 1500) * env_ad(N(0.03), 0.001, 0.008) * 2
    out = metal_ping((900, 1460, 2210, 3300), 0.9)
    out[: len(crack)] += crack
    return out


def crash():
    n = N(2.6)
    out = np.zeros(n)
    out += norm(boom()[:n] if len(boom()) >= n else np.pad(boom(), (0, n - len(boom()))), 1.0) * 0.9
    burst = lowpass(noise(n), 3000) * env_ad(n, 0.002, 0.18)
    out += burst * 0.8
    m = metal_ping((300, 517, 811, 1240), 2.0)
    out[: len(m)] += m * 0.5
    for _ in range(26):
        s = N(RNG.uniform(0.05, 0.9))
        c = chime([RNG.uniform(2500, 6500)], 0.35, RNG.uniform(0.04, 0.12))
        out[s: s + len(c)] += c[: n - s] * 0.12
    return out


def static(dur=1.0, density=0.4):
    n = N(dur)
    x = bandpass(noise(n), 800, 5000) * 0.25
    clicks = (RNG.random(n) > 1 - density * 0.002) * RNG.standard_normal(n) * 3
    return lowpass(x + clicks, 6000)


def phone_buzz(dur=0.45):
    t = tt(dur)
    return lowpass(np.sign(np.sin(2 * np.pi * 160 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * t)), 900) * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.02, 0, 1)


def pop():
    t = tt(0.12)
    f = 900 * np.exp(-t * 18) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.04)


def page_flip():
    return whoosh(0.3, 5000, 1500, q=0.9, shape=0.5) + 0.3 * highpass(noise(N(0.3)), 3000) * env_ad(N(0.3), 0.01, 0.06)


def scribble(dur=1.0):
    t = tt(dur)
    am = np.clip(np.sin(2 * np.pi * 7 * t + 3 * np.sin(2 * np.pi * 1.3 * t)), 0, 1) ** 2
    return bandpass(noise(len(t)), 2500, 7000) * am * 0.6


def flutter(dur=1.5, rate=38):
    t = tt(dur)
    am = (0.5 + 0.5 * np.sin(2 * np.pi * rate * t)) ** 3
    return bandpass(noise(len(t)), 300, 2500) * am * np.sin(np.pi * t / dur) ** 0.5


def flag_flap(dur=1.6):
    t = tt(dur)
    am = np.clip(np.sin(2 * np.pi * 6.5 * t + RNG.uniform(0, 6)), 0, 1) ** 4
    return lowpass(noise(len(t)), 1400) * am


def tiptoe():
    return thud(160, 0.05, 0.25) * 0.6


def clap_burst():
    return bandpass(noise(N(0.02)), 800, 4500) * np.hanning(N(0.02))


def applause(dur, density=220, swell=1.5):
    n = N(dur)
    out = np.zeros(n)
    count = int(density * dur)
    for _ in range(count):
        s = int(RNG.uniform(0, max(1, n - N(0.03))))
        out[s: s + N(0.02)] += clap_burst()[: n - s] * RNG.uniform(0.3, 1)
    t = np.arange(n) / SR
    env = np.clip(t / swell, 0, 1) * np.clip((dur - t) / 1.0, 0, 1)
    return reverb(out * env, 1.2, 0.35, 5000)


def crowd(dur, level=1.0, excite=None):
    n = N(dur)
    t = np.arange(n) / SR
    base = bandpass(noise(n), 200, 1800)
    babble = np.zeros(n)
    for _ in range(int(dur * 18)):
        s = int(RNG.uniform(0, n - N(0.3)))
        f = RNG.uniform(250, 900)
        seg = bandpass(noise(N(0.25)), f, f * 2.2) * np.hanning(N(0.25))
        babble[s: s + len(seg)] += seg * RNG.uniform(0.3, 1)
    x = norm(base, 1) * 0.6 + norm(babble, 1) * 0.5
    mod = 0.8 + 0.2 * np.sin(2 * np.pi * 0.13 * t)
    if excite is not None:
        mod *= excite(t)
    return x * mod * level


def band(dur, bpm=120):
    """Muffled concert band heard from the security post (kick + bass + pad)."""
    n = N(dur)
    t = np.arange(n) / SR
    out = np.zeros(n)
    beat = 60 / bpm
    k = 0.0
    kick_t = tt(0.25)
    kick = np.sin(2 * np.pi * np.cumsum(110 * np.exp(-kick_t * 18) + 45) / SR) * np.exp(-kick_t / 0.12)
    while k < dur:
        i = N(k)
        out[i: i + len(kick)] += kick[: n - i]
        k += beat
    roots = [55.0, 55.0, 43.65, 49.0]
    bass = np.zeros(n)
    for bar in range(int(dur / (beat * 4)) + 1):
        f = roots[bar % 4]
        s = N(bar * beat * 4)
        seg_t = tt(beat * 4)
        seg = np.sign(np.sin(2 * np.pi * f * seg_t)) * 0.4
        bass[s: s + len(seg)] += seg[: n - s]
    pad = lowpass(sum(np.sin(2 * np.pi * f * t) for f in (220, 277.2, 329.6)), 600) * 0.15
    return lowpass(out + lowpass(bass, 300) + pad, 900)


def engine(dur, rpm=1.0):
    t = tt(dur)
    f0 = 42 * rpm
    x = sum(np.sin(2 * np.pi * f0 * k * t + RNG.uniform(0, 6)) / k for k in range(1, 7))
    road = lowpass(noise(len(t)), 500) * 0.6
    return lowpass(x * (1 + 0.1 * np.sin(2 * np.pi * 3 * t)) + road, 1200)


def indicator():
    return click() * 0.8


# ---------------------------------------------------------------- beds
def sea_bed(dur):
    n = N(dur)
    t = np.arange(n) / SR
    surf = highpass(lowpass(np.cumsum(noise(n)) * 0.02, 700), 60)
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 6.3 + 1.0) ** 2
    wash = bandpass(noise(n), 400, 2600) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 6.3 + 2.2) ** 8) * 0.35
    wind = bandpass(noise(n), 250, 1100) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 9.1))
    return norm(surf, 1) * swell + norm(wash, 1) * 0.5 + norm(wind, 1) * 0.25


def room_tone(dur, hum=True):
    n = N(dur)
    t = np.arange(n) / SR
    x = lowpass(noise(n), 300) * 0.5
    if hum:
        x += 0.08 * np.sin(2 * np.pi * 50 * t) + 0.04 * np.sin(2 * np.pi * 100 * t)
    return x


def city_bed(dur):
    n = N(dur)
    t = np.arange(n) / SR
    rumble = lowpass(noise(n), 250)
    traffic = bandpass(noise(n), 300, 1500) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7.0) ** 2)
    return norm(rumble, 1) * 0.6 + norm(traffic, 1) * 0.4


def gym_bed(dur):
    n = N(dur)
    x = reverb(bandpass(noise(n), 200, 1500) * 0.3, 1.5, 0.5, 3000)
    return x
