import React from "react";
import { C } from "../style/palette";
import { clamp, deg, lerp, mixColor } from "../lib/anim";
import { NEUTRAL_FACE, STAND, type CharacterSpec, type Face, type Pose } from "./types";

type V = { x: number; y: number };
const dirOf = (a: number): V => ({ x: Math.sin(deg(a)), y: Math.cos(deg(a)) });
const add = (p: V, d: V, s = 1): V => ({ x: p.x + d.x * s, y: p.y + d.y * s });
// clockwise rotation in SVG space (y down), same as SVG rotate(a)
const rot = (p: V, a: number): V => {
  const c = Math.cos(deg(a));
  const s = Math.sin(deg(a));
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};
const pts = (...p: V[]) => p.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" ");

export type FigureProps = {
  spec: CharacterSpec;
  id: string; // unique per instance (gradient ids)
  x: number;
  y: number; // ground line (feet) in parent space, or hip line if grounded=false
  scale?: number;
  facing?: 1 | -1;
  turn?: number; // 0 = front view, 1 = profile
  pose?: Partial<Pose>;
  face?: Partial<Face>;
  light?: V; // screen-space direction from the figure toward its key light
  rim?: string;
  rimAmt?: number;
  ring?: number; // 0..1 close-up head ring (reference close-up style)
  grounded?: boolean;
  hairSwing?: number; // -1..1 ponytail secondary motion
  holdNear?: React.ReactNode; // drawn at the near wrist, rotated with the forearm
  holdFar?: React.ReactNode;
  holdUpright?: boolean; // keep held props upright instead of following the forearm
  headExtra?: React.ReactNode; // drawn in head space (e.g. cardboard mask)
  headExtraBehind?: React.ReactNode;
  opacity?: number;
  filter?: string;
};

export const Figure: React.FC<FigureProps> = ({
  spec: S,
  id,
  x,
  y,
  scale = 1,
  facing = 1,
  turn = 1,
  pose: poseIn,
  face: faceIn,
  light = { x: 0.8, y: -0.6 },
  rim = C.rimWarm,
  rimAmt = 1,
  ring = 0,
  grounded = true,
  hairSwing = 0,
  holdNear,
  holdFar,
  holdUpright = false,
  headExtra,
  headExtraBehind,
  opacity = 1,
  filter,
}) => {
  const P: Pose = { ...STAND, ...poseIn };
  const F: Face = { ...NEUTRAL_FACE, ...faceIn };
  const r = S.D / 2;
  const L = (() => {
    const lx = light.x * facing;
    const ly = light.y;
    const m = Math.hypot(lx, ly) || 1;
    return { x: lx / m, y: ly / m };
  })();
  const rimD = S.D * 0.032;

  // ---- skeleton (hip at origin, then grounded) -------------------------
  const hip0: V = { x: 0, y: 0 };
  const legX = lerp(S.torsoW * 0.24, 3, turn);
  const armX = lerp(S.torsoW * 0.5 + S.limbW * 0.25, 2, turn);
  const shoulderY = -S.torsoLen + S.limbW * 0.75;

  const leg = (hipA: number, knee: number, foot: number, side: 1 | -1) => {
    const h = add(hip0, { x: legX * side, y: 0 });
    const k = add(h, dirOf(hipA), S.thigh);
    const shinA = hipA - knee;
    const a = add(k, dirOf(shinA), S.shin);
    const fd: V = { x: Math.cos(deg(foot)), y: -Math.sin(deg(foot)) };
    const heel = add(a, fd, -S.shoeL * 0.18);
    const toe = add(a, fd, S.shoeL * 0.82);
    return { h, k, a, heel, toe };
  };
  const legN = leg(P.hipN, P.knN, P.footN, 1);
  const legF = leg(P.hipF, P.knF, P.footF, -1);

  const footBottom = Math.max(legN.a.y, legN.toe.y, legF.a.y, legF.toe.y) + S.shoeH * 0.5;
  const lift = grounded ? -footBottom - P.bob * S.D : -P.bob * S.D;

  const arm = (sh: number, el: number, side: 1 | -1) => {
    const s = add(hip0, rot({ x: armX * side, y: shoulderY }, P.lean));
    const e = add(s, dirOf(sh), S.upper);
    const foreA = sh + el;
    const w = add(e, dirOf(foreA), S.fore);
    return { s, e, w, foreA };
  };
  const armN = arm(P.shN, P.elN, 1);
  const armF = arm(P.shF, P.elF, -1);

  const headC = add(hip0, rot({ x: P.headX * S.D, y: -S.torsoLen - r + S.D * 0.08 - P.headY * S.D }, P.lean));

  // ---- colours ----------------------------------------------------------
  const ink = C.ink;
  const inkFar = C.inkFar;
  const rimOn = rimAmt > 0.01;
  const rimOff = { x: L.x * rimD, y: L.y * rimD };
  const gid = `${id}-cloth`;
  const ringId = `${id}-ring`;

  const limb = (d: string, w: number, col: string, rimScale = 1) => (
    <g>
      {rimOn && (
        <path
          d={d}
          transform={`translate(${rimOff.x * rimScale},${rimOff.y * rimScale})`}
          stroke={rim}
          strokeOpacity={rimAmt * 0.95}
          strokeWidth={w}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path d={d} stroke={col} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );

  const legPath = (l: ReturnType<typeof leg>, col: string, rimScale = 1) => (
    <g>
      {limb(pts(l.h, l.k, l.a), S.limbW, col, rimScale)}
      {limb(pts(l.heel, l.toe), S.shoeH, col, rimScale)}
    </g>
  );

  const hold = (a: ReturnType<typeof arm>, node: React.ReactNode) =>
    node ? (
      <g transform={`translate(${a.w.x},${a.w.y}) rotate(${holdUpright ? 0 : -a.foreA})`}>{node}</g>
    ) : null;

  // ---- torso / outfit ---------------------------------------------------
  const torsoTop = -S.torsoLen - S.D * 0.04;
  const torsoBot = S.outfit === "suit" ? S.thigh * 0.32 : S.thigh * 0.16;
  const tw = S.torsoW;
  const torsoD = (() => {
    if (S.outfit === "dress") {
      const hem = S.thigh * 0.62;
      const top = tw * 0.84;
      const hw = S.hemW;
      const rr = 10;
      return [
        `M${-top / 2 + rr},${torsoTop}`,
        `L${top / 2 - rr},${torsoTop}`,
        `Q${top / 2},${torsoTop} ${top / 2 + 1},${torsoTop + rr}`,
        `L${hw / 2},${hem - 6}`,
        `Q${hw / 2 + 1},${hem} ${hw / 2 - 8},${hem}`,
        `L${-hw / 2 + 8},${hem}`,
        `Q${-hw / 2 - 1},${hem} ${-hw / 2},${hem - 6}`,
        `L${-top / 2 - 1},${torsoTop + rr}`,
        `Q${-top / 2},${torsoTop} ${-top / 2 + rr},${torsoTop}Z`,
      ].join(" ");
    }
    const w = S.outfit === "plain" ? S.limbW * 1.6 : tw;
    const rt = w * 0.36;
    const rb = w * 0.18;
    const x0 = -w / 2;
    const x1 = w / 2;
    return [
      `M${x0 + rt},${torsoTop}`,
      `L${x1 - rt},${torsoTop}`,
      `Q${x1},${torsoTop} ${x1},${torsoTop + rt}`,
      `L${x1},${torsoBot - rb}`,
      `Q${x1},${torsoBot} ${x1 - rb},${torsoBot}`,
      `L${x0 + rb},${torsoBot}`,
      `Q${x0},${torsoBot} ${x0},${torsoBot - rb}`,
      `L${x0},${torsoTop + rt}`,
      `Q${x0},${torsoTop} ${x0 + rt},${torsoTop}Z`,
    ].join(" ");
  })();
  const frontX = turn * tw * 0.3; // where the "front" of the torso is
  const outfitDetail = (() => {
    if (S.outfit === "jacket") {
      return (
        <g>
          <path
            d={`M${frontX},${torsoTop + 10} L${frontX},${torsoBot - 4}`}
            stroke={S.clothLight}
            strokeOpacity={0.55}
            strokeWidth={2.4}
          />
          <path
            d={`M${frontX - 13},${torsoTop + 1} L${frontX},${torsoTop + 15} L${frontX + 13 - turn * 6},${torsoTop + 1}`}
            stroke={S.clothShade}
            strokeWidth={5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <rect x={-tw / 2} y={torsoBot - 9} width={tw} height={9} fill={S.clothShade} opacity={0.6} rx={4} />
        </g>
      );
    }
    if (S.outfit === "suit") {
      const sx = frontX;
      return (
        <g>
          <path d={`M${sx - 15},${torsoTop + 1} L${sx + 15 - turn * 8},${torsoTop + 1} L${sx},${torsoTop + 56}Z`} fill={C.shirtWhite} />
          <path
            d={`M${sx - 3.5},${torsoTop + 5} L${sx + 3.5},${torsoTop + 5} L${sx + 5},${torsoTop + 44} L${sx},${torsoTop + 54} L${sx - 5},${torsoTop + 44}Z`}
            fill={ink}
          />
          <path
            d={`M${sx - 16},${torsoTop + 2} L${sx},${torsoTop + 58} L${sx},${torsoBot - 6}`}
            stroke={S.clothShade}
            strokeWidth={2.5}
            fill="none"
          />
          <circle cx={sx + 4} cy={torsoTop + 78} r={2.6} fill={S.clothShade} />
          <circle cx={sx + 4} cy={torsoTop + 100} r={2.6} fill={S.clothShade} />
        </g>
      );
    }
    if (S.outfit === "dress") {
      const hem = S.thigh * 0.62;
      return (
        <path
          d={`M${-S.hemW / 2 + 2},${hem - 9} L${S.hemW / 2 - 2},${hem - 9}`}
          stroke={S.clothShade}
          strokeWidth={5}
          strokeOpacity={0.7}
          strokeLinecap="round"
        />
      );
    }
    return null;
  })();

  // ---- hair ---------------------------------------------------------------
  const ponytail = S.hair === "ponytail" && (
    <g>
      {(() => {
        const bx = lerp(-0.78, -0.62, turn) * r;
        const by = lerp(-0.38, -0.5, turn) * r;
        const sw = hairSwing * r * 0.35;
        const d = `M${bx},${by} C${bx - 1.15 * r + sw * 0.3},${by - 0.35 * r} ${bx - 1.3 * r + sw},${by + 0.95 * r} ${bx - 0.62 * r + sw * 1.2},${by + 1.6 * r}`;
        return (
          <>
            {rimOn && (
              <path
                d={d}
                transform={`translate(${rimOff.x},${rimOff.y})`}
                stroke={rim}
                strokeOpacity={rimAmt}
                strokeWidth={r * 0.4}
                fill="none"
                strokeLinecap="round"
              />
            )}
            <path d={d} stroke={ink} strokeWidth={r * 0.4} fill="none" strokeLinecap="round" />
          </>
        );
      })()}
    </g>
  );
  const clip = S.hair === "ponytail" && (
    <rect
      x={-r * 0.1}
      y={-r * 0.3}
      width={r * 0.2}
      height={r * 0.6}
      rx={r * 0.1}
      fill={C.miaClip}
      transform={`translate(${lerp(-0.62, -0.5, turn) * r},${lerp(-0.62, -0.68, turn) * r}) rotate(${lerp(-28, -45, turn)})`}
    />
  );
  const slick =
    S.hair === "slick"
      ? `M${-0.92 * r},${-0.4 * r} Q${-0.6 * r},${-1.22 * r} ${0.25 * r},${-1.2 * r} Q${0.85 * r},${-1.18 * r} ${0.98 * r},${-0.72 * r} Q${0.7 * r},${-0.86 * r} ${0.3 * r},${-0.84 * r} Q${-0.4 * r},${-0.78 * r} ${-0.92 * r},${-0.4 * r}Z`
      : null;

  const headRot = P.headTilt + P.lean * 0.4;

  return (
    <g
      transform={`translate(${x},${y}) scale(${scale * facing},${scale})`}
      opacity={opacity}
      filter={filter}
    >
      <defs>
        <linearGradient id={gid} x1={L.x > 0 ? 1 : 0} y1={0} x2={L.x > 0 ? 0 : 1} y2={0.15}>
          <stop offset="0" stopColor={mixColor(S.cloth, S.clothLight, 0.45)} />
          <stop offset="0.45" stopColor={S.cloth} />
          <stop offset="1" stopColor={S.clothShade} />
        </linearGradient>
        <linearGradient
          id={ringId}
          x1={0.5 - L.x * 0.5}
          y1={0.5 - L.y * 0.5}
          x2={0.5 + L.x * 0.5}
          y2={0.5 + L.y * 0.5}
        >
          <stop offset="0" stopColor={rim} stopOpacity={0.35} />
          <stop offset="1" stopColor={rim} stopOpacity={1} />
        </linearGradient>
      </defs>
      <g transform={`translate(0,${lift})`}>
        {/* far side */}
        {limb(pts(armF.s, armF.e, armF.w), S.limbW, inkFar, 0.6)}
        {hold(armF, holdFar)}
        {legPath(legF, inkFar, 0.6)}
        {/* hair behind the head */}
        <g transform={`translate(${headC.x},${headC.y}) rotate(${headRot})`}>
          {ponytail}
          {headExtraBehind}
        </g>
        {legPath(legN, ink)}
        {/* torso */}
        <g transform={`rotate(${P.lean})`}>
          {rimOn && S.outfit !== "plain" && (
            <path
              d={torsoD}
              transform={`translate(${rimOff.x * 0.9},${rimOff.y * 0.9})`}
              fill={mixColor(S.clothLight, rim, 0.55)}
              opacity={rimAmt}
            />
          )}
          {S.outfit === "plain" ? (
            limb(`M0,${torsoTop + 6} L0,${torsoBot}`, S.limbW * 1.5, ink)
          ) : (
            <path d={torsoD} fill={`url(#${gid})`} />
          )}
          {outfitDetail}
        </g>
        {/* head */}
        <g transform={`translate(${headC.x},${headC.y}) rotate(${headRot})`}>
          {rimOn && <circle cx={rimOff.x * 1.25} cy={rimOff.y * 1.25} r={r} fill={rim} opacity={rimAmt} />}
          <circle r={r} fill={ink} />
          {slick && (
            <>
              {rimOn && <path d={slick} transform={`translate(${rimOff.x},${rimOff.y})`} fill={rim} opacity={rimAmt} />}
              <path d={slick} fill={ink} />
              <path
                d={`M${-0.55 * r},${-0.86 * r} Q${0.05 * r},${-1.12 * r} ${0.72 * r},${-0.86 * r}`}
                stroke="#4A4452"
                strokeWidth={r * 0.045}
                fill="none"
                strokeLinecap="round"
              />
            </>
          )}
          {ring > 0 && (
            <circle r={r * 1.015} fill="none" stroke={`url(#${ringId})`} strokeWidth={r * 0.06} opacity={ring} />
          )}
          <FaceFeatures r={r} f={F} turn={turn} />
          {clip}
          {headExtra}
        </g>
        {/* near arm (drawn over the head so raised arms read in front) */}
        {limb(pts(armN.s, armN.e, armN.w), S.limbW, ink)}
        {hold(armN, holdNear)}
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------
// Face: white features only (reference §A). Head-local coords, radius r.
export const FaceFeatures: React.FC<{ r: number; f: Face; turn: number }> = ({ r, f, turn }) => {
  const W = C.eyeWhite;
  const shift = turn * 0.4 * r;
  const spacing = lerp(0.74, 0.6, turn) * r;
  const er = 0.175 * r * f.eyeScale;
  const ex = f.lookX * 0.12 * r;
  const ey = -0.1 * r + f.lookY * 0.1 * r;
  const blink = clamp(f.blink);
  const eyes = [-1, 1].map((side) => {
    const far = side === -1;
    const s = far ? lerp(1, 0.86, turn) : 1;
    const cx = shift + ex + (side * spacing) / 2;
    const cy = ey;
    const k = er * s;
    let el: React.ReactNode;
    if (f.eye === "happy") {
      el = (
        <path
          d={`M${cx - k * 1.05},${cy + k * 0.45} Q${cx},${cy - k * 1.25} ${cx + k * 1.05},${cy + k * 0.45}`}
          stroke={W}
          strokeWidth={k * 0.6}
          fill="none"
          strokeLinecap="round"
        />
      );
    } else if (f.eye === "closed" || (blink > 0.82 && f.eye !== "wide")) {
      el = (
        <path
          d={`M${cx - k * 1.05},${cy + k * 0.15} L${cx + k * 1.05},${cy + k * 0.15}`}
          stroke={W}
          strokeWidth={k * 0.5}
          strokeLinecap="round"
        />
      );
    } else if (f.eye === "wide") {
      const R = k * 1.3;
      el = (
        <g>
          <ellipse cx={cx} cy={cy} rx={R} ry={R * (1 - blink * 0.9)} fill={W} />
          <circle cx={cx + f.lookX * R * 0.3} cy={cy + f.lookY * R * 0.3} r={R * 0.42} fill={C.ink} />
        </g>
      );
    } else if (f.eye === "lid") {
      el = (
        <path
          d={`M${cx - k},${cy - k * 0.1} A${k},${k * (1 - blink * 0.8)} 0 0 0 ${cx + k},${cy - k * 0.1}Z`}
          fill={W}
        />
      );
    } else {
      el = <ellipse cx={cx} cy={cy} rx={k} ry={k * (1 - blink * 0.85)} fill={W} />;
    }
    // brows: inner end is toward the face centre
    const bl = k * 2.1;
    const by = cy - k * 2.25 - f.browY * k * 0.9;
    const ang = side * f.brow * 24;
    const brow =
      f.browShow > 0.01 ? (
        <path
          d={`M${cx - bl / 2},${by} L${cx + bl / 2},${by}`}
          transform={`rotate(${ang},${cx},${by})`}
          stroke={W}
          strokeWidth={k * 0.62}
          strokeLinecap="round"
          opacity={f.browShow}
        />
      ) : null;
    const tear =
      f.tears > 0.01 ? (
        <path
          d={`M${cx},${cy + k * 1.2} q${k * 0.55},${k * 0.8} 0,${k * 1.25} q${-k * 0.55},${-k * 0.45} 0,${-k * 1.25}Z`}
          fill={C.tear}
          opacity={f.tears}
          transform={`translate(0,${(1 - f.tears) * -k * 0.6})`}
        />
      ) : null;
    return (
      <g key={side}>
        {el}
        {brow}
        {tear}
      </g>
    );
  });

  const mx = shift * 1.08 + ex * 0.5;
  const my = 0.38 * r + f.lookY * 0.04 * r;
  const w = 0.44 * r * f.mouthW * lerp(1, 0.85, turn);
  const sw = er * 0.55;
  let mouth: React.ReactNode = null;
  switch (f.mouth) {
    case "smile":
      mouth = (
        <path
          d={`M${mx - w / 2},${my} Q${mx},${my + f.curve * 0.55 * r} ${mx + w / 2},${my}`}
          stroke={W}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
        />
      );
      break;
    case "flat":
      mouth = (
        <path d={`M${mx - w * 0.3},${my + 0.04 * r} L${mx + w * 0.3},${my + 0.04 * r}`} stroke={W} strokeWidth={sw} strokeLinecap="round" />
      );
      break;
    case "grin": {
      const h = (0.28 + f.open * 0.12) * r;
      mouth = (
        <path
          d={`M${mx - w * 0.68},${my - 0.06 * r} Q${mx},${my + 0.0 * r} ${mx + w * 0.68},${my - 0.06 * r} Q${mx + w * 0.62},${my + h} ${mx},${my + h} Q${mx - w * 0.62},${my + h} ${mx - w * 0.68},${my - 0.06 * r}Z`}
          fill={W}
        />
      );
      break;
    }
    case "o":
      mouth = <ellipse cx={mx} cy={my + 0.06 * r} rx={(0.1 + f.open * 0.05) * r} ry={(0.12 + f.open * 0.09) * r} fill={W} />;
      break;
    case "talk":
      mouth = (
        <ellipse
          cx={mx}
          cy={my + 0.05 * r}
          rx={w * (0.28 + f.open * 0.06)}
          ry={Math.max(sw * 0.5, (0.02 + f.open * 0.15) * r)}
          fill={W}
        />
      );
      break;
    case "smirk":
      mouth = (
        <path
          d={`M${mx - w * 0.45},${my + 0.06 * r} Q${mx + w * 0.05},${my + 0.12 * r} ${mx + w * 0.5},${my - 0.06 * r}`}
          stroke={W}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
        />
      );
      break;
    case "wobble": {
      const q = w / 6;
      mouth = (
        <path
          d={`M${mx - w / 2},${my + 0.04 * r} q${q / 2},${-0.06 * r} ${q},0 t${q},0 t${q},0 t${q},0 t${q},0 t${q},0`}
          stroke={W}
          strokeWidth={sw * 0.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
      break;
    }
  }
  return (
    <g>
      {eyes}
      {mouth}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Close-up head (reference close-up style: big head, full warm/cool ring,
// shallow-DOF background supplied by the scene). Head-local coords.
export const Head: React.FC<{
  spec: CharacterSpec;
  id: string;
  x: number;
  y: number;
  size: number; // rendered head diameter in px
  face?: Partial<Face>;
  turn?: number;
  facing?: 1 | -1;
  tilt?: number;
  light?: V;
  rim?: string;
  ring?: number;
  hairSwing?: number;
  shoulders?: boolean;
  extra?: React.ReactNode;
}> = ({ spec, id, x, y, size, face, turn = 0, facing = 1, tilt = 0, light = { x: 0.7, y: -0.7 }, rim = C.rimWarm, ring = 1, hairSwing = 0, shoulders = true, extra }) => {
  const k = size / spec.D;
  return (
    <g transform={`translate(${x},${y}) scale(${k * facing},${k})`}>
      {shoulders && (
        <g>
          <path
            d={`M${-spec.D * 0.62},${spec.D * 0.95} Q${-spec.D * 0.6},${spec.D * 0.5} ${0},${spec.D * 0.47} Q${spec.D * 0.6},${spec.D * 0.5} ${spec.D * 0.62},${spec.D * 0.95}Z`}
            fill={spec.outfit === "plain" ? C.ink : spec.cloth}
          />
          {spec.outfit === "suit" && (
            <path d={`M${-spec.D * 0.12},${spec.D * 0.5} L${spec.D * 0.12},${spec.D * 0.5} L0,${spec.D * 0.9}Z`} fill={C.shirtWhite} />
          )}
        </g>
      )}
      <g transform={`rotate(${tilt})`}>
        <Figure
          spec={{ ...spec, thigh: 0, shin: 0, upper: 0, fore: 0, torsoLen: 0, limbW: 0, shoeH: 0, shoeL: 0, torsoW: 0, hemW: 0, outfit: "plain" }}
          id={id}
          x={0}
          y={spec.D / 2 - spec.D * 0.08}
          grounded={false}
          turn={turn}
          face={face}
          light={{ x: light.x * facing, y: light.y }}
          rim={rim}
          rimAmt={0.7}
          ring={ring}
          hairSwing={hairSwing}
          headExtra={extra}
        />
      </g>
    </g>
  );
};
