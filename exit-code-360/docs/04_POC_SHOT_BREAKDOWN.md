# EXIT CODE 360 — Proof of Concept v2: Shot Breakdown

* Window: narration **13.70 s → 43.20 s** (29.50 s, 885 frames @ 30 fps).
* Both cut points fall in measured pauses: 13.43–13.91 and 42.81–43.29.
* All times are **narration seconds**, from `docs/02_AUDIO_TIMING_MAP.md`.
* Every cue lives in one file, `src/scenes/poc/timeline.ts`. The picture and `tools/mix_audio.py` both read it.

| Shot | Narration time | Type | Environment |
|---|---|---|---|
| A | 13.70–18.95 | Wide tracking shot | Seaside promenade, sunset |
| BC | 18.95–29.35 | Medium two-shot ending in a push-in | Same promenade, further along |
| D | 29.12–43.20 | Match-dissolve into the science graphic | Navy infographic space |

---

## Shot A — "The untouchable walk" (13.70–18.95)

| # | Time | Narration | Environment / lighting | Characters | Animation | Camera | VFX / graphics | Transition | Sound |
|---|---|---|---|---|---|---|---|---|---|
| A1 | 13.70–13.91 | (pause) | Promenade at sunset. The sun sets over open sea between two headlands. Bloom, glint column, pines, a lighthouse with a pulsing beam. Lamps are just lit and cast warm cones and pools. | **Leo** on the mid lane, profile right, sandwich in his near hand. **Mia** about 330 px behind on the far lane, mask pushed up, sulking. | Walk cycle: feet planted, so phase = distance ÷ stride. Mia's sulky gait has her head down and her ponytail swinging. | Tracking shot keeps Leo at screen x 820. Zoom 1.00. | Dust motes, drifting clouds, a sailboat, far gulls, blurred foreground posts passing (parallax 1.55). | Fade from black, 0.45 s | Sea bed fades in. Footsteps on boards. |
| A2 | 13.91–16.06 | "A cyclist rings his bell from behind." | same | Cyclist (black extra) enters from the left on the mid lane at 640 px/s. | Pedals driven by distance: legs use 2-bone IK onto the pedals, wheels rotate. **Bell** at 14.78 and 15.12 shows "ring" marks. Leo never turns. At 16.05 a faint ring pulses around his head. | Slow push to 1.05 | Motion ghosts behind the bike. 360° "sense ring" motif. | — | Bell ring-ring (panned left). Tyre hum and freewheel ticks rise. Distant gull. |
| A3 | 16.40–17.33 | "You step aside," | same | Leo moves from the mid lane to the near lane, scale 0.82 → 0.86. | Anticipation dip at 16.2, hop at 16.42–16.8. Turns profile → front with eyes closed and a calm smile. The bike passes **behind** him at 16.95. Mia flinches as it passes her. | Push to 1.10 | — | — | Swish. Bike pass-by whoosh panning L→R. |
| A4 | 17.75–18.68 | "like a dancer." | same | Leo holds a front-facing ballet pose: one arm raised, one extended with the sandwich, toe pointed. Mia stops and stares. | Flourish wobble on the raised arm and head at 17.8. Back to profile and walking at 18.22–18.6. | Holds 1.11 | — | — | Soft chime twinkle at 16.98 and 17.8 |

## Shot BC — "How did you do that?" + seagull (18.95–29.35)

| # | Time | Narration | Environment / lighting | Characters | Animation | Camera | VFX / graphics | Transition | Sound |
|---|---|---|---|---|---|---|---|---|---|
| B1 | 18.95–20.63 | "Mia stares." | Same promenade, two-shot. Background DOF blur 3.2 px, railing 1.4 px. | Mia (left) faces Leo. Leo (right) walks two steps away, then stops. | Mia's stare: big eyes, raised brows, blink at 20.1. Leo's walk eases into a breathing idle. | **Cut.** Two-shot at zoom 1.50, slow push. | Motes | Hard cut (match on story beat) | Leo's footsteps |
| B2 | 20.63–21.00 | "How" | same | Mia | Palms-out "How?!" with a hop. Ponytail wobble. Mouth lip-synced to the narration words. | 1.54 | — | — | — |
| B3 | 21.59–22.66 | "how did you do that?" | same | Mia hurries to Leo, 2700 → 2848. Leo turns to her. | Brisk walk, talking mouth. Leo turns profile → front, then a **seamless facing flip** (mirrored pose, sandwich swaps hands) → 3/4 facing Mia. | Pans right to recentre the pair | — | — | Mia's light footsteps |
| B4 | 22.66–23.26 | (pause) | same | Leo | Front-view shrug with a sly face | — | — | — | — |
| C1 | 23.26–25.36 | "Then a seagull swoops for your sandwich." | same | **Gull** enters top right, *behind* Leo. Mia notices. | Gull glides, then dives (cubic Bézier, ease-in). Mia: shocked face, then points at the gull. Leo keeps smiling at Mia. | Push 1.55 → 1.68, tilt up | — | — | Gull call (right), dive whoosh building |
| C2 | 25.66–26.61 | "You hold it high." | same | Leo lifts the sandwich straight up **without looking** (eyes closed). Gull snaps at empty air at 25.92. Mia ducks. | Arm raise 25.45–25.72. Beak snap. Gull flies past at flapping speed. | Small follow left | Sense ring around Leo's head at 25.4 | — | Snap click, whoosh panning R→L, flaps, duck swish |
| C3 | 26.86–28.02 | "The seagull leaves," | same | Gull lands on the railing between them, settles and **glares**. Leo bites the sandwich, smug. | Landing: legs extend, wings fold, settle wobble, feather ruffle. Leo lowers the sandwich and bites (crunch, chewing mouth). | Settles 1.66 → 1.63 | — | — | Landing tap, ruffle, crunch |
| C4 | 28.22–28.82 | "offended." | same | Gull turns its nose up ("hmph") and takes off to the upper right. | Head-up 28.22. Takeoff 28.48 with wings unfolding and legs tucking. | — | — | — | Short indignant squawk, takeoff flaps |
| C5 | 28.85–29.35 | (pause) | same | Leo | — | **Push-in** to Leo's head, zoom to 5.6 (ease-in). DOF blur grows. The reference close-up ring fades in on his head. | Warm ring, then a blue ring, expanding from his head. Navy wash. | **Match dissolve**: Leo's head becomes the top-down head | Riser → low boom at 29.32 |

## Shot D — Field of view, seen from above (29.12–43.20)

| # | Time | Narration | Graphic (navy space, grid, vignette) | Motion | Camera | Sound |
|---|---|---|---|---|---|---|
| D1 | 29.34–31.93 | "A normal human sees about two hundred degrees," | Top-down person: shoulders, head, nose and eyes, facing up. The field wedge opens from the eyes. Counter reads "NORMAL HUMAN ≈200° · horizontal field of view". | Head shrinks from match size (4.25×) to 1×. Wedge 0 → 200° (ease-out) synced with the counter. Glow pulse at 200°. | Intro scale | Boom tail, rising tone, counter ticks, ping at 200 |
| D2 | 32.30–33.11 | "everything ahead," | Central 120° (both eyes) highlighted. "AHEAD" label. | Pulse, then settles to a 30% hint | Slow breathe zoom | Soft ping |
| D3 | 33.42–34.62 | "and a little to each side." | Peripheral lobes (60–100° each side) highlighted. "SIDE" labels. | Pulse | — | L/R pings |
| D4 | 35.26–35.79 | "Behind you?" | The remaining 160° behind is outlined, dashed coral, with a "?" | Outline draws in. "?" rises. | — | Low questioning tone |
| D5 | 36.54–36.96 | "Nothing." | The blind zone darkens. "BLIND ZONE ≈160°". | "?" fades | — | Dull thud |
| D6 | 37.42–37.75 | "You?" | The human diagram slides left and scales to 0.7, counter moves under it. **"YOU · HYPOTHETICAL"** diagram slides in (gold, Leo-blue shoulders). | Ease in-out | Re-frame to side-by-side | Slide whoosh |
| D7 | 38.22–39.38 | "Three hundred and sixty." | Gold field sweeps 200° → 360° around the back. Counter counts to 360°. | Ease in-out sweep | — | Rising sweep with 8 ticks |
| D8 | 39.74–40.66 | "The whole circle." | Full gold ring glows. Ripples expand (reference ring motif). | Glow pulse + 3 ripples | — | Major-chord chime |
| D9 | 41.02–41.92 | "No blindside." | A ghost of the human blind zone appears on Leo's diagram and **shatters** into 18 shards. "NO BLIND ZONE". | Shards fly and rotate outward | — | Glass tinkles + noise burst |
| D10 | 42.22–42.81 | "No back." | Final glow pulse and ripples | — | — | Low resonant pulse |
| — | 42.95–43.20 | (pause) | Fade to black | — | — | Beds fade |

## Scientific accuracy notes

* The human horizontal visual field is about 200°, of which about 120° is binocular. The remaining ~160° behind is unseen. The diagram is a top-down simplification.
* 360° vision is labelled **HYPOTHETICAL**. The diagram deliberately does not add eyes or alter anatomy.
* The diagram's "AHEAD" region is the binocular overlap. "SIDE" is the monocular periphery.
