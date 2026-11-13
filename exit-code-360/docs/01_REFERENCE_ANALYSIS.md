# EXIT CODE — Stage A: Reference Analysis & Visual Style Guide

Project: **WHAT IF YOU HAD 360-DEGREE VISION?**
Reference: uploaded `FREE-UNLIMITED-SnapYT.App.mp4` (640×360, 30 fps, 13:12.7, H.264/AAC).
Method: scene-cut detection (ffmpeg `select=gt(scene,…)`), frames sampled every 5 s across the whole file, then every 2 s in the animation sections, plus 7.5 fps motion strips for walk cycles and camera moves. Colors were sampled from 5×5-pixel averages of the frames.

Reference boards (local only; they are third-party frames and are git-ignored):
`assets/reference_frames/board_A_story_environments.jpg`, `board_B_closeups_characters.jpg`, `board_C_motion_graphics.jpg`.

---

## 0. What the reference file actually contains

The reference is **not** one continuous animation. It is a 13-minute tutorial ("how these animations are made") that wraps finished animation clips in production material.

| Time range | Content | Use as visual reference? |
|---|---|---|
| 0:00 – 0:17 | YouTube channel pages, thumbnail grids | **No** (UI) |
| 0:17 – 0:50 | Finished clips mixed with thumbnail UI. Includes Mia-like sister close-up, couch scene, sunset festival lake, "CONNECTED" phone-glow shot, school hall | **Yes**, finished clips only |
| 0:50 – 1:05 | Cream "explainer" cards (Claude Code logo, "4 minutes", "Script", icons), a live-action stock clip, a meme photo | **No** (tutorial graphics) |
| 1:05 – 1:51 | **Finished animation sizzle:** ECG infographics, sunset title card, school/exam scenes, swimming pool, underwater whale, ECG doctor room, heart-rate bar chart, brain ring, close-ups | **Yes, primary** |
| 1:51 – 10:00 | Desktop recordings: Google Docs, Claude chat, ElevenLabs, file browser | **No** |
| 10:00 – 11:40 | Desktop with **embedded preview renders** of the finished film (style tiles, close-ups, couch, lake) | **Yes** (only the embedded previews) |
| 11:40 – 12:30 | **Finished film playing full-screen** ("What if your heartbeat was 10× slower?"): couch, sister close-ups, lake at sunset, pier, underwater, festival, "reality check" infographics | **Yes, primary** |
| 12:30 – 12:52 | Cream outro cards ("No manual animation", "One workflow") | **No** |
| 12:52 – end | "Ready to watch" final shot (two characters dancing on festival pier) | **Yes** |

Everything below is taken from the **finished animation** sections only.

---

## A. Character design

**Construction (measured on the 640×360 frames, brother at full height ≈ 160 px):**

| Part | Measurement / rule |
|---|---|
| Head | Perfect circle. Diameter ≈ **¼ of total height** for the older brother. Closer to **⅓** for the little sister. Solid near-black `#14111A`, never pure `#000`. |
| Rim light | Thin warm stroke on the lit side of head and limbs: peach `#F2C48D` at sunset or under a lamp, lavender `#B9C2FF` under moonlight or in clinical light. In close-ups it becomes a **full, thicker ring** around the head (≈3% of head diameter), brighter on the key-light side. |
| Torso | A soft rounded rectangle "shirt" in **one flat saturated color**, slightly narrower than the head (≈ 0.55 × head Ø), length ≈ 1.2 × head Ø. Brother = steel blue `#3F6FA6`. Sister = A-line pink dress `#EC8FBF`. |
| Limbs | Thick black rounded strokes (≈ head Ø / 6), **round caps**, no hands or fingers drawn. Thigh ≈ shin. Small elongated black shoes. Arms are black even when the shirt has color. |
| Neck | No neck. The head sits right on the shoulders with a 2–3 px overlap. |
| Face | **White** features only, no nose: two solid round **eyes** (Ø ≈ 0.17 × head Ø, spaced ≈ 0.36 × head Ø apart, slightly above center). The **mouth** is a thick white arc for a smile, a filled white "D" for a laugh, a white oval for shock, or a short flat bar for neutral. **Eyebrows** are short thick white strokes and carry most of the emotion. Tears are light-blue drops `#8FC7F2`. |
| Facing | In profile and walking, both eyes stay visible but slide toward the facing direction. The silhouette reads at any size. |
| Hair / identity | Identity comes from **silhouette accents**: the sister's thick looping black ponytail with a pink pill-shaped clip, a green cap, a frizzy afro, cat ears. Bodies stay identical. |
| Background extras | Fully black stick figures with no shirt color and smaller heads, so they recede from the main cast. |

**Expressions observed:** content (closed "– –" eyes plus a smile), laughing (closed "^ ^" eyes plus a "D" mouth), worried (brows up and in plus a flat mouth), crying (worried, tears, "o" mouth), shocked (wide eyes plus an "o" mouth), angry (brows down and in), smug (one brow raised).

**Acting:** posture is broad and readable (slumped shoulders, head tilt, arms raised). Close-ups carry the emotional beats. Interactions are tactile: a hand on the head, a hug, kneeling to eye level.

## B. Environment

Flat-shaded vector shapes **plus** gradients, soft blur, bloom and film grain. Nothing is outlined with black ink lines. Shapes are defined by value and color only.

| Set | Palette (sampled) | Signature elements |
|---|---|---|
| **Sunset lake / pier** (most used) | sky `#3D2A4A → #5E3962 → #8E5685`, sun core `#FFF3E6` with large pink bloom, hills `#452F44`, pine silhouettes `#2A1C2E`, water `#705067 → #34263D`, dock `#3B3A44` | Horizontal water glints under the sun, wispy cloud bands, silhouetted pines, a dark pier in the foreground |
| **Night living room** | lit wall `#523E3D`, shadow wall `#1E1319`, sofa `#36293E`, floor `#443436`, window sky `#0E132E` | Floor lamp with pale-yellow shade and a soft light cone, window with moon and lit city, goldfish bowl, picture frame. Light falls off into dark corners. |
| **School / hall** | warm amber windows `#F0B47A`, walls `#3A2B2C` | Tree silhouettes behind windows, blurred dark pillars in the foreground |
| **Underwater** | `#407678 → #356C79 → #0F2A33` | God-rays fanning from the surface, bubbles, silhouettes |
| **Clinic / night room** | cool navy `#1C2236`, window `#3A4880` | Light shafts through the window, green ECG monitor |
| **Infographic space** | center `#0F1124`, edges `#060A15`, very faint square grid | Glowing line art (see D) |

**Depth:** 3–5 parallax planes (sky, far hills, water, set, characters, blurred foreground posts). The foreground is blurred and dark. Distant layers are lower contrast and hazier.
**Atmosphere:** floating dust motes, soft vignette, light film grain, horizon haze, bloom on every light source.
**Environmental motion:** water glints shimmer, motes drift, lamp light breathes slightly, clouds crawl.

## C. Cinematography

* **Aspect:** story shots are **letterboxed**, with black bars ≈ 5% of frame height top and bottom (about 2:1 inside 16:9).
* **Shot sizes:** wide establishing shots (characters ≈ 30–45% of frame height), medium two-shots, and **big face close-ups** where the head fills about 60% of the height and the background is heavily blurred (shallow depth of field).
* **Movement:** slow lateral **tracking** that follows a walking character, who stays near center while the foreground posts pass blurred. Slow push-ins. Gentle lateral drift on still moments. Occasional angled wide shots for establishing.
* **Rack focus / DOF:** a foreground prop (stopwatch, exam paper, phone) is held sharp while the character behind is blurred, then focus shifts.
* **Transitions:** mostly straight cuts and short cross-dissolves. **Expanding rings** around a character (heartbeat pulses) are used as a visual motif and bridge into graphics. Story and infographic sections alternate rhythmically.
* **Composition:** strong horizon line around 40–45% from the top. Characters on the dock line in the lower third. Generous negative space.

## D. Motion graphics

* **Background:** dark navy infographic space (see B) with a vignette and faint grid.
* **Line art:** thin (≈2 px at 1080p) glowing strokes in pale blue `#9CC8F2` or gold `#F2C55C`. Stick figures in infographics become **outlined line drawings** in the same weight. Lines draw on with a **glowing leading dot**.
* **Typography:**
  * Small labels in **uppercase geometric sans, bold, wide tracking** (≈ +0.15 em), muted blue-grey `#9FB2C8`.
  * Hero numbers are large, bold and rounded, either white-blue `#DCE9FF` or gold `#F2C55C`, with a soft glow.
  * Title cards use two lines over a sunset background: a small white uppercase line, then a big **gold** uppercase line with bloom.
  * The font in the reference reads as Montserrat-class (geometric, bold). **We use Montserrat 600/700/800.**
* **Data devices:** ECG lines, horizontal progress bars with a glowing head and a counting number, vertical bars with axis ticks, a **circular ring progress** (gold arc on a dark track), side-by-side comparison columns (MOUSE / HUMAN / WHALE).
* **Accents:** coral-red `#FF5C6C` for danger or "impossible", gold for the hero result, blue for normal or baseline.
* **Restraint:** one idea per frame, few words, large and centered.

## E. Animation

* Movement is **smooth, eased** (no linear tweens) and slightly bouncy on arrivals.
* Walk cycles: about 1 s per two steps, with a clear passing pose, a little body bob, and arms swinging opposite the legs.
* Faces: blinks, eyebrow shifts and mouth swaps are timed to the narration beat.
* **Secondary motion:** ponytail sway, water glints, drifting dust, lamp flicker, crowd flags.
* Infographics animate on: lines draw, numbers count, bars grow, rings fill. Every element has an entrance.
* Pacing: a visual change every 1–3 s, synchronized to narration phrases.

---

## Style guide for EXIT CODE: 360°

### Palette tokens (used in code: `src/style/palette.ts`)

| Token | Hex | Use |
|---|---|---|
| ink | `#14111A` | heads, limbs, silhouettes |
| eyeWhite | `#F6F1EA` | eyes, mouth, brows |
| rimWarm | `#F4C590` | sunset / lamp rim light |
| rimCool | `#BFC8FF` | moon / clinical rim light |
| leoBlue | `#3F6FA6` (shade `#2F5583`) | Leo's jacket |
| miaPink | `#EC8FBF` (shade `#C96E9E`), clip `#F27BAA` | Mia's dress and clip |
| cardboard | `#C79A68` (edge `#9B7148`) | Mia's scare mask |
| blackSuit | `#5B5F69` | Mr. Black's grey suit |
| sky (sunset) | `#33233F → #5E3962 → #A8638C` | sunset sets |
| sun | `#FFF4E8`, bloom `#F7B7C8` | sunset sets |
| water | `#7A5272 → #34263D` | sunset sets |
| navy | `#0F1428` center, `#060A15` edge | infographics |
| lineBlue | `#9CC8F2` | infographic strokes |
| gold | `#F2C55C` | hero numbers / results |
| coral | `#FF5C6C` | danger / blind zone |
| label | `#9FB2C8` | small caps labels |

### Lighting guide

1. Each set has **one motivated key light** (sun, lamp, moon or monitor). The rim-light side of every character points toward it.
2. Set lights get **bloom**: a radial gradient plus blur, 2–4× the size of the source.
3. Lamps cast a **soft cone** (low-opacity gradient polygon) and a pool on the floor.
4. Shadows are **cool and transparent**, never black fills.
5. Corners fall off through a vignette (multiply, 35–55%).
6. Film grain overlay ≈ 6–8% opacity, refreshed at about 12 fps.

### Camera & animation guide

* The camera is a virtual 2.5D rig: `x, y, zoom`, with per-layer parallax factors (sky 0.02 → foreground 1.6).
* Foreground layers get 8–14 px blur. Sky and far layers get haze.
* Use **ease-in-out** (cubic or sine) for camera moves and **spring/back-out** for character arrivals.
* Keep shots long and continuous where the narration allows. Prefer tracking and push-ins to cuts.
* Bridge story ↔ infographic with motivated **match transitions**: the character's head becomes the diagram's head, and rings expand from a character.

### Motion-graphics guide

* Navy space with grid, glowing 2–3 px strokes, Montserrat uppercase labels at +0.15 em tracking.
* One hero number per beat. Numbers **count**, never just appear.
* Scientific diagrams must be **honest**. For vision:
  * The human horizontal field is about **200°** (≈ 120° seen by both eyes).
  * The blind zone behind is about 160°.
  * 360° is labeled **HYPOTHETICAL**.
  * Sharp vision (fovea) is only about the width of a thumb at arm's length.
  * The eyes make about 3 saccades per second.
