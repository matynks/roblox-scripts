// Segmented parallel film renderer.
//
// * Bundles once, splits the composition into fixed-size segments.
// * N worker processes (each its own Chromium + GPU process) render segments
//   straight to H.264 (no PNG frames on disk), muted.
// * Segments are cached in renders/segments/<comp>/ — re-render only what changed
//   with --only 3,4 (segment indices) or --range 1200-1800 (frames), or --force.
// * Concatenates segments (stream copy) and muxes the soundtrack (AAC 192k).
//
//   node tools/render_film.mjs --comp Film --out renders/EXIT_CODE_360_FULL.mp4 \
//        --audio public/audio/film_mix.wav --workers 4 --seg 600 --crf 16
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
const flag = (k) => process.argv.includes(`--${k}`);

if (process.argv[2] === "worker") {
  // node render_film.mjs worker <serveUrl> <comp> <crf> <jobsJson>
  const [, , , serveUrl, id, crf, jobsJson] = process.argv;
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const inputProps = { withAudio: false };
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable });
  for (const job of JSON.parse(jobsJson)) {
    const tmp = job.out + ".part.mp4";
    const t0 = Date.now();
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      browserExecutable,
      codec: "h264",
      crf: Number(crf),
      x264Preset: "medium",
      pixelFormat: "yuv420p",
      imageFormat: "png",
      frameRange: [job.a, job.b],
      muted: true,
      concurrency: 1,
      outputLocation: tmp,
      overwrite: true,
    });
    fs.renameSync(tmp, job.out);
    console.log(`segment ${job.i} [${job.a}-${job.b}] done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  process.exit(0);
}

const comp = arg("comp", "Film");
const out = path.resolve(root, arg("out", "renders/EXIT_CODE_360_FULL.mp4"));
const audio = arg("audio") ? path.resolve(root, arg("audio")) : null;
const workers = Number(arg("workers", Math.min(4, os.cpus().length)));
const segLen = Number(arg("seg", "600"));
const crf = arg("crf", "16");
const segDir = path.join(root, "renders/segments", comp);
fs.mkdirSync(segDir, { recursive: true });

const t0 = Date.now();
const { bundle } = await import("@remotion/bundler");
const { selectComposition } = await import("@remotion/renderer");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const composition = await selectComposition({ serveUrl, id: comp, inputProps: { withAudio: false }, browserExecutable });
const total = composition.durationInFrames;
const segs = [];
for (let a = 0, i = 0; a < total; a += segLen, i++) segs.push({ i, a, b: Math.min(total - 1, a + segLen - 1), out: path.join(segDir, `seg_${String(i).padStart(3, "0")}.mp4`) });

const only = arg("only") ? new Set(arg("only").split(",").map(Number)) : null;
const range = arg("range") ? arg("range").split("-").map(Number) : null;
const todo = segs.filter((s) => {
  if (only) return only.has(s.i);
  if (range) return s.b >= range[0] && s.a <= range[1];
  return flag("force") || !fs.existsSync(s.out);
});
console.log(`${comp}: ${total} frames, ${segs.length} segments of ${segLen}; rendering ${todo.length} with ${workers} workers`);

// longest-processing-first is unknown; interleave so each worker gets a mix
const buckets = Array.from({ length: workers }, () => []);
todo.forEach((s, k) => buckets[k % workers].push(s));
await Promise.all(
  buckets
    .filter((b) => b.length)
    .map(
      (jobs) =>
        new Promise((res, rej) => {
          const p = spawn(process.execPath, [self, "worker", serveUrl, comp, crf, JSON.stringify(jobs)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
          p.stdout.on("data", (d) => process.stdout.write(d));
          p.stderr.on("data", (d) => {
            const s = String(d);
            if (!/memory|CGroup|MemAvailable|docker run|lower amount/.test(s)) process.stderr.write(s);
          });
          p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`worker exited ${code}`))));
        }),
    ),
);
const missing = segs.filter((s) => !fs.existsSync(s.out));
if (missing.length) throw new Error(`missing segments: ${missing.map((s) => s.i).join(",")}`);
console.log(`segments ready in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

const list = path.join(segDir, "concat.txt");
fs.writeFileSync(list, segs.map((s) => `file '${s.out}'`).join("\n") + "\n");
const ff = [
  "-y", "-v", "error",
  "-f", "concat", "-safe", "0", "-i", list,
  ...(audio ? ["-i", audio] : []),
  "-map", "0:v:0", ...(audio ? ["-map", "1:a:0"] : []),
  "-c:v", "copy",
  ...(audio ? ["-c:a", "aac", "-b:a", arg("abr", "192k"), "-ar", "44100"] : []),
  "-movflags", "+faststart",
  out,
];
const r = spawnSync("ffmpeg", ff, { stdio: "inherit" });
if (r.status !== 0) throw new Error("ffmpeg concat/mux failed");
console.log(`wrote ${out} in ${((Date.now() - t0) / 1000).toFixed(0)} s total`);
