// Render specific POC frames (by narration time) to PNG for visual QA, using
// a single bundle. Usage:
//   node tools/qa_stills.mjs <outDir> <time1> [time2 ...]   (narration seconds)
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
// usage: node tools/qa_stills.mjs <outDir> [--comp Film] <t1> <t2> ...
const argv = process.argv.slice(2);
const ci = argv.indexOf("--comp");
const compId = ci >= 0 ? argv.splice(ci, 2)[1] : "POC";
const [outDir, ...times] = argv;
const START = compId === "POC" ? 13.7 : 0;
const FPS = 30;
const browserExecutable =
  process.env.REMOTION_BROWSER ??
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const inputProps = { withAudio: false };
const composition = await selectComposition({ serveUrl, id: compId, inputProps, browserExecutable });
for (const ts of times) {
  const frame = Math.round((Number(ts) - START) * FPS);
  const output = path.join(outDir, `T${Number(ts).toFixed(2)}_f${frame}.png`);
  await renderStill({ serveUrl, composition, frame, output, inputProps, browserExecutable, scale: Number(process.env.QA_SCALE || 0.5) });
  console.log(output);
}
