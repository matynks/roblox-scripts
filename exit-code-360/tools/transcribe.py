#!/usr/bin/env python3
"""Transcribe the approved narration with word-level timestamps.

Pipeline:
  1. Load the 16 kHz mono WAV derived from the approved MP3 (no edits to the audio itself).
  2. Find pauses with a short-term RMS energy detector.
  3. Cut the audio at pauses into chunks of at most MAX_CHUNK seconds.
  4. Run NeMo Parakeet-TDT 0.6B v2 (int8, via sherpa-onnx) on each chunk; it
     returns punctuated text plus per-token timestamps.
  5. Merge tokens into words, offset them by the chunk start, then group words
     into phrases at punctuation / pauses.

Outputs (JSON + Markdown) go to the directory given by --out.

Usage:
  python3 tools/transcribe.py --wav narr16k.wav --model-dir <parakeet dir> --out docs/
"""
import argparse
import json
import os

import numpy as np
import sherpa_onnx
import soundfile as sf

MAX_CHUNK = 12.0      # seconds; long chunks occasionally drop a sentence
MIN_PAUSE = 0.18      # seconds of low energy that counts as a cut point
PHRASE_PAUSE = 0.32   # a gap this long between words starts a new phrase


def find_pauses(x, sr, win=0.02, thresh_db=-40.0):
    hop = int(sr * win)
    n = len(x) // hop
    frames = x[: n * hop].reshape(n, hop)
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-12)
    db = 20 * np.log10(rms / (np.abs(x).max() + 1e-9))
    quiet = db < thresh_db
    pauses = []
    i = 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            dur = (j - i) * win
            if dur >= MIN_PAUSE:
                pauses.append(((i * win), (j * win)))
            i = j
        else:
            i += 1
    return pauses


def plan_chunks(total, pauses):
    """Greedy: extend each chunk to the last pause midpoint before MAX_CHUNK."""
    cuts = [0.0]
    mids = [(a + b) / 2 for a, b in pauses]
    while total - cuts[-1] > MAX_CHUNK:
        start = cuts[-1]
        cands = [m for m in mids if start + 4.0 < m <= start + MAX_CHUNK]
        cuts.append(max(cands) if cands else start + MAX_CHUNK)
    cuts.append(total)
    return list(zip(cuts[:-1], cuts[1:]))


def build_recognizer(model_dir):
    return sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=os.path.join(model_dir, "encoder.int8.onnx"),
        decoder=os.path.join(model_dir, "decoder.int8.onnx"),
        joiner=os.path.join(model_dir, "joiner.int8.onnx"),
        tokens=os.path.join(model_dir, "tokens.txt"),
        model_type="nemo_transducer",
        num_threads=4,
    )


def tokens_to_words(tokens, timestamps, offset, chunk_end):
    """SentencePiece tokens: a leading space ('▁' already decoded to ' ') starts a word."""
    words = []
    for tok, ts in zip(tokens, timestamps):
        t = offset + float(ts)
        if tok.startswith(" ") or not words:
            words.append({"word": tok.strip(), "start": t})
        else:
            words[-1]["word"] += tok
    # end time = next word start (capped) — refined later with energy
    for i, w in enumerate(words):
        nxt = words[i + 1]["start"] if i + 1 < len(words) else chunk_end
        w["end"] = min(nxt, w["start"] + 1.2)
    return [w for w in words if w["word"]]


def refine_word_ends(words, x, sr):
    """Pull each word's end back to where the energy actually drops."""
    win = int(0.01 * sr)
    peak = np.abs(x).max() + 1e-9
    for w in words:
        a, b = int(w["start"] * sr), int(w["end"] * sr)
        seg = x[a:b]
        if len(seg) < win * 3:
            continue
        n = len(seg) // win
        rms = np.sqrt((seg[: n * win].reshape(n, win) ** 2).mean(axis=1))
        db = 20 * np.log10(rms / peak + 1e-12)
        loud = np.where(db > -38)[0]
        if len(loud):
            w["end"] = round(w["start"] + (loud[-1] + 1) * 0.01, 3)
    return words


def group_phrases(words):
    phrases = []
    cur = []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt["start"] - w["end"]) if nxt else 99
        ends_sentence = w["word"][-1:] in ".?!"
        ends_clause = w["word"][-1:] in ",;:—"
        if ends_sentence or (ends_clause and gap > 0.15) or gap > PHRASE_PAUSE:
            phrases.append(cur)
            cur = []
    if cur:
        phrases.append(cur)
    out = []
    for i, p in enumerate(phrases):
        out.append({
            "id": f"P{i + 1:03d}",
            "start": round(p[0]["start"], 3),
            "end": round(p[-1]["end"], 3),
            "text": " ".join(w["word"] for w in p),
        })
    return out


def uncovered_speech(words, x, sr, min_len=0.30):
    """Return voiced regions (energy > -35 dBFS-rel) that no word covers."""
    win = int(0.01 * sr)
    n = len(x) // win
    peak = np.abs(x).max() + 1e-9
    rms = np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(axis=1))
    voiced = 20 * np.log10(rms / peak + 1e-12) > -35
    covered = np.zeros(n, bool)
    for w in words:
        covered[int(w["start"] / 0.01): int(w["end"] / 0.01) + 1] = True
    gaps, i = [], 0
    while i < n:
        if voiced[i] and not covered[i]:
            j = i
            while j < n and (voiced[j] and not covered[j] or (j - i < 3)):
                j += 1
            if (j - i) * 0.01 >= min_len:
                gaps.append((i * 0.01, j * 0.01))
            i = j
        else:
            i += 1
    return gaps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wav", required=True)
    ap.add_argument("--model-dir", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    x, sr = sf.read(args.wav, dtype="float32")
    assert sr == 16000 and x.ndim == 1, "expected 16 kHz mono"
    total = len(x) / sr
    pauses = find_pauses(x, sr)
    chunks = plan_chunks(total, pauses)
    rec = build_recognizer(args.model_dir)

    words = []
    for a, b in chunks:
        seg = x[int(a * sr): int(b * sr)]
        s = rec.create_stream()
        s.accept_waveform(sr, seg)
        rec.decode_stream(s)
        r = s.result
        words += tokens_to_words(r.tokens, r.timestamps, a, b)
        print(f"[{a:7.2f}-{b:7.2f}] {r.text}")

    words = refine_word_ends(words, x, sr)

    # Safety net: any voiced audio without words is re-decoded with context.
    for g0, g1 in uncovered_speech(words, x, sr):
        a = max(0.0, g0 - 1.5)
        b = min(total, g1 + 1.5)
        s = rec.create_stream()
        s.accept_waveform(sr, x[int(a * sr): int(b * sr)])
        rec.decode_stream(s)
        extra = tokens_to_words(s.result.tokens, s.result.timestamps, a, b)
        extra = [e for e in extra if g0 - 0.15 <= e["start"] <= g1 + 0.05]
        print(f"[recovered {g0:.2f}-{g1:.2f}] " + " ".join(e["word"] for e in extra))
        words = sorted(words + refine_word_ends(extra, x, sr), key=lambda w: w["start"])
    left = uncovered_speech(words, x, sr)
    print("uncovered voiced regions after recovery:", left)
    for w in words:
        w["start"] = round(w["start"], 3)
        w["end"] = round(w["end"], 3)
    phrases = group_phrases(words)

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "narration_words.json"), "w") as f:
        json.dump({"duration": round(total, 3), "words": words}, f, indent=1)
    with open(os.path.join(args.out, "narration_phrases.json"), "w") as f:
        json.dump({"duration": round(total, 3), "phrases": phrases}, f, indent=1)
    print(f"\n{len(words)} words, {len(phrases)} phrases, duration {total:.3f}s")


if __name__ == "__main__":
    main()
