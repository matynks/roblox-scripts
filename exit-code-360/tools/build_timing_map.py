#!/usr/bin/env python3
"""Build docs/02_AUDIO_TIMING_MAP.md from the ASR phrase data.

Every phrase gets its measured start/end time and the story sequence it belongs to.
Sequences are defined by an anchor phrase (first phrase of the sequence, matched in
order, case-insensitive substring) plus the environment / visual plan for that block.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SEQUENCES = [
    # (id, anchor text, title, environment, visual plan)
    ("S01", "your little sister tiptoes", "Cold open: the untouchable walk",
     "Seaside promenade, sunset (purple/pink)",
     "Mia's failed cardboard-mask scare; pigeon dive and duck; cyclist dodge 'like a dancer'; Mia stares, 'How?'"),
    ("S02", "then a seagull swoops", "Seagull vs sandwich",
     "Same promenade, closer two-shot",
     "Gull dives from behind; Leo lifts sandwich without looking; offended gull leaves"),
    ("S03", "a normal human sees", "Field of view: 200° vs 360°",
     "Navy infographic space (top-down heads)",
     "Match transition from Leo's head to top-down diagram; 200° wedge, 160° blind zone, 360° sweep (HYPOTHETICAL)"),
    ("S04", "here's the rule", "The rule: wider eyes, same brain",
     "Navy infographic + thumb-at-arm's-length shot",
     "Eye → brain diagram; foveal patch = thumb width; saccade dots (~3/s); brain 'stitching' tiles; 'see everything / look at one thing'"),
    ("S05", "so what if you had three hundred", "Title card",
     "Sunset sea title (gold type)",
     "WHAT IF YOU HAD / 360° VISION? title with bloom, ring motif"),
    ("S06", "plus,", "Perk 1: no surprise party",
     "Night living room",
     "Lights on, 40 people behind couch all 'spotted' with ring pings; 'Mate, you could at least pretend'"),
    ("S07", "pickpockets are doomed", "Perk 2: pickpocket",
     "Busy street, dusk",
     "Hand slides to bag; Leo's rear-vision ping; thief apologises and runs"),
    ("S08", "driving lessons", "Perk 3: driving lesson",
     "Car interior / road, day-to-dusk",
     "Blind-spot diagram vs Leo; instructor stares; 'Dude, you didn't even look once'"),
    ("S09", "dodgeball", "Perk 4: dodgeball",
     "School gym, warm windows",
     "12 balls from all angles, Leo facing the wall dodging; scoreboard; complaint letter"),
    ("S10", "basketball", "Perk 5: basketball",
     "Gym court",
     "Top-down court with 9 vision lines; behind-the-back pass; coach drops clipboard"),
    ("S11", "football next", "Perk 6: football referee",
     "Stadium pitch, floodlights",
     "Referee blind zone vs Leo; foul / shove / dive spotted with flags"),
    ("S12", "nature already tried this", "Nature: prey animals",
     "Meadow at dawn + line-art infographic",
     "Horse and rabbit top-down FOV wedges (~350°); prey-animal label; 'Welcome to the club'"),
    ("S13", "the catch?", "The catch: nothing is background",
     "Promenade/street; attention spotlight graphic",
     "Attention cursor jumps: moth left, car right, flag behind; 'distracted by everything'"),
    ("S14", "in class", "Class: thirty faces",
     "Classroom, warm windows",
     "30 faces each with glance/smirk/whisper pings around Leo"),
    ("S15", "then a man in a grey suit", "Mr. Black's offer",
     "Classroom doorway → corridor (cool light)",
     "Mr. Black introduction; 'human security camera'; 40,000 / 1 / €10,000 figures; 'Just watch'"),
    ("S16", "but there's a cost", "The cost: a busier mind",
     "Leo close-up + overload graphic",
     "Buzzing signal clutter around head; 'amazing and overwhelming'"),
    ("S17", "and sneaky surprises are ruined", "Surprises and dopamine",
     "Vignettes + navy science graphic",
     "Gift / party / scare vignettes; prediction-error graph (reward vs prediction); spark never lights"),
    ("S18", "worse,", "No off switch",
     "Night, Leo's room",
     "Eyes can't close the circle; transition to the night it 'costs far more'"),
    ("S19", "mia notices", "Mia's notebook",
     "Night living room (lamp + moon)",
     "Notebook: SCARES 0 / TRIES 412; 'Just once, Leo'; tired laugh; 'Are you okay?'"),
    ("S20", "she grins anyway", "Concert ticket",
     "Same room",
     "Ticket reveal, mask on; 'Watch your back, Leo… oh wait'"),
    ("S21", "everyone else you just see", "Concert night: Gate Four",
     "Stadium concert, night (stage lights)",
     "'Mia?' look; 40,000 crowd; earpiece crackle; GATE 4 framing"),
    ("S22", "behind you metal groans", "The light fails",
     "Rig above crowd",
     "Shaking stage light; bolt snaps; eye-instant vs brain-late timeline (0.25 s)"),
    ("S23", "then you see her", "Mia under the light",
     "Crowd close-up",
     "Cardboard mask spotted directly underneath"),
    ("S24", "the light hangs eight meters up", "Physics: can you reach her?",
     "Navy infographic",
     "8 m drop → ~1.25 s fall (free fall: √(2·8/9.81) ≈ 1.28 s), minus 0.25 s = 1 s; 15 m at 5 m/s = 3 s; NOT EVEN CLOSE"),
    ("S25", "you can see everything,", "The choice",
     "Concert, slow motion",
     "Gate 4 vs Mia split; 'You look at Mia'; scream; 40,000 heads turn"),
    ("S26", "she looks up", "The rescue",
     "Concert",
     "Freeze; stranger yanks her back; crash; silence"),
    ("S27", "mister black snarls", "Fired / the bolts",
     "Concert rig",
     "'You're fired'; money gone; Leo points bolt after bolt (6 rings); engineers; show stops; applause"),
    ("S28", "mia clings to your jacket", "I always look at you",
     "Concert aftermath, warm work-lights",
     "Mia hugging; 'How did you know?' / 'I always look at you'"),
    ("S29", "weeks later", "Epilogue: the scare lands",
     "Sunset promenade (callback to S01)",
     "New mask; Leo closes eyes; BOO; real jump; notebook SCARES 1 / TRIES 413; 'only look at her'"),
    ("S30", "is any of this real?", "Reality check",
     "Navy infographic",
     "REALITY CHECK card; no human sees 360°; limit is real"),
    ("S31", "1999", "Invisible gorilla study",
     "Navy infographic + gym line art",
     "Simons & Chabris 1999: count passes; ~50% miss gorilla; SEEING ≠ NOTICING"),
    ("S32", "the dopamine spark is real", "Fact vs fiction",
     "Navy infographic",
     "Dopamine real; overload/surprises fiction; brain ≈ 1/5 of body energy ring"),
    ("S33", "so could a mind ever watch", "Cliffhanger",
     "Leo's room, night, phone glow",
     "Phone buzzes: UNKNOWN NUMBER — 'We saw what you did…', 'You're not the only one.'"),
    ("S34", "so what would you do with three hundred", "Outro / CTA",
     "Sunset sea, characters line-up",
     "Question to audience; comment / like / subscribe; EXIT CODE end card"),
]


def main():
    ph = json.load(open(os.path.join(ROOT, "src/data/narration_phrases.json")))
    phrases, duration = ph["phrases"], ph["duration"]

    # resolve anchors in order
    def norm(t):
        t = t.lower().replace("metres", "meters").replace("gray", "grey")
        return re.sub(r"[^a-z0-9]", "", t)

    starts = []
    i = 0
    for sid, anchor, *_ in SEQUENCES:
        while i < len(phrases) and norm(anchor) not in norm(phrases[i]["text"]):
            i += 1
        if i >= len(phrases):
            raise SystemExit(f"anchor not found for {sid}: {anchor!r}")
        starts.append(i)
    bounds = list(zip(starts, starts[1:] + [len(phrases)]))

    lines = []
    lines.append("# EXIT CODE — Audio Timing Map (approved narration)\n")
    lines.append(f"* Source: `ElevenLabs_Your_little_sister_tiptoes_up_behind_.mp3` — MP3, 44,100 Hz, mono, 192 kbps.")
    lines.append(f"* Decoded duration: **{duration:.3f} s** (container header: 439.771 s; the extra 0.049 s is MP3 encoder padding).")
    lines.append("* Frame rate: 30 fps → **13,192 frames** (439.733 s) for the full film, so the narration ends inside the final frame.")
    lines.append("* Timing method: NeMo Parakeet-TDT 0.6B v2 (sherpa-onnx) on ≤12 s pause-aligned chunks, token timestamps → words → phrases; word ends refined with RMS energy; coverage check confirms **no voiced audio is left without a word**.")
    lines.append("* Text is the ASR transcript, used here for timing only. Punctuation may differ from the approved script; items marked ⚠ should be checked against it.\n")
    lines.append("## Sequence overview\n")
    lines.append("| Seq | Time | Dur | Title | Environment | Visual plan |")
    lines.append("|---|---|---|---|---|---|")
    for (sid, _, title, env, plan), (a, b) in zip(SEQUENCES, bounds):
        t0 = phrases[a]["start"]
        t1 = phrases[b]["start"] if b < len(phrases) else duration
        lines.append(f"| {sid} | {t0:7.2f}–{t1:7.2f} | {t1 - t0:5.1f}s | {title} | {env} | {plan} |")
    lines.append("")
    lines.append("## Phrase-level map\n")
    lines.append("Columns: phrase ID, start/end in seconds (narration time, 0 = first sample), duration, words, sequence.")
    lines.append("The per-phrase visual / character / camera / SFX / transition columns are filled in **for the POC window** in `docs/04_POC_SHOT_BREAKDOWN.md`, and will be filled for every sequence in full production after the style is approved.\n")
    for (sid, _, title, *_), (a, b) in zip(SEQUENCES, bounds):
        lines.append(f"### {sid} — {title}\n")
        lines.append("| ID | Start | End | Dur | Narration |")
        lines.append("|---|---:|---:|---:|---|")
        for p in phrases[a:b]:
            flag = " ⚠" if any(k in p["text"].lower() for k in ("mister", "sea gull", "dodge ball", "note book")) else ""
            lines.append(f"| {p['id']} | {p['start']:.2f} | {p['end']:.2f} | {p['end'] - p['start']:.2f} | {p['text']}{flag} |")
        lines.append("")
    lines.append("⚠ = ASR spelling to normalise in captions (Mr. Black, seagull, dodgeball, notebook).\n")

    out = os.path.join(ROOT, "docs/02_AUDIO_TIMING_MAP.md")
    open(out, "w").write("\n".join(lines))
    print("wrote", out, len(phrases), "phrases,", len(SEQUENCES), "sequences")


if __name__ == "__main__":
    main()
