#!/usr/bin/env python3
"""EXIT CODE 360 — English subtitles from the original narration.

Source of truth: the narration's measured word timings (src/data/narration_words.json, ASR on the
approved MP3) and the edited subtitle script below (one entry per narration phrase). The script may
only change punctuation, capitalisation, quotation marks, numerals and spelling style; every
spoken word is kept. `verify()` proves that word for word against the timing data.

Cue rules (broadcast style): ≤ 2 lines, ≤ 42 characters per line, ≤ 7 s, reading speed target
≤ 17 characters/second, breaks at sentence/clause boundaries, line breaks balanced and never after
an article/preposition; in-time 1 frame before speech, out-time 0.35 s after the last word (never
running into the next cue), minimum 0.9 s, cues closer than 0.5 s are chained with a 2-frame gap;
all times snapped to the 30 fps frame grid.

Outputs: subtitles/EXIT_CODE_360_EN.srt, subtitles/EXIT_CODE_360_EN.ass (styled, for burn-in),
renders/subtitles/cues.json (report).
"""
import json
import math
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
FILM_END = 13192 / FPS

# --------------------------------------------------------------------------- edited script
# One entry per narration phrase (1-based order of src/data/narration_phrases.json). Quotes mark
# lines spoken by characters (attribution from the film's lip-sync windows).
SCRIPT = [
    "Your little sister tiptoes up behind you,", "cardboard mask on,", "arms raised,", "ready.",
    "You don’t even turn around.", "“Hi, Mia.” She groans.", "A pigeon dives at your head,", "you duck,",
    "without looking.", "A cyclist rings his bell from behind.", "You step aside,", "like a dancer.",
    "Mia stares.", "“How…", "how did you do that?”", "Then a seagull swoops for your sandwich.",
    "You hold it high.", "The seagull leaves,", "offended.", "A normal human sees about 200 degrees:",
    "everything ahead,", "and a little to each side.", "Behind you?", "Nothing.",
    "You?", "Three hundred and sixty.", "The whole circle.", "No blind side.",
    "No back.", "Here’s the rule.", "Your eyes got wider.", "Your brain did not.",
    "Hold up a thumb at arm’s length.", "Only that patch is truly sharp.", "Your eyes jump about three times a second.", "Your brain stitches the rest.",
    "You can see everything,", "but you can only look at one thing.", "So what if you had 360-degree vision?", "Plus,",
    "nobody sneaks up on you.", "Ever.", "Your surprise party is ruined.", "Forty people hide behind the couch,",
    "all spotted.", "“Mate,", "you could at least pretend.”", "Pickpockets are doomed.",
    "A hand slips toward your bag.", "You see it", "before it arrives.", "The thief apologises,",
    "then runs.", "Driving lessons.", "Normal drivers turn their heads to check blind spots.", "You?",
    "Never.", "The instructor stares in silence.", "“Dude…", "you didn’t even look once.”",
    "“No need.”", "Dodgeball.", "Twelve balls from every angle.", "You dodge them all,",
    "facing the wall.", "Game over in four minutes.", "Teammates cheer.", "The other team is writing a complaint.",
    "Basketball.", "Ten players on the court.", "You see the other nine at once.", "A behind-the-back pass.",
    "Perfect.", "The coach drops his clipboard.", "Football next.", "Twenty-two players on the pitch.",
    "A referee can’t see behind him.", "You can.", "Every foul,", "every shove,",
    "every dive.", "Nature already tried this once.", "Horses see almost all the way around.", "So do rabbits.",
    "They’re both prey animals.", "Danger can come from anywhere.", "Welcome to the club.", "The catch?",
    "Nothing is background.", "A moth flutters left.", "Attention jumps.", "A car honks right.",
    "Jump.", "A flag flaps behind.", "Jump.", "Seeing everything means getting distracted by everything.",
    "In class, 30 faces:", "every glance,", "every smirk,", "every whisper behind a hand.",
    "Then a man in a grey suit finds you.", "Mr. Black.", "He smiles.", "“We need a human security camera.",
    "Forty thousand fans,", "one concert,", "10,000 euros.", "Just watch.”",
    "“Just watch?”", "“Just watch.", "And never leave your post.”", "But there’s a cost.",
    "A busier picture means a busier mind.", "By noon,", "your head is buzzing,", "amazing and overwhelming,",
    "and sneaky surprises are ruined:", "the gift behind a back,", "the party behind a couch,", "the scare from behind.",
    "Ever wonder why surprises feel so good?", "Dopamine cells fire hardest when life beats the prediction.", "You can’t predict everything,", "but you see these coming,",
    "so the spark never lights.", "You smile a second late,", "or not at all.", "Worse,",
    "there’s no off switch.", "And one night, it costs far more.", "Mia notices.", "Of course she does.",
    "She…", "keeps a little notebook.", "Scares:", "zero.",
    "Tries:", "412.", "She holds it up,", "hopeful.",
    "“Just once, Leo.", "Let me win once.”", "You never mean to ruin it.", "You just…",
    "always see her.", "You laugh.", "The tired laugh,", "not the real one.",
    "She hears the difference.", "“Are you okay?”", "“Just tired,” you say.", "She grins anyway.",
    "“Tomorrow’s concert.", "I got a ticket.", "Mask on.", "Watch your back, Leo.",
    "Oh,", "wait.”", "Everyone else, you just see.", "Mia?",
    "You look.", "The concert.", "Forty thousand people.", "Mr. Black’s voice crackles in your earpiece.",
    "“Watch Gate 4.", "Only Gate 4.", "Look away,", "and the deal is over.”",
    "So you stare at Gate 4.", "Behind you, metal groans.", "High above the crowd,", "a stage light shakes.",
    "A bolt snaps.", "Your eyes see it instantly.", "Your brain?", "A quarter second late.",
    "Noticing takes time.", "Then you see her:", "a cardboard mask, right underneath.", "Mia.",
    "The light hangs eight metres up.", "It falls in about one and a quarter seconds.", "Take away your quarter.", "One second left.",
    "Mia is 15 metres away.", "You run five metres per second.", "Three seconds.", "Can you reach her?",
    "Not even close.", "You can see everything,", "but you can only look at one thing.", "Gate 4 or Mia?",
    "You look at Mia.", "You scream her name.", "“Mia!", "Up!”",
    "Forty thousand heads turn.", "She looks up,", "freezes.", "A stranger yanks her back.",
    "The light crashes where she stood.", "Silence.", "Mr. Black snarls through the earpiece.", "“You’re fired.",
    "The money?", "Gone.”", "Silence would be easy.", "Instead,",
    "you point.", "Bolt after bolt.", "Six more,", "loose across the rig.",
    "Engineers climb up.", "Every one is loose.", "The show stops.", "Nobody else gets hurt.",
    "The whole crowd claps", "for the kid with eyes in the back of his head.", "Mia clings to your jacket.", "“How did you know?”",
    "“I always look at you,” you say.", "Weeks later,", "Mia tiptoes up behind you,", "a brand-new mask.",
    "You close your eyes.", "“Boo!”", "You jump.", "Really jump,",
    "a real scream.", "Then you laugh,", "right on time.", "The spark finally lights up.",
    "In her notebook:", "Scares:", "one.", "Tries:",
    "413.", "You open your eyes.", "You can see everything,", "but you only look at her.",
    "Is any of this real?", "Not the power.", "No human sees the full circle,", "but the limit is real.",
    "In 1999,", "Daniel Simons and Christopher Chabris asked volunteers to count basketball passes.", "About half never noticed a person in a gorilla suit walking through.", "Seeing isn’t noticing.",
    "The dopamine spark is real, too.", "The overload and the spoiled surprises are fiction.", "Your brain uses about a fifth of your body’s energy.", "Thinking harder barely changes that.",
    "Extra vision wouldn’t make you starving,", "or let you predict everything.", "So, could a mind ever watch everything at once?", "That night, your phone buzzes.",
    "Unknown number.", "“We saw what you did at the concert.”", "Then a second message:", "“You’re not the only one.”",
    "So, what would you do with 360-degree vision?", "Tell us the sneakiest prank you’d spot coming in the comments.", "And if you’d look at Mia too,", "hit like",
    "and subscribe for more What Ifs.",
]

# editorial hints (1-based phrase numbers): keep a phrase with the next one / always cut after it
JOIN_AFTER = {14, 46, 59, 195}  # “How… how did you…”, “Mate, you could…”, “Dude… you didn’t…”, “Mia! Up!”
BREAK_AFTER = {6, 47, 55, 61, 189, 243, 253}  # end of a character line / a beat; 243, 253: single-line cues clear the reality-check labels

# hard shot changes in the finished film (isolated cuts from tools/qa_film.py) — cues avoid
# straddling them, and in/out times snap to them when close (subtitle convention)
CUTS = [18.967, 29.133, 47.033, 73.633, 107.167, 219.367, 225.1, 230.433, 237.8, 240.7, 242.5, 244.233, 246.5,
        254.467, 255.567, 258.433, 261.133, 273.233, 285.2, 307.567, 312.033, 313.967, 321.367, 327.433, 331.033,
        335.367, 339.233, 368.167, 374.467, 419.967, 426.567]
ABBREV = {"mr.", "mrs.", "dr."}


def sentence_end(tok):
    return bool(re.search(r"[.!?]”?$", tok)) and tok.lower().strip("“”") not in ABBREV


# formatting the script may apply; mapped back to the spoken words for verification
SPOKEN = {
    "200": "two hundred", "360": "three hundred and sixty", "30": "thirty", "10,000": "ten thousand",
    "412": "four hundred and twelve", "413": "four hundred and thirteen", "15": "fifteen", "4": "four",
    "mr": "mister", "apologises": "apologizes", "grey": "gray", "metres": "meters",
}
# ASR spellings normalised the same way (British/American variants)
ASR_SAME = {"metres": "meters", "apologises": "apologizes", "grey": "gray"}


def norm_letters(text, spoken_map=None):
    """lowercase letters/digits only, after expanding script formatting to spoken words"""
    out = []
    for tok in re.split(r"\s+", text.strip()):
        t = tok.lower().strip("“”\"‘’'.,:;!?…()")
        t = t.replace("’", "'")
        if spoken_map is not None:
            # 360-degree → 360 + degree
            parts = t.split("-")
            parts = [spoken_map.get(p, p) for p in parts]
            t = " ".join(parts)
        else:
            t = ASR_SAME.get(t, t)
        out.append(re.sub(r"[^a-z0-9]", "", t))
    return "".join(out)


def load():
    P = json.load(open(os.path.join(ROOT, "src/data/narration_phrases.json")))["phrases"]
    Wd = json.load(open(os.path.join(ROOT, "src/data/narration_words.json")))["words"]
    return P, Wd


def phrase_words(P, Wd):
    """assign every ASR word to its phrase (by time) — each word exactly once"""
    out = [[] for _ in P]
    for w in Wd:
        # phrase i owns [start_i, start_{i+1}); a word starting exactly on a boundary opens the next phrase
        i = max(k for k, p in enumerate(P) if p["start"] <= w["start"] + 0.02)
        out[i].append(w)
    return out


def verify(P, Wd):
    assert len(SCRIPT) == len(P), (len(SCRIPT), len(P))
    pw = phrase_words(P, Wd)
    assert sum(len(x) for x in pw) == len(Wd), "words not covered exactly once"
    bad = []
    for i, (s, ws) in enumerate(zip(SCRIPT, pw)):
        a = norm_letters(s, SPOKEN)
        b = norm_letters(" ".join(w["word"] for w in ws))
        if a != b:
            bad.append((i + 1, s, " ".join(w["word"] for w in ws)))
    return pw, bad


# --------------------------------------------------------------------------- tokens with times
def tokens(P, pw):
    """script tokens with start/end from the ASR words they cover (mapped by normalised letters)"""
    toks = []
    for i, (s, ws) in enumerate(zip(SCRIPT, pw)):
        # cumulative normalised char spans of ASR words
        spans, c = [], 0
        for w in ws:
            n = len(norm_letters(w["word"]))
            spans.append((c, c + n, w))
            c += n
        c = 0
        words = s.split()
        for j, tok in enumerate(words):
            n = len(norm_letters(tok, SPOKEN))
            a, b = c, c + n
            cover = [w for (x, y, w) in spans if x < b and y > a] or [spans[min(len(spans) - 1, 0)][2]]
            toks.append({"text": tok, "start": cover[0]["start"], "end": cover[-1]["end"], "phrase": i, "last_in_phrase": j == len(words) - 1})
            c = b
    return toks


# --------------------------------------------------------------------------- segmentation
MAXL, MAXDUR, CPS = 42, 5.0, 17.0
WEAK_END = {"a", "an", "the", "of", "to", "in", "on", "at", "for", "and", "or", "but", "with", "your", "his", "her", "my", "you", "i", "so", "if", "by", "from", "as", "that",
            "behind", "toward", "about", "into", "through", "under", "over", "after", "before", "across", "around", "their", "our", "its", "this", "these", "every", "would", "could", "can",
            "you’d", "i’d", "we’d", "they’d", "you’re", "it’s", "there’s", "he", "she", "they", "we", "it", "is", "are", "was", "mr.", "ever"}
NUMWORDS = {"one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "hundred", "thousand"}


def line_split(words):
    """best 1- or 2-line layout; returns (lines, penalty)"""
    s = " ".join(words)
    if len(s) <= MAXL:
        return [s], 0.0
    best = None
    for k in range(1, len(words)):
        l1, l2 = " ".join(words[:k]), " ".join(words[k:])
        if len(l1) > MAXL or len(l2) > MAXL:
            continue
        pen = abs(len(l1) - len(l2)) * 0.02
        if min(len(l1), len(l2)) < 8:
            pen += 2.5  # no stub lines
        if len(l1) > len(l2) + 10:
            pen += 0.3  # mildly prefer bottom-heavy or balanced
        last = words[k - 1]
        if sentence_end(last):
            pen -= 2.0  # one sentence per line
        elif re.search(r"[,:;…]”?$", last):
            pen -= 1.2
        if not re.search(r"[,:;…]”?$", last) and last.lower().strip("“”.") in WEAK_END:
            pen += 3.0
        if words[k].startswith("“"):
            pen -= 1.0  # new speaker starts the second line
        if last.lower().strip("“”,.") in NUMWORDS and words[k].lower() in {"and", "hundred", "thousand", "a"}:
            pen += 5.0  # never split a number
        if words[k].lower() in {"and", "but", "or", "so", "because", "when", "where", "who", "that"}:
            pen -= 0.5
        if best is None or pen < best[1]:
            best = ([l1, l2], pen)
    return best if best else (None, 1e9)


def segment(toks):
    n = len(toks)
    INF = 1e18
    cost = [INF] * (n + 1)
    back = [0] * (n + 1)
    cost[0] = 0
    for j in range(1, n + 1):
        for i in range(max(0, j - 18), j):
            ws = [t["text"] for t in toks[i:j]]
            lines, lpen = line_split(ws)
            if lines is None:
                continue
            dur = toks[j - 1]["end"] - toks[i]["start"]
            if dur > MAXDUR:
                continue
            # no long silence inside a cue
            if any(toks[k + 1]["start"] - toks[k]["end"] > 1.2 for k in range(i, j - 1)):
                continue
            chars = sum(len(w) for w in ws) + len(ws) - 1
            shown = max(dur + 0.35, 0.9)
            c = 1.2 + lpen  # small per-cue cost: cues follow the speech instead of filling two lines
            # text must not sit on screen long before it is spoken: penalise pauses inside a cue
            c += sum(max(0.0, (toks[k + 1]["start"] - toks[k]["end"]) - 0.2) * 8.0 for k in range(i, j - 1))
            # a new sentence shown before it is spoken: cost per sentence boundary + for early display
            for k in range(i, j - 1):
                if sentence_end(toks[k]["text"]):
                    c += 1.0 + max(0.0, toks[k + 1]["start"] - toks[i]["start"] - 1.2) * 2.0
            # a cue must not straddle a hard cut in the middle of its speech
            c += sum(4.0 for t in CUTS if toks[i]["start"] + 0.25 < t < toks[j - 1]["end"] - 0.25)
            # a closing quote ends the cue
            c += sum(1.0 for k in range(i, j - 1) if toks[k]["text"].endswith("”"))
            # any phrase shown long before it is spoken
            c += max(0.0, toks[j - 1]["start"] - toks[i]["start"] - 2.6) * 0.8
            # editorial hints
            c += sum(9.0 for k in range(i, j - 1) if toks[k]["last_in_phrase"] and toks[k]["phrase"] + 1 in BREAK_AFTER)
            if len(lines) == 2:
                c += 0.6
            c += max(0.0, chars / shown - CPS) * 1.5
            last = toks[j - 1]["text"]
            if j < n:
                gap = toks[j]["start"] - toks[j - 1]["end"]
                if toks[j - 1]["last_in_phrase"] and toks[j - 1]["phrase"] + 1 in JOIN_AFTER:
                    c += 9.0
                if sentence_end(last) or last.endswith("…"):
                    c += 0.0
                elif re.search(r"[,:;]”?$", last):
                    c += 1.5
                elif toks[j - 1]["last_in_phrase"]:
                    c += 2.5
                else:
                    c += 7.0
                if last.lower().strip("“”") in WEAK_END:
                    c += 6.0
                if last.endswith("…"):
                    c += 4.0  # “How… | how did you” belongs together
                if gap > 0.4:
                    c -= 1.0  # a real pause is a natural cut
            if dur < 0.45 and len(ws) <= 2 and (j == n or toks[j]["start"] - toks[j - 1]["end"] < 0.25):
                c += 1.5  # avoid flashing one-word cues when they run straight into the next words
            if cost[i] + c < cost[j]:
                cost[j] = cost[i] + c
                back[j] = i
    cues, j = [], n
    while j > 0:
        i = back[j]
        cues.append((i, j))
        j = i
    return cues[::-1]


def timing(toks, segs):
    f = lambda t: round(t * FPS) / FPS  # noqa: E731
    cues = []
    for i, j in segs:
        ws = [t["text"] for t in toks[i:j]]
        lines, _ = line_split(ws)
        t0 = math.floor((toks[i]["start"] - 1 / FPS) * FPS) / FPS
        t1 = math.ceil((toks[j - 1]["end"] + 0.35) * FPS) / FPS
        cues.append({"in": max(0.0, t0), "out": t1, "lines": lines, "speech": (toks[i]["start"], toks[j - 1]["end"])})
    for c in cues:  # snap in/out to a nearby shot change (never cutting speech)
        s0, s1 = c["speech"]
        for t in CUTS:
            if c["in"] - 0.4 <= t <= s0 + 0.03:
                c["in"] = t
            if s1 + 0.1 <= t - 2 / FPS and abs((t - 2 / FPS) - c["out"]) <= 0.45:
                c["out"] = t - 2 / FPS
    for k, c in enumerate(cues):
        nxt = cues[k + 1]["in"] if k + 1 < len(cues) else FILM_END
        c["out"] = max(c["out"], c["in"] + 0.9)  # minimum on-screen time
        if nxt - c["out"] < 0.5:
            c["out"] = nxt - 2 / FPS  # chain: close small gaps to a clean 2-frame cut
        c["out"] = min(c["out"], nxt - 2 / FPS, FILM_END)
        c["in"], c["out"] = f(c["in"]), f(c["out"])
    return cues


def ts_srt(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def ts_ass(t):
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


# --------------------------------------------------------------------------- styled ASS (burn-in)
# per-cue placement overrides, keyed by cue in-time (s): "box" = semi-transparent backing,
# ("pos", y) = raise the block so its bottom sits at y (keeps on-screen info visible)
OVERRIDES = {}
# placement by time range (cue in-time inside the range):
#   top  — story-critical action at the bottom of frame (Mia's reveal ring; Leo's face in the split screen)
#   y    — end card: the film's own call-to-action row and footer sit in the subtitle area, so the
#          block moves up into the clear sky between the headline and the characters
PLACE = [
    ((280.8, 281.0), "top"),
    ((305.3, 305.5), "top"),
    ((384.0, 384.3), 966),  # the film's own gold caption "but the limit is real" sits at y 980
    ((427.3, 440.0), 500),
]
# backing box forced where the text crosses a graphic line (split-screen divider)
BOX_RANGES = [(305.3, 305.5)]


def placement(c):
    for (a, b), how in PLACE:
        if a <= c["in"] < b:
            return how
    return None

ASS_HEAD = """[Script Info]
Title: EXIT CODE - What If You Had 360-Degree Vision? (English)
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: None

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,Montserrat Thin SemiBold,54,&H00FFFFFF,&H00FFFFFF,&H001A1114,&H8C0A0608,0,0,0,0,100,100,0.6,0,1,2.8,1.8,2,200,200,66,1
Style: Box,Montserrat Thin SemiBold,54,&H00FFFFFF,&H00FFFFFF,&H5A140F14,&H00000000,0,0,0,0,100,100,0.6,0,3,11,0,2,200,200,66,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def needs_box(c):
    """semi-transparent backing only where the background behind the text is bright or busy"""
    m = ZONES.get(f"{c['in']:.2f}")
    return bool(m) and (m["mean"] > 68 or m["bright"] > 5.0)


ZONES = {}
_zp = os.path.join(ROOT, "renders/subtitles/zone_metrics.json")
if os.path.exists(_zp):
    ZONES = json.load(open(_zp))


def write_ass(cues, path):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(ASS_HEAD)
        for c in cues:
            ov = OVERRIDES.get(round(c["in"], 2))
            forced = any(a <= c["in"] < b for a, b in BOX_RANGES)
            style = "Box" if forced or ov == "box" or (isinstance(ov, tuple) and "box" in ov) or needs_box(c) else "Main"
            tags = "{\\blur0.9}" if style == "Main" else ""
            mv = 0
            if isinstance(ov, tuple) and ov[0] == "pos":
                mv = 1080 - ov[1]
            pl = placement(c)
            if pl == "top":
                tags += "{\\an8}"
                mv = 72
            elif isinstance(pl, (int, float)):
                mv = int(1080 - pl)
            text = "\\N".join(c["lines"])
            fh.write(f"Dialogue: 0,{ts_ass(c['in'])},{ts_ass(c['out'])},{style},,0,0,{mv},,{tags}{text}\n")


def main():
    P, Wd = load()
    pw, bad = verify(P, Wd)
    if bad:
        for b in bad:
            print("MISMATCH", b)
        sys.exit(1)
    toks = tokens(P, pw)
    cues = timing(toks, segment(toks))
    os.makedirs(os.path.join(ROOT, "subtitles"), exist_ok=True)
    with open(os.path.join(ROOT, "subtitles/EXIT_CODE_360_EN.srt"), "w", encoding="utf-8") as fh:
        for k, c in enumerate(cues, 1):
            fh.write(f"{k}\n{ts_srt(c['in'])} --> {ts_srt(c['out'])}\n" + "\n".join(c["lines"]) + "\n\n")
    write_ass(cues, os.path.join(ROOT, "subtitles/EXIT_CODE_360_EN.ass"))
    os.makedirs(os.path.join(ROOT, "renders/subtitles"), exist_ok=True)
    json.dump(cues, open(os.path.join(ROOT, "renders/subtitles/cues.json"), "w"), indent=1, ensure_ascii=False)
    # stats
    durs = [c["out"] - c["in"] for c in cues]
    cps = [len(" ".join(c["lines"])) / (c["out"] - c["in"]) for c in cues]
    print(json.dumps({"cues": len(cues), "words": len(Wd), "two_line_cues": sum(len(c["lines"]) == 2 for c in cues),
                      "max_line": max(len(l) for c in cues for l in c["lines"]), "min_dur": round(min(durs), 2), "max_dur": round(max(durs), 2),
                      "max_cps": round(max(cps), 1), "cues_over_20cps": sum(x > 20 for x in cps)}, indent=1))


if __name__ == "__main__":
    main()
