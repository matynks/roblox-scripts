# EXIT CODE — *What If You Had 360-Degree Vision?* — Final Production Report

Deliverable: `renders/EXIT_CODE_360_FULL.mp4` (269.8 MB; delivered directly, not committed — it exceeds GitHub's file limit and is fully reproducible with `npm run render:film`).

## Final specifications (measured on the delivered file, `tools/qa_film.py`)

| Item | Result |
|---|---|
| Duration | **439.733 s** (7:19.7) — 13,192 frames, picture and audio streams both 439.733 s |
| Resolution / aspect | **1920 × 1080, 16:9** |
| Frame rate | **30 fps constant** (r_frame_rate = avg_frame_rate = 30/1) |
| Video | **H.264** High profile, yuv420p, CRF 16 (≈ 4.7 Mb/s) |
| Audio | **AAC**-LC, stereo, 44.1 kHz, 194 kb/s |
| Loudness | −14.5 LUFS integrated, LRA 3.5 LU, true peak −0.9 dBTP |

## Audio synchronisation and narration integrity

* The narration is the approved MP3 (SHA-256 `41a8651f…7cc6377`, unchanged), decoded at 44.1 kHz and placed sample-for-sample at t = 0: never re-timed, stretched, pitched, compressed, faded or re-levelled. The mixer verifies the narration buffer against the source decode (max difference **0.0**) and the written master against narration + stems (residual 3·10⁻⁸ = float32 storage rounding).
* Picture timing is driven by measured narration time (`T = frame / 30`, phrase/word map in `src/data/`), so every scene, cue and lip-sync window is locked to the voice.
* The muxed AAC was cross-correlated against the master mix at 5, 60, 120, 180, 240, 300, 360 and 420 s: **0.0 ms offset at all eight points, correlation 1.000** — no drift from start to end.

## Sound design and music (all original, all generated in this project)

* **SFX** (`tools/audio_lib.py`, cue sheet in `tools/mix_film.py`): 608 synchronised sound events — footsteps from the walk cycles, bell/bike pass, gulls and pigeon, doors, switches, whooshes, pings, stamps, ball/net/whistle, car pass and horn, metal groan, rattle, bolt snap, falling whistle, crash, applause, phone buzz, UI pops.
* **Ambience beds**: sea, rooms, city, car interior, gym, stadium, classroom, concert crowd + muffled band (automated through the physics graphic, the crash and the silence).
* **Score** (`tools/score.py`): 14 sections following the story (playful promenade, curious science, upbeat montage, nervous catch, Mr. Black drone, tender notebook, accelerating concert tension, hard cut to silence at the crash, hopeful applause swell, warm epilogue, science pad, eerie cliffhanger, warm outro).
* Every sound is synthesised from code — no samples, libraries or third-party recordings — so the production owns all rights to it.

**Narration clarity** (`tools/qa_audio.py`): music ducks 6 dB below 250 Hz and 10 dB above (look-ahead, 400 ms hold), beds 4.5 dB, SFX 2 dB. While the narrator speaks, the background sits a **median 18.9 dB below the voice** (5th percentile 8.3 dB); music under voice −37 dB RMS vs narration −17.8 dB RMS. A gain rider acts only on the non-narration stem near full scale (engaged 116 ms in total).

## Quality checks completed

| Check | Result |
|---|---|
| Frame count / duration vs composition | 13,192 / 13,192, 439.733 s ✔ |
| Missing or duplicated frames | 0 irregular PTS steps across 13,192 packets, including all 21 segment joins (join differences 0.14–2.3, same as neighbouring frames) ✔ |
| One-frame glitches (frame unlike both neighbours) | none ✔ |
| Black frames | only the intended S18 "fade to night" dip (212.10–212.53 s) ✔ |
| Frozen picture | no pixel-static run ≥ 0.8 s anywhere; remaining low-motion stretches are acted dialogue holds and the phone screen ✔ |
| Transitions | 69 hard cuts listed with their scene and reviewed; dissolves and whips as designed ✔ |
| A/V sync | 0.0 ms at 8 points ✔ |
| Audio levels | −14.5 LUFS, −0.9 dBTP, no clipping; narration clarity as above ✔ |
| Visual review | every 600-frame segment reviewed on contact sheets (2 fps) plus full-resolution spot checks; whole-film overview (1 frame / 2 s) ✔ |

## Issues found during QC and fixed before delivery

| Scene | Problem | Fix |
|---|---|---|
| S09 dodgeball | Scoreboard cut in half by the frame edge during the push-in, cheer and complaint shots; clock counted *down* to "04:00" | Camera re-framed so the board is wholly in or out of frame; clock now counts up 03:50 → 04:00 GAME OVER |
| S10 basketball | Bottom of the scoreboard showed as a dark bar in the coach shot | Coach shot re-framed |
| S12 nature | ~2 s of empty frame on "Nature already tried this once" | New title beat: a 360° ring draws itself, horse / rabbit / eye pop on (+ sound) |
| S15 Mr. Black | Stat cards (40,000 / 1 / €10,000) covered both characters' faces | Cards moved above the heads |
| S17 dopamine | ~2 s of empty frame on "sneaky surprises are ruined"; lone static spark | New beat: spotted gift + RUINED stamp (+ sound); spark ripples |
| S26 climax | Mia tiny at the bottom edge, feet under the letterbox, during look-up / yank / crash | Rescue restaged: close on Mia, pull back for the fall, push in after the crash |
| S27 applause | 6.5 s locked wide with Leo tiny | Push-in on Leo for "the kid with eyes in the back of his head" |
| S29 epilogue | Circle beside the new score made "1" read as "10" | Circle centred on the 1 |
| S31 gorilla study | 1.9 s of "1999" on an empty frame | Players enter during "In 1999" |
| Graphic holds (S17, S22, S29, S30, S32, S33) | Panels sat still for 2.6–3.8 s | Slow eased camera pushes (3–6 %) |

All fixes were re-rendered (15 of 22 segments) and the full QC was re-run on the final file.

## Reproduce

```bash
npm install && python3 tools/make_grain.py
npm run render:film                     # mix + 4-worker segmented render + mux (≈ 35 min)
python3 tools/qa_film.py renders/EXIT_CODE_360_FULL.mp4 public/audio/film_mix.wav renders/qa/film
python3 tools/qa_audio.py
```
