# EXIT CODE 360 — Stage D: Proof of Concept v2 Technical Report

**Deliverable:** `renders/EXIT_CODE_360_POC_v2.mp4`, covering narration 13.70–43.20 s (29.50 s).

## 1. Source files

| File | Status |
|---|---|
| Reference video `FREE-UNLIMITED-SnapYT.App.mp4` | ✅ Opened and analysed (640×360, 30 fps, 792.7 s). It is a tutorial: finished animation clips mixed with desktop recordings. Only the finished clips were used (see `01_REFERENCE_ANALYSIS.md` §0). |
| Narration `ElevenLabs_Your_little_sister_tiptoes_up_behind_.mp3` | ✅ MP3 44.1 kHz mono 192 kbps. Decoded duration **439.722 s**, matching the brief. SHA-256 `41a8651f…7cc6377`. |
| Previous proof of concept `EXIT_CODE_360_POC.mp4` | ❌ **Not present** in the repository or the uploads. It was not needed: the brief rules out its visual direction, and the new pipeline was built from scratch. |

## 2. Pipeline (chosen after inspecting the environment)

| Layer | Tool |
|---|---|
| Animation / compositing | **Remotion 4.0.543**, React 19, TypeScript 5.9, SVG + CSS filters |
| Browser | Pre-installed Chromium headless shell 1243 (no download) |
| Encoding | Remotion → FFmpeg: H.264 High, yuv420p, CRF 16, AAC 192 kbps |
| Narration timing | NeMo Parakeet-TDT 0.6B v2 (int8) via sherpa-onnx, word timestamps. A coverage check guarantees every voiced region is transcribed. |
| Sound design | Python (numpy/scipy). Every SFX and ambience is synthesised, so all assets are original. |
| Type | Montserrat 500–800 (SIL OFL), bundled locally |

Render performance: Chromium's `swangle` GL backend was 5× slower and has been removed. A full-resolution frame now costs about 0.6–1.3 s; depth-of-field blur is the main cost.

## 3. Requirement checklist (Stage C)

| Requirement | Where in the POC |
|---|---|
| Character interaction | Mia ↔ Leo: stare, "How?!", she hurries over, he turns and shrugs. Mia points at the gull and ducks. Gull ↔ Leo standoff. |
| Character movement | Walk cycles with planted feet (phase driven by distance), dancer side-step, brisk walk, duck, arm lift, bite. Cyclist pedalling via IK. Gull flight, landing, takeoff. |
| Cinematic environment | Seaside promenade at sunset in 5 parallax planes. Sun bloom and glint column, pines, lighthouse beam, sailboat, lamps with light cones, dust motes, blurred foreground posts, vignette, grain, letterbox. |
| Camera movement | Tracking shot with slow push, two-shot push and pans, gull follow, push-in into Leo's head, re-framing in the diagram. |
| Lighting | Single motivated key (setting sun) drives the rim light on every character. Lamp cones and pools, bloom, DOF. |
| Scientific / infographic animation | Top-down field-of-view diagram: 200° human (≈120° both eyes plus periphery), 160° blind zone, hypothetical 360° sweep with counters, ripples and a shattering blind zone. |
| Transition between shots | Hard cut A→BC. Designed **match transition** BC→D: push into Leo's head, rings expand, and his head dissolves into the top-down head. |
| Original narration audio | Sample-exact slice of the approved MP3 (verified max difference 0.0 vs source). |

## 4. QA results (`tools/qa_video.py` → `renders/qa/video/qa_report.json`)

| Check | Result |
|---|---|
| Video stream | H.264 High, **1920×1080**, **30 fps**, yuv420p, **885 frames**, 29.500 s |
| Audio stream | **AAC**, 44.1 kHz stereo, ~193 kbps, 29.500 s |
| Narration integrity | Mix narration vs source MP3: max sample difference **0.0** (8 ms edge fades sit in measured pauses) |
| A/V sync | Cross-correlation of MP4 audio vs mix: **0 samples** offset |
| Loudness | Narration −17.4 dB RMS. SFX + beds −35.8 dB RMS (≈18 dB under the voice). Decoded peak −0.54 / −1.07 dBFS (L/R), no clipping. |
| Black frames | Only the intended fade-in (first 2 frames) |
| Frozen frames | None longer than 1 s |
| Walk cycle | Planted foot moves at background speed (≈6.3 px/frame under the tracking camera): **no foot sliding** |
| Facing flip (21.95 s) | Mirrored-pose flip shows no visible pop in a 10 fps strip |
| Visual spot checks | Full-resolution frames at the dodge (17.1 s) and the perched gull (27.6 s), plus 10 fps strips of every section |
| Fixed during QA | (1) Sky/sea gradient too bright → re-staged. (2) Overhead arm read as a blob → re-posed. (3) Shrug unreadable in 3/4 → moved to front view. (4) Gull clipped by the letterbox → path lowered. (5) "≈0°" counter visible before the sweep → delayed. (6) Render bottleneck (single GPU process) → parallel renderer. |

## 5. Known limitations and open issues

1. **Sound effects were verified visually, not by ear.**
   * I can't listen in this environment. Placement and levels were checked with spectrograms and RMS/peak measurements: effects and beds sit about 18 dB under the narration, and the mix peaks at −0.53 dBFS.
   * The synthesised **seagull calls** are the most likely to sound artificial. If they do, swap in a licensed field recording.
2. **The transcript is ASR output, used for timing only.** A few spellings are flagged in `02_AUDIO_TIMING_MAP.md` (e.g. "mister" → "Mr."). Please confirm the phrase *"Football next. Twenty two players on the pitch. A referee can't see behind him."* The first ASR pass dropped it; the coverage check recovered it.
3. **No back-view drawing yet.** Facing changes go through the front view with a mirrored-pose flip. A true back view (for a pirouette or walking away from camera) still needs to be added to the rig.
4. **Render cost.**
   * The 885 POC frames took about 8 minutes on 4 cores.
   * Estimate for the full film (13,192 frames): about 2 hours at similar complexity.
5. **Letterbox.** The bars (54 px) follow the reference's cinematic framing; the science shot keeps them for consistency. Easy to remove globally if you prefer full 16:9.
6. **The previous POC was not provided**, so nothing was reused from it.

## 6. Decisions requested before full production

* Approve or redirect the **visual direction**: characters, sunset palette, navy infographics, letterbox.
* Approve **Leo's "sense ring"** as the recurring motif for perceiving behind.
* Sound: keep the **procedural SFX** approach (fully original), or allow licensed SFX/music libraries?
* Background **music**: the POC uses only a subtle ambient pad under the science section. Do you want a scored music bed?

## 7. Files created

```
.gitignore
README.md
assets/character_sheets/sheet_black.png
assets/character_sheets/sheet_leo.png
assets/character_sheets/sheet_mia.png
docs/01_REFERENCE_ANALYSIS.md
docs/02_AUDIO_TIMING_MAP.md
docs/03_CHARACTER_DESIGN.md
docs/04_POC_SHOT_BREAKDOWN.md
docs/05_POC_TECHNICAL_REPORT.md
package-lock.json
package.json
public/audio/narration.mp3
public/audio/poc_mix.wav
public/fonts/montserrat-latin-500-normal.woff2
public/fonts/montserrat-latin-600-normal.woff2
public/fonts/montserrat-latin-700-normal.woff2
public/fonts/montserrat-latin-800-normal.woff2
remotion.config.ts
renders/EXIT_CODE_360_POC_v2.mp4
src/Root.tsx
src/characters/Figure.tsx
src/characters/cast.ts
src/characters/poses.ts
src/characters/types.ts
src/data/narration_phrases.json
src/data/narration_words.json
src/env/Atmosphere.tsx
src/env/Promenade.tsx
src/graphics/VisionField.tsx
src/index.ts
src/lib/anim.ts
src/lib/camera.tsx
src/lib/fx.ts
src/props/Cyclist.tsx
src/props/Props.tsx
src/props/Seagull.tsx
src/scenes/poc/POC.tsx
src/scenes/poc/PromenadeShots.tsx
src/scenes/poc/VisionShot.tsx
src/scenes/poc/timeline.ts
src/sheets/CharacterSheet.tsx
src/style/fonts.ts
src/style/palette.ts
tools/build_timing_map.py
tools/make_grain.py
tools/mix_audio.py
tools/profile.mjs
tools/qa_stills.mjs
tools/qa_video.py
tools/render_parallel.mjs
tools/transcribe.py
tsconfig.json
```

Generated locally and git-ignored (rebuild with the tools above): `public/audio/poc_mix.wav`, `public/textures/grain_*.png`, `renders/frames/`, `renders/qa/` (QA stills, strips, stems, `qa_report.json`). The `assets/reference_frames/` analysis boards are kept local because they are third-party frames.
