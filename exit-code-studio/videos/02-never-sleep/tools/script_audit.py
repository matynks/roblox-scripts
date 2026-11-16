#!/usr/bin/env python3
"""EXIT CODE — script audit for Video #2.

Reads   script/script_v1.json   (the source of truth)
        docs/02_CLAIM_LEDGER.md docs/01_RESEARCH.md docs/04_STORY_LOCK.md
Writes  script/SCRIPT_v1.md          readable script (cues, speakers, claim tags)
        script/VOICEOVER_v1.txt      paste text for ElevenLabs (spoken words only)
        script/VOICEOVER_v1_by_speaker.txt
        script/AUDIT_v1.md / .json   sentence, factual, timeline and speaking-rate audits

Everything reported is computed here — nothing is estimated by hand.
Usage:  python3 tools/script_audit.py [script/script_v1.json]
Exit code 1 if any check fails (warnings don't fail).
"""
import json
import math
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # videos/02-never-sleep
def _latest_script():
    found = sorted((ROOT / "script").glob("script_v*.json"), key=lambda q: int(re.search(r"_v(\d+)$", q.stem).group(1)))
    return found[-1]


SCRIPT = Path(sys.argv[1]) if len(sys.argv) > 1 else _latest_script()
DOCS = ROOT / "docs"
OUT = SCRIPT.parent
VER = json.loads(SCRIPT.read_text())["doc"]["version"]

EST, RES, HYP, SPEC, UNK = ("ESTABLISHED FACT", "RESEARCH-SUPPORTED EVIDENCE",
                            "HYPOTHETICAL ASSUMPTION", "SPECULATIVE SCENARIO", "UNKNOWN")
WEAKEST_FIRST = [SPEC, UNK, HYP, RES, EST]           # the ledger's weakest-input rule
SHORT = {EST: "established", RES: "research", HYP: "hypothetical", SPEC: "speculative",
         UNK: "unknown", "STORY": "story", "FRAME": "frame"}
NON_FACT = {"STORY", "FRAME"}
ROLES = {"HOOK", "PREMISE", "PROMISE", "QUESTION", "FACT", "EVIDENCE", "UNKNOWN", "RULE",
         "STORY", "DIALOGUE", "SETUP", "TRANSITION", "CONSEQUENCE", "THEME", "PAYOFF",
         "CALLBACK", "LESSON", "FINAL"}
SPEAKER = {"N": "NARRATOR", "MIA": "MIA", "LEO": "LEO", "MUM": "MUM"}

# Wording markers (lower-case substrings) ---------------------------------------------
HEDGE = ["studies suggest", "study", "studies", "research suggests", "estimated", "thought to",
         "in another", "don't always", " can ", " may ", " might ", " could ", "suggest", "linked"]
UNCERTAIN = ["nobody", "can't", "cannot", "still", "disagree", "?", "don't understand",
             "find out", "unknown", "no one knows", "not everything", "hasn't settled", "not yet"]
REAL_WORLD = ["today", "already", "even now", "twenty sixteen", "study", "studies", "research", "real world",
              "before this", "science", "estimated"]
IMAGINE = ["imagine", "in this world", "would", "what if", "here,"]
MODAL = [" might ", " could ", " may ", " would "]
SCIENCE_WORDS = ["study", "studies", "research", "scientists", "science"]
EMPHASIS = re.compile(r"\b(just|only|alone|actually|really|even)\b", re.I)
WITHDRAWN = [  # phrases withdrawn by the ledger and the Story Bible guardrails (§9)
    (r"\bswitch(es|ed)? (it|melatonin) off\b", "light switches melatonin off (B08: it suppresses)"),
    (r"\bunconscious\b", "sleep as 'unconscious' (withdrawn v1)"),
    (r"\bsleep hormone\b", "melatonin as 'the sleep hormone'"),
    (r"\bclock\b[^.?!]*\breleases melatonin", "the clock releases melatonin (the pineal gland does)"),
    (r"\btimes (more )?(likely|likelier)\b|\btimes as likely\b|\bfour times more colds\b", "odds ratio said as likelihood (C03)"),
    (r"\bdisappear", "RAND cost 'disappears' (withdrawn v4)"),
    (r"\bfifteen percent\b|\b15 ?%", "15 % lighting figure (withdrawn v3)"),
    (r"\btwenty-five years\b", "'about twenty-five years' (withdrawn v1)"),
    (r"\bevery big city\b", "'every big city tries' (withdrawn v1)"),
    (r"\bbarely looks like night\b", "night side 'barely looks like night' (withdrawn)"),
    (r"\bfrance was first\b|\bfirst country\b", "'France was first' (level S only)"),
    (r"\btiredness\b", "RAND construct is lack of sleep, not tiredness"),
    (r"\bmelatonin is flowing\b", "'melatonin is flowing' with the lights on (withdrawn v1)"),
    (r"\bproves?\b", "'proves' (never for research-supported claims)"),
    (r"\b(550|five hundred and fifty) million\b|\b135 (calories|kcal)\b", "CALC-04 (withdrawn)"),
    (r"\bonly (happen|in) rem\b", "dreams only in REM (A04)"),
    (r"\bsleep cleans the brain\b", "brain cleaning stated as fact (D04)"),
    (r"\breal night\b", "'your body clocks finally get a real night' (withdrawn v4)"),
    (r"\bscientists know (why|everything)\b|\bscience knows (why|everything)\b", "'scientists know why we sleep' (D01 overclaim)"),
]
ID_RE = re.compile(r"^(?:[A-H]\d\d|I01|CALC-\d\d|HR\d|SP-\d\d)$")
CLAIM_IN_TEXT = re.compile(r"\b(?:[A-H]\d\d|I01|CALC-\d\d|HR\d|SP-\d\d)\b")


def words(s):
    toks = s.replace("—", " ").replace("…", " ").replace("–", " ").split()
    return [t.strip(".,!?;:\"'()“”‘’") for t in toks if re.search(r"[A-Za-z0-9]", t)]


MONTHS = {m: i for i, m in enumerate(["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST",
                                        "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"], 1)}
MONTHS.update({k[:3]: v for k, v in list(MONTHS.items())})
WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]


def parse_label(txt):
    """(month, day) and (hour, minute) written in an on-screen label such as '13 SEPTEMBER · 3 A.M.'."""
    dm = re.search(r"\b(\d{1,2}) ([A-Z]{3,9})\b", txt)
    tm = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(A\.M\.|P\.M\.)", txt)
    d = (MONTHS[dm.group(2)], int(dm.group(1))) if dm and dm.group(2) in MONTHS else None
    hm = None
    if tm:
        hm = (int(tm.group(1)) % 12 + (12 if tm.group(3) == "P.M." else 0), int(tm.group(2) or 0))
    return d, hm


def fmt_t(sec, decimals=1):
    m = int(sec // 60)
    s = sec - 60 * m
    return f"{m}:{s:0{3 + decimals}.{decimals}f}" if decimals else f"{m}:{int(round(s)):02d}"


def parse_mmss(s):
    m, ss = s.split(":")
    return int(m) * 60 + float(ss)


def low(s):
    return " " + s.lower() + " "


def has_any(text, markers):
    t = low(text)
    return any(m in t for m in markers)


def _selftest():
    """Known-answer tests for the checker's own rules; the audit refuses to run if one fails."""
    T = []
    T.append(("word count, a.m. and dash", len(words("It's three a.m. — and the playground is full.")) == 8))
    T.append(("word count, hyphen and ellipsis", len(words("Awake twenty-four hours a day… and almost never together.")) == 9))
    T.append(("ellipsis is not a word", len(words("Just… awake.")) == 2))
    for txt, exp in (("Which brings us back to three a.m.", 1), ("How? Nobody knows.", 2), ("Mr. Black's company becomes BLACK 24.", 1)):
        core = re.sub(r"\b(?:a\.m\.|p\.m\.|Mr\.|U\.S\.)", "X", txt)
        n = len(re.findall(r"[.!?](?=\s|$)", core)) + (1 if re.search(r"(?:a\.m\.|p\.m\.)$", txt) else 0)
        T.append((f"sentence count “{txt}” = {exp}", n == exp))
    age = lambda v, w: bool(re.search(rf"\b(at|you're|you are|aged)\s+{w}\b(?!\s*(a\.m|p\.m|o'clock|percent))", v.lower()))
    T.append(("age: 'At eighteen, you join' matches", age("At eighteen, you join Black Twenty-Four too.", "eighteen")))
    T.append(("age: 'starts at eight a.m.' does not", not age("Mia's starts at eight a.m.", "eight")))
    T.append(("age: 'eight extra hours' does not", not age("So what do you do with eight extra hours?", "eight")))
    T.append(("hedge found in 'In one study, …'", has_any("In one study, people …", HEDGE)))
    T.append(("no hedge in 'Earlier deaths.'", not has_any("Earlier deaths.", HEDGE)))
    T.append(("uncertainty found in 'Nobody knows.'", has_any("Nobody knows.", UNCERTAIN)))
    T.append(("withdrawn: 'four times more likely' caught", any(re.search(p, "four times more likely", re.I) for p, _ in WITHDRAWN)))
    T.append(("withdrawn: 'Scientists know why we sleep' caught", any(re.search(p, "Scientists know why we sleep.", re.I) for p, _ in WITHDRAWN)))
    T.append(("withdrawn: '…know a lot about why… but not everything' allowed",
              not any(re.search(p, "Scientists know a lot about why… but not everything.", re.I) for p, _ in WITHDRAWN)))
    T.append(("withdrawn: 'Does sleep really clean the brain?' allowed", not any(re.search(p, "Does sleep really clean the brain?", re.I) for p, _ in WITHDRAWN)))
    T.append(("label '13 SEPTEMBER · 3 A.M.'", parse_label("13 SEPTEMBER · 3 A.M.") == ((9, 13), (3, 0))))
    T.append(("label '14 SEPTEMBER · 3 A.M.'", parse_label("14 SEPTEMBER · 3 A.M.") == ((9, 14), (3, 0))))
    T.append(("label '12 SEPTEMBER · 8 P.M.'", parse_label("12 SEPTEMBER · 8 P.M.") == ((9, 12), (20, 0))))
    T.append(("label '12 MAY · 3:02 A.M.'", parse_label("12 MAY · 3:02 A.M.") == ((5, 12), (3, 2))))
    T.append(("label '4 A.M.' (time only)", parse_label("4 A.M.") == (None, (4, 0))))
    T.append(("label 'TEN YEARS FROM NOW' has no date", parse_label("TEN YEARS FROM NOW") == (None, None)))
    T.append(("uncertainty found in '…but not everything.'", has_any("Scientists know a lot about why… but not everything.", UNCERTAIN)))
    T.append(("real-world marker found in 'Even now, …'", has_any("Even now, over eighty percent of people live under light-polluted skies.", REAL_WORLD)))
    T.append(("no real-world marker in 'Earlier deaths.'", not has_any("Earlier deaths.", REAL_WORLD)))
    bad = [n for n, ok in T if not ok]
    if bad:
        sys.exit("checker self-test failed: " + "; ".join(bad))
    return len(T)


SELFTESTS = _selftest()

# ------------------------------------------------------------------------------------
# 1. Load sources
# ------------------------------------------------------------------------------------
S = json.loads(SCRIPT.read_text())
ledger_txt = (DOCS / "02_CLAIM_LEDGER.md").read_text()
research_txt = (DOCS / "01_RESEARCH.md").read_text()
lock_txt = (DOCS / "04_STORY_LOCK.md").read_text()

LEDGER = {}
for line in ledger_txt.splitlines():
    if not line.startswith("|"):
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if not cells or not ID_RE.match(cells[0]):
        continue
    cid = cells[0]
    row = {"id": cid, "claim": cells[1], "sources": [], "notes": "", "withdrawn": False,
           "not_narrated": False, "row": line}
    if cid.startswith("HR"):
        row["cls"] = HYP
    elif cid.startswith("SP-"):
        row["cls"] = SPEC
        row["withdrawn"] = "withdrawn" in cells[1].lower()
        row["notes"] = " | ".join(cells[2:])
    else:
        row["cls"] = cells[2]
        row["sources"] = re.findall(r"S\d\d", cells[3])
        row["notes"] = " | ".join(cells[3:])
        nl = row["notes"].lower()
        # Narrated status comes from the ledger's chapter column (the last cell), not from free-text notes:
        # notes may describe what is *not* narrated about a claim that is itself narrated (LL-75).
        row["ch"] = cells[-1].strip()
        row["not_narrated"] = row["ch"] in ("—", "-", "")
        row["picture_only"] = "(picture)" in row["ch"]
        row["not_planned"] = "not planned" in nl
    LEDGER[cid] = row
wd = ledger_txt.split("## Withdrawn or not narrated")[1].split("\n## ")[0] if "## Withdrawn or not narrated" in ledger_txt else ""
for cid in re.findall(r"\*\*(CALC-\d\d|SP-\d\d)\*\*", wd):
    LEDGER.setdefault(cid, {"id": cid, "claim": "(withdrawn)", "cls": HYP, "sources": [], "notes": "",
                            "row": "", "not_narrated": True})["withdrawn"] = True

LEVEL = {}
for line in research_txt.splitlines():
    m = re.match(r"^\| (S\d\d) \|.*\| ([AS]) \|\s*$", line)
    if m:
        LEVEL[m.group(1)] = m.group(2)


def method_inputs(cid):
    """Claim IDs named in a calculation's method section (for derived claims with no S-source)."""
    m = re.search(rf"### {re.escape(cid)} method(.*?)(?=\n### |\n## )", ledger_txt, re.S)
    if not m:
        return []
    return sorted(set(CLAIM_IN_TEXT.findall(m.group(1))) - {cid})


def level_a_status(cid, seen=None):
    seen = seen or set()
    row = LEDGER.get(cid)
    if row is None or cid in seen:
        return False, "missing"
    seen.add(cid)
    if row["cls"] in (HYP, SPEC):
        return True, "world rule / scenario — no source needed"
    if row["sources"]:
        levels = {s: LEVEL.get(s, "?") for s in row["sources"]}
        ok = any(v == "A" for v in levels.values())
        return ok, ", ".join(f"{s} ({v})" for s, v in levels.items())
    if "physics" in row["notes"].lower():
        return True, "physics — no source needed"
    ins = method_inputs(cid)
    if ins:
        res = [(i, level_a_status(i, seen)) for i in ins]
        ok = all(r[1][0] for r in res)
        return ok, "derived from " + ", ".join(i for i, _ in res)
    return row["cls"] == UNK, "no source listed"


# Story Lock fact bank ----------------------------------------------------------------
fb_line = next((l for l in lock_txt.splitlines() if l.startswith("| **FACT BANK**")), "")
FACT_BANK = set(CLAIM_IN_TEXT.findall(fb_line))
for a, b, c in re.findall(r"\b([A-H])(\d\d)[–-]\1(\d\d)\b", fb_line):
    FACT_BANK |= {f"{a}{i:02d}" for i in range(int(b), int(c) + 1)}
for b, c in re.findall(r"\bHR(\d)[–-]HR(\d)\b", fb_line):
    FACT_BANK |= {f"HR{i}" for i in range(int(b), int(c) + 1)}
for b, c in re.findall(r"\bSP-(\d\d)[–-]SP-(\d\d)\b", fb_line):
    FACT_BANK |= {f"SP-{i:02d}" for i in range(int(b), int(c) + 1)}

# ------------------------------------------------------------------------------------
# 2. Flatten the script: beats with timestamps, sentences
# ------------------------------------------------------------------------------------
SUBS = S["tts_substitutions"]


def to_vo(text):
    for a, b in SUBS:
        text = text.replace(a, b)
    return text


errors, warnings = [], []
beats, sents = [], []
t = 0.0
for ch in S["chapters"]:
    ch["start"] = t
    for b in ch["beats"]:
        b["ch"] = ch["n"]
        b["start"], b["end"] = t, t + b["dur"]
        b["emotional"] = bool(b.get("emotional"))
        t += b["dur"]
        b["words"] = 0
        for i, ln in enumerate(b["lines"]):
            vo = to_vo(ln["text"])
            w = words(vo)
            s = {"n": len(sents) + 1, "beat": b["id"], "ch": ch["n"], "who": ln["who"], "text": ln["text"],
                 "vo": vo, "w": len(w), "claims": ln.get("claims", []), "role": ln.get("role", ""),
                 "frame": b["frame"], "idx": i, "timing": ln.get("timing", ""), "review": ln.get("review", "")}
            b["words"] += len(w)
            sents.append(s)
        beats.append(b)
    ch["end"] = t
    ch["words"] = sum(b["words"] for b in ch["beats"])
TOTAL = t
by_beat = defaultdict(list)
for s in sents:
    by_beat[s["beat"]].append(s)

# ------------------------------------------------------------------------------------
# 3. Sentence-level checks
# ------------------------------------------------------------------------------------
ABBR = re.compile(r"\b(?:a\.m\.|p\.m\.|Mr\.|U\.S\.)")
for s in sents:
    core = ABBR.sub("X", s["text"])
    ends = re.findall(r"[.!?](?=\s|$)", core)
    if re.search(r"(?:a\.m\.|p\.m\.)$", s["text"].strip()):
        ends.append(".")                      # the abbreviation's full stop ends the sentence
    if len(ends) != 1:
        errors.append(f"{s['beat']} sentence {s['n']}: not exactly one sentence → “{s['text']}”")
    if not s["claims"]:
        errors.append(f"{s['beat']} sentence {s['n']}: no claim tag")
    if s["role"] not in ROLES:
        errors.append(f"{s['beat']} sentence {s['n']}: missing/unknown role '{s['role']}'")
    if s["who"] not in SPEAKER:
        errors.append(f"{s['beat']} sentence {s['n']}: unknown speaker {s['who']}")
    if re.search(r"\d", s["vo"]) or "%" in s["vo"] or "$" in s["vo"]:
        errors.append(f"{s['beat']} sentence {s['n']}: digits or symbols in the paste text → “{s['vo']}”")
    caps = [w for w in re.findall(r"\b[A-Z]{2,}\b", s["vo"]) if w not in {"REM"}]
    if caps:
        errors.append(f"{s['beat']} sentence {s['n']}: capitalised word(s) the voice may spell out: {caps}")
    for pat, why in WITHDRAWN:
        if re.search(pat, s["vo"], re.I):
            errors.append(f"{s['beat']} sentence {s['n']}: withdrawn wording — {why} → “{s['text']}”")

# ------------------------------------------------------------------------------------
# 4. Factual audit: classes, wording by class, sources
# ------------------------------------------------------------------------------------
for s in sents:
    fact_ids = [c for c in s["claims"] if c not in NON_FACT]
    for c in s["claims"]:
        if c in NON_FACT:
            continue
        row = LEDGER.get(c)
        if row is None:
            errors.append(f"{s['beat']} sentence {s['n']}: claim {c} not in the ledger")
            continue
        if row.get("withdrawn"):
            errors.append(f"{s['beat']} sentence {s['n']}: claim {c} is withdrawn")
        if row.get("not_narrated"):
            errors.append(f"{s['beat']} sentence {s['n']}: claim {c} is marked not narrated in the ledger")
        if row.get("picture_only"):
            errors.append(f"{s['beat']} sentence {s['n']}: claim {c} is picture-only in the ledger")
        if row.get("not_planned"):
            warnings.append(f"{s['beat']} sentence {s['n']}: claim {c} is marked 'not planned' — review")
    known = [c for c in fact_ids if c in LEDGER]
    if known:
        s["cls"] = min((LEDGER[c]["cls"] for c in known), key=WEAKEST_FIRST.index)
    else:
        s["cls"] = "STORY" if "STORY" in s["claims"] else "FRAME"
    s["checks"] = []


def neighbours_share(s, markers):
    """True if s sits in an unbroken run of sentences (same beat) sharing one of its claim IDs,
    and some sentence in that run carries the marker."""
    group = by_beat[s["beat"]]
    for cid in set(s["claims"]) - NON_FACT:
        lo = hi = s["idx"]
        while lo - 1 >= 0 and cid in group[lo - 1]["claims"]:
            lo -= 1
        while hi + 1 < len(group) and cid in group[hi + 1]["claims"]:
            hi += 1
        if any(has_any(group[i]["vo"], markers) for i in range(lo, hi + 1) if i != s["idx"]):
            return True
    return False


for s in sents:
    c, v, ok = s["cls"], s["vo"], True
    if c == RES:
        if has_any(v, HEDGE):
            s["checks"].append("evidence signalled")
        elif neighbours_share(s, HEDGE):
            s["checks"].append("continues a signalled sentence")
        else:
            ok = False
            errors.append(f"{s['beat']} sentence {s['n']}: research-supported claim without an evidence signal → “{s['text']}”")
    if c == UNK:
        if has_any(v, UNCERTAIN):
            s["checks"].append("uncertainty stated")
        else:
            ok = False
            errors.append(f"{s['beat']} sentence {s['n']}: UNKNOWN claim stated without uncertainty → “{s['text']}”")
    if c == HYP:
        if has_any(v, SCIENCE_WORDS) and not any(LEDGER.get(x, {}).get("cls") in (UNK, RES) for x in s["claims"]):
            ok = False
            errors.append(f"{s['beat']} sentence {s['n']}: world rule attributed to science → “{s['text']}”")
        if s["frame"] == "real" and not has_any(v, IMAGINE):
            ok = False
            errors.append(f"{s['beat']} sentence {s['n']}: world rule inside a real-world beat → “{s['text']}”")
        if ok:
            s["checks"].append("framed as the premise" if s["frame"] in ("rules", "imagined") else "framed")
    if c == SPEC:
        if s["frame"] == "imagined" or has_any(v, MODAL):
            s["checks"].append("inside the imagined frame" if s["frame"] == "imagined" else "modal verb")
        else:
            ok = False
            errors.append(f"{s['beat']} sentence {s['n']}: speculation outside the imagined frame → “{s['text']}”")
    if c in (EST, RES) and s["frame"] == "imagined":
        if has_any(v, REAL_WORLD) or neighbours_share(s, REAL_WORLD):
            s["checks"].append("real-world marker inside the story")
        else:
            ok = False
            errors.append(f"{s['beat']} sentence {s['n']}: real fact inside the story with no real-world marker → “{s['text']}”")
    if c in (EST, RES) and s["frame"] in ("real", "rules"):
        s["checks"].append("stated in a real-world beat")
    if c in (EST, RES):
        emph = EMPHASIS.findall(re.sub(r"\beven (today|now)\b", "", v, flags=re.I))
        if emph and s.get("review"):
            s["checks"].append(f"emphasis '{', '.join(emph)}' reviewed: {s['review']}")
        elif emph:
            warnings.append(f"{s['beat']} sentence {s['n']}: emphasis word(s) {emph} in a factual sentence — review → “{s['text']}”")
    if c == "STORY" and s["frame"] == "real" and s["who"] == "N":
        errors.append(f"{s['beat']} sentence {s['n']}: narrated story line inside a real-world beat")
    if c in NON_FACT and re.search(r"\b(percent|study|studies|research|billion|million)\b", v, re.I):
        errors.append(f"{s['beat']} sentence {s['n']}: tagged {c} but contains factual-looking content")
    for x in s["claims"]:
        if x in LEDGER and LEDGER[x]["cls"] in (EST, RES):
            okA, desc = level_a_status(x)
            if not okA:
                errors.append(f"{s['beat']} sentence {s['n']}: {x} has no level-A source ({desc})")
    s["ok"] = ok

# On-screen claims and typography
ONSCREEN = []
for b in beats:
    for o in b.get("onscreen", []):
        ONSCREEN.append((b, o))
        for c in o.get("claims", []):
            if c not in NON_FACT and c not in LEDGER:
                errors.append(f"{b['id']} on-screen “{o['text']}”: claim {c} not in the ledger")
            if c in LEDGER and LEDGER[c].get("withdrawn"):
                errors.append(f"{b['id']} on-screen “{o['text']}”: claim {c} is withdrawn")
        if o["kind"] in ("label", "tag", "card", "source", "speech bubble"):
            core = re.sub(r"\([^)]*\)", "", o["text"])
            n = len([w for w in re.split(r"[\s·/→+—]+", core) if re.search(r"[A-Za-z]", w)])
            o["nwords"] = n
            if n > S["limits"]["label_max_words"]:
                errors.append(f"{b['id']} on-screen {o['kind']} has {n} words (max {S['limits']['label_max_words']}): “{o['text']}”")

used_spoken = {c for s in sents for c in s["claims"] if c not in NON_FACT}
used_screen = {c for _, o in ONSCREEN for c in o.get("claims", []) if c not in NON_FACT}
fb_not_used = sorted((FACT_BANK - used_spoken) - {c for c in FACT_BANK if LEDGER.get(c, {}).get("withdrawn")},
                     key=lambda x: (x[:2], x))
notes = S.get("fact_bank_notes", {})
for c in fb_not_used:
    if c in used_screen:
        continue
    if c not in notes:
        errors.append(f"Story Lock fact bank lists {c}, but the script never uses it and gives no reason")
new_ids = sorted(used_spoken - FACT_BANK)

# ------------------------------------------------------------------------------------
# 5. Speaking-rate audit
# ------------------------------------------------------------------------------------
L = S["limits"]
SPK = S["voice"]["speaking_wpm"]
FPS = S["voice"]["fps"]


def est_speech(text_vo):
    w = len(words(text_vo))
    return w * 60.0 / SPK + 0.25 * text_vo.count("—") + 0.35 * text_vo.count("…")


for b in beats:
    b["wpm"] = b["words"] / b["dur"] * 60 if b["dur"] else 0
    b["limit"] = L["emotional_wpm"] if b["emotional"] else L["beat_wpm"]
    lead = 0.2 if b["id"] == "1.1" else (1.5 if b["id"] == "8.9" else 0.0)
    b["speech_s"] = sum(est_speech(s["vo"]) for s in by_beat[b["id"]]) + (0.3 * max(0, len(by_beat[b["id"]]) - 1))
    b["slack"] = b["dur"] - lead - b["speech_s"]
    b["rate_ok"] = b["wpm"] <= b["limit"] + 1e-9
    if not b["rate_ok"]:
        errors.append(f"beat {b['id']}: {b['words']} words in {b['dur']} s = {b['wpm']:.0f} wpm (limit {b['limit']})")
    if b["words"] and b["slack"] < 0:
        warnings.append(f"beat {b['id']}: estimated speech {b['speech_s']:.1f} s + lead {lead} s exceeds the beat ({b['dur']} s)")

CH_ROWS = []
for ch in S["chapters"]:
    w0, w1 = (parse_mmss(x) for x in ch["window"])
    win = w1 - w0
    dur = ch["end"] - ch["start"]
    d = (dur - win) / win * 100
    ok = abs(d) <= L["chapter_tolerance_pct"] + 1e-9
    if not ok:
        errors.append(f"chapter {ch['n']}: {dur:.1f} s vs window {win:.0f} s ({d:+.1f} %) — outside ±{L['chapter_tolerance_pct']} %")
    elif abs(d) > L["chapter_tolerance_pct"] - 2:
        warnings.append(f"chapter {ch['n']}: {d:+.1f} % — within 2 points of the ±{L['chapter_tolerance_pct']} % limit")
    CH_ROWS.append({"n": ch["n"], "title": ch["title"], "window": f"{ch['window'][0]}–{ch['window'][1]}",
                    "win": win, "start": ch["start"], "end": ch["end"], "dur": dur, "delta": d,
                    "words": ch["words"], "wpm": ch["words"] / dur * 60, "ok": ok})

# Opening sync (production requirement 3)
b11 = beats[0]
line1 = by_beat["1.1"][0]
line_end = 0.2 + est_speech(line1["vo"])
cut_min = line_end + 4 / FPS
OPENING = {"vo_start": 0.2, "est_line_end": line_end, "earliest_cut": cut_min, "planned_cut": b11["dur"],
           "ok": b11["dur"] >= cut_min, "thumb_at": b11["dur"]}
if not OPENING["ok"]:
    errors.append(f"opening sync: planned cut {b11['dur']} s is before the line can end (≈ {cut_min:.2f} s)")
if OPENING["thumb_at"] > 3.5:      # Standard v1.4 §6: first cut after the opening line, target ≤ 3.5 s
    warnings.append(f"first three seconds: thumbnail shot at {OPENING['thumb_at']:.1f} s — later than the 3.5 s target (Standard v1.4 §6)")

# ------------------------------------------------------------------------------------
# 6. Sentence metrics
# ------------------------------------------------------------------------------------
YOU = {"you", "your", "you're", "yours", "yourself", "you'll", "you've"}


def metrics(ss):
    n = len(ss)
    w = sum(x["w"] for x in ss)
    toks = [t.lower() for x in ss for t in words(x["vo"])]
    return {"sentences": n, "words": w, "avg": w / n if n else 0,
            "short_pct": 100 * sum(1 for x in ss if x["w"] <= 4) / n if n else 0,
            "questions": sum(1 for x in ss if x["text"].rstrip().endswith("?")),
            "ellipses": sum(x["vo"].count("…") for x in ss),
            "you_per100": 100 * sum(1 for t in toks if t in YOU) / w if w else 0}


M_ALL = metrics(sents)
M_NARR = metrics([s for s in sents if s["who"] == "N"])
M_CH = {ch["n"]: metrics([s for s in sents if s["ch"] == ch["n"]]) for ch in S["chapters"]}
TARGETS = [("Average words per sentence", "avg", "4–5 (flag above 5.5)", lambda v: v <= 5.5, "{:.2f}"),
           ("Sentences of 4 words or fewer", "short_pct", "45–55 %", lambda v: 45 <= v <= 55, "{:.1f} %"),
           ("Questions", "questions", "~14–20", lambda v: 14 <= v <= 20, "{:.0f}"),
           ("Ellipses (pause cues)", "ellipses", "~12–24", lambda v: 12 <= v <= 24, "{:.0f}"),
           ("you / your per 100 words", "you_per100", "~5–8 (documentary chapters lower)", lambda v: 5 <= v <= 8, "{:.1f}")]
for name, key, tgt, fn, f in TARGETS:
    if not fn(M_ALL[key]):
        warnings.append(f"script metric: {name} = {f.format(M_ALL[key])} (target {tgt})")

long_sents = [s for s in sents if s["w"] > L["long_sentence_words"]]
for s in long_sents:
    warnings.append(f"{s['beat']} sentence {s['n']}: {s['w']} words — check breath and delivery → “{s['text']}”")

# Repetition: openers and 4-grams
openers = Counter(words(s["vo"])[0].lower() for s in sents if words(s["vo"]))
runs = []
prev, run = None, []
for s in sents:
    fw = words(s["vo"])[0].lower() if words(s["vo"]) else ""
    if fw == prev:
        run.append(s)
    else:
        if len(run) >= 3:
            runs.append(run)
        run = [s]
    prev = fw
if len(run) >= 3:
    runs.append(run)
grams = defaultdict(list)
for s in sents:
    tk = [x.lower() for x in words(s["vo"])]
    for i in range(len(tk) - 3):
        grams[" ".join(tk[i:i + 4])].append(s["n"])
cb = [c.lower() for c in S.get("callbacks", [])]
REPEATS = []
for g, where in grams.items():
    if len(set(where)) > 1:
        deliberate = any(c in g or g in c for c in cb) or any(len(set(c.split()) & set(g.split())) >= 2 for c in cb)
        REPEATS.append((g, sorted(set(where)), deliberate))
        if not deliberate:
            warnings.append(f"repeated phrase “{g}” in sentences {sorted(set(where))} — not a declared callback")

# Near repeats (v2, LL-75): the same content word in the same or the next beat.
# The four-word check above missed 'billions' twice in six seconds; this list is for review, not a pass/fail rule.
NEAR_STOP = {"through", "anyone", "nobody", "really", "before", "people", "anymore", "everyone", "something", "because",
             "there's", "that's", "you're", "doesn't", "don't", "can't", "isn't", "hasn't", "they're", "night", "nights",
             "asleep", "awake", "sleep", "hours", "dreams", "tired", "clock", "clocks", "hourglass", "twenty-four"}
cb_words = {w for c in S.get("callbacks", []) for w in c.lower().split()}


def content_words(v):
    out = set()
    for w in words(v):
        w = w.lower().replace("’", "'")
        w = w[:-2] if w.endswith("'s") else w
        if len(w) >= 6 and w not in NEAR_STOP and w not in cb_words:
            out.add(w)
    return out


NEAR = []
for i, b in enumerate(beats):
    window = by_beat[b["id"]] + (by_beat[beats[i + 1]["id"]] if i + 1 < len(beats) else [])
    for x in range(len(window)):
        for y in range(x + 1, len(window)):
            sx, sy = window[x], window[y]
            if sx["beat"] != b["id"]:
                continue
            for w in sorted(content_words(sx["vo"]) & content_words(sy["vo"])):
                key = (w, sx["n"], sy["n"])
                if key not in [(k[0], k[1], k[2]) for k in NEAR]:
                    NEAR.append(key)

# ------------------------------------------------------------------------------------
# 7. Timeline audit
# ------------------------------------------------------------------------------------
TL = S["timeline"]
REQ = S["requirements"]


def solar_elevation(lat, lon, dt_utc):
    """NOAA solar position algorithm (degrees above the horizon)."""
    jd = (dt_utc - datetime(2000, 1, 1, 12)).total_seconds() / 86400 + 2451545.0
    jc = (jd - 2451545.0) / 36525
    L0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360
    Mn = 357.52911 + jc * (35999.05029 - 0.0001537 * jc)
    e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc)
    C = (math.sin(math.radians(Mn)) * (1.914602 - jc * (0.004817 + 0.000014 * jc))
         + math.sin(math.radians(2 * Mn)) * (0.019993 - 0.000101 * jc) + math.sin(math.radians(3 * Mn)) * 0.000289)
    om = 125.04 - 1934.136 * jc
    app = L0 + C - 0.00569 - 0.00478 * math.sin(math.radians(om))
    obl = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60 + 0.00256 * math.cos(math.radians(om))
    dec = math.degrees(math.asin(math.sin(math.radians(obl)) * math.sin(math.radians(app))))
    y = math.tan(math.radians(obl / 2)) ** 2
    eot = 4 * math.degrees(y * math.sin(2 * math.radians(L0)) - 2 * e * math.sin(math.radians(Mn))
                           + 4 * e * y * math.sin(math.radians(Mn)) * math.cos(2 * math.radians(L0))
                           - 0.5 * y * y * math.sin(4 * math.radians(L0)) - 1.25 * e * e * math.sin(2 * math.radians(Mn)))
    mins = dt_utc.hour * 60 + dt_utc.minute + dt_utc.second / 60
    ha = ((mins + eot + 4 * lon) % 1440) / 4 - 180
    cz = (math.sin(math.radians(lat)) * math.sin(math.radians(dec))
          + math.cos(math.radians(lat)) * math.cos(math.radians(dec)) * math.cos(math.radians(ha)))
    return 90 - math.degrees(math.acos(max(-1.0, min(1.0, cz))))


def morning(site, d):
    out = {}
    for name, thr in (("astronomical dawn", -18), ("nautical dawn", -12), ("civil dawn", -6), ("sunrise", -0.833)):
        for m in range(0, 12 * 60):
            loc = datetime(d.year, d.month, d.day) + timedelta(minutes=m)
            if solar_elevation(site["lat"], site["lon"], loc - timedelta(hours=site["utc_offset_h"])) >= thr:
                out[name] = loc.strftime("%H:%M")
                break
    return out


def elev_at(site, dt_local):
    return solar_elevation(site["lat"], site["lon"], dt_local - timedelta(hours=site["utc_offset_h"]))


_ls_start = TL.get("last_sleep", {}).get("start", "Y0-09-12 22:30")
_lsm = re.match(r"Y0-(\d\d)-(\d\d)", _ls_start)
LS_MD = (int(_lsm.group(1)), int(_lsm.group(2)))
years = [y for y in range(2026, 2061) if date(y, *LS_MD).weekday() == 0]   # the last sleep is a Monday night
REF = years[1] if len(years) > 1 else years[0]          # a representative future year


def add_years(dt, n):
    """Same calendar date and time n years on (29 February falls back to the 28th)."""
    try:
        return dt.replace(year=dt.year + n)
    except ValueError:
        return dt.replace(year=dt.year + n, day=28)


def span(a, b):
    """Elapsed time from a to b as whole calendar years + days + hours + minutes (computed, not estimated)."""
    sign = ""
    if b < a:
        a, b, sign = b, a, "−"
    yrs = 0
    while add_years(a, yrs + 1) <= b:
        yrs += 1
    rest = b - add_years(a, yrs)
    d, h, mi = rest.days, rest.seconds // 3600, rest.seconds % 3600 // 60
    parts = ([f"{yrs} years"] if yrs else []) + ([f"{d} day{'s' if d != 1 else ''}"] if d else []) + \
            ([f"{h} h"] if h else []) + ([f"{mi} min"] if mi else [])
    return sign + (" + ".join(parts) or "0"), yrs


_T2 = [  # known answers for the date arithmetic (v3)
    ("span 13 Sep 2033 07:00 → 14 Sep 2043 03:00 = 10 years + 20 h",
     span(datetime(2033, 9, 13, 7), datetime(2043, 9, 14, 3))[0] == "10 years + 20 h"),
    ("span 13 Sep 2033 07:00 → 13 Sep 2043 03:00 is only 9 whole years (the v2 hook)",
     span(datetime(2033, 9, 13, 7), datetime(2043, 9, 13, 3))[1] == 9),
    ("add_years 13 Sep 2033 22:00 + 10 = 13 Sep 2043 22:00", add_years(datetime(2033, 9, 13, 22), 10) == datetime(2043, 9, 13, 22)),
    ("add_years 29 Feb 2036 + 1 = 28 Feb 2037", add_years(datetime(2036, 2, 29), 1) == datetime(2037, 2, 28)),
]
if [n for n, ok in _T2 if not ok]:
    sys.exit("checker self-test failed: " + "; ".join(n for n, ok in _T2 if not ok))
SELFTESTS += len(_T2)


def resolve(when, y0):
    m = re.match(r"Y(\d+)-(\d\d)-(\d\d) (\d\d):(\d\d)", when)
    if not m:
        return None
    yy = y0 + int(m.group(1))
    return datetime(yy, int(m.group(2)), int(m.group(3)), int(m.group(4)), int(m.group(5)))


TL_CHECKS = []


def tl(name, ok, detail):
    TL_CHECKS.append((name, ok, detail))
    if not ok:
        errors.append(f"timeline: {name} — {detail}")


ev = {e["id"]: e for e in TL["events"]}
year_rows = []
for y0 in years:
    E = {k: resolve(v["when"], y0) for k, v in ev.items()}
    ls_a, ls_b = resolve(TL["last_sleep"]["start"], y0), resolve(TL["last_sleep"]["end"], y0)
    row = {"Y0": y0, "Y10": y0 + 10,
           "last sleep": f"{ls_a:%a %d} → {ls_b:%a %d %b}",
           "moment zero": f"{resolve(TL['moment_zero']['when'], y0):%a %d %b, %H:%M}",
           "hook": f"{E['T09']:%a %d %b, %H:%M}", "train": f"{E['T13']:%a %d %b}", "term": f"{E['T14']:%a %d %b}",
           "may": f"{E['T07']:%a %d %b}"}
    year_rows.append(row)
    order = ["T01", "T02", "T03", "T04", "T05", "T06"]
    order10 = [k for k in ("T07", "T07b", "T08", "T09", "T10", "T11", "T12", "T13", "T14") if k in E]
    seq_ok = all(E[a] < E[b] for a, b in zip(order, order[1:])) and all(E[a] < E[b] for a, b in zip(order10, order10[1:]))
    if y0 == years[0]:
        tl("The last sleep is a Monday night in September", ls_a.weekday() == 0 and ls_b.weekday() == 1,
           f"{ls_a:%A %d %B} {ls_a:%H:%M} → {ls_b:%A %d %B} {ls_b:%H:%M} in every reference year ({', '.join(map(str, years))})")
        tl("Day 1 is the Tuesday", E["T02"].weekday() == 1, f"{E['T02']:%d %B} {y0} is a {E['T02']:%A}")
        tl("Events run in order (Year 0 and Year 10)", seq_ok, " → ".join(order + order10))
        gap = E["T13"] - E["T09"]
        tl("Train leaves after the 03:00 scene, same morning", timedelta(0) < gap <= timedelta(hours=6) and E["T13"].date() == E["T09"].date(),
           f"train {E['T13']:%d %b, %H:%M} is {gap.seconds // 3600} h after the {E['T09']:%H:%M} scene — 'My train's at seven'")
        tl("Back from the hill before the train", E["T12"] + timedelta(hours=1) <= E["T13"],
           "leave the hill ≈ 05:00, about an hour's drive, train 07:00")
        tl("Programme starts the day after she travels", (E["T14"].date() - E["T13"].date()).days == 1,
           f"train {E['T13']:%d %b}, term starts {E['T14']:%d %b}")
        tl(f"'She leaves tomorrow' (packing on {E['T08']:%d %B})", (E["T13"].date() - E["T08"].date()).days == 1,
           f"packing {E['T08']:%d %b} evening → train {E['T13']:%d %b}")
        months = (E["T08"].year - E["T07"].year) * 12 + E["T08"].month - E["T07"].month
        tl("May message is months earlier, not the same night", months == 4 and E["T07"].date() != E["T09"].date(),
           f"{E['T07']:%d %B} → {E['T08']:%d %B} = {months} months before she leaves")
    elif not seq_ok:
        tl(f"Event order in reference year {y0}", False, "out of order")

# Moment zero arithmetic (v3): every 'ten years' in the script computed as elapsed time, not just checked on a calendar
MZ_ROWS = []
_story = {b["id"]: b.get("story_time") for b in beats}
for y0 in years:
    mz = resolve(TL["moment_zero"]["when"], y0)
    ls_start, ls_end = resolve(TL["last_sleep"]["start"], y0), resolve(TL["last_sleep"]["end"], y0)
    hook = resolve(ev["T09"]["when"], y0)
    mz10 = add_years(mz, 10)
    MZ_ROWS.append({"y0": y0, "mz": mz, "mz10": mz10, "days": (mz10 - mz).days, "hook": hook,
                    "hook_after_mz10": hook - mz10, "since_sleep": span(ls_end, hook), "back10": add_years(hook, -10)})
    if y0 != years[0]:
        continue
    tl("Moment zero = the beat that shows it (3.2, 'That night, nobody gets tired')", resolve(_story["3.2"], y0) == mz,
       f"{TL['moment_zero']['definition']}: {mz:%A %d %B, %H:%M}, Year 0")
    tl("The last sleep ends before moment zero", ls_end < mz, f"last sleep {ls_start:%a %H:%M} → {ls_end:%a %H:%M}; moment zero {mz:%a %H:%M}")
    off = hook - mz10
    tl("The hook falls in the night that begins exactly ten years after moment zero",
       timedelta(0) <= off < timedelta(hours=12),
       f"moment zero + 10 years = {mz10:%d %B, %H:%M} ({(mz10 - mz).days:,} days in this reference year); "
       f"hook {hook:%d %B, %H:%M} = moment zero + 10 years + {off.seconds // 3600} h")
    since, yrs = MZ_ROWS[-1]["since_sleep"]
    tl("'Nobody here has slept… in ten years' (1.3) is literally true at the hook", hook >= add_years(ls_end, 10),
       f"end of the last sleep {ls_end:%d %b} Year 0, {ls_end:%H:%M} → hook = {since}")
    b10 = add_years(hook, -10)
    tl("Ten years before the hook falls inside the first sleepless night", mz <= b10 < resolve(ev["T06"]["when"], y0),
       f"hook − 10 years = {b10:%a %d %B, %H:%M}, Year 0 — between moment zero and the sunrise beat")
    s21, y21 = span(resolve(_story["2.1"], y0), hook)
    tl("'TEN YEARS EARLIER' (1.7) jumps back ten whole years", y21 == 10, f"hook → 2.1 (Monday night) = {s21}")
    s14, y14 = span(ls_start, hook)
    tl("'TEN YEARS FROM NOW' (1.3), counted from 'Tonight… sleep' (1.4)", y14 == 10, f"start of the last sleep → hook = {s14}")
    ch7 = [b for b in beats if b["ch"] == 7 and re.match(r"Y\d+-\d\d-\d\d \d\d:\d\d$", b.get("story_time") or "")]
    yrs7 = {b["id"]: (resolve(b["story_time"], y0) - mz).days / 365.2425 for b in ch7}
    tl("'Imagine it's ten years on' (7.1): every dated chapter 7 scene is ten years on, rounded",
       all(9.5 <= v < 10.5 for v in yrs7.values()), "; ".join(f"{k} {v:.2f} years after moment zero" for k, v in yrs7.items()))

ages = REQ["dates"]["ages"]
for who, a in ages.items():
    ok = all(a[f"Y{k}"] - a["Y0"] == k for k in (1, 3, 10) if f"Y{k}" in a)
    tl(f"{who}'s ages follow the years", ok, " → ".join(f"Y{k[1:]}: {v}" for k, v in a.items()))
tl("Age gap Leo–Mia is constant", len({ages["Leo"][k] - ages["Mia"][k] for k in ages["Leo"]}) == 1,
   f"{ages['Leo']['Y0'] - ages['Mia']['Y0']} years")


def beat_year(b):
    st = b.get("story_time") or ""
    m = re.match(r"Y(\d+)", st)
    return int(m.group(1)) if m else None


AGE_WORDS = {"eight": 8, "eleven": 11, "fifteen": 15, "eighteen": 18, "twenty-five": 25}
for b in beats:
    y = beat_year(b)
    if y is None or "–" in (b.get("story_time") or "").split(" ")[0]:
        continue
    for who, age in re.findall(r"\b(Leo|Mia)(?:'s)?\s*\((\d{1,2})\)", b["picture"]) + re.findall(r"\b(Leo|Mia), (\d{1,2})\b", b["picture"]):
        exp = ages[who].get(f"Y{y}")
        if exp is not None:
            tl(f"{b['id']} picture: {who} ({age}) in Year {y}", int(age) == exp, f"expected {exp}")
    for s in by_beat[b["id"]]:
        for wd_, n in AGE_WORDS.items():
            if s["who"] == "N" and re.search(rf"\b(at|you're|you are|aged)\s+{wd_}\b(?!\s*(a\.m|p\.m|o'clock|percent))", s["vo"].lower()):
                exp = ages["Leo"].get(f"Y{y}")
                if exp is not None:
                    tl(f"{b['id']} narration: '{wd_}' (Leo) in Year {y}", n == exp, f"expected {exp}")

# Diegetic dates and times on screen vs the story time of their beat
MON = {"MAY": 5, "SEP": 9, "SEPTEMBER": 9}
for b, o in ONSCREEN:
    if o["kind"] != "diegetic" or not b.get("story_time"):
        continue
    st = resolve(b["story_time"], REF) if re.match(r"Y\d+-\d\d-\d\d", b["story_time"]) else None
    txt = o["text"]
    tm = re.search(r"\b(\d{1,2}):(\d{2})\b", txt)
    dm = re.search(r"\b(\d{1,2}) (MAY|SEP|SEPTEMBER)\b", txt)
    if "clock" in txt and tm and len(re.findall(r"\d{1,2}:\d{2}", txt)) == 1:
        hh, mm = int(tm.group(1)), int(tm.group(2))
        st_t = re.search(r"(\d\d):(\d\d)", b["story_time"])
        if st_t:
            sh, sm = int(st_t.group(1)), int(st_t.group(2))
            tl(f"{b['id']} on-screen clock {hh}:{mm:02d}", (hh % 12, mm) == (sh % 12, sm), f"story time {b['story_time']}")
    if "calendar" in txt and dm and st:
        tl(f"{b['id']} wall calendar {dm.group(0)}", (st.month, st.day) == (MON[dm.group(2)], int(dm.group(1))), f"story time {b['story_time']}")
    if dm and tm and "clock" not in txt:
        when = (MON[dm.group(2)], int(dm.group(1)), int(tm.group(1)), int(tm.group(2)))
        match = [e["id"] for e in TL["events"] if (lambda d: d and (d.month, d.day, d.hour, d.minute) == when)(resolve(e["when"], REF))]
        if st and (st.month, st.day, st.hour, st.minute) == when:
            tl(f"{b['id']} on-screen {dm.group(0)} · {tm.group(0)}", True, f"= this beat's story time ({b['story_time']})")
        else:
            tl(f"{b['id']} on-screen {dm.group(0)} · {tm.group(0)}", bool(match), f"matches timeline event {', '.join(match) or '—'}"
               + (f"; beat is {b['story_time']}" if st else ""))
            if match and st:
                dd = (resolve(ev[match[0]]["when"], REF).date() - st.date()).days
                tl(f"{b['id']} ticket is for 'tomorrow'", dd == 1, f"{dd} day(s) after the packing scene")
    ts = re.search(r"TERM STARTS (\d{1,2}) (SEPTEMBER)", txt)
    if ts:
        t14 = resolve(ev["T14"]["when"], REF)
        tl(f"{b['id']} letter: term starts {ts.group(1)} September", (t14.month, t14.day) == (9, int(ts.group(1))), "= timeline T14")

# Scene labels with a date, a time or a weekday vs the story time of their beat (v2)
for b, o in ONSCREEN:
    if o["kind"] != "label" or not b.get("story_time"):
        continue
    d_, hm = parse_label(o["text"])
    wd_ = next((w for w in WEEKDAYS if re.search(rf"\b{w}\b", o["text"])), None)
    if not (d_ or hm or wd_):
        continue
    m = re.match(r"Y(\d+)(?:-(\d\d)-(\d\d))?(?: (\d\d):(\d\d))?", b["story_time"])
    ok, why = True, []
    if d_:
        ok &= bool(m and m.group(2)) and d_ == (int(m.group(2)), int(m.group(3)))
    if hm:
        ok &= bool(m and m.group(4)) and hm == (int(m.group(4)), int(m.group(5)))
    if wd_:
        if m and m.group(2):
            wk = {WEEKDAYS[date(y0 + int(m.group(1)), int(m.group(2)), int(m.group(3))).weekday()] for y0 in years}
            ok &= wk == {wd_}
            why.append(f"{wd_.title()} in every reference year" if wk == {wd_} else f"weekday varies: {sorted(wk)}")
        else:
            ok = False
            why.append("beat has no story date")
    tl(f"{b['id']} label “{o['text']}”", ok, f"story time {b['story_time']}" + (f" · {'; '.join(why)}" if why else ""))


def beat_dt(b):
    st = b.get("story_time") or ""
    return resolve(st, REF) if re.match(r"Y\d+-\d\d-\d\d \d\d:\d\d$", st) else None


# Relative time words in the narration vs the timeline (v2)
t13, t09 = resolve(ev["T13"]["when"], REF), resolve(ev["T09"]["when"], REF)
for s in sents:
    b = next(x for x in beats if x["id"] == s["beat"])
    bt, v = beat_dt(b), s["vo"].lower()
    if "leaves tomorrow" in v:
        tl(f"{b['id']} 'She leaves tomorrow'", bool(bt) and (t13.date() - bt.date()).days == 1,
           f"said over {bt:%d %b, %H:%M}; train {t13:%d %b, %H:%M} = the next calendar day")
    if "back to three a.m" in v:
        nb = beats[beats.index(b) + 1]
        ok = bool(bt) and bt == t09 and beat_dt(nb) == t09
        tl(f"{b['id']} 'Which brings us back to three a.m.'", ok,
           f"this beat {bt:%d %b, %H:%M}; next beat {nb['id']} {beat_dt(nb):%d %b, %H:%M}; the hook (T09) {t09:%d %b, %H:%M}")
    if "train's at seven" in v:
        ok = bool(bt) and bt.date() == t13.date() and bt < t13
        tl(f"{b['id']} 'My train's at seven'", ok,
           f"said at {bt:%d %b, %H:%M}; train {t13:%d %b, %H:%M} — {(t13 - bt).seconds // 3600} h {(t13 - bt).seconds % 3600 // 60:02d} min later, the same day")

# Birthdays that fit every dated age (v2)
BDAYS = {}


def _runs(days):
    """Compress (month, day) tuples of a non-leap year into wrap-around ranges."""
    yd = [(date(2001, m_, d__) - date(2001, 1, 1)).days for m_, d__ in days]
    flags = [i in set(yd) for i in range(365)]
    if all(flags):
        return ["any day"]
    start = next(i for i in range(365) if not flags[i])            # begin scanning just after a gap
    runs, cur = [], None
    for k in range(1, 366):
        i = (start + k) % 365
        if flags[i] and cur is None:
            cur = i
        if not flags[i] and cur is not None:
            runs.append((cur, (i - 1) % 365))
            cur = None
    if cur is not None:
        runs.append((cur, (start - 1) % 365))
    f = lambda i: (date(2001, 1, 1) + timedelta(days=i)).strftime("%-d %b")
    missing = [i for i in range(365) if not flags[i]]
    if len(missing) <= 3:
        return ["any day except " + ", ".join(f(i) for i in missing)]
    return [f"{f(a)} – {f(b_)}" if a != b_ else f(a) for a, b_ in runs]


for who in ("Leo", "Mia"):
    asserts = [a for a in TL.get("age_assertions", []) if a["who"] == who]
    if not asserts:
        continue
    fits = []
    for k in range(365):
        md_ = ((date(2001, 1, 1) + timedelta(days=k)).month, (date(2001, 1, 1) + timedelta(days=k)).day)
        good = True
        for y0 in years:
            d_first = resolve(asserts[0]["when"], y0).date()
            cands = (d_first.year - asserts[0]["age"] - 1, d_first.year - asserts[0]["age"])
            if not any(all(resolve(a["when"], y0).year - born - ((resolve(a["when"], y0).month, resolve(a["when"], y0).day) < md_)
                           == a["age"] for a in asserts) for born in cands):
                good = False
                break
        if good:
            fits.append(md_)
    BDAYS[who] = _runs(fits)
    tl(f"{who}: some birthday fits every dated age", bool(fits),
       "birthday " + " or ".join(BDAYS[who]) + " — ages " + ", ".join(
           f"{a['age']} on {resolve(a['when'], REF):%d %b} of Year {re.match(r'Y(\d+)', a['when']).group(1)}" for a in asserts))

SCENES = sorted((b for b in beats if beat_dt(b) and beat_dt(b) >= resolve(ev["T07"]["when"], REF)),
                key=lambda b: (beat_dt(b), b["start"]))

# Astronomy
SKY = []
for site in TL["astronomy_sites"]:
    d0 = resolve(ev["T06"]["when"], years[0]).date()          # the 'twenty-four hours awake' sunrise (Year 0)
    d10 = resolve(ev["T11"]["when"], years[0]).date()         # the hill (Year 10)
    m0, m10 = morning(site, d0), morning(site, d10)
    e = {hh: elev_at(site, datetime(d10.year, d10.month, d10.day, hh, mm)) for hh, mm in ((3, 10), (4, 0), (5, 0))}
    e = {f"{k:02d}:{'10' if k == 3 else '00'}": v for k, v in e.items()}
    SKY.append({"site": site, "y0": m0, "y10": m10, "elev": e})
    for key, evid in (("04:00", "T11"), ("05:00", "T12")):
        tl(f"{site['name']}: {key} on {d10:%d %b} is still night (sun below −12°)", e[key] < -12,
           f"sun at {e[key]:.1f}° ({'stars clearly visible' if e[key] < -12 else 'twilight'})")
    wake = resolve(ev["T02"]["when"], years[0]) - timedelta(minutes=30)      # up ~30 min before breakfast
    sr = datetime.strptime(f"{d0} {m0['sunrise']}", "%Y-%m-%d %H:%M")
    hrs = (sr - wake).total_seconds() / 3600
    tl(f"{site['name']}: 'Twenty-four hours awake' at sunrise on {d0:%A %d %b}", 22.5 <= hrs <= 25.5,
       f"up {wake:%a %H:%M} → sunrise {d0:%a} {m0['sunrise']} {site['zone']} = {hrs:.1f} h awake")

# Notebook contrast (production requirement 2)


def lum(hexs):
    h = hexs.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


NB = REQ["notebook"]
la, lb = lum(NB["ink_hex"]), lum(NB["paper_hex"])
CONTRAST = (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
if CONTRAST < NB["min_contrast"]:
    errors.append(f"notebook: ink/paper contrast {CONTRAST:.1f}:1 below {NB['min_contrast']}:1")
CAP_PX = NB["cap_height_pct_of_frame_h"] / 100 * 1080
TALLY_PX = NB["tally"]["mark_height_pct_of_frame_h"] / 100 * 1080
captions = [(b["id"], o) for b, o in ONSCREEN if o["kind"] == "caption"]
if len(captions) != 3:
    errors.append(f"notebook: caption appears {len(captions)} times on screen (Lock: 3 sightings)")
for bid, o in captions:
    b = next(x for x in beats if x["id"] == bid)
    if b["dur"] < NB["min_hold_s"]:
        errors.append(f"notebook: beat {bid} is shorter than the {NB['min_hold_s']} s caption hold")
if NB["tally"]["ch8"] > NB["tally"]["max_groups"] * 5:
    errors.append("notebook: more tally marks than the legibility cap allows")

# ------------------------------------------------------------------------------------
# 8. Write outputs
# ------------------------------------------------------------------------------------
def tagstr(s):
    ids = [c for c in s["claims"] if c not in NON_FACT] or s["claims"]
    cls = SHORT.get(s["cls"], s["cls"])
    return f"`{' · '.join(ids)}`" + ("" if cls in ("story", "frame") else f" *{cls}*")


md = []
D = S["doc"]
md.append(f"# {D['title']} — Narration Script {D['version']}\n")
md.append(f"**{D['kind']}_{D['version']} · {D['date']} · {D['status']}** · built from {D['built_from']}\n")
md.append(f"> Generated by `tools/script_audit.py` from [`script_{VER}.json`](script_{VER}.json) — edit the JSON, not this file. "
          f"Audits: [AUDIT_{VER}.md](AUDIT_{VER}.md). Paste text for ElevenLabs: [VOICEOVER_{VER}.txt](VOICEOVER_{VER}.txt).\n")
md.append("## How to read it\n")
md.append("* **Spoken words** are in quote blocks, under the speaker's name: **NARRATOR**, or a character (**MIA**, **LEO**, **MUM**). Nothing else is spoken.")
md.append("* **PICTURE**, **ON SCREEN** and **SOUND** are cues for the animation and the mix.")
md.append("* After every spoken sentence: its claim IDs from the [claim ledger](../docs/02_CLAIM_LEDGER.md) and its evidence class. "
          "`STORY` = our characters' fiction; `FRAME` = framing with no factual content.")
md.append(f"* Timestamps are planned at Video #1's measured pace; the final cut follows your generated voiceover. "
          f"Planned runtime **{fmt_t(TOTAL)}**, **{M_ALL['words']} spoken words**.\n")

md.append("## Locked production requirements\n")
R1 = REQ["dates"]
md.append(f"### 1 · {R1['title'].split('— ')[1].capitalize()}\n")
md.append(R1["rule"] + "\n")
md.append("| Moment | Date and time | What happens |\n|---|---|---|")
for r in R1["rows"]:
    md.append(f"| {r[0]} | {r[1]} | {r[2]} |")
if R1.get("moment_zero"):
    md.append("\n**Moment zero and the ten-year jump**\n")
    md.append("| | |\n|---|---|")
    for k, v in R1["moment_zero"]:
        md.append(f"| {k} | {v} |")
md.append("\n**Ages:** " + " · ".join(f"{w} " + " → ".join(f"{v}" for v in a.values()) + f" (Years {', '.join(k[1:] for k in a)})" for w, a in R1["ages"].items()))
md.append(f"\n{R1['not_shown']}\n")
md.append(f"### 2 · {NB['title'].split('— ')[1].capitalize()}\n")
md.append(NB["rule"] + "\n")
md.append("| Element | Spec |\n|---|---|")
md.append(f"| Caption | {NB['caption_text']} |")
md.append(f"| Size | cap height ≥ {NB['cap_height_pct_of_frame_h']:.0f} % of frame height (≥ {CAP_PX:.0f} px at 1080p); caption ≥ {NB['caption_width_pct_of_frame_w']} % of frame width |")
md.append(f"| Contrast | ink {NB['ink_hex']} on paper {NB['paper_hex']} = **{CONTRAST:.1f}:1** (minimum {NB['min_contrast']:.0f}:1, re-measured in the rendered frame) |")
md.append(f"| Hold | ≥ {NB['min_hold_s']:.1f} s per sighting, camera push ≤ {NB['max_push_pct']} %, no motion blur |")
md.append(f"| Zone | {NB['zone']} |")
tly = NB["tally"]
md.append(f"| Tally | ch 3: none · ch 6: {tly['ch6']} mark · ch 8: **{tly['ch8']} marks** — {tly['ch8_layout']}; at most {tly['max_groups']} groups |")
md.append(f"| Tally size | each mark ≥ {tly['mark_height_pct_of_frame_h']:.0f} % of frame height (≥ {TALLY_PX:.0f} px), strokes ≥ {tly['stroke_px_min']} px, ≥ {tly['gap_px_min']} px apart, groups ≥ {tly['group_gap_px_min']} px apart |")
for a, b_ in NB["other_text"]:
    md.append(f"| {a} | {b_} |")
md.append(f"| Phone check | {NB['phone_checks']} |\n")
R3 = REQ["opening_sync"]
md.append(f"### 3 · {R3['title'].split('— ')[1].capitalize()}\n")
md.append("| When | Rule |\n|---|---|")
for a, b_ in R3["rows"]:
    md.append(f"| {a} | {b_} |")
md.append(f"\n**Deviation, explained:** {R3['deviation']}\n")

md.append("## Chapters at a glance\n")
md.append("| # | Chapter | Brief window | Planned | Δ | Words | Pace |\n|---|---|---|---|---|---|---|")
for r in CH_ROWS:
    md.append(f"| {r['n']} | {r['title']} | {r['window']} | {fmt_t(r['start'], 0)}–{fmt_t(r['end'], 0)} ({r['dur']:.1f} s) | {r['delta']:+.0f} % | {r['words']} | {r['wpm']:.0f} wpm |")
md.append(f"| | **Total** | 7:30 | **{fmt_t(TOTAL, 0)}** | | **{M_ALL['words']}** | {M_ALL['words'] / TOTAL * 60:.0f} wpm |\n")

for ch in S["chapters"]:
    md.append(f"---\n\n## CHAPTER {ch['n']} — {ch['title'].upper()} · {fmt_t(ch['start'], 0)}–{fmt_t(ch['end'], 0)}\n")
    md.append(f"*Brief window {ch['window'][0]}–{ch['window'][1]}.* **Music:** {ch['music']}\n")
    for b in ch["beats"]:
        tag = " · emotional beat" if b["emotional"] else ""
        md.append(f"### {b['id']} · {fmt_t(b['start'])}–{fmt_t(b['end'])} · {b['dur']:g} s{tag}\n")
        md.append(f"**PICTURE** — {b['picture']}  ")
        if b.get("onscreen"):
            os_ = " · ".join(f"“{o['text']}” ({o['kind']}" + (f"; `{' · '.join(c for c in o['claims'] if c not in NON_FACT)}`" if any(c not in NON_FACT for c in o['claims']) else "") + ")" for o in b["onscreen"])
            md.append(f"**ON SCREEN** — {os_}  ")
        md.append(f"**SOUND** — {b['sound']}\n")
        if not b["lines"]:
            md.append("*(no words)*\n")
        cur = None
        for s in by_beat[b["id"]]:
            if s["who"] != cur:
                if cur is not None:
                    md.append("")
                label = SPEAKER[s["who"]] + ("" if s["who"] == "N" else " *(dialogue)*")
                md.append(f"**{label}**\n")
                cur = s["who"]
            note = f" *({s['timing']})*" if s["timing"] else ""
            md.append(f"> {s['text']} &nbsp;&nbsp;{tagstr(s)}{note}  ")
        md.append("")

if S.get("changes_from_lock"):
    prev = f"v{int(VER[1:]) - 1}"
    md.append(f"---\n\n## Changes in this pass (script {prev} → {VER})\n")
    md.append(S["changes_from_lock"] + " The creative direction, premise, characters, timeline, emotional arc and ending are unchanged.\n")
    md.append(f"| Beat | Kind | Your point | Script {prev} | Script {VER} | Why |\n|---|---|---|---|---|---|")
    for c in S["changes"]:
        md.append(f"| {c['beat']} | {c['kind']} | {c.get('point', '')} | {c['from']} | {c['to']} | {c['why']} |")
else:
    md.append("---\n\n## Changes from the Story Lock v4 draft beats\n")
    md.append("The creative direction, premise, characters, timeline, emotional arc and ending are unchanged. Every wording, timing or picture change is listed here with its reason.\n")
    md.append("| Beat | Kind | Story Lock v4 | Script v1 | Why |\n|---|---|---|---|---|")
    for c in S["changes"]:
        md.append(f"| {c['beat']} | {c['kind']} | {c['from']} | {c['to']} | {c['why']} |")
md.append("\n## Pronunciation (for the voice)\n")
md.append("| Word | Say it |\n|---|---|")
for a, b_ in S["pronunciation"]:
    md.append(f"| {a} | {b_} |")
(OUT / f"SCRIPT_{VER}.md").write_text("\n".join(md) + "\n")

# Voiceover paste text --------------------------------------------------------------
vo_paras, vo_chapters = [], []
for ch in S["chapters"]:
    paras = []
    for b in ch["beats"]:
        group, cur = [], None
        for s in by_beat[b["id"]]:
            if s["who"] != cur:
                group.append([])
                cur = s["who"]
            group[-1].append(f"“{s['vo']}”" if s["who"] != "N" else s["vo"])
        paras += [" ".join(g) for g in group]
    vo_chapters.append("\n\n".join(paras))
vo_text = "\n\n".join(vo_chapters) + "\n"
(OUT / f"VOICEOVER_{VER}.txt").write_text(vo_text)
VO_CHARS = len(vo_text)
PARTS = []
if VO_CHARS > 5000:
    acc, part, cut = 0, [], None
    for i, c in enumerate(vo_chapters):
        if part and acc + len(c) > 5000:
            PARTS.append(part)
            part, acc = [], 0
        part.append(c)
        acc += len(c) + 2
    PARTS.append(part)
    for i, p in enumerate(PARTS, 1):
        (OUT / f"VOICEOVER_{VER}_part{i}.txt").write_text("\n\n".join(p) + "\n")

bs = ["# VOICEOVER by speaker — for the editor, or for a second voice (do not paste this file into ElevenLabs)",
      f"# Generated from script_{VER}.json · planned timecodes", ""]
for s in sents:
    b = next(x for x in beats if x["id"] == s["beat"])
    bs.append(f"[{s['beat']:>5} · {fmt_t(b['start'])}] {SPEAKER[s['who']]:<8} {s['vo']}")
for who in ("MIA", "LEO", "MUM"):
    bs += ["", f"## {who} only", ""] + [f"[{s['beat']}] {s['vo']}" for s in sents if s["who"] == who]
bs += ["", "## NARRATOR only (paste this instead of VOICEOVER if the characters get their own voices)", ""]
for b in beats:
    ln = [s["vo"] for s in by_beat[b["id"]] if s["who"] == "N"]
    if ln:
        bs.append(" ".join(ln))
        bs.append("")
(OUT / f"VOICEOVER_{VER}_by_speaker.txt").write_text("\n".join(bs) + "\n")

# Audit report ------------------------------------------------------------------------
A = []
A.append(f"# Script audit — {D['title']} · script {VER}\n")
A.append(f"Computed by `tools/script_audit.py` from `script_{VER}.json`, the [claim ledger](../docs/02_CLAIM_LEDGER.md), "
         f"the [research sources](../docs/01_RESEARCH.md) and the [Story Lock](../docs/04_STORY_LOCK.md). Nothing here is estimated by hand. "
         f"The checker first passes its own {SELFTESTS} known-answer tests.\n")
A.append("## Result\n")
A.append(f"* **Errors (fail): {len(errors)}**" + ("" if errors else " — every check passed."))
for e in errors:
    A.append(f"  * ❌ {e}")
A.append(f"* **Warnings (review): {len(warnings)}**")
for w in warnings:
    A.append(f"  * ⚠️ {w}")
A.append(f"\n**Totals:** {len(sents)} sentences · {M_ALL['words']} spoken words ({M_NARR['words']} narration, "
         f"{M_ALL['words'] - M_NARR['words']} dialogue) · planned runtime {fmt_t(TOTAL)} · "
         f"{len(beats)} beats · paste text {VO_CHARS:,} characters" + (f" (also split into {len(PARTS)} parts under 5,000)" if PARTS else "") + ".\n")

A.append("---\n\n## 1 · Sentence-level script audit\n")
A.append("### Script metrics (reference engine targets, Production Standard §6)\n")
A.append("| Metric | This script | Narration only | Target | Video #1 | Result |\n|---|---|---|---|---|---|")
V1 = {"avg": "5.4", "short_pct": "49.5 %", "questions": "18", "ellipses": "n/a", "you_per100": "7.9"}
for name, key, tgt, fn, f in TARGETS:
    A.append(f"| {name} | {f.format(M_ALL[key])} | {f.format(M_NARR[key])} | {tgt} | {V1[key]} | {'✅' if fn(M_ALL[key]) else '⚠️ off target'} |")
A.append(f"| Words | {M_ALL['words']} | {M_NARR['words']} | ≈ 1,050 for 7:30 | 1,036 | {'✅' if 950 <= M_ALL['words'] <= 1150 else '⚠️'} |")
A.append(f"| Sentences | {M_ALL['sentences']} | {M_NARR['sentences']} | — | — | — |\n")
_prev = OUT / f"AUDIT_v{int(VER[1:]) - 1}.json"
if VER != "v1" and _prev.exists():
    P = json.loads(_prev.read_text())
    A.append(f"**Compared with {_prev.stem.split('_')[1]}:** " + " · ".join(
        f"{k} {P['metrics'][k]:.2f} → {M_ALL[k]:.2f}" if isinstance(P["metrics"][k], float) else f"{k} {P['metrics'][k]} → {M_ALL[k]}"
        for k in ("words", "sentences", "avg", "short_pct", "questions", "ellipses", "you_per100")) +
        f" · runtime {fmt_t(P['totals']['runtime_s'])} → {fmt_t(TOTAL)}\n")
A.append("**By chapter:**\n")
A.append("| Ch | Sentences | Words | Avg words | ≤ 4 words | Questions | Ellipses | you/your per 100 |\n|---|---|---|---|---|---|---|---|")
for n, m in M_CH.items():
    A.append(f"| {n} | {m['sentences']} | {m['words']} | {m['avg']:.1f} | {m['short_pct']:.0f} % | {m['questions']} | {m['ellipses']} | {m['you_per100']:.1f} |")
A.append("\n### Every sentence\n")
A.append("Role = what the sentence does for the story (every sentence must have one).\n")
A.append("| # | Beat | Speaker | Sentence | Words | Role | Claims | Class |\n|---|---|---|---|---|---|---|---|")
for s in sents:
    A.append(f"| {s['n']} | {s['beat']} | {SPEAKER[s['who']]} | {s['text']} | {s['w']} | {s['role']} | {' · '.join(s['claims'])} | {SHORT.get(s['cls'], s['cls'])} |")
role_counts = Counter(s["role"] for s in sents)
A.append("\n**Roles:** " + " · ".join(f"{k} {v}" for k, v in role_counts.most_common()) + "\n")
A.append("### Repetition\n")
A.append("**Most common sentence openers:** " + " · ".join(f"“{w}” ×{c}" for w, c in openers.most_common(8)) + "\n")
if runs:
    A.append("**Three or more sentences in a row with the same opener** (judge as deliberate rhythm or fix):\n")
    for r in runs:
        A.append(f"* {r[0]['beat']}–{r[-1]['beat']}: " + " / ".join(f"“{x['text']}”" for x in r))
A.append("\n**Repeated four-word phrases:**\n")
A.append("| Phrase | Sentences | Declared callback? |\n|---|---|---|")
for g, where, delib in sorted(REPEATS, key=lambda x: x[1]):
    A.append(f"| {g} | {', '.join(map(str, where))} | {'yes' if delib else '**no — review**'} |")
A.append("\n**Near repeats** — the same content word (six letters or more, motif words excluded) in the same or the next beat; for review:\n")
if NEAR:
    A.append("| Word | Sentences |\n|---|---|")
    for w, a_, b_ in NEAR:
        A.append(f"| {w} | {a_} · {b_} |")
else:
    A.append("* none")
A.append("\n### Long sentences (over %d words)\n" % L["long_sentence_words"])
for s in long_sents:
    A.append(f"* {s['beat']} ({s['w']} words): {s['text']}")
if not long_sents:
    A.append("* none")
A.append("\n### Text-to-speech readiness\n")
A.append("* No digits, %, $ or capitalised abbreviations in the paste text (checked per sentence; REM is the one allowed — see pronunciation).")
A.append("* Substitutions applied for the voice only: " + "; ".join(f"“{a}” → “{b}”" for a, b in SUBS) + ".")
A.append(f"* Withdrawn wording scanned in every sentence: {len(WITHDRAWN)} patterns from the ledger's withdrawn list and the Story Bible guardrails (§9).\n")

A.append("---\n\n## 2 · Factual audit\n")
cls_counts = Counter(s["cls"] for s in sents)
A.append("**Sentences by class:** " + " · ".join(f"{SHORT.get(k, k)} {v}" for k, v in cls_counts.most_common()) + "\n")
A.append("Rules applied (ledger v4.1, Production Standard §5): one class per sentence by the weakest-input rule; research-supported → the evidence is signalled; "
         "unknown → the uncertainty is said; world rules → never attributed to science; speculation → inside the imagined frame or with a modal verb; "
         "a real fact inside the story → a real-world marker (\"today\", \"already\", \"in twenty sixteen\"…); every narrated fact → at least one level-A source.\n")
A.append("### Fact ledger — every sentence with factual content\n")
A.append("| # | Beat | Sentence | Claims | Class | Sources (level) | Wording check |\n|---|---|---|---|---|---|---|")
for s in sents:
    if s["cls"] in NON_FACT:
        continue
    src = []
    for c in s["claims"]:
        if c in LEDGER and LEDGER[c]["cls"] in (EST, RES):
            src.append(f"{c}: {level_a_status(c)[1]}")
    A.append(f"| {s['n']} | {s['beat']} | {s['text']} | {' · '.join(c for c in s['claims'] if c not in NON_FACT)} | {SHORT[s['cls']]} | "
             f"{'; '.join(src) or '—'} | {'; '.join(s['checks']) or '—'} {'✅' if s['ok'] else '❌'} |")
A.append("\n### Sentences with no factual content\n")
A.append("| # | Beat | Speaker | Sentence | Tag |\n|---|---|---|---|---|")
for s in sents:
    if s["cls"] in NON_FACT:
        A.append(f"| {s['n']} | {s['beat']} | {SPEAKER[s['who']]} | {s['text']} | {s['cls']} |")
A.append("\n### On-screen text with factual content\n")
A.append("| Beat | Text | Kind | Claims | Words |\n|---|---|---|---|---|")
for b, o in ONSCREEN:
    ids = [c for c in o.get("claims", []) if c not in NON_FACT]
    if ids:
        A.append(f"| {b['id']} | {o['text']} | {o['kind']} | {' · '.join(ids)} | {o.get('nwords', '—')} |")
A.append("\n### Coverage against the Story Lock fact bank\n")
A.append(f"* Fact bank IDs (Lock v4, ranges expanded): {len(FACT_BANK)}. Used in the narration: {len(FACT_BANK & used_spoken)}. "
         f"On screen only: {', '.join(sorted((FACT_BANK & used_screen) - used_spoken)) or 'none'}.")
A.append("* **In the fact bank but not narrated** — each with its reason:\n")
A.append("| ID | Reason |\n|---|---|")
for c in fb_not_used:
    A.append(f"| {c} | {notes.get(c, 'on screen only' if c in used_screen else '**no reason given**')} |")
A.append(f"\n* **Narrated but not listed in the Lock's fact bank:** {', '.join(new_ids) or 'none'} — "
         "CALC-02 and I01 were in the Lock's draft beats but missing from its fact-bank line; SP-20, SP-21 and SP-22 are bookkeeping IDs added in ledger v4.1 for approved beats.\n")

A.append("---\n\n## 3 · Timeline audit\n")
A.append(f"Reference years: every year from 2026 to 2060 in which 12 September is a Monday — **{', '.join(map(str, years))}**. "
         "Each is checked; the weekday of Year 10 dates differs by year and is never shown on screen.\n")
A.append("| Year 0 | Year 10 | Last sleep | Moment zero | May message | Hook | Train | Term starts |\n|---|---|---|---|---|---|---|---|")
for r in year_rows:
    A.append(f"| {r['Y0']} | {r['Y10']} | {r['last sleep']} | {r['moment zero']} | {r['may']} | {r['hook']} | {r['train']} | {r['term']} |")
A.append("\n### Moment zero — the calculation\n")
A.append(f"**Definition:** moment zero = {TL['moment_zero']['definition']}, **{MZ_ROWS[0]['mz']:%A %d %B}, {MZ_ROWS[0]['mz']:%H:%M}, Year 0** "
         f"({TL['moment_zero']['where']}). {TL['moment_zero']['why']}\n")
A.append("| Reference years | Moment zero + 10 years | Days elapsed | Hook | Hook − (moment zero + 10 years) | End of last sleep → hook | Hook − 10 years |\n|---|---|---|---|---|---|---|")
for r in MZ_ROWS:
    A.append(f"| {r['y0']} → {r['y0'] + 10} | {r['mz10']:%a %d %b, %H:%M} | {r['days']:,} | {r['hook']:%a %d %b, %H:%M} | "
             f"+{r['hook_after_mz10'].seconds // 3600} h | {r['since_sleep'][0]} | {r['back10']:%a %d %b, %H:%M} (Year 0) |")
A.append("\nDays elapsed differ by year only because of how many 29 Februaries fall in the ten years; every narrated span holds in every reference year.\n")
A.append("\n### Checks\n")
A.append("| Check | Result | Detail |\n|---|---|---|")
for name, ok, det in TL_CHECKS:
    A.append(f"| {name} | {'✅' if ok else '❌'} | {det} |")
A.append("\n### Scene clock — from the May message to the train\n")
A.append("In story order. The hook (film time 0:00) and chapter 8 are the same night as 7.8d.\n")
A.append("| Beat | Film time | On-screen label | Story date and time (Year 10) | Before the 07:00 train |\n|---|---|---|---|---|")
for b in SCENES:
    lab = next((o["text"] for o in b.get("onscreen", []) if o["kind"] == "label"), "—")
    dt_ = beat_dt(b)
    gap = t13 - dt_
    rel = (f"{gap.days} days {gap.seconds // 3600} h" if gap.days else f"{gap.seconds // 3600} h {gap.seconds % 3600 // 60:02d} min")
    A.append(f"| {b['id']} | {fmt_t(b['start'])} | {lab} | {dt_:%d %B, %H:%M} | {rel} |")
A.append(f"| train | — | ticket 13 SEP · 07:00 | {t13:%d %B, %H:%M} | — |")
A.append(f"| term | — | letter TERM STARTS 14 SEPTEMBER | {resolve(ev['T14']['when'], REF):%d %B} | the next day |")
A.append("\n**Birthdays that fit every dated age:** " + " · ".join(f"{w}: {' or '.join(r)}" for w, r in BDAYS.items()) + "\n")
A.append(f"\n### The night sky (NOAA solar-position algorithm, Year 0 = {years[0]}, Year 10 = {years[0] + 10})\n")
_d10 = resolve(ev["T11"]["when"], years[0]); _d0 = resolve(ev["T06"]["when"], years[0])
A.append(f"| Site | Year 10, {_d10:%d %b}: astronomical dawn | nautical dawn | sunrise | sun at 03:10 | at 04:00 | at 05:00 | Year 0, {_d0:%a %d %b} sunrise |\n|---|---|---|---|---|---|---|---|")
for k in SKY:
    s_, y10, e = k["site"], k["y10"], k["elev"]
    A.append(f"| {s_['name']} ({s_['lat']}°, {s_['zone']}) | {y10.get('astronomical dawn')} | {y10.get('nautical dawn')} | {y10.get('sunrise')} | "
             f"{e['03:10']:.1f}° | {e['04:00']:.1f}° | {e['05:00']:.1f}° | {k['y0'].get('sunrise')} |")
A.append(f"\n{TL['story_city_note']} Below −18° the sky is fully dark; between −18° and −12° it is still night to the eye, with the stars clearly out.\n")

A.append("---\n\n## 4 · Per-beat speaking-rate audit\n")
A.append(f"Rule (Standard §6, item 14): words ÷ beat seconds ≤ **{L['beat_wpm']} wpm**, emotional beats ≤ **{L['emotional_wpm']} wpm**. "
         f"*Est. speech* = words at the voice's measured speaking rate ({SPK} wpm) + 0.25 s per dash, 0.35 s per ellipsis, 0.3 s between sentences — "
         "an estimate, shown so tight beats stand out; the rule itself uses the planned beat length.\n")
A.append("| Beat | Start–end | Length | Words | wpm | Limit | Est. speech | Slack | Result |\n|---|---|---|---|---|---|---|---|---|")
for b in beats:
    A.append(f"| {b['id']}{' ♥' if b['emotional'] else ''} | {fmt_t(b['start'])}–{fmt_t(b['end'])} | {b['dur']:g} s | {b['words']} | "
             f"{b['wpm']:.0f} | {b['limit']} | {b['speech_s']:.1f} s | {b['slack']:+.1f} s | {'✅' if b['rate_ok'] else '❌'} |")
A.append("\n♥ = emotional beat (lower limit).\n")
A.append("### Chapters against the brief's windows (±15 %)\n")
A.append("| # | Chapter | Window | Planned | Length | Δ | Words | Pace | Result |\n|---|---|---|---|---|---|---|---|---|")
for r in CH_ROWS:
    A.append(f"| {r['n']} | {r['title']} | {r['window']} ({r['win']:.0f} s) | {fmt_t(r['start'], 0)}–{fmt_t(r['end'], 0)} | {r['dur']:.1f} s | "
             f"{r['delta']:+.1f} % | {r['words']} | {r['wpm']:.0f} wpm | {'✅' if r['ok'] else '❌'} |")
fastest = max(beats, key=lambda x: x["wpm"])
A.append(f"\n* **Runtime:** {fmt_t(TOTAL)} planned (Story Lock v4: 7:50; brief: about 7–8 minutes). Speech alone at Video #1's overall "
         f"{S['voice']['overall_wpm']} wpm: {fmt_t(M_ALL['words'] / S['voice']['overall_wpm'] * 60)}.")
A.append(f"* **Fastest beat:** {fastest['id']} at {fastest['wpm']:.0f} wpm. Beats at or above 150 wpm: "
         f"{', '.join(b['id'] for b in beats if b['wpm'] >= 150) or 'none'}.")
A.append(f"* **Opening sync:** narration from 0:00.2; the line is estimated to end at {fmt_t(OPENING['est_line_end'], 2)}; "
         f"the earliest allowed cut (+4 frames) is {fmt_t(OPENING['earliest_cut'], 2)}; planned cut {fmt_t(OPENING['planned_cut'], 1)} "
         f"→ {'✅ the full playground is on screen for the whole line' if OPENING['ok'] else '❌'}.\n")
(OUT / f"AUDIT_{VER}.md").write_text("\n".join(A) + "\n")

summary = {
    "version": VER, "errors": errors, "warnings": warnings,
    "totals": {"sentences": len(sents), "words": M_ALL["words"], "runtime_s": round(TOTAL, 1), "beats": len(beats),
               "vo_chars": VO_CHARS},
    "metrics": {k: round(v, 2) for k, v in M_ALL.items()},
    "chapters": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()} for r in CH_ROWS],
    "beats": [{"id": b["id"], "start": round(b["start"], 2), "dur": b["dur"], "words": b["words"], "wpm": round(b["wpm"], 1),
               "limit": b["limit"], "ok": b["rate_ok"]} for b in beats],
    "sentences": [{"n": s["n"], "beat": s["beat"], "who": s["who"], "text": s["text"], "vo": s["vo"], "words": s["w"],
                   "claims": s["claims"], "class": s["cls"], "role": s["role"], "checks": s["checks"]} for s in sents],
    "timeline": [{"check": n, "ok": o, "detail": d} for n, o, d in TL_CHECKS],
    "notebook_contrast": round(CONTRAST, 2),
    "opening": {k: (round(v, 3) if isinstance(v, float) else v) for k, v in OPENING.items()},
    "fact_bank_not_narrated": fb_not_used, "narrated_not_in_fact_bank": new_ids,
}
(OUT / f"AUDIT_{VER}.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")

print(f"sentences {len(sents)} · words {M_ALL['words']} · runtime {fmt_t(TOTAL)} · beats {len(beats)} · VO chars {VO_CHARS}")
print(f"avg {M_ALL['avg']:.2f} · ≤4 {M_ALL['short_pct']:.1f}% · questions {M_ALL['questions']} · ellipses {M_ALL['ellipses']} · you/100 {M_ALL['you_per100']:.1f}")
for r in CH_ROWS:
    print(f"  ch{r['n']} {r['dur']:.1f}s {r['delta']:+.1f}% {r['words']}w {r['wpm']:.0f}wpm")
print(f"ERRORS {len(errors)}")
for e in errors:
    print("  ✗", e)
print(f"WARNINGS {len(warnings)}")
for w in warnings:
    print("  !", w)
sys.exit(1 if errors else 0)
