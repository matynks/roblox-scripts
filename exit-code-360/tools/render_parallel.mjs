// Parallel renderer: bundle once, render frame ranges in N independent browser
// instances (each has its own GPU/compositor process, which is the bottleneck in
// software rendering), then encode the PNG sequence once with FFmpeg and mux the
// soundtrack.
//
//   node tools/render_parallel.mjs --comp POC --out renders/EXIT_CODE_360_POC_v2.mp4 \
//        --audio public/audio/poc_mix.wav [--workers 4] [--crf 16]
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), "..");
const browserExecutable =
  process.env.REMOTION_BROWSER ??
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};

if (process.argv[2] === "worker") {
  // worker: node render_parallel.mjs worker <serveUrl> <comp> <from> <to> <outDir> <propsJson>
  const [, , , serveUrl, id, from, to, outDir, propsJson] = process.argv;
  const { renderFrames, selectComposition } = await import("@remotion/renderer");
  const inputProps = JSON.parse(propsJson);
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable });
  let last = 0;
  await renderFrames({
    serveUrl,
    composition,
    inputProps,
    browserExecutable,
    outputDir: outDir,
    imageFormat: "png",
    frameRange: [Number(from), Number(to)],
    concurrency: 1,
    onStart: () => {},
    onFrameUpdate: (n) => {
      if (n - last >= 25) {
        last = n;
        process.stdout.write(`[${from}-${to}] ${n} frames\n`);
      }
    },
  });
  process.exit(0);
}

const comp = arg("comp", "POC");
const out = path.resolve(root, arg("out", "renders/out.mp4"));
const audio = arg("audio") ? path.resolve(root, arg("audio")) : null;
const workers = Number(arg("workers", Math.min(4, os.cpus().length)));
const crf = arg("crf", "16");
const props = arg("props", '{"withAudio":false}');
const framesDir = path.join(root, "renders/frames", comp);
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const t0 = Date.now();
const { bundle } = await import("@remotion/bundler");
const { selectComposition } = await import("@remotion/renderer");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const composition = await selectComposition({ serveUrl, id: comp, inputProps: JSON.parse(props), browserExecutable });
const total = composition.durationInFrames;
const fps = composition.fps;
console.log(`bundle ready (${((Date.now() - t0) / 1000).toFixed(1)} s): ${comp} ${total} frames @ ${fps} fps, ${workers} workers`);

const chunk = Math.ceil(total / workers);
const jobs = [];
for (let w = 0; w < workers; w++) {
  const a = w * chunk;
  const b = Math.min(total - 1, a + chunk - 1);
  if (a > b) continue;
  jobs.push(
    new Promise((res, rej) => {
      const p = spawn(process.execPath, [self, "worker", serveUrl, comp, String(a), String(b), framesDir, props], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
      p.stdout.on("data", (d) => process.stdout.write(d));
      p.stderr.on("data", (d) => {
        const s = String(d);
        if (!/memory|CGroup|MemAvailable|docker run|lower amount/.test(s)) process.stderr.write(s);
      });
      p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`worker ${a}-${b} exited ${code}`))));
    }),
  );
}
await Promise.all(jobs);
const pngs = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png")).sort();
console.log(`rendered ${pngs.length}/${total} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (pngs.length !== total) throw new Error("missing frames");

// FFmpeg encode: H.264 High, yuv420p, CRF, AAC 192k; exact frame count.
const ff = [
  "-y",
  "-v", "error",
  "-framerate", String(fps), "-pattern_type", "glob", "-i", path.join(framesDir, "*.png"),
  ...(audio ? ["-i", audio] : []),
  "-r", String(fps),
  "-c:v", "libx264", "-preset", "slow", "-crf", crf, "-pix_fmt", "yuv420p", "-profile:v", "high",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  ...(audio ? ["-c:a", "aac", "-b:a", "192k", "-ar", "44100"] : []),
  "-frames:v", String(total),
  "-movflags", "+faststart",
  out,
];
const enc = spawnSync("ffmpeg", ff, { stdio: "inherit" });
if (enc.status !== 0) throw new Error("ffmpeg failed");
console.log(`wrote ${out} in ${((Date.now() - t0) / 1000).toFixed(1)} s total`);
