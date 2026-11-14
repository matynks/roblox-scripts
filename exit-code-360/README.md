# EXIT CODE — *What If You Had 360-Degree Vision?*

Animated explainer production project (Remotion + React + TypeScript + SVG, FFmpeg, Python audio tools).

**Status: full production complete — 439.733 s, 13,192 frames, 1920×1080, 30 fps, H.264 + AAC. See `docs/07_FINAL_PRODUCTION_REPORT.md`.**

## Layout

```
docs/
  01_REFERENCE_ANALYSIS.md   Stage A: what the reference contains, style guide, palette, lighting, camera, motion graphics
  02_AUDIO_TIMING_MAP.md     full narration: 265 phrases with measured times, 34 story sequences
  03_CHARACTER_DESIGN.md     Stage B: Leo, Mia, Mr. Black
  04_POC_SHOT_BREAKDOWN.md   Stage C: per-phrase shot spec for the POC window
  05_POC_TECHNICAL_REPORT.md Stage D: what was built, QA, open issues
  06_FULL_PRODUCTION_PLAN.md per-sequence designs for all 34 sequences, build order
  07_FINAL_PRODUCTION_REPORT.md final specs, sound design, QC results, fixes made during QC
  08_SHORTS_TEASER.md         30-s 9:16 YouTube Shorts teasers: v1 (summary) and v2 (mystery, no spoilers)
src/
  characters/  rig (Figure.tsx), cast proportions, poses + walk/run cycles, expressions
  props/       cardboard mask, sandwich, seagull, cyclist (IK pedalling)
  env/         promenade, living room, street, car, gym, pitch, classroom, concert stadium; atmosphere
  graphics/    field-of-view science diagram, glow icon set (navy infographic style)
  scenes/poc/  timeline (all cues), shots, POC composition (S01–S03 of the film)
  film/        Film.tsx master composition + scenes/ (S04–S34) and the scene table
  teaser/      Shorts teasers (1080×1920): Teaser.tsx + shots.json (v1), Mystery.tsx + mystery.json (v2)
  thumbnail/   YouTube thumbnail still (1280×720) composed from the production assets
  sheets/      character design sheets (rendered from the rig)
  data/        narration_words.json / narration_phrases.json (ASR timing)
tools/
  transcribe.py         narration → word/phrase timings (Parakeet-TDT via sherpa-onnx)
  build_timing_map.py   phrases → docs/02_AUDIO_TIMING_MAP.md
  mix_audio.py          POC soundtrack (procedural SFX + ambience, narration bit-exact)
  audio_lib.py          synthesized SFX / ambience library (original, no third-party audio)
  score.py              original procedural score (14 story sections)
  mix_film.py           full-film cue sheet + beds + score + ducking → public/audio/film_mix.wav
  qa_audio.py           narration-clarity check (voice vs background per 200 ms)
  render_film.mjs       parallel segment renderer (H.264 segments, cached) + concat + AAC mux
  qa_film.py            full-film QC: specs, PTS continuity, blips, black/frozen, cuts, A/V sync, loudness, sheets
  make_grain.py         film-grain textures
  qa_stills.mjs         render QA stills by narration time
  profile.mjs           render-cost profiling
public/
  audio/narration.mp3   approved narration (SHA-256 41a8651f…7cc6377)
  audio/poc_mix.wav     POC soundtrack (generated)
  audio/film_mix.wav    film soundtrack (generated, git-ignored)
  fonts/                Montserrat 500–800 (SIL OFL)
  textures/             grain frames (generated)
renders/
  EXIT_CODE_360_POC_v2.mp4
  EXIT_CODE_360_FULL.mp4     (generated; delivered directly, not committed)
thumbnail/
  EXIT_CODE_360_THUMBNAIL_FINAL.png  FINAL 1280×720 thumbnail — story scene (Still "ThumbnailScene" at 2× → Lanczos to 1280×720)
  EXIT_CODE_360_THUMBNAIL.png     v2 redesign (Still "ThumbnailV2")
  EXIT_CODE_360_THUMBNAIL_v1.png  first version (Still "Thumbnail")
assets/
  character_sheets/     rendered sheets
  reference_frames/     (git-ignored) analysis boards from the third-party reference
```

## Rendering

Requirements: Node 22, Python 3 (numpy, scipy, soundfile), FFmpeg, and Chromium headless shell. The path is set in `remotion.config.ts`; override it with `REMOTION_BROWSER`.

```bash
npm install
python3 tools/make_grain.py          # once
python3 tools/mix_audio.py           # rebuild POC soundtrack from timeline cues
npm run render:poc                   # → renders/EXIT_CODE_360_POC_v2.mp4 (1920×1080, 30 fps, H.264 + AAC)
npm run render:film                  # mix + render → renders/EXIT_CODE_360_FULL.mp4 (≈35 min on 4 cores)
node tools/render_film.mjs --comp Film --out renders/EXIT_CODE_360_FULL.mp4 \
  --audio public/audio/film_mix.wav --only 4,5   # re-render only changed 600-frame segments
python3 tools/qa_film.py renders/EXIT_CODE_360_FULL.mp4 public/audio/film_mix.wav renders/qa/film
npx remotion studio src/index.ts     # interactive preview
```

Re-timing the narration (only needed if the MP3 changes):

```bash
ffmpeg -i public/audio/narration.mp3 -ac 1 -ar 16000 narr16k.wav
python3 tools/transcribe.py --wav narr16k.wav --model-dir <sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8> --out src/data/
python3 tools/build_timing_map.py
```
