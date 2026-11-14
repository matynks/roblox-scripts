# EXIT CODE — English subtitles

Deliverables
* `subtitles/EXIT_CODE_360_EN.srt` — sidecar subtitles (upload to YouTube as English captions).
* `subtitles/EXIT_CODE_360_EN.ass` — styled version used for the burn-in.
* `renders/subtitled/EXIT_CODE_360_FULL_SUBTITLED.mp4` — master with burned-in subtitles (generated, not committed).
* `renders/EXIT_CODE_360_FULL.mp4` — original master, unchanged (SHA-256 `97a02f80…7dd5a5`, verified after the job).

## Text: source of truth and accuracy
* Words and timings come from the approved narration: `src/data/narration_words.json` (Parakeet-TDT ASR on the MP3, word-level times).
* `tools/subtitles.py` holds the edited subtitle script, one entry per narration phrase (265). Edits are limited to punctuation, capitalisation, quotation marks for character lines, numerals and spelling style; `verify()` proves word for word that every spoken word is present, in order, and nothing was added.
* Independent cross-check: a second recogniser of a different model family (Whisper small.en) transcribed the whole narration; 99.4 % word agreement. All five disagreements were adjudicated: "cells" (not "sells"), "Chabris" (researcher's name), "Mia too" (not "mere two"), "one and a quarter" (Whisper writes 1.25), and "Look **away**" — Whisper dropped the word; the audio shows it voiced at −15.5 dB like "Look".
* Style: British spelling (grey, metres, apologises) to match the film (euros, mate, pitch); numbers one–ten and sentence-initial numbers spelled out, larger numbers as numerals (200 degrees, 360-degree, 10,000 euros, 412); "Gate 4" as on the on-screen sign; "Mr. Black" as in the film's lower third. Character lines are in quotation marks; attribution was taken from the film's lip-sync windows (e.g. "Mask on." is Mia; "Just watch?" is Leo).

## Timing
* 220 cues; ≤ 2 lines; ≤ 42 characters per line; median reading speed well under 17 cps, max 19.5 cps.
* In-time one frame before the first word; out-time 0.35 s after the last word; cues closer than 0.5 s are chained with a clean 2-frame gap; minimum 0.73 s only for single-word beats ("You?", "Jump.").
* Segmentation follows the speech, not the page: a cost model penalises showing a sentence before it is spoken, straddling a hard shot change, ending a line on an article/preposition/pronoun, splitting numbers, or separating a quoted line from its continuation; in/out times snap to nearby shot changes.

## Design
* Montserrat SemiBold (the film's typeface, converted from the bundled web fonts), 54 px at 1080p, white, soft brand-ink outline (2.8 px) and shadow; bottom-centred above the letterbox inside the title-safe area.
* A semi-transparent dark backing is used only where the background needs it, chosen by measuring the subtitle zone in the original frames behind every cue (18 cues: the bright notebook inserts, gym floor, a bright living-room patch) plus the split-screen cue where the text crosses the divider line.
* Placement exceptions so nothing important is covered (each checked at full resolution):
  * 280.9 s "Then you see her:" → top (Mia's reveal ring is at the bottom of frame).
  * 305.4 s "Gate 4 or Mia?" → top, between the film's own GATE 4 / MIA captions (Leo's face badge is at the bottom).
  * 384.1 s "but the limit is real." → raised above the film's own gold caption of the same words.
  * End card (427.4 s–) → in the clear sky between the headline and the cast, keeping the call-to-action row and footer visible.
  * Reality-check facts at 382 s and 410 s → single-line cues that clear the diagram labels.

## Burn-in and QC
* `ffmpeg` + libass onto the existing master — the animation was not re-rendered. x264 CRF 12, preset slow, tune animation, High profile, yuv420p; timestamps passed through; AAC stream copied (bit-identical).
* `tools/subtitle_verify.py`: specs identical to the original; audio packet MD5 identical; original SHA-256 unchanged; every one of the 13,192 frames compared with the original to detect when subtitle pixels are on screen — matched against the cue list frame for frame; cue rules re-checked.
* Visual review: every cue's mid-frame reviewed on contact sheets (`tools/subtitle_qc.py sheets`), borderline cues at full resolution.

```bash
python3 tools/subtitles.py && python3 tools/subtitle_qc.py zones && python3 tools/subtitles.py
ffmpeg -i renders/EXIT_CODE_360_FULL.mp4 -map 0:v:0 -map 0:a:0 \
  -vf "ass=subtitles/EXIT_CODE_360_EN.ass:fontsdir=renders/subtitles/fonts" -fps_mode passthrough \
  -c:v libx264 -preset slow -tune animation -crf 12 -profile:v high -pix_fmt yuv420p -c:a copy \
  -movflags +faststart renders/subtitled/EXIT_CODE_360_FULL_SUBTITLED.mp4
python3 tools/subtitle_verify.py renders/EXIT_CODE_360_FULL.mp4 renders/subtitled/EXIT_CODE_360_FULL_SUBTITLED.mp4 <sha256>
```
(The TTF fonts in `renders/subtitles/fonts` are generated from `public/fonts/*.woff2` with fontTools — see the snippet in the commit history / this doc's build step.)
