// EXIT CODE 360 — YouTube Shorts teaser (1080×1920, 30 fps, 900 frames = 30.000 s).
// Re-frames the finished film's scenes (same code, characters, sets, lighting, timing) at
// native vertical resolution: each shot renders the film at a narration time T inside a
// 1920×1080 "stage" that is scaled and positioned behind a 9:16 window. Nothing in the
// film is changed; scene captions are switched off (LabelsVisible) and the teaser sets its
// own type in the Shorts safe area.
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { SCENES } from "../film/scenes";
import { FxContext } from "../lib/fx";
import { LabelsVisible } from "../lib/acting";
import { clamp, ease, lerp } from "../lib/anim";
import { C } from "../style/palette";
import { FONT, loadFonts } from "../style/fonts";
import DATA from "./shots.json";
import WORDS from "../data/narration_words.json";

loadFonts();

type Key = [number, number, number, number];
type Shot = {
  id: string;
  f0: number;
  f1: number;
  src: number;
  speed?: number;
  layout?: "split" | "black" | "endcard";
  crop?: Key[];
  top?: Key[];
  bottom?: Key[];
  whip?: [number, number];
};
type Vo = { src0: number; src1: number; at: number; captions?: boolean; capY?: number };

const FPS = DATA.fps;
const SHOTS = DATA.shots as Shot[];
const VOS = DATA.vo as Vo[];
const W = 1080;
const H = 1920;
// Shorts safe area: keep type inside x 140–940 and y 230–1500 (top bar, right action
// column and bottom title/channel overlay stay clear).
const SAFE_W = 800;

export const TEASER_FRAMES = DATA.frames;

const shotAt = (f: number) => SHOTS.find((s) => f >= s.f0 && f < s.f1) ?? SHOTS[SHOTS.length - 1];
const timeIn = (s: Shot, f: number) => s.src + ((f - s.f0) / FPS) * (s.speed ?? 1);

/** eased interpolation through crop keys by film time */
const cropAt = (keys: Key[], T: number) => {
  if (T <= keys[0][0]) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (T <= b[0]) {
      const u = ease.inOut(clamp((T - a[0]) / (b[0] - a[0])));
      return [T, lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)] as Key;
    }
  }
  return keys[keys.length - 1];
};

/** the film's scene table at time T (same cross-dissolve rule as the master composition) */
const SceneAt: React.FC<{ T: number }> = ({ T }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SCENES.map((s, i) => {
      const next = SCENES[i + 1];
      const end = next ? next.t0 + (next.xIn ?? 0) : Infinity;
      if (T < s.t0 || T >= end) return null;
      const o = s.xIn ? clamp((T - s.t0) / s.xIn) : 1;
      const Cmp = s.C;
      return (
        <AbsoluteFill key={s.id} style={{ opacity: o }}>
          <Cmp T={T} />
        </AbsoluteFill>
      );
    })}
  </AbsoluteFill>
);

/** a window of size w×h looking at stage point (cx, cy) at scale k */
const Window: React.FC<{ T: number; c: Key; w?: number; h?: number; blur?: number; style?: React.CSSProperties }> = ({ T, c, w = W, h = H, blur = 0, style }) => {
  const [, cx, cy, k] = c;
  return (
    <div style={{ position: "absolute", width: w, height: h, overflow: "hidden", background: "#000", ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          transformOrigin: "0 0",
          transform: `translate(${w / 2 - cx * k}px, ${h / 2 - cy * k}px) scale(${k})`,
          filter: blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : undefined,
        }}
      >
        <SceneAt T={T} />
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ typography
const OUTLINE = "0 0 2px #0B0812, 2px 2px 0 #0B0812, -2px 2px 0 #0B0812, 2px -2px 0 #0B0812, -2px -2px 0 #0B0812, 0 6px 18px rgba(0,0,0,0.65)";

const slamK = (f: number, f0: number, dur = 6) => ease.outBack(clamp((f - f0) / dur));

const Headline: React.FC<{ f: number; f0: number; f1: number; y: number; kicker: string; main: string; size?: number; color?: string; kickerColor?: string }> = ({
  f,
  f0,
  f1,
  y,
  kicker,
  main,
  size = 78,
  color = C.gold,
  kickerColor = "#F6F1EA",
}) => {
  if (f < Math.max(0, f0) || f >= f1) return null;
  const a = slamK(f, f0);
  const b = slamK(f, f0 + 3);
  const out = 1 - clamp((f - (f1 - 4)) / 4);
  return (
    <div style={{ position: "absolute", left: (W - SAFE_W) / 2, width: SAFE_W, top: y, textAlign: "center", fontFamily: FONT, opacity: out }}>
      <div style={{ fontWeight: 800, fontSize: 40, letterSpacing: "0.16em", color: kickerColor, textShadow: OUTLINE, opacity: clamp(a * 2), transform: `translateY(${(1 - a) * -14}px)` }}>{kicker}</div>
      <div
        style={{
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.04,
          letterSpacing: "0.01em",
          color,
          marginTop: 8,
          textShadow: `${OUTLINE}, 0 0 30px rgba(242,197,92,0.35)`,
          opacity: clamp(b * 2),
          transform: `scale(${lerp(1.35, 1, b)})`,
        }}
      >
        {main}
      </div>
    </div>
  );
};

type Word = { word: string; start: number; end: number };
type Chunk = { words: { text: string; t0: number; t1: number }[]; t0: number; t1: number; y: number; cap: number };

const buildChunks = (): Chunk[] => {
  const all = (WORDS as { words: Word[] }).words;
  const chunks: Chunk[] = [];
  for (const v of VOS) {
    if (v.captions === false) continue;
    const ws = all.filter((w) => w.start >= v.src0 - 0.01 && w.start < v.src1).map((w) => ({ text: w.word, t0: v.at + (w.start - v.src0), t1: v.at + (w.end - v.src0) }));
    let cur: Chunk["words"] = [];
    const flush = () => {
      if (cur.length) chunks.push({ words: cur, t0: cur[0].t0, t1: cur[cur.length - 1].t1, y: v.capY ?? 1330, cap: v.at + (v.src1 - v.src0) });
      cur = [];
    };
    for (const w of ws) {
      const len = cur.map((c) => c.text).join(" ").length + w.text.length;
      if (cur.length && (len > 17 || cur.length >= 3)) flush();
      cur.push(w);
      if (/[,.?!]$/.test(w.text)) flush();
    }
    flush();
  }
  // each chunk stays up until the next one starts (or 0.35 s after its last word)
  chunks.forEach((c, i) => {
    const next = chunks[i + 1];
    c.t1 = Math.min(next && next.t0 - c.t1 < 0.6 ? next.t0 - 0.02 : c.t1 + 0.35, c.cap);
  });
  return chunks;
};
const CHUNKS = buildChunks();

const Captions: React.FC<{ t: number }> = ({ t }) => {
  const c = CHUNKS.find((k) => t >= k.t0 - 0.04 && t < k.t1);
  if (!c) return null;
  const pop = ease.outBack(clamp((t - c.t0 + 0.04) / 0.12));
  return (
    <div
      style={{
        position: "absolute",
        left: (W - SAFE_W) / 2,
        width: SAFE_W,
        top: c.y,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 62,
        lineHeight: 1.12,
        wordSpacing: "0.18em",
        textTransform: "uppercase",
        transform: `translateY(-50%) scale(${lerp(0.9, 1, pop)})`,
        opacity: clamp(pop * 1.5),
      }}
    >
      {c.words.map((w, i) => {
        const on = t >= w.t0 - 0.03;
        const active = t >= w.t0 - 0.03 && t < w.t1 + 0.12;
        return (
          <React.Fragment key={i}>
            {i > 0 ? " " : null}
            <span style={{ color: active ? C.gold : on ? "#FFFFFF" : "rgba(255,255,255,0.55)", textShadow: OUTLINE, display: "inline-block", transform: active ? "scale(1.06)" : undefined }}>
              {w.text.replace(/[.,]$/, "")}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------ grain (9:16)
const Grain916: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.075, pointerEvents: "none" }}>
    <Img
      src={staticFile(`textures/grain_${Math.floor(f / 2.5) % 8}.png`)}
      style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: "translate(1080px,0) rotate(90deg)" }}
    />
  </AbsoluteFill>
);

// ------------------------------------------------------------------ split (Gate 4 / Mia)
const SPLIT_Y = 820;
const Split: React.FC<{ s: Shot; f: number; T: number }> = ({ s, f, T }) => {
  const u = (f - s.f0) / FPS;
  const inTop = ease.outQuint(clamp(u / 0.25));
  const inBot = ease.outQuint(clamp((u - 0.06) / 0.25));
  const tag = (t: number) => ease.outBack(clamp((T - t) / 0.18));
  const tOr = 306.52;
  const tMia = 306.76;
  const line = ease.inOut(clamp(u / 0.3));
  return (
    <AbsoluteFill style={{ background: "#07060C" }}>
      <Window T={T} c={cropAt(s.top!, T)} h={SPLIT_Y} style={{ top: 0, left: 0, transform: `translateX(${(1 - inTop) * -W}px)` }} />
      <Window T={T} c={cropAt(s.bottom!, T)} h={H - SPLIT_Y} style={{ top: SPLIT_Y, left: 0, transform: `translateX(${(1 - inBot) * W}px)` }} />
      <div style={{ position: "absolute", top: SPLIT_Y - 3, left: W / 2 - (W / 2) * line, width: W * line, height: 6, background: C.gold, boxShadow: "0 0 24px rgba(242,197,92,0.8)" }} />
      <div style={{ position: "absolute", right: 140, top: SPLIT_Y + 40, fontFamily: FONT, fontWeight: 800, fontSize: 44, letterSpacing: "0.14em", color: C.miaPinkLight, textShadow: OUTLINE, opacity: clamp(tag(tMia) * 2), transform: `scale(${lerp(1.3, 1, tag(tMia))})`, transformOrigin: "right center" }}>
        MIA?
      </div>
      <div
        style={{
          position: "absolute",
          left: W / 2 - 62,
          top: SPLIT_Y - 62,
          width: 124,
          height: 124,
          borderRadius: 62,
          background: "#0E0B16",
          border: `5px solid ${C.gold}`,
          boxShadow: "0 0 30px rgba(242,197,92,0.55)",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 46,
          color: "#F6F1EA",
          textAlign: "center",
          lineHeight: "114px",
          opacity: clamp(tag(tOr) * 2),
          transform: `scale(${lerp(1.5, 1, tag(tOr))})`,
        }}
      >
        OR
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ end card
const EndCard: React.FC<{ s: Shot; f: number; T: number }> = ({ s, f, T }) => {
  const u = (f - s.f0) / FPS;
  const title = ease.outBack(clamp((u - 0.12) / 0.3));
  const kick = ease.out(clamp(u / 0.3));
  const brand = ease.out(clamp((u - 0.55) / 0.4));
  const cta = ease.outBack(clamp((u - 1.0) / 0.35));
  const sub = ease.out(clamp((u - 1.4) / 0.4));
  const pulse = 1 + 0.025 * Math.sin(Math.max(0, u - 1.4) * Math.PI * 2 * 1.1);
  return (
    <AbsoluteFill>
      <Window T={T} c={cropAt(s.crop!, T)} />
      <AbsoluteFill style={{ background: "linear-gradient(rgba(9,6,18,0.82) 0%, rgba(9,6,18,0.6) 40%, rgba(9,6,18,0.15) 54%, rgba(9,6,18,0) 62%, rgba(9,6,18,0.7) 100%)" }} />
      <div style={{ position: "absolute", left: (W - SAFE_W) / 2, width: SAFE_W, top: 250, textAlign: "center", fontFamily: FONT, opacity: brand }}>
        <div style={{ fontWeight: 800, fontSize: 44, letterSpacing: "0.5em", color: "#F6F1EA", paddingLeft: "0.5em", textShadow: OUTLINE }}>EXIT CODE</div>
        <div style={{ margin: "14px auto 0", width: 120 * brand, height: 4, background: C.gold, boxShadow: "0 0 14px rgba(242,197,92,0.8)" }} />
      </div>
      <div style={{ position: "absolute", left: (W - SAFE_W) / 2, width: SAFE_W, top: 372, textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 800, fontSize: 44, letterSpacing: "0.16em", color: "#F6F1EA", textShadow: OUTLINE, opacity: kick }}>WHAT IF YOU HAD</div>
        <div style={{ fontWeight: 800, fontSize: 124, lineHeight: 1.05, color: C.gold, textShadow: `${OUTLINE}, 0 0 40px rgba(242,197,92,0.5)`, opacity: clamp(title * 2), transform: `scale(${lerp(1.4, 1, title)})` }}>
          360° VISION?
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: W / 2 - 380,
          top: 768,
          width: 760,
          height: 116,
          borderRadius: 62,
          background: C.gold,
          boxShadow: "0 10px 40px rgba(0,0,0,0.55), 0 0 40px rgba(242,197,92,0.45)",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 44,
          letterSpacing: "0.06em",
          color: "#14111A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          opacity: clamp(cta * 2),
          transform: `scale(${lerp(0.6, 1, cta) * pulse})`,
        }}
      >
        <svg width={38} height={42} viewBox="0 0 38 42">
          <path d="M4,3 L35,21 L4,39 Z" fill="#14111A" />
        </svg>
        WATCH THE FULL VIDEO
      </div>
      <div style={{ position: "absolute", left: (W - SAFE_W) / 2, width: SAFE_W, top: 908, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 28, letterSpacing: "0.18em", color: "#F6F1EA", textShadow: OUTLINE, opacity: sub * 0.9 }}>
        THE FULL STORY · ON EXIT CODE
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ composition
export const Teaser: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const s = shotAt(f);
  const T = timeIn(s, f);

  let body: React.ReactNode;
  if (s.layout === "black") body = <AbsoluteFill style={{ background: "#000" }} />;
  else if (s.layout === "split") body = <Split s={s} f={f} T={T} />;
  else if (s.layout === "endcard") body = <EndCard s={s} f={f} T={T} />;
  else {
    const c = cropAt(s.crop!, T);
    let blur = 0;
    if (s.whip && T > s.whip[0] - 0.02 && T < s.whip[1] + 0.02) {
      const c2 = cropAt(s.crop!, T + 1 / FPS);
      blur = Math.min(16, (Math.abs(c2[1] - c[1]) * c[3]) / 9);
    }
    body = <Window T={T} c={c} blur={blur} />;
  }

  // punctuation flashes: montage cuts, the crash, the end card
  const flash = (at: number, peak: number, frames: number) => (f >= at && f < at + frames ? peak * (1 - (f - at) / frames) : 0);
  const white = Math.max(flash(257, 0.35, 3), flash(275, 0.35, 3), flash(293, 0.35, 3), flash(636, 0.95, 4));
  const goldFlash = flash(757, 0.4, 7);

  return (
    <FxContext.Provider value={{ blur: 1, grain: true }}>
      <LabelsVisible.Provider value={false}>
        <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
          {body}
          <Headline f={f} f0={-4} f1={39} y={232} kicker="WHAT IF YOU COULD" main="SEE EVERYTHING?" size={80} />
          <Headline f={f} f0={257} f1={311} y={300} kicker="NO BLIND SPOTS." main="NOTHING GETS PAST YOU." size={74} color="#F6F1EA" kickerColor={C.gold} />
          <Headline f={f} f0={311} f1={348} y={300} kicker="THE €10,000 JOB:" main="WATCH ONE GATE." size={76} color="#F6F1EA" kickerColor={C.gold} />
          <Captions t={t} />
          {white > 0 && <AbsoluteFill style={{ background: "#FFF6EA", opacity: white }} />}
          {goldFlash > 0 && <AbsoluteFill style={{ background: C.gold, opacity: goldFlash, mixBlendMode: "screen" }} />}
          <Grain916 f={f} />
          {withAudio && <Audio src={staticFile("audio/teaser_mix.wav")} />}
        </AbsoluteFill>
      </LabelsVisible.Provider>
    </FxContext.Provider>
  );
};
