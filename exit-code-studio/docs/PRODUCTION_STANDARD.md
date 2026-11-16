# EXIT CODE — PRODUCTION STANDARD

**Version 1.5 · 2026-11-16 · applies from Video #2 (*What If Humans Never Needed Sleep?*) onward** · v1.1–v1.5 tighten §5 and §6 after the producer's reviews of Story Lock v1 and v3, the final review of v2, the script stage and the producer's review of script v1 (LL-45–LL-75)

> WE DON'T START OVER. WE BUILD FORWARD.

This is the shared production standard for every EXIT CODE video. It is built from three sources of evidence, cited next to each rule:

* **LL-xx** — a real finding from Video #1, documented in [LESSONS_LEARNED.md](LESSONS_LEARNED.md).
* **REF** — the 13-minute reference tutorial (extracted end to end on 2026-11-15: frames + full transcript).
* **BRIEF** — the Video #2 master production prompt.

Rules marked **[IN FORCE]** apply now. Rules marked **[STAGE 8]** need tooling that will be built at Project setup (stage 8, after approval); until then the manual fallback written next to them applies.

---

## 1. Principles [IN FORCE]

1. **Narration is the master clock.** Picture, sound and subtitles follow the approved voice file. The voice file is never edited (Video #1: sample-exact, max difference 0.0).
2. **Evidence over assumption.** Every factual sentence in a script maps to a sourced claim with an evidence class (§5). Speculation is labelled as speculation.
3. **No fabrication.** No invented metrics, sources, test results or completed work. Anything unavailable is reported as unavailable.
4. **Review cheap before rendering expensive:** story → script → storyboard → full-length preview → final. (LL-03)
5. **Never overwrite** a deliverable or a previous video. Changes get new versions (§3).
6. **Story quality first.** Do not stretch a script to reach a duration. (BRIEF)
7. **Every stage leaves evidence** (files and numbers) committed to git. (LL-10)

## 2. Repository, freezing and reproducibility [IN FORCE]

| Path | Role |
|---|---|
| `exit-code-360/` | **Video #1 — FROZEN** at commit `b134a81`. Nothing inside is edited, moved, reformatted or "cleaned up". It reproduces with its own README and `docs/10_SUBTITLES.md`. |
| `exit-code-studio/docs/` | This standard and LESSONS LEARNED. |
| `exit-code-studio/videos/<NN>-<slug>/` | One folder per video from Video #2 on (docs, data, later code). |
| `exit-code-studio/core/` | Shared production code. **Not created yet**; it is created at stage 8 after approval, as *copies* of Video #1 components, never by moving files out of `exit-code-360/`. |

* **Video #1 regression rule [STAGE 8]:** shared code derived from Video #1 must reproduce Video #1's outputs (subtitle file byte-identical, mix sample-identical, reference stills pixel-identical) before Video #2 depends on it.
* **Git:** commit at the end of every stage; commit messages say what was verified. Large renders (MP4, WAV) are not committed; their SHA-256 hashes are.
* **Third-party material** (reference-video frames, transcripts of other creators' videos) is analysis-only and is never committed.
* **The cloud container is temporary.** Anything worth keeping is committed. Final MP4s are downloaded by the producer and identified by hash. (LL-07, LL-10)

## 3. Naming, versions and the deliverables registry [IN FORCE]

* Video folder: `exit-code-studio/videos/<NN>-<slug>/` — Video #2 is `02-never-sleep`.
* Deliverables: `EXIT_CODE_<SLUG>_<KIND>_v<N>.<ext>`, for example `EXIT_CODE_SLEEP_FULL_v1.mp4`, `EXIT_CODE_SLEEP_FULL_SUBTITLED_v1.mp4`, `EXIT_CODE_SLEEP_THUMBNAIL_v3.png`, `EXIT_CODE_SLEEP_EN_v1.srt`. A changed file is a new version. Nothing is named `_FINAL`. (LL-07, LL-08)
* Every video README has a **deliverables registry**: file, version, size, SHA-256, status (`DRAFT` / `APPROVED` / `UPLOAD`). Exactly one file per platform slot carries `UPLOAD`. (LL-07)
* JSON data files are read and written by code, never patched as text. (LL-34)

## 4. Pipeline and approval gates [IN FORCE]

The sequence follows the reference tutorial — script engine (session → titles → **Story Lock** → script → **script audit** → **fact ledger**) → ElevenLabs web app → project folder → Claude Code build (word timestamps → story bible + shot list → **style samples, pick a look** → build every shot with **contact-sheet QC** → music + SFX → **short preview with sound** → final render) — mapped onto the brief's 18 stages. (REF, BRIEF)

| # | Stage | Output (in the video folder) | Gate / check |
|---|---|---|---|
| 1 | Inspect and configure | inspection notes | — |
| 2 | Production-system audit | audit + upgrade plan | **G1** producer approval |
| 3 | Research | `docs/01_RESEARCH.md` with source list | every claim sourced |
| 4 | Story Bible | `docs/02_CLAIM_LEDGER.md`, `docs/03_STORY_BIBLE.md`, `docs/04_STORY_LOCK.md` | **G2 Story Lock** approval |
| 5 | Script | `script/script_v<N>.json` (the source of truth) → generated `SCRIPT_v<N>.md`, ElevenLabs paste text, `AUDIT_v<N>.md` (script audit + fact ledger) | audit within targets (§6) |
| 6 | Script review | review notes, revised script | **G3 Script** approval |
| 7 | Voiceover prep | producer generates the MP3 in ElevenLabs; `audio/voice.json` | **G4 Voice accepted** (§7) |
| 8 | Project setup | `core/` + video project; word timestamps | Video #1 regression checks pass |
| 9–10 | Storyboard + shot list | `shots.json` + storyboard sheet | coverage checks (§9) |
| 11 | Visual style | style-sample stills, new character/set sheets | **G5 Look + storyboard** approval |
| 12–13 | Visual generation + contact sheets | scenes; contact sheets at 1 frame/s per batch | automatic visual checks (§12) |
| 14 | Audio and music | SFX, score, mix; sound-check clip | **G6a Sound check** (producer listens) |
| 15 | Editing | timing passes | — |
| 16 | Preview render | full-length 960×540 preview with the real mix | **G6 Preview** approval |
| 17 | Quality assurance | QC reports (§12) | all checks pass or are justified |
| 18 | Final render and export | 1080p master, subtitles, burn-in, registry | **G7 Delivery** |

* Packaging runs alongside: the concept is fixed at G2, key frames are planned in the shot list at G5, the thumbnail is finalised after G6, metadata at G7. (LL-05, LL-06)
* **No mass visual generation before G3 and G5.** (BRIEF)

## 5. Science and fact standard [IN FORCE]

### 5.1 The five evidence classes (v1.1: full definitions — LL-49)

| Class | Definition | Minimum evidence | How the narration may say it |
|---|---|---|---|
| **ESTABLISHED FACT** | Settled knowledge: scientific consensus or textbook physiology, replicated findings, official statistics, laws and other public facts, definitions, and arithmetic whose inputs are all established. | A level-A source (agency, professional society, major review, official page or primary data). | Plainly, keeping the source's qualifiers ("about", "in the US", the year). |
| **RESEARCH-SUPPORTED EVIDENCE** | Credible peer-reviewed findings that are not settled: single or few studies, small samples, animal studies, observational associations, model-based estimates, or findings contradicted by other studies. | A level-A source, with study type, size and limits recorded in the ledger. | The evidence is signalled — "studies suggest", "in one study", "in mice", "linked to", "estimated". Never "proves", and no causal claim beyond the study design. |
| **HYPOTHETICAL ASSUMPTION** | The rules of the thought experiment — conditions not true in the real world — and anything that follows from those rules by logic or arithmetic alone. | None from science. Listed as a world rule or a rule-derived claim, with its reasoning shown. | Framed as the premise: "imagine", "in this world". Never attributed to science. |
| **SPECULATIVE SCENARIO** | Reasoned guesses about how people, businesses, cities and societies might respond to the world rules. Plausible and untestable — not predictions. | Grounded in real evidence where possible; the ledger shows the grounding. | "might", "could", "would probably", or inside a clearly imagined frame. |
| **UNKNOWN** | Questions science has not answered: the evidence is absent, conflicting or too weak. | The sources that show the gap or disagreement, where they exist. | "nobody knows", "scientists still disagree", "science can't yet say". |

### 5.2 Rules
* **One class per claim.** A claim takes the class of its **weakest input**: all-established inputs → ESTABLISHED; any world-rule input → HYPOTHETICAL ASSUMPTION; a guess about behaviour → SPECULATIVE SCENARIO. Qualifiers go in the ledger's notes, never in the class name. (LL-49)
* **World rule or speculation?** Anything that follows from the premise by logic is a **world rule** and is stated as one on screen (e.g. "in this world, nobody dreams"). SPECULATIVE SCENARIO is only for how people and institutions respond. (LL-48)
* **Narrated facts need level-A sources.** Level-S material may inform visuals or optional texture only. (LL-52)
* **No scaling up.** Results from small, lab or animal studies are never extrapolated to population-level numbers. (LL-45)
* **Calculations:** every derived number has a worked method, sourced inputs, stated assumptions and a sensitivity range. The narration wording must hold across the whole range, and the assumption is shown on screen where it matters. (LL-46)
* **Mechanism check:** every sentence about how the body works names the right structure, the condition (for example light or dark) and a verb no stronger than the source ("suppresses", not "switches off"). It is checked against a level-A source. Metaphors (e.g. "hourglass", "clock") are labelled as metaphors in the ledger. (LL-47)
* **Everyday words must not contradict the science** — for example, sleep is not "unconscious" or "switching off". (LL-47)
* **Recency and scope (v1.2):** every statistic records its **data year** and **scope**. Figures more than about five years old get a search for a newer authoritative estimate before narration; superseded figures are withdrawn in the ledger. (LL-55)
* **Effect measures (v1.2):** record the measure (odds ratio, risk ratio, hazard ratio), the confidence interval and n from the abstract — not the press release. Narrate odds as "odds". If the interval is extreme, give the direction without a number. (LL-56)
* **Construct fidelity (v1.2):** narration keeps the source's construct (e.g. "too little sleep", not "tiredness"). No emphasis words ("alone", "just", "only") that the source doesn't support. (LL-57)
* **Real statistics stay in their own frame (v1.3):** a real figure is always attributed (source and year) and described as the source measured it. It is never projected into the hypothetical world as if its model applied there; any consequence for the hypothetical world is a SPECULATIVE SCENARIO and is hedged. (LL-62)
* **World-rule scope (v1.5, LL-71):** the narration of a world rule says exactly what the rule removes or keeps — "no harm from going without sleep", not "not sick"; "the dreams that come with sleep", not all imagination.
* **Time-dependent figures (v1.5, LL-72):** a real figure that changes over time (population, prices, shares) is never stated as a fact of a scene set at another time. Use scale words, or a form of the calculation that doesn't depend on the figure.
* **Character-state check (v1.5, LL-73):** a science line about a character must hold for that character at that point in the story — for example, a normal melatonin rhythm can't be assumed after years of night work.
* **Partial unknowns (v1.5, LL-74):** where knowledge is partial, the unknown is worded as partial ("know a lot… but not everything", "hasn't settled"), never as total ignorance.
* **World-rule consistency (v1.3):** science lines inside the story must agree with the world rules (e.g. a normally working body clock) and must never imply that another state (darkness, rest) substitutes for something the rules removed. (LL-63)

### 5.3 Ledger and sources
* Every factual sentence in a script has a claim ID; the fact ledger lists claim → script line.
* **Sources:** peer-reviewed papers, reviews and meta-analyses; government and intergovernmental agencies (NIH, CDC, BLS, UN, IARC); professional societies (AASM, SRS). Press releases and news are used only to locate or summarise a primary source and are marked as such.
* **Numbers keep their qualifiers** ("up to", "about", "in one study of 164 adults"). Arithmetic is shown in the ledger.
* **Construct re-check at the script stage (v1.4, LL-68):** every narration-safe wording in the ledger is compared once more with the source's own terms before it is narrated — the ledger's wording is not trusted just because it passed earlier reviews.
* **Contested findings** are presented with both sides, or not used.
* **Check section:** where a story could be mistaken for advice, a short real-world line is included. (REF "check section", "safety lesson")
* **Video #2 guardrails (BRIEF):** never claim scientists know every purpose of sleep; never give REM sleep one definitive function; never overstate brain-waste clearance; keep the need for sleep and the body clock as separate mechanisms.

## 6. Story and script standard [IN FORCE]

**Story Lock fields** (REF, extended): title · **moment zero** (v1.2) · central question · hook · signature line · payoff · the rule · baseline → extreme · hero · cast · **character motivations** · planted detail · hidden cost · crisis · the choice · resolution · check section · safety lesson · final line · fact bank · packaging · voice · length. Locked at G2, before any script.

**Characters (v1.1, LL-50).** Every named character has a written:
* **want** and **need**;
* the **reason for each key decision**, answering "why now?" and "why not the obvious alternative?";
* a check against traits established in earlier episodes.

Scenes must be logical inside the world's rules (e.g. where people are at 3 a.m. in a 24-hour world).

**Pacing plan (v1.1, LL-53).** Every chapter's beats get planned seconds, and words are **counted from the draft beats, not estimated**. Chapters stay within ±15 % of their window, and any chapter faster than the voice's measured pace is flagged. **(v1.4, LL-69)** Draft beats are written with their final qualifiers — hedges, attributions, scope words — before their words are counted, because those words cost time.

**Critical review before every gate (v1.1, LL-51).** Before a gate document (Story Lock, script, storyboard, preview) is presented, it gets a written **review log** of problems found and fixes made, against this checklist:
1. every claim sourced, classed and worded to its class (§5);
2. calculations and mechanisms checked (§5.2);
3. character motivation and decision logic;
4. point of view and continuity;
5. pacing measured;
6. repetition — within the video and against earlier episodes;
7. predictability (LL-54);
8. overgeneralisation and overstatement;
9. every sentence serves a purpose — no filler, no unnecessary explanation;
10. **setup/payoff audit** (v1.2): every payoff names its setup — chapter and line — and the setup involves the character who pays it off (LL-58);
11. **timeline check** (v1.2): every chapter's times and ages agree with the moment zero (LL-60);
12. **narration vs picture** (v1.2): each fact is told once across the video; narration adds what the picture can't show (LL-61);
13. **recognition test** (v1.3): a payoff's setup is met at least twice before the payoff, and the payoff uses the character's own words or handwriting — never a narrated explanation of the emotion (LL-64);
14. **per-beat speech rate** (v1.3): every beat's quoted words ÷ its seconds ≤ 160 words/min, lower for emotional beats; chapter averages are not enough (LL-66);
15. **diegetic dates and times** (v1.3) on screen agree with the moment-zero timeline (LL-66).

**The first three seconds (v1.3, LL-59, LL-65).**
* No black or silent first frame.
* **Frame 1 must be readable at a glance at phone size:** the core premise or paradox image, in motion, with sound. No reveal may depend on a long camera move.
* The thumbnail image (or its in-film source) appears **at the first cut after the opening line** — never cutting away from frame 1 mid-line; target ≤ 3.5 s (v1.4, LL-67). Cut times are set from the spoken line, not from a fixed clock.
* A curiosity line lands within 3 s.
* The premise is clear within 10–15 s.

**Retention principles** (BRIEF): immediate payoff · open questions answered later · escalation from individuals to cities and civilisation · meaningful visual changes · new information throughout · strong chapter transitions · no unnecessary repetition · no artificial suspense · emotional payoff.

* **Hook:** the premise is understood within 10–15 s, with one concrete image, one open question and a reason to stay.
* **No generic outro.** The story's last line is the video's last line. (BRIEF)

**Script audit** — computed by a script, never estimated, and the script first passes its own known-answer self-tests (v1.4, LL-70). Targets come from the reference engine scaled to long form; Video #1's measured values are shown for comparison. A metric outside its target is reported with its cause, never forced: splitting a sentence that carries a qualifier is not an acceptable fix. **(v1.5, LL-75)** The checker reads a claim's narrated status from the ledger's chapter column, never from free-text notes; withdrawn-wording patterns name the exact overclaim; thresholds follow the current version of this standard; near repeats of a content word in neighbouring beats are listed for review.

| Metric | Target | Video #1 |
|---|---|---|
| Words | duration × ~141 words/min (7:30 ≈ 1,050) | 1,036 |
| Average words per sentence | 4–5 (flag above 5.5) | 5.4 |
| Sentences of 4 words or fewer | about half (45–55 %) | 49.5 % |
| Questions | ~14–20 per 7–8 minutes | 18 |
| "you / your" per 100 words | ~5–8 (documentary chapters run lower) | 7.9 |
| Ellipses (pause cues for the voice) | deliberate, ~12–24 | not measurable (only subtitle text exists) |

* **Writing for text-to-speech:** numbers written the way they should be spoken where ambiguous; no abbreviations the voice may misread; ellipses and line breaks for pauses; a pronunciation list for names; British spelling for on-screen text (Video #1 convention).
* **Chapter budget:** each chapter within ±15 % of its planned time unless the producer approves.

## 7. Voice standard [IN FORCE]

* **Workflow** (REF, BRIEF): the producer generates the narration in the ElevenLabs web app from the approved script and uploads the MP3. A paid API route is used only with explicit approval.
* **Voice record** `audio/voice.json` for every narration: voice name, voice ID, model, stability, similarity, style exaggeration, speaker boost, speed, output format, generation date, file SHA-256. (LL-09)
* **Video #1 reference profile** (measured 2026-11-15 from the delivered MP3; voice identity is *not* stored in the file):

| Property | Value |
|---|---|
| File | MP3, mono, 44.1 kHz, 192 kb/s; tags: title, album, description, track, encoder `Lavf60.16.101` |
| Pitch | median 97.6 Hz (10th–90th percentile 79–127 Hz) — a low male voice |
| Pace | 141 words/min overall, ~192 words/min while speaking; 89 pauses over 0.5 s |
| Level | −17.5 LUFS integrated, loudness range 3.6 LU |

* **Acceptance at G4:** format; duration within ±10 % of the script estimate; automatic transcript matches the script with ≥ 99 % word agreement (every mismatch listed and judged); listening list of names and numbers; pace and level compared with the reference profile.
* **The accepted MP3 is never edited** (no trims, fades, EQ, compression or re-timing). A retake is a new file and a new version.

## 8. Visual standard

* **Look [IN FORCE]:** Video #1's language — flat 2D vector, soft gradients, bloom on lights, 54 px letterbox, film grain, vignette, Montserrat 500–800, palette tokens. No photorealistic 3D. (BRIEF; `exit-code-360/docs/01_REFERENCE_ANALYSIS.md`)
* **Characters [IN FORCE]:** built on the existing rig. New characters and variants (for example older versions) are new specs with a design sheet approved at G5. Existing designs are not altered without approval.
* **Layout zones at 1920×1080 [IN FORCE]:** (LL-15, LL-20)

| Zone | Area | Rule |
|---|---|---|
| Letterbox | y 0–54 and y 1026–1080 | empty |
| Label band | y 70–200 | scene labels, chapter cards |
| Content | y 200–850 | faces, key graphics, numbers |
| Subtitle band | x 200–1720, y 850–1026 | no on-screen text, no faces, no key graphic detail |

* **Faces are never covered** by graphics or cards. (LL-15)
* **Motion [IN FORCE]:** no hold longer than 1.5 s without purposeful motion (a 2–4 % camera push or acting); a meaningful visual change at least every ~4 s on average. (LL-19)
* **Picture follows words [IN FORCE]:** the subject of a phrase is on screen while the phrase is spoken; shots never open on an empty frame. (LL-14)
* **Numbers and diegetic logic [IN FORCE]:** numbers are checked at phone size for misreadings; clocks, counters and scores obey the story's logic. (LL-16, LL-17)
* **Typography [IN FORCE]:** at most 6 words per on-screen label; text ≥ 40 px at 1080p, key numbers ≥ 64 px; checked at 960×540.
* **Teaser-ready [IN FORCE]:** shots tagged as teaser or thumbnail candidates keep their subject inside a centred 9:16 column (608 px wide).

## 9. Shot list (`shots.json`) [STAGE 8]

One entry per shot: id (`s001`…), narration anchor (phrase or word), duration, chapter, beat, set, cast, action, camera move, on-screen text and zone, SFX cues, music cue, claim IDs, teaser/thumbnail tags, status. Scenes and the mixer both read it.

Checks: every narration phrase is covered by a shot; every sound cue resolves to a time; no text in the subtitle band; no shot breaks the motion rule. **Manual fallback before stage 8:** a storyboard table with the same columns.

## 10. Audio standard [IN FORCE]

* **Narration sample-exact:** assert max difference 0.0 against the decoded source.
* **Mix targets:** −14 LUFS integrated (±1); true peak ≤ −1.0 dBTP; while the narrator speaks, background median ≥ 15 dB below the voice and 5th percentile ≥ 8 dB. Every flagged 200 ms window is listed and either fixed or justified. (LL-25)
* **Ducking:** look-ahead envelope; music split-band ducking (≈6 dB below 250 Hz, ≈10 dB above); the gain rider acts only on the non-narration stem, ceiling −1.0 dBFS. (LL-26)
* **Music and SFX:** original, synthesised in code, by default (rights-clean). Licensed or AI-generated music only with approval (cost). A short sound-check clip of the main cues goes to the producer before the full mix (G6a), because the production tools cannot judge how music sounds to a listener. (LL-27)
* Loud SFX are planned away from words in the shot list.

## 11. Rendering [IN FORCE]

* **Preview:** full length, 960×540, real mix — for G6.
* **Final:** 1920×1080, 30 fps constant, H.264 High, yuv420p, CRF 16; AAC-LC 44.1 kHz stereo 192 kb/s.
* Parallel segment rendering with a cache; render time and frames per second recorded for every pass.
* Long jobs run in the background with logs and are resumable. (LL-12)

## 12. Quality control

* **Story and script [IN FORCE]:** claim IDs complete; computed audit; read-aloud timing per chapter.
* **Voice [IN FORCE]:** §7 acceptance.
* **Picture [STAGE 8 automatic; manual until then]:** contact sheets at 1 frame/s per batch; automatic flags for empty frames, holds over 1.5 s, text over faces, text in the subtitle band, black/dark runs and one-frame blips. (LL-03, LL-04)
* **Final file [IN FORCE]:** specs, timestamp continuity, frame count, black/frozen runs, hard cuts listed, A/V sync by cross-correlation at 8 points (target 0 ms), loudness, zero decode errors.
* **Subtitles [IN FORCE]:** per-frame burn-in verification and cue rules (§13).
* **Protected files [IN FORCE]:** SHA-256 checked after every job that could touch them.
* **Evidence [IN FORCE]:** compact QC reports (JSON) and sheets are committed with their stage. Nothing is reported as passed without its report. (LL-10)

## 13. Subtitles [IN FORCE]

* Text = the approved script aligned to the narration's word times (not re-transcribed); an independent speech-recognition cross-check must agree on ≥ 99 % of words.
* ≤ 2 lines; ≤ 42 characters per line; reading speed ≤ 20 characters/s (median about 13); in-time at most 1 frame before speech; out-time about 0.35 s after; minimum gap 2 frames; timestamps floored to the frame. (LL-42)
* Style: Montserrat SemiBold 54 px, white, brand-ink outline; backing box only where the measured background needs it.
* Deliver SRT + burned-in MP4. The burn-in never re-renders the animation.

## 14. Packaging [IN FORCE]

* **Thumbnail:** one focal story image readable without text; at most 4 words; tested at 168×94 and 320×180 before final; EXIT CODE identity. (LL-06, LL-23)
* **The thumbnail image exists in the film** (planned in the shot list), so the click promise is paid off early.
* **Teaser:** a written spoiler policy at G2 — what may and may not be shown. (LL-05)
* **Metadata** (title, description, tags) at G7. Nothing is published externally without approval.

## 15. Documentation [IN FORCE]

* Per video: `README.md` (status, gates, decisions, deliverables registry) and `docs/` numbered by stage.
* LESSONS LEARNED is updated at every gate.
* At the end of every video this standard gets a new version and a change-log entry, so the next video starts from a better system.

## 16. Approval required before [IN FORCE] (BRIEF)

Destructive changes · deleting or overwriting existing assets · major architectural rewrites with significant regression risk · paid actions with external costs (e.g. ElevenLabs API usage, licensed music) · publishing externally.

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-15 | First edition, from the Video #1 audit, the reference tutorial and the Video #2 brief. |
| 1.5 | 2026-11-16 | Producer's review of script v1. §5.2: world-rule scope, time-dependent figures, character-state check, partial unknowns. §6: checker rules (narrated status from the ledger's chapter column, exact withdrawn patterns, current thresholds, near repeats). Evidence: LL-71–LL-75. |
| 1.4 | 2026-11-15 | Script stage (script v1). §4: the script is a JSON source of truth with generated documents. §5.3: construct re-check of ledger wording before narration. §6: the thumbnail appears at the first cut after the opening line, never mid-line (production requirement 3); draft beats carry their final qualifiers before counting; the audit tool self-tests; off-target metrics are explained, not forced. Evidence: LL-67–LL-70. |
| 1.3 | 2026-11-15 | After the producer's narrow pass on Story Lock v3. §5.2: real statistics stay in their own frame; world-rule consistency. §6: first-three-seconds rule refined (frame 1 readable at a glance; thumbnail within 3 s); recognition test; per-beat speech rate; diegetic dates. Evidence: LL-62–LL-66. |
| 1.2 | 2026-11-15 | After the final independent review of Story Lock v2: recency and scope, effect-measure and construct-fidelity rules (§5.2); MOMENT ZERO field, setup/payoff audit, timeline check, narration-vs-picture rule, first-three-seconds rule (§6). Evidence: LL-55–LL-61. |
| 1.1 | 2026-11-15 | After the producer's review of Story Lock v1 (six issues) and a self-review that found 15 more. Changes: full definitions of the five classes; the one-class and weakest-input rule; world rule vs speculation; level-A sources for narration; no scaling up; the calculation rule; the mechanism check (§5). Character motivation fields; measured pacing plan; a critical-review protocol before every gate (§6). Evidence: LL-45–LL-54. |
