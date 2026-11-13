// Time full-resolution POC stills under different quality switches.
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const variants = [
  { withAudio: false },
  { withAudio: false, grain: false },
  { withAudio: false, blur: 0 },
  { withAudio: false, blur: 0, grain: false },
];
for (const inputProps of variants) {
  const composition = await selectComposition({ serveUrl, id: "POC", inputProps, browserExecutable });
  for (const frame of [90, 300, 500]) {
    const t0 = Date.now();
    await renderStill({ serveUrl, composition, frame, output: `/tmp/claude-0/-home-user-roblox-scripts/b91a9ea7-bd39-5a77-9706-16d2493174b6/scratchpad/prof_${frame}.png`, inputProps, browserExecutable });
    console.log(JSON.stringify(inputProps), frame, Date.now() - t0, "ms");
  }
}
