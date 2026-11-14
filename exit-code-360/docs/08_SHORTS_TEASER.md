# EXIT CODE — 30-second YouTube Shorts teaser

Deliverable: `renders/teaser/EXIT_CODE_360_TEASER_SHORTS.mp4` (23.4 MB; generated, not committed). The full-length film and its composition are untouched.

## Specs (measured on the delivered file, `tools/qa_teaser.py`)

| Item | Result |
|---|---|
| Duration | **30.000 s** — 900 frames; video and audio streams both 30.000000 s |
| Format | **1080 × 1920, 9:16**, **30 fps** constant |
| Video | **H.264** High, yuv420p, CRF 16 (≈ 6 Mb/s) |
| Audio | **AAC**-LC stereo, 44.1 kHz, ≈ 243 kb/s (256k target) |
| Loudness | −15.4 LUFS integrated, true peak −1.1 dBTP |

## How it was made (reuse, not regeneration)

* **Picture**: `src/teaser/Teaser.tsx` renders the finished film's scenes (same code, characters, sets, lighting, grade and timing) at a narration time *T* inside the 1920×1080 stage, scaled and positioned behind a 9:16 window. A 9:16 crop of the 1080p master would have meant upscaling a 608-px slice 1.78×; re-framing the vector scenes keeps the full detail at native 1080×1920. Scene captions are switched off (`LabelsVisible`, default on for the film) and the teaser sets its own type.
* **Edit** (`src/teaser/shots.json`, single source of truth for picture and sound): hook (Leo close-up + "WHAT IF YOU COULD SEE EVERYTHING?", 360° sweep) → pigeon dodge (camera tracks the dive) → dodgeball → 3-shot montage "NOTHING GETS PAST YOU" → the €10,000 job, whip pan to GATE 4 → bolt snaps → "then you see her" → vertical split GATE 4 / OR / MIA? → scream → she looks up, freezes → the light falls → crash to black → UNKNOWN NUMBER: "We saw what you did at the concert." / "You're not the only one." → rooftop silhouette → end card. The rescue is not shown: the teaser stops on the crash.
* **Sound** (`tools/teaser_mix.py`): 12 narration lines as sample-exact slices of the approved MP3 (cut only inside measured pauses — the script refuses any cut inside a word); the film's own SFX/ambience buses sliced at the same film times as the picture (sync by construction); a new 120 BPM cue from the film's instrument library (hook impact, drive, accelerating heartbeat, hard stop at the crash, eerie phone beat, warm end-card resolve); cut whooshes, text-slam hits, CTA pop. Music ducks 6/10 dB (low/high band) under the voice; the voice leads the background by a median 16.4 dB.
* **Typography**: Montserrat (brand font), gold/white with outline for legibility; word-by-word captions (current word in gold); all type inside the Shorts safe area (x 140–940, y 230–1500: clear of the top bar, the right action column and the bottom title/channel overlay).
* **End card**: EXIT CODE wordmark, "WHAT IF YOU HAD 360° VISION?", gold "▶ WATCH THE FULL VIDEO" button, "THE FULL STORY · ON EXIT CODE", over the sunset two-shot of Leo and Mia.

## QC

* 900 / 900 frames, 0 irregular PTS steps (no drops or duplicates), no one-frame blips.
* Every detected picture change is a planned cut or designed motion (pigeon-tracking pan, montage flashes, whip pan, split reveal, the film's own cut to Leo's reaction, crash flash, end-card flash).
* Black only on the planned crash cut (frames 640–657).
* A/V sync vs the master teaser mix: 0.0 ms at 2, 8, 14, 20 and 26 s.
* Narration slices: max difference vs source 0.0; captions: 13 chunks, each inside its own shot.
* Contact sheet with the Shorts UI zones overlaid reviewed frame-by-frame (4 fps); full-resolution stills checked for sharpness.
* Fixed during QC: a 4-frame flash of the previous shot at the start of the reaction shot, captions lingering one frame past a cut, captions of one line suppressed by a cap bug, unbalanced caption wraps, the split screen opening on black, CTA overlapping the characters, the phone header and GATE 4 sign in the top UI zone.

## Reproduce

```bash
python3 tools/teaser_mix.py
node tools/render_film.mjs --comp Teaser --out renders/teaser/EXIT_CODE_360_TEASER_SHORTS.mp4 \
  --audio public/audio/teaser_mix.wav --workers 4 --seg 225 --crf 16 --abr 256k
python3 tools/qa_teaser.py renders/teaser/EXIT_CODE_360_TEASER_SHORTS.mp4 public/audio/teaser_mix.wav renders/teaser/qa
```

---

# v2 — mystery teaser (no spoilers)

Deliverable: `renders/teaser_v2/EXIT_CODE_360_TEASER_MYSTERY.mp4` (22.0 MB; generated, not committed). v1 and the full film are untouched. Sources: `src/teaser/Mystery.tsx` (composition `TeaserMystery`), `src/teaser/mystery.json` (shots, narration lines, text cards), `tools/teaser_mystery_mix.py`.

**Spoiler rules applied:** nothing from the science sections (no field-of-view diagrams, no "see everything / look at one thing", no physics, gorilla study or reality check), no outcome (the rescue, the aftermath and the epilogue are not shown), no final twist (the phone is seen buzzing; its messages and the rooftop figure are not). Events appear as short glimpses, partly out of order; the crash is heard over black, never seen.

**Structure (30.000 s):** cold-open flash of Leo screaming → his face in a swarm of rings, *HE CAN SEE EVERYTHING.* → Mia sneaks up, *EVEN BEHIND HIM.* / "You don't even turn around." → the pigeon → Mia: "How… how did you do that?" → balls from every side → rings pulsing in the dark → a stranger in a lit doorway, *BUT SOMEONE NOTICED.* → his smile → the earpiece → "Only Gate Four." / "Look away, and the deal is over." → a light shakes high above → *MIA?* in the crowd → Leo's shocked face, *WHAT DID HE SEE?* → Mia looks up → a scream → flash, crash, black → "Silence." / *WHAT WOULD YOU DO?* → a phone buzzes in the dark, *IT'S NOT OVER.* → a gold ring draws itself 0→360°: **WHAT IF YOU HAD 360-DEGREE VISION?** + **EXIT CODE** · *watch the full video on EXIT CODE*.

**Sound:** six narration lines (sample-exact, cut only where the audio is actually silent — measured, not just by ASR word times), the film's own SFX/ambience at the matching film times, and a new mystery cue: braam hook, ticking pulse, heartbeat build, hard stop at the crash, eerie phone bed, ring sweep and title hit timed after "…sixty". Voice leads the background by a median 15.8 dB.

**QC (`QA_SHOTS=src/teaser/mystery.json tools/qa_teaser.py`):** H.264 High 1080×1920, 30 fps CFR, yuv420p, 900 frames, 30.000 s video and audio; AAC-LC stereo 44.1 kHz ≈ 239 kb/s; 0 irregular PTS steps; no one-frame blips; black only on the planned crash cut (frames 608–689; 602–607 are the flash); A/V sync 0.0 ms at five points; −16.7 LUFS, −1.1 dBTP (the untouched narration sets the level). Fixed during QC: caption chunking ("HOW / HOW DID YOU DO THAT?"), the stranger framed too small, the title hit masking "…sixty", "Silence." masked by the crash tail, title entering through pure black.

```bash
python3 tools/teaser_mystery_mix.py
node tools/render_film.mjs --comp TeaserMystery --out renders/teaser_v2/EXIT_CODE_360_TEASER_MYSTERY.mp4 \
  --audio public/audio/teaser_mystery_mix.wav --workers 4 --seg 225 --crf 16 --abr 256k
QA_SHOTS=src/teaser/mystery.json python3 tools/qa_teaser.py renders/teaser_v2/EXIT_CODE_360_TEASER_MYSTERY.mp4 public/audio/teaser_mystery_mix.wav renders/teaser_v2/qa
```
