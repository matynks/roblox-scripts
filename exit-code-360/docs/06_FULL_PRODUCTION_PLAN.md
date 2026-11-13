# EXIT CODE 360 — Full Production Plan (approved style: POC v2)

Film: 0.000 → 439.722 s narration, **13,192 frames @ 30 fps**, 1920×1080, H.264 High + AAC.
Composition id: `Film` (`src/film/Film.tsx`). Every scene is a pure function of narration time `T`.
Times below are measured narration times (`docs/02_AUDIO_TIMING_MAP.md`).

## Build order (commit after each batch)
1. Kit: timing helpers, acting helpers, Film scene table, parallel segment renderer (renders straight to H.264 segments, no PNG disk use).
2. Batches: B1 S01–S05 · B2 S06–S08 · B3 S09–S12 · B4 S13–S16 · B5 S17–S20 · B6 S21–S24 · B7 S25–S28 · B8 S29–S34.
3. Audio: original SFX library + original procedural score (per-sequence moods), ducked under narration.
4. Full render → QA (`tools/qa_video.py` + strips per sequence) → fixes → final render.

## Environments (kit)
| Env | Used in | Notes |
|---|---|---|
| Promenade sunset (approved) | S01–S02, S04 POV, S05, S13, S29, S34 | existing |
| Navy infographic (approved) | S03, S04, S08b, S10b, S12, S17b, S22b, S24, S30–S32 | existing |
| Night living room | S06, S19–S20, S33 | lamp + moon window, sofa, door light |
| Street at dusk | S07, S13 | shopfronts, warm windows, lamps, pedestrians |
| Car: road exterior + cabin cutaway | S08 | learner car, parallax road at dusk |
| Gym | S09–S10 | warm high windows, wooden floor, hoops |
| Football pitch (evening floodlights) | S11 | stands + floodlights |
| Classroom | S14–S16 | warm windows w/ tree silhouettes, desks, door |
| Concert stadium at night | S21–S28 | truss rig, stage lights, beams, haze, crowd, GATE 4 |

## Sequence designs
- **S01 0.00–23.26** Promenade. Leo at the railing eating; Mia tiptoes in (mask on, arms up); "Hi, Mia" wave without turning; she groans, mask up; pigeon dives, Leo ducks without looking; walks → (approved POC) cyclist dodge → Mia "How?".
- **S02 23.26–29.34** approved POC seagull + push-in.
- **S03 29.34–43.34** approved POC FOV diagram; dissolves (navy→navy) into S04.
- **S04 43.34–59.10** "THE RULE": eyes-wider/brain-same funnel graphic → first-person POV of the promenade, blurred, thumb + sharp ≈2° patch → saccade jumps ≈3/s → stitched mosaic → whole view → attention spotlight on Mia.
- **S05 59.10–62.30** Title over sunset sea: WHAT IF YOU HAD / 360° VISION? + EXIT CODE.
- **S06 62.30–73.72** Dark living room; Leo enters; 40 hidden heads behind couch pinged ("SPOTTED 40/40"); lights on; deflated friend "Mate, you could at least pretend".
- **S07 73.72–82.55** Street tracking; thief's hand reaches for bag; Leo taps it away without looking; thief bows, runs.
- **S08 82.55–95.86** Learner car on road; top-down blind-spot diagram (head turn vs Leo's 360 ring); cabin: instructor stares, "Dude…", Leo "No need".
- **S09 95.86–106.99** Gym dodgeball: 12 balls from all angles, Leo facing the wall dodges all; clock 4:00 GAME OVER; teammates cheer; other team writes COMPLAINT.
- **S10 106.99–115.83** Top-down court, 9 sight lines; behind-the-back pass; coach drops clipboard.
- **S11 115.83–125.62** Pitch, 22 players; referee's cone misses foul behind; Leo spots FOUL / SHOVE / DIVE (ring stamps).
- **S12 125.62–136.52** Navy nature: horse ≈350°, rabbit ≈360° (tiny blind spots), prey animals, threats from all sides; Leo joins "the club".
- **S13 136.52–151.23** THE CATCH: attention reticle jumps moth (left) → car honk (right) → flag (behind); overload swarm.
- **S14 151.23–157.95** Classroom: 30 faces; glance/smirk/whisper pings; Leo overwhelmed.
- **S15 157.95–175.92** Mr. Black at the door; lower-third; "human security camera"; stat cards 40,000 / 1 / €10,000; "Just watch?"; earpiece handover.
- **S16 175.92–184.62** Close-up Leo, buzzing swarm around head, noon clock, amazed → overwhelmed.
- **S17 184.62–207.57** Triptych: gift / party / scare (all pinged); dopamine prediction-error graph; spark never lights; smile a second late.
- **S18 207.57–212.77** "No off switch": eyes closed, ring stays on; switch flips; fade to night.
- **S19 212.77–242.60** Living room night: Mia's notebook SCARES 0 / TRIES 412; "Just once, Leo"; tired laugh; "Are you okay?" "Just tired".
- **S20 242.60–251.61** Ticket TOMORROW'S CONCERT; mask on; "Watch your back, Leo… oh wait".
- **S21 251.61–268.70** Concert: Mia in the crowd; 40,000; earpiece crackle; GATE 4; Leo stares.
- **S22 268.70–280.99** Rig groans, light shakes, bolt snaps; eyes 0.00 s vs brain +0.25 s timeline.
- **S23 280.99–286.19** Mia right underneath (ring), Leo's shocked face.
- **S24 286.19–302.28** Physics: 8 m, t=√(2h/g)≈1.28 s ≈ 1¼ s, −0.25 s = 1.0 s; 15 m ÷ 5 m/s = 3 s; NOT EVEN CLOSE stamp.
- **S25 302.28–314.01** Split: GATE 4 vs MIA; he looks at Mia; scream rings; 40,000 heads turn.
- **S26 314.01–321.45** Mia looks up, freezes; stranger yanks her back; crash; silence.
- **S27 321.45–346.77** Earpiece "You're fired", €10,000 → 0; Leo points; 6 bolts pinged; engineers climb; show stops; crowd claps.
- **S28 346.77–352.37** Mia clings to Leo; "How did you know?" "I always look at you."
- **S29 352.37–379.09** Promenade callback: new mask; eyes closed; BOO; real jump; laugh; spark; notebook SCARES 1 / TRIES 413; sunset two-shot.
- **S30 379.09–386.10** REALITY CHECK card; 360 ✗ / 200° ✓; LIMIT IS REAL.
- **S31 386.10–398.99** Invisible gorilla (Simons & Chabris 1999): pass counter, gorilla walks through, ≈50% missed, SEEING ≠ NOTICING.
- **S32 398.99–414.34** REAL / FICTION checklist; brain ≈1/5 energy ring; thinking harder barely changes it.
- **S33 414.34–427.49** Night window; phone buzz: UNKNOWN NUMBER; two messages; distant silhouette with a ring.
- **S34 427.49–439.72** Cast line-up at sunset; question; comment / like / subscribe; EXIT CODE end card.

## Audio
- Narration: untouched, sample-exact.
- SFX: original synthesized library (`tools/audio/`), cue times in `src/film/cues.json` (shared by picture and mixer).
- Music: original procedural score: warm pads + plucked strings + felt-piano motifs; mood per sequence; ducked ≈10 dB under the voice.
- Target: narration ≈ −17 dB RMS, music ≈ −34 dB RMS under voice, SFX peaks ≤ −14 dBFS, mix peak < −0.5 dBFS.
