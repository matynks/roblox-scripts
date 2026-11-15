# EXIT CODE — LESSONS LEARNED

**Running record · started 2026-11-15 · covers Video #1 (*What If You Had 360-Degree Vision?*) and Video #2 so far**

Every meaningful production issue gets one entry:

* **What happened**: the facts, with evidence.
* **Why**: the cause. Where this is analysis rather than something measured, it says so.
* **Fix**: what was done.
* **Standard?**: whether the fix became a permanent rule, with the section of [PRODUCTION_STANDARD.md](PRODUCTION_STANDARD.md).
* **Avoid**: how not to repeat it.

Sources of evidence:
* Video #1 git history (`exit-code-360/`, 40 commits up to `b134a81`).
* Its documents (`exit-code-360/docs/01–10`).
* The QC reports left on disk (`exit-code-360/renders/qa/`, git-ignored).
* The producer's feedback during the project.

## Index

| ID | Area | Lesson | Standard |
|---|---|---|---|
| LL-01 | Workflow | Reference analysed only in part | §4 |
| LL-02 | Workflow | No research or fact ledger for Video #1 | §5, §6 |
| LL-03 | Workflow | First full-length review was the 1080p final | §4, §11 |
| LL-04 | QC | Batch contact sheets sampled too sparsely | §12 |
| LL-05 | Packaging | Teaser revealed too much | §14 |
| LL-06 | Packaging | Thumbnail needed four versions | §14 |
| LL-07 | Delivery | Producer had to ask which file is the upload | §3 |
| LL-08 | Delivery | File names reused for new designs | §3 |
| LL-09 | Voice | Voice identity and settings not recorded | §7 |
| LL-10 | Evidence | QC reports not kept in git | §1, §12 |
| LL-11 | Reproducibility | A manual, unscripted build step | §2 |
| LL-12 | Infrastructure | Worker restarts during long work | §11 |
| LL-13 | Research | Search limit and blocked databases | §4 |
| LL-14 | Picture | Shots opening empty / picture behind the words | §8 |
| LL-15 | Picture | Graphics covering faces | §8 |
| LL-16 | Picture | A number that misread at a glance | §8 |
| LL-17 | Picture | Clock and scoreboard broke the story's logic | §8 |
| LL-18 | Picture | Emotional beats framed too wide | §8 |
| LL-19 | Picture | Static infographic holds | §8 |
| LL-20 | Layout | In-film captions sat where subtitles had to go | §8, §13 |
| LL-21 | Code | SVG component placed inside HTML | §12 |
| LL-22 | Code | TypeScript errors in variant compositions | §12 |
| LL-23 | Packaging | Thumbnail details misread at phone size | §14 |
| LL-24 | Packaging | Orbit ring drawn inside out | §14 |
| LL-25 | Audio | Background too close to the voice in places | §10 |
| LL-26 | Audio | Gain rider triggered by narration peaks | §10 |
| LL-27 | Audio | Music and SFX never auditioned by a person | §10 |
| LL-28 | Audio code | SFX buffers of different lengths | — |
| LL-29 | QC tools | Loudness parser read the wrong line | §12 |
| LL-30 | QC tools | Cut detector missed a real cut | §12 |
| LL-31 | QC tools | Black-frame check reported only endpoints | §12 |
| LL-32 | QC tools | Report crashed on NumPy integers | — |
| LL-33 | Teaser | Narration cuts risked clipping words | §10 |
| LL-34 | Teaser | Editing JSON as text broke after reformatting | §3 |
| LL-35 | Teaser | Caption chunking hid words | §13 |
| LL-36 | Teaser | Black frames at a split screen and a title card | §12 |
| LL-37 | Teaser | A shot flashed the wrong source frame | §12 |
| LL-38 | Subtitles | Words assigned to the wrong phrase | §13 |
| LL-39 | Subtitles | Text normalisation key never matched | §13 |
| LL-40 | Subtitles | First segmentation far too dense | §13 |
| LL-41 | Subtitles | Bad line breaks | §13 |
| LL-42 | Subtitles | Rounding put cues on the wrong frames | §13 |
| LL-43 | Subtitles | Verifier rule too strict for continuous speech | §13 |
| LL-44 | Data | Stale data file in an old format | §3 |

---

## Workflow, delivery and infrastructure

### LL-01 · Reference analysed only in part
* **What happened:** Video #1's Stage A analysed only the finished-animation sections of the 13-minute reference. It skipped 1:51–10:00 as "desktop recordings" (`exit-code-360/docs/01_REFERENCE_ANALYSIS.md`, §0). That section shows the actual workflow:
  * the script engine with Story Lock, script audit and fact ledger;
  * the ElevenLabs step;
  * the Claude Code plan, style samples and contact-sheet QC;
  * the preview gate.
* **Why:** the Video #1 brief asked for the visual style, so the workflow wasn't treated as reference material.
* **Fix:** Video #2 stage 1 extracted the whole reference: frames every 5–10 s, key screens enlarged, a full local transcript.
* **Standard?** Yes, §4: the pipeline follows the reference's sequence.
* **Avoid:** transcribe and skim the whole of a reference before deciding which parts matter.

### LL-02 · No research or fact ledger for Video #1
* **What happened:** the script and voice arrived finished (an ElevenLabs MP3). No research notes, sources or fact ledger exist in the project. The reality-check claims (the 1999 attention study, dopamine, "the brain uses about a fifth of the body's energy") were never checked inside the project.
* **Why:** production started from a finished narration, and the reference's script stage wasn't part of the brief.
* **Fix:** Video #2 adds research, a sourced claim ledger with five evidence classes, a Story Lock and a script audit before any voice is recorded.
* **Standard?** Yes, §5 and §6.
* **Avoid:** no narration is recorded before its fact ledger is complete.

### LL-03 · First full-length review was the 1080p final
* **What happened:** the first full-length viewing was the final render (1,937 s for 13,192 frames, ≈ 6.9 fps on 4 workers). QC then found 10 visual problems (LL-14 to LL-19). They needed two more render passes of 1,191 s and 137 s, about 54 minutes of rendering in total.
* **Why:** there was no full-length preview stage. The 29-second proof of concept checked the look, not the whole film.
* **Fix:** each problem was fixed and its segments re-rendered; the segment cache kept passes partial.
* **Standard?** Yes, §4 G6 and §11: a full-length 960×540 preview with the real mix is the approval gate before the final.
* **Avoid:** never let the final render be the first time anyone sees the whole film.

### LL-04 · Batch contact sheets sampled too sparsely
* **What happened:** Video #1 batches were reviewed on hand-picked stills, about 22 per batch (checked: batches b1 and b5), roughly one frame every 2–3 s. The LL-03 problems sat between or around those frames.
* **Why:** frames were chosen by hand at moments expected to matter.
* **Fix (Video #1):** extra stills after the full render.
* **Standard?** Yes, §12: contact sheets at 1 frame/s, plus automatic flags (empty frames, long holds, text over faces, text in the subtitle band). The automatic flags are built at stage 8.
* **Avoid:** sample on a fixed grid, not by guesswork.

### LL-05 · Teaser revealed too much
* **What happened:** the first 30-second Shorts teaser summarised the film. The producer's feedback was that it "reveals too much", so it was rebuilt as a mystery teaser v2 with short glimpses, no explanations and no outcome.
* **Why:** no spoiler policy existed when the teaser was planned.
* **Fix:** mystery teaser v2.
* **Standard?** Yes, §14: a written spoiler policy at G2.
* **Avoid:** decide what a teaser may show before cutting it.

### LL-06 · Thumbnail needed four versions
* **What happened:** the thumbnail went through four designs:
  * v1, cluttered: four focal points and an abstract ring;
  * v2, a 360° orbit ring;
  * a ring "final";
  * a story-scene version.

  The scene version followed the producer's requirement to tell the concept through a visual scene rather than text, arrows and circles. Phone-size readability was tested properly only in the last round.
* **Why (analysis):** the thumbnail was designed as graphics after the film, not planned as a story image within it.
* **Fix:** a scene thumbnail: dodgeballs from every direction, Leo unbothered.
* **Standard?** Yes, §14: one story image readable without text, tested at 168×94 and 320×180, and planned as a shot in the film.
* **Avoid:** fix the thumbnail concept at the Story Lock and test it small early.

### LL-07 · Producer had to ask which file is the upload
* **What happened:** several MP4s existed: the proof of concept, the full master, the subtitled master and two teasers. The producer had to ask for "the EXACT final EXIT CODE video file". It was identified read-only, by hash: `renders/subtitled/EXIT_CODE_360_FULL_SUBTITLED.mp4`, SHA-256 `be5bf155…c71d`.
* **Why:** there was no registry naming exactly one upload file.
* **Fix:** identification by hash and specs.
* **Standard?** Yes, §3: a deliverables registry with exactly one `UPLOAD` row per platform slot.
* **Avoid:** register every deliverable as it is made.

### LL-08 · File names reused for new designs
* **What happened (git history):**
  * `thumbnail/EXIT_CODE_360_THUMBNAIL.png` held v1 (`ee6a9ef`) and was overwritten by v2 (`ff4b9c5`); v1 was kept as a renamed copy.
  * `EXIT_CODE_360_THUMBNAIL_FINAL.png` first held the ring design (`ced84f1`) and was then overwritten by the scene design (`dcf3469`). The ring design survives only in git history.
* **Why:** names described roles ("final") instead of versions.
* **Fix:** none needed for Video #1, since git kept every version.
* **Standard?** Yes, §3: versioned names (`_v<N>`), never `_FINAL`, and nothing overwritten.
* **Avoid:** a new design is a new file.

### LL-09 · Voice identity and settings not recorded
* **What happened:** for Video #2 the producer asked to reuse Video #1's voice. The MP3 holds only title, album, description, track and encoder (`Lavf60.16.101`): no voice name, voice ID, model or settings. Nothing in the project records them.
* **Why:** the MP3 was generated outside the project and no record was kept.
* **Fix:** reported. The voice was measured instead (median pitch 97.6 Hz, 141 words/min, −17.5 LUFS) so a match can be checked. The producer will choose the voice at the voiceover stage, and can look it up in their ElevenLabs history.
* **Standard?** Yes, §7: `voice.json` for every narration.
* **Avoid:** record the voice settings the day the MP3 is generated.

### LL-10 · QC reports not kept in git
* **What happened:** Video #1's QC evidence lives in `exit-code-360/renders/qa/`, which is git-ignored (`.gitignore`). It includes `qa_film.json`, `audio_clarity.json`, `film_mix_report.json` and the contact sheets. It disappears when the cloud container is reclaimed; only the summaries in the docs survive.
* **Why:** the whole `renders/qa/` folder was ignored to keep images and stems out of git.
* **Fix:** none needed for Video #1, whose results are summarised in docs 07 and 10.
* **Standard?** Yes, §1 and §12: compact QC JSON is committed with its stage.
* **Avoid:** separate small evidence files from large media.

### LL-11 · A manual, unscripted build step
* **What happened:** the subtitle burn-in needs TTF fonts converted from the project's WOFF2 files. This was done with an ad-hoc fontTools snippet. `docs/10_SUBTITLES.md` refers to "the snippet in the commit history"; no tool file contains it.
* **Why:** a one-off step done interactively.
* **Fix:** documented only.
* **Standard?** Yes, §2: every build step is a committed script.
* **Avoid:** if a step is typed twice, it becomes a script.

### LL-12 · Worker restarts during long work
* **What happened:** the session worker restarted during Video #1 production (twice) and during Video #2 research (2026-11-15). Work resumed from files on disk: the render segment cache, logs, and research notes saved per batch.
* **Why:** the cloud environment can restart the worker at any time.
* **Fix:** resumable jobs; Video #2 research notes are written to disk after every search batch.
* **Standard?** Yes, §11: long jobs run in the background with logs and are resumable.
* **Avoid:** never keep the only copy of results in conversation memory.

### LL-13 · Search limit and blocked databases (Video #2)
* **What happened:** during Video #2 research, web search hit an account usage limit at about 12:48 UTC and resumed after its 15:50 UTC reset. Direct access to scientific databases was refused by the environment's network policy with "CONNECT tunnel failed, response 403". This affected the PubMed E-utilities, Crossref, PubMed pages, RAND, BLS, UNEP and UN.
* **Why:** account usage limits, and an environment network allowlist that doesn't include those hosts.
* **Fix:** research resumed after the reset. Notes were saved per batch. Sources were verified through search summaries of abstracts, agency pages and press releases. Full texts were not read; the research document says so.
* **Standard?** Yes, §4: start research early and keep notes on disk. If primary-database access is needed, the producer can allow those hosts in the environment settings (approval required).
* **Avoid:** batch searches by topic and record every result immediately.

## Picture and layout

### LL-14 · Shots opening empty / picture behind the words
* **What happened:** S12 and S17 opened on near-empty frames. In S31 the frame was empty while the narration said "In 1999", because the players entered too late.
* **Why:** shots were timed to the start of the scene rather than to the words.
* **Fix:**
  * S12: a "NATURE / ALREADY TRIED THIS ONCE" title beat.
  * S17: a gift and "RUINED" stamp opening.
  * S31: the players fade in from the year's word.
* **Standard?** Yes, §8: picture follows words, and no shot opens empty.
* **Avoid:** anchor every shot's first visual to a narration word in the shot list.

### LL-15 · Graphics covering faces
* **What happened:** in S15 the information cards covered characters' faces.
* **Why:** the cards were placed in the frame's centre, where the faces were.
* **Fix:** cards moved above the heads (top 96, 330×196).
* **Standard?** Yes, §8: faces are never covered, and layout zones apply.
* **Avoid:** check card positions against face positions in the shot list.

### LL-16 · A number that misread at a glance
* **What happened:** in S29 a new score "1" read as "10" because of a circle drawn next to it.
* **Why:** the circle sat beside the digit and looked like a zero.
* **Fix:** the circle was centred on the "1".
* **Standard?** Yes, §8: numbers are checked at phone size for misreadings.
* **Avoid:** look at every number graphic at 960×540 or smaller.

### LL-17 · Clock and scoreboard broke the story's logic
* **What happened:** in S09 the scoreboard was half cut off by the frame, and the game clock counted down when the story needed it to run up to the final seconds.
* **Why:** the prop was animated without checking it against the story.
* **Fix:** reframed; the clock counts up ("03:5x").
* **Standard?** Yes, §8: diegetic clocks, counters and scores obey the story.
* **Avoid:** list every on-screen counter in the shot list with its intended values.

### LL-18 · Emotional beats framed too wide
* **What happened:**
  * The S26 rescue was framed too wide.
  * The S27 applause stayed on a locked wide shot.
  * The S10 coach shot showed a stray scoreboard bar.
  * The S09 cheer/complaint framing needed a third pass.
* **Why:** wide establishing framings were reused for emotional moments.
* **Fix:** the rescue camera was restaged, a push-in on Leo added for the applause, the coach shot reframed, and the S09 framing fixed in a third pass.
* **Standard?** Yes, §8: emotional beats get closer framing or a push.
* **Avoid:** mark emotional beats in the shot list.

### LL-19 · Static infographic holds
* **What happened:** science graphics held still for several seconds. The final QC still lists 19 low-motion stretches over 1.5 s, 39.8 s in total (about 9 % of the film); all were reviewed as deliberate holds. No frame is completely frozen for 0.8 s or more.
* **Why:** the graphics were built as static layouts.
* **Fix:** `pushK` / `pushSvg` / `Push` helpers (2–4 % camera pushes) in `src/lib/acting.tsx`.
* **Standard?** Yes, §8: no hold over 1.5 s without purposeful motion.
* **Avoid:** give every graphic a motion plan in the shot list.

### LL-20 · In-film captions sat where subtitles had to go
* **What happened:** when subtitles were added, the film's own captions occupied zones the subtitles needed: top labels at y = 96, a caption at y = 980, and the end-card call-to-action row. This took four manual placement exceptions and a backing box.
* **Why:** subtitles weren't planned when the film was laid out, and no layout zones existed.
* **Fix:** placement overrides, each checked at full resolution.
* **Standard?** Yes, §8 and §13: a reserved subtitle band (x 200–1720, y 850–1026) and a label band.
* **Avoid:** design every frame with the subtitle band empty.

### LL-21 · SVG component placed inside HTML
* **What happened:** an SVG `Stamp` component was placed inside an HTML `div` and failed to render.
* **Why:** the component API didn't say it must sit inside an `<svg>`.
* **Fix:** wrapped in an `<svg>`.
* **Standard?** Yes, §12: components document their container. The core library at stage 8 will type-check this.
* **Avoid:** typed wrappers for SVG-only components.

### LL-22 · TypeScript errors in variant compositions
* **What happened:** `ThumbnailFinal` failed type-checking because of a dead-code branch. The mystery teaser failed on a layout union type, fixed with an `MShot` type.
* **Why:** variants were built by copying and editing compositions.
* **Fix:** removed the dead branch; added the type.
* **Standard?** Yes, §12: `npm run typecheck` before every render.
* **Avoid:** variants as parameters, not copies.

## Packaging details

### LL-23 · Thumbnail details misread at phone size
* **What happened:** at mobile-feed size a ball Leo was catching read as a ball hitting him, and Leo was too small. A scoreboard in the background distracted, and a ball meant to pass behind his head didn't overlap it.
* **Why:** the design was judged at full size first.
* **Fix:** removed the caught ball, scaled Leo up, moved the camera off the scoreboard, put the ball partly behind the head.
* **Standard?** Yes, §14: test at 168×94 and 320×180.
* **Avoid:** judge thumbnails small first.

### LL-24 · Orbit ring drawn inside out
* **What happened:** in thumbnail v2 the front and back arcs of the 360° orbit ring were swapped, so the ring passed in front of Leo where it should have gone behind.
* **Why:** wrong SVG arc sweep flags.
* **Fix:** corrected the sweep flags.
* **Standard?** No separate rule; covered by visual review.
* **Avoid:** check depth order visually on every 3D-style element.

## Audio

### LL-25 · Background too close to the voice in places
* **What happened:** clarity analysis (`tools/qa_audio.py`) flagged moments where music or SFX sat too close to the narration. After the fixes, the background is a median 18.9 dB under the voice (5th percentile 8.3 dB). 72 windows of 200 ms (about 14 s) remain below the 8 dB margin. They are worst in the concert (minimum gap 0.6 dB), Mr. Black (1.8 dB) and notebook (2.0 dB) scenes.
* **Why:** loud dramatic cues (crowd, crash, swells) overlap the words.
* **Fix:** split-band music ducking, a longer hold, lower swells, the crash 2 dB lower.
* **Standard?** Yes, §10: clarity targets; flagged windows listed and fixed or justified; loud SFX planned away from words.
* **Avoid:** place loud cues in the shot list between phrases.

### LL-26 · Gain rider triggered by narration peaks
* **What happened:** the master's safety rider engaged for 116 ms (down to −15.6 dB on the non-narration stem) because the narration itself peaks at −1.05 dBFS.
* **Why:** the voice file is hot, and the narration is never altered.
* **Fix:** the rider acts only on the non-narration stem, ceiling −1.0 dBFS. Documented as momentary.
* **Standard?** Yes, §10.
* **Avoid:** measure the narration's peaks at G4.

### LL-27 · Music and SFX never auditioned by a person
* **What happened:** all 608 SFX events and the 14-section score were synthesised in code and judged only by measurements: levels, spectra, clarity. The production tools cannot listen, and no one listened during production.
* **Why:** no listening gate existed.
* **Fix:** none yet for Video #1. Its sound quality to a listener is unverified.
* **Standard?** Yes, §4 G6a and §10: a short sound-check clip goes to the producer before the full mix. Licensed or AI music is a fallback only with approval.
* **Avoid:** a person listens before the mix is final.

### LL-28 · SFX buffers of different lengths
* **What happened:** a synthesised SFX (`gorilla_thud`) crashed the mixer with mismatched array shapes.
* **Why:** two layers of different lengths were added directly.
* **Fix:** add the shorter array into the longer.
* **Standard?** No separate rule. The core audio library at stage 8 will pad automatically.
* **Avoid:** mixing helpers handle lengths.

## QC tools

### LL-29 · Loudness parser read the wrong line
* **What happened:** the first loudness check reported −70 LUFS because it parsed a per-frame line of ffmpeg's `ebur128` output.
* **Why:** a pattern match on the first "I:" line.
* **Fix:** parse after the "Summary:" block.
* **Standard?** Yes, §12, in the QC tools.
* **Avoid:** test parsers against a known file.

### LL-30 · Cut detector missed a real cut
* **What happened:** with a threshold of 18 the hard-cut detector missed a real cut.
* **Why:** an uncalibrated threshold.
* **Fix:** lowered to 9.
* **Standard?** Yes, §12: detectors are calibrated on known cases.
* **Avoid:** keep a small test set of known cuts and black runs.

### LL-31 · Black-frame check reported only endpoints
* **What happened:** the teaser QC reported only the first and last dark frames, hiding the length and number of dark runs.
* **Why:** min/max instead of run detection.
* **Fix:** report dark runs.
* **Standard?** Yes, §12.
* **Avoid:** report runs, not extremes.

### LL-32 · Report crashed on NumPy integers
* **What happened:** the teaser QC failed to write JSON because NumPy `int64` isn't JSON-serialisable.
* **Why:** NumPy types passed straight into `json.dump`.
* **Fix:** cast to `int`.
* **Standard?** No.
* **Avoid:** convert at the report boundary.

## Teasers

### LL-33 · Narration cuts risked clipping words
* **What happened:** an overlap assert fired while slicing narration for the teaser, and slices could cut inside words.
* **Why:** slices were defined by phrase times only.
* **Fix:** non-overlapping slices, cut only where the audio is measured as silent (word-cut guard). Every slice is an exact copy of the source.
* **Standard?** Yes, §10: narration is only ever cut in measured silence.
* **Avoid:** keep the guard in the core audio library.

### LL-34 · Editing JSON as text broke after reformatting
* **What happened:** text edits to `shots.json` stopped matching after the file was reformatted.
* **Why:** data edited as text.
* **Fix:** load, modify, save with code.
* **Standard?** Yes, §3.
* **Avoid:** never search-and-replace data files.

### LL-35 · Caption chunking hid words
* **What happened:** the teaser's caption chunker had per-chunk caps and balance problems. One wrong cap hid "she looks up, freezes".
* **Why:** chunking rules weren't checked against the narration text.
* **Fix:** fixed chunking and caps.
* **Standard?** Yes, §13: on-screen captions are verified against the script automatically.
* **Avoid:** assert that every narrated word appears in some caption.

### LL-36 · Black frames at a split screen and a title card
* **What happened:** a split screen opened on black, and the mystery title card had a brief black dip.
* **Why:** fade-ins started from zero opacity.
* **Fix:** content from the first frame; fade-in base 0.45.
* **Standard?** Yes, §12: dark-run detection on every render.
* **Avoid:** never fade a key shot up from black unless it is meant as a beat.

### LL-37 · A shot flashed the wrong source frame
* **What happened:** a teaser shot ("G") briefly flashed a frame from the wrong film moment.
* **Why:** an incorrect source time.
* **Fix:** source changed.
* **Standard?** Yes, §12: contact sheets at 1 frame/s catch single-shot errors.
* **Avoid:** review every shot's first and last frames.

## Subtitles

### LL-38 · Words assigned to the wrong phrase
* **What happened:** words near phrase boundaries were assigned to the wrong subtitle phrase.
* **Why:** the boundary rule.
* **Fix:** a word belongs to the last phrase starting at or before its start + 0.02 s.
* **Standard?** Yes, §13. Video #2 subtitles come from the approved script, aligned to word times.
* **Avoid:** test alignment on boundary cases.

### LL-39 · Text normalisation key never matched
* **What happened:** the spoken-form map used the key `"mr."`, which never matched the tokenised `"mr"`, so "Mr. Black" failed verification.
* **Why:** a key format different from the tokeniser's output.
* **Fix:** key `"mr"`.
* **Standard?** Yes, §13: normalisation is unit-tested.
* **Avoid:** normalise keys with the same tokeniser.

### LL-40 · First segmentation far too dense
* **What happened:** the first segmentation produced 86 two-line cues. The final has 220 cues with a median reading speed of 12.8 characters/s.
* **Why:** cost-model weights.
* **Fix:** retuned the cost model to follow speech.
* **Standard?** Yes, §13: cue rules.
* **Avoid:** report reading-speed statistics for every run.

### LL-41 · Bad line breaks
* **What happened:** lines broke after "Mr.", split numbers, and left one-word stub lines.
* **Why:** no line-break rules for these cases.
* **Fix:** rules in the segmenter.
* **Standard?** Yes, §13.
* **Avoid:** keep the rule list in the core subtitle tool.

### LL-42 · Rounding put cues on the wrong frames
* **What happened:** rounding SRT/ASS times put 162 frames out of agreement with the cue list.
* **Why:** rounding to ms/cs can land a time one frame late.
* **Fix:** floor times to the millisecond/centisecond. Verified 220/220 cues on exactly their frames.
* **Standard?** Yes, §13.
* **Avoid:** verify burn-ins frame by frame.

### LL-43 · Verifier rule too strict for continuous speech
* **What happened:** the verifier demanded every cue cover its speech until the next word, which fails where speech runs straight on.
* **Why:** speech recognition ends one word exactly where the next begins.
* **Fix:** an audio-energy handover check: no voiced narration of the cue's own line after its out-time. Loudest found: −26 dBFS, an unvoiced "t".
* **Standard?** Yes, §13.
* **Avoid:** judge timing rules against the audio, not only the transcript.

## Data

### LL-44 · Stale data file in an old format
* **What happened:** an older `zone_metrics.json` (a list) broke the subtitle tool, which expected a dictionary.
* **Why:** a generated file from an earlier version of the tool was still on disk.
* **Fix:** removed and regenerated.
* **Standard?** Yes, §3: generated data carries a schema version and is regenerated, not reused.
* **Avoid:** version generated files.

---

## What worked (keep)

| Practice | Evidence |
|---|---|
| Style gate before production (29 s proof of concept) | Approved; the look held for the whole film |
| Narration sample-exact in every mix | Max difference 0.0 vs the source (`film_mix_report.json`) |
| Segment cache for re-renders | Fix passes took 1,191 s and 137 s instead of a full 1,937 s |
| Sync verification | A/V offset 0.0 ms at 8 points, correlation 1.000 |
| Subtitle verification | 0 frame mismatches over 13,192 frames; audio bit-identical; independent transcript agreement 99.4 % |
| Hash protection | Original master and protected deliverables verified unchanged after every later job |
