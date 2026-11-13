# EXIT CODE — *What If You Had 360-Degree Vision?*

Animated explainer production project (Remotion + React + TypeScript + SVG, FFmpeg, Python audio tools).

**Status: Proof of Concept v2. Waiting for style approval before full production.**

## Layout

```
docs/
  01_REFERENCE_ANALYSIS.md   Stage A: what the reference contains, style guide, palette, lighting, camera, motion graphics
  02_AUDIO_TIMING_MAP.md     full narration: 265 phrases with measured times, 34 story sequences
  03_CHARACTER_DESIGN.md     Stage B: Leo, Mia, Mr. Black
  04_POC_SHOT_BREAKDOWN.md   Stage C: per-phrase shot spec for the POC window
  05_POC_TECHNICAL_REPORT.md Stage D: what was built, QA, open issues
src/
  characters/  rig (Figure.tsx), cast proportions, poses + walk/run cycles, expressions
  props/       cardboard mask, sandwich, seagull, cyclist (IK pedalling)
  env/         seaside promenade set (parallax layers), atmosphere (letterbox, grain, motes, vignette)
  graphics/    field-of-view science diagram (navy infographic style)
  scenes/poc/  timeline (all cues), shots, POC composition
  sheets/      character design sheets (rendered from the rig)
  data/        narration_words.json / narration_phrases.json (ASR timing)
tools/
  transcribe.py         narration → word/phrase timings (Parakeet-TDT via sherpa-onnx)
  build_timing_map.py   phrases → docs/02_AUDIO_TIMING_MAP.md
  mix_audio.py          procedural SFX + ambience + mix (narration bit-exact)
  make_grain.py         film-grain textures
  qa_stills.mjs         render QA stills by narration time
  profile.mjs           render-cost profiling
public/
  audio/narration.mp3   approved narration (SHA-256 41a8651f…7cc6377)
  audio/poc_mix.wav     POC soundtrack (generated)
  fonts/                Montserrat 500–800 (SIL OFL)
  textures/             grain frames (generated)
renders/
  EXIT_CODE_360_POC_v2.mp4
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
npx remotion studio src/index.ts     # interactive preview
```

Re-timing the narration (only needed if the MP3 changes):

```bash
ffmpeg -i public/audio/narration.mp3 -ac 1 -ar 16000 narr16k.wav
python3 tools/transcribe.py --wav narr16k.wav --model-dir <sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8> --out src/data/
python3 tools/build_timing_map.py
```
