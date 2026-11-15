# EXIT CODE · Video #2 — *What If Humans Never Needed Sleep?*

16:9 · 1920×1080 · ~7:30 · English · production follows [`../../docs/PRODUCTION_STANDARD.md`](../../docs/PRODUCTION_STANDARD.md)

## Status

| # | Stage | Status | Evidence |
|---|---|---|---|
| 1–2 | Inspect, audit, upgrade plan | ✅ **G1 approved** 2026-11-15 | audit presented in session; standards in `../../docs/` |
| 3 | Research | ✅ v1.2, 2026-11-15 | [docs/01_RESEARCH.md](docs/01_RESEARCH.md) — 62 sources with verification levels (S52–S63 added in reviews) |
| 4 | Story Bible + Story Lock | ⏳ **v4 awaiting G2** — v1 reviewed by the producer (6 issues); v2 independently reviewed (27 findings); v3 narrow producer pass (5 points) | [docs/02_CLAIM_LEDGER.md](docs/02_CLAIM_LEDGER.md) v4, [docs/03_STORY_BIBLE.md](docs/03_STORY_BIBLE.md) v4, [docs/04_STORY_LOCK.md](docs/04_STORY_LOCK.md) v4, [docs/05_FINAL_REVIEW.md](docs/05_FINAL_REVIEW.md), [docs/06_V4_CORRECTIONS.md](docs/06_V4_CORRECTIONS.md) |
| 5–6 | Script + review | not started | — |
| 7 | Voiceover (producer, ElevenLabs web app) | not started | — |
| 8 | Project setup (shared core) | not started | — |
| 9–18 | Storyboard → final render | not started | — |

## Constraints from the G1 approval (2026-11-15)

* Video #1 (`exit-code-360/`) stays completely frozen and untouched.
* No restructuring or migration of production code yet. The shared core is created only at stage 8.
* Preserve all existing assets and working functionality.
* No final script, voiceover, animation or video before G2.
* Voice: reuse Video #1's ElevenLabs voice if its identity can be established; otherwise the producer chooses later and generates the MP3 themself.
* No analytics; no invented performance data.

## Voice status

* **Video #1 voice identity: not establishable from the project.** The narration MP3 (`exit-code-360/public/audio/narration.mp3`, identical to the uploaded file) carries only title, album, description, track and encoder tags (`Lavf60.16.101`). It has no voice name, voice ID, model or settings, and no record exists elsewhere in the project.
* **Measured profile**, to match against: median pitch 97.6 Hz (79–127 Hz), 141 words/min overall, −17.5 LUFS integrated, MP3 mono 44.1 kHz 192 kb/s (`PRODUCTION_STANDARD.md` §7).
* **Next:** at stage 7 the producer picks the voice. Your ElevenLabs account's generation history may show which voice made the Video #1 file. Its settings get recorded in `audio/voice.json`.

## Deliverables registry

| File | Version | Size | SHA-256 | Status |
|---|---|---|---|---|
| — | — | — | — | nothing rendered yet |
