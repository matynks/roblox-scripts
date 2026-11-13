# EXIT CODE 360 — Stage B: Character Design

Design sheets are rendered from code, so they always match the animation rig:

* `assets/character_sheets/sheet_leo.png`
* `assets/character_sheets/sheet_mia.png`
* `assets/character_sheets/sheet_black.png`

Each sheet shows front, three-quarter and side views, walk, run, story-specific emotional poses, and 8 expressions in the reference close-up style. To regenerate: `npx remotion still src/index.ts SheetLeo|SheetMia|SheetBlack <out.png>`.

## Shared construction (from the reference, §A of the analysis)

* **Head:** a perfect circle in near-black `#14111A`. All features are white (`#F6F1EA`) and there is no nose.
* **Rim light:** a thin warm `#F4C590` edge on the side facing the scene's key light. Close-ups add the reference's full head ring.
* **Torso:** a single flat garment colour with a soft lit-to-shadow gradient. Limbs are black rounded strokes about head Ø / 6 thick. There are no hands, and shoes are small black capsules.
* **Expressions** come from eyes (dot / happy / closed / wide / lidded), thick brows, and a mouth set (smile, flat, grin "D", "o", talk, smirk, wobble), plus tears.
* **One rig** (`src/characters/Figure.tsx`) drives everyone:
  * Forward-kinematic limbs with world-space angles.
  * Auto-grounding, so the lowest foot always touches the floor.
  * `turn` (front ↔ profile).
  * Mirrored facing with a seamless flip helper.
  * Hold slots for props.
  * A numeric face model, so expressions can tween.

## Leo — main character

* Proportions: head ≈ ¼ of height, the older-sibling proportions in the reference.
* Outfit: steel-blue zip jacket (`#3F6FA6`) with collar and zip line. Mia "clings to your jacket" later in the story, so the jacket is a story prop.
* Silhouette: plain round head with no accent, readable at any size by the blue torso.
* Acting notes: calm, unbothered, slightly smug. His signature is **eyes closed + smile while something happens behind him**. A thin **"sense ring"** around his head marks every moment he perceives something behind him. This motif is reused through the film and in the science graphics.

## Mia — little sister

* Proportions: head ≈ ⅓ of height (child).
* Outfit: pink A-line dress (`#EC8FBF`). Silhouette accent: a thick looping black ponytail with a pink pill clip (`#F27BAA`), with spring-driven secondary motion.
* Prop: **cardboard scare mask** (`#C79A68`) with cut eye holes and marker-drawn angry brows and jagged teeth. It animates between worn and pushed-up (`state` 0 → 1).
* Acting notes: big readable reactions (stare, "How?!", pointing, ducking), and hopeful brows for the notebook scenes.

## Mr. Black — the man in the grey suit

* Proportions: tallest and broadest, head ≈ ⅕ of height.
* Outfit: grey suit (`#5B5F69`), white shirt V, black tie, lapel line, buttons.
* Silhouette accent: a slicked quiff with a sheen line.
* Face: narrow **lidded eyes**, sly or smug mouth. Anger shows as brows down and a snarl.

## Background extras

* Plain black stick figures with no garment colour and smaller heads, like the reference's crowd and background people.
* Example: the cyclist in the POC.
