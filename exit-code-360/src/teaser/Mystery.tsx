// EXIT CODE 360 — mystery teaser v2 (YouTube Shorts, 1080×1920, 30 fps, 900 frames).
// Glimpses only: re-frames short moments of the finished film (same scenes, same look) with
// intrigue typography and a motion-graphics title card. No explanations, no outcomes.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { FxContext } from "../lib/fx";
import { LabelsVisible } from "../lib/acting";
import { clamp, ease, lerp, rand } from "../lib/anim";
import { C } from "../style/palette";
import { FONT, loadFonts } from "../style/fonts";
import { Captions, Grain916, H, OUTLINE, SAFE_W, W, Window, buildChunks, cropAt, type Shot, type Vo } from "./Teaser";
import DATA from "./mystery.json";

loadFonts();

type Txt = { f0: number; f1: number; kicker: string; main: string; gold: boolean; y?: number };
const FPS = DATA.fps;
type MShot = Omit<Shot, "layout"> & { layout?: "black" | "title" };
const SHOTS = DATA.shots as unknown as MShot[];
const VOS = DATA.vo as Vo[];
const TEXTS = DATA.text as Txt[];
const CHUNKS = buildChunks(VOS, SHOTS as unknown as Shot[], FPS, 5, 0.4);
export const MYSTERY_FRAMES = DATA.frames;

const shotAt = (f: number) => SHOTS.find((s) => f >= s.f0 && f < s.f1) ?? SHOTS[SHOTS.length - 1];

/** trailer card: letters track in from wide spacing, slight flicker, quick fade out */
const MysteryText: React.FC<{ f: number; x: Txt }> = ({ f, x }) => {
  if (f < x.f0 || f >= x.f1) return null;
  const u = (f - x.f0) / FPS;
  const a = ease.out(clamp(u / 0.35));
  const b = ease.out(clamp((u - 0.12) / 0.4));
  const flicker = u < 0.12 ? (Math.floor(u * 60) % 2 ? 0.35 : 1) : 1;
  const out = 1 - clamp((f - (x.f1 - 5)) / 5);
  return (
    <div style={{ position: "absolute", left: (W - SAFE_W) / 2, width: SAFE_W, top: x.y ?? 300, textAlign: "center", fontFamily: FONT, opacity: out * flicker }}>
      <div style={{ fontWeight: 700, fontSize: 44, letterSpacing: `${lerp(0.7, 0.24, a)}em`, paddingLeft: `${lerp(0.7, 0.24, a)}em`, color: "#EDEAF4", textShadow: OUTLINE, opacity: a }}>{x.kicker}</div>
      <div
        style={{
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1.05,
          marginTop: 10,
          letterSpacing: `${lerp(0.35, 0.03, b)}em`,
          color: x.gold ? C.gold : "#F6F1EA",
          textShadow: `${OUTLINE}${x.gold ? ", 0 0 34px rgba(242,197,92,0.45)" : ", 0 0 30px rgba(255,255,255,0.18)"}`,
          opacity: b,
          filter: b < 0.98 ? `blur(${((1 - b) * 8).toFixed(1)}px)` : undefined,
        }}
      >
        {x.main}
      </div>
    </div>
  );
};

/** final card: a gold ring draws itself 0→360°, then the title and the brand */
const TitleCard: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS;
  const t0 = 25.1;
  const t1 = 26.5;
  const sweep = ease.inOut(clamp((t - t0) / (t1 - t0)));
  const R = 400;
  const cx = 540;
  const cy = 900;
  const circ = 2 * Math.PI * R;
  const done = clamp((t - t1 - 0.1) / 0.9);
  const head = -Math.PI / 2 + sweep * Math.PI * 2;
  const kick = ease.out(clamp((t - 25.25) / 0.6));
  const big = ease.outBack(clamp((t - 26.6) / 0.32));
  const vis = ease.outBack(clamp((t - 26.86) / 0.32));
  const brand = ease.out(clamp((t - 27.45) / 0.5));
  const cta = ease.out(clamp((t - 28.0) / 0.5));
  const fadeIn = 0.45 + 0.55 * clamp((t - 25.0) / 0.2); // enters from a navy dip, never pure black
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 47%, #151B3A 0%, #080A16 58%, #030308 100%)", opacity: fadeIn }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 40 }).map((_, i) => {
          const px = rand(i * 7.1) * W;
          const py = (rand(i * 3.3) * H - t * (12 + rand(i) * 18)) % H;
          return <circle key={i} cx={px} cy={py < 0 ? py + H : py} r={1 + rand(i * 9) * 1.6} fill="#C9D6FF" opacity={0.12 + rand(i * 5) * 0.2} />;
        })}
        {Array.from({ length: 72 }).map((_, i) => {
          if (i / 72 > sweep) return null;
          const a = -Math.PI / 2 + (i / 72) * Math.PI * 2;
          const r0 = R + 28;
          const r1 = R + (i % 6 === 0 ? 56 : 42);
          return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} stroke={C.gold} strokeWidth={i % 6 === 0 ? 3 : 1.6} opacity={0.55} />;
        })}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.gold} strokeWidth={18} opacity={0.12} strokeDasharray={`${circ * sweep} ${circ}`} transform={`rotate(-90 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.gold} strokeWidth={4} strokeDasharray={`${circ * sweep} ${circ}`} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
        {sweep > 0.002 && sweep < 0.999 && <circle cx={cx + Math.cos(head) * R} cy={cy + Math.sin(head) * R} r={10} fill="#FFF3D0" style={{ filter: "drop-shadow(0 0 14px rgba(255,230,160,0.95))" }} />}
        {done > 0 &&
          [0, 1].map((k) => {
            const q = clamp(done * 1.2 - k * 0.25);
            return q > 0 ? <circle key={k} cx={cx} cy={cy} r={R + q * 170} fill="none" stroke={C.gold} strokeWidth={3} opacity={(1 - q) * 0.6} /> : null;
          })}
      </svg>
      <div style={{ position: "absolute", left: (W - SAFE_W) / 2, width: SAFE_W, top: 735, textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 44, letterSpacing: `${lerp(0.6, 0.2, kick)}em`, paddingLeft: "0.2em", color: "#EDEAF4", opacity: kick, textShadow: OUTLINE }}>WHAT IF YOU HAD</div>
        <div style={{ fontWeight: 800, fontSize: 102, lineHeight: 1.04, marginTop: 14, color: C.gold, opacity: clamp(big * 2), transform: `scale(${lerp(1.5, 1, big)})`, textShadow: `${OUTLINE}, 0 0 44px rgba(242,197,92,0.55)` }}>360-DEGREE</div>
        <div style={{ fontWeight: 800, fontSize: 102, lineHeight: 1.04, color: C.gold, opacity: clamp(vis * 2), transform: `scale(${lerp(1.5, 1, vis)})`, textShadow: `${OUTLINE}, 0 0 44px rgba(242,197,92,0.55)` }}>VISION?</div>
      </div>
      <div style={{ position: "absolute", left: (W - SAFE_W) / 2, width: SAFE_W, top: 1352, textAlign: "center", fontFamily: FONT, opacity: brand }}>
        <div style={{ fontWeight: 800, fontSize: 46, letterSpacing: "0.5em", paddingLeft: "0.5em", color: "#F6F1EA", textShadow: OUTLINE }}>EXIT CODE</div>
        <div style={{ margin: "14px auto 0", width: 140 * brand, height: 4, background: C.gold, boxShadow: "0 0 14px rgba(242,197,92,0.8)" }} />
        <div style={{ marginTop: 22, fontWeight: 700, fontSize: 26, letterSpacing: "0.2em", color: "#CFC8DC", opacity: cta }}>WATCH THE FULL VIDEO ON EXIT CODE</div>
      </div>
    </AbsoluteFill>
  );
};

export const Mystery: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const s = shotAt(f);
  const T = s.src + (f - s.f0) / FPS;

  let body: React.ReactNode = <AbsoluteFill style={{ background: "#000" }} />;
  if (s.layout === "title") body = <TitleCard f={f} />;
  else if (s.layout !== "black") body = <Window T={T} c={cropAt(s.crop!, T)} />;

  const flash = (at: number, peak: number, frames: number) => (f >= at && f < at + frames ? peak * (1 - (f - at) / frames) : 0);
  const white = Math.max(flash(14, 0.55, 3), flash(302, 0.4, 3), flash(533, 0.5, 3), flash(602, 1.0, 6));

  return (
    <FxContext.Provider value={{ blur: 1, grain: true }}>
      <LabelsVisible.Provider value={false}>
        <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
          {body}
          {s.layout !== "title" && s.layout !== "black" && (
            <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 48%, rgba(4,3,10,0.5) 100%)" }} />
          )}
          {TEXTS.map((x, i) => (
            <MysteryText key={i} f={f} x={x} />
          ))}
          <Captions t={t} chunks={CHUNKS} size={56} />
          {white > 0 && <AbsoluteFill style={{ background: "#FFF6EA", opacity: white }} />}
          <Grain916 f={f} />
          {withAudio && <Audio src={staticFile("audio/teaser_mystery_mix.wav")} />}
        </AbsoluteFill>
      </LabelsVisible.Provider>
    </FxContext.Provider>
  );
};
