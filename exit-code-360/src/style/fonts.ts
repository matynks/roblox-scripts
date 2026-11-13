import { continueRender, delayRender, staticFile } from "remotion";

// Montserrat (SIL OFL) is bundled in public/fonts so renders never depend on
// network access. Every composition waits until the faces are loaded.
const WEIGHTS = [500, 600, 700, 800] as const;
export const FONT = "Montserrat";

let started = false;
export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading Montserrat");
  Promise.all(
    WEIGHTS.map((w) => {
      const face = new FontFace(
        FONT,
        `url(${staticFile(`fonts/montserrat-latin-${w}-normal.woff2`)}) format('woff2')`,
        { weight: String(w), style: "normal" },
      );
      return face.load().then((f) => document.fonts.add(f));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};

// Shared label / number text styles from the motion-graphics guide.
export const labelStyle = (size = 22, color = "#9FB2C8"): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: size,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color,
});

export const numberStyle = (size = 96, color = "#DCE9FF"): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: size,
  color,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.01em",
});
