"""
Soar Boar — Word Pair Frequency Annotator (level-generation pipeline, step 1)
==============================================================================
Reads the ranked TSVs from `word_pair_difficulty.py` and joins in word
frequency from the `wordfreq` library, so a downstream filter can drop
pairs whose endpoints are too obscure for a fun level.

Why this isn't in `word_pair_difficulty.py`: that script is stdlib-only on
purpose. Frequency annotation adds a `wordfreq` dependency, kept here so
the core graph analysis stays portable.

What it produces
----------------
For each row of `pairs_<N>.tsv` it appends three columns:
  freq_a    — wordfreq frequency of word_a in English
  freq_b    — wordfreq frequency of word_b
  min_freq  — min(freq_a, freq_b); pair is no more recognizable than this
Output is `pairs_<N>_annotated.tsv` in the same dir as the input.

A pair where one endpoint isn't in the wordfreq corpus has `min_freq = 0`,
which is what you'd want a filter to drop first.

Calibration hint
----------------
The script also prints (a) a histogram of `min_freq` by log10 bucket and
(b) sample words at each bucket. Use those to pick a threshold for the
next pipeline step. Reference frequencies:
  ~1e-2 the     ~1e-5 bone/cat     ~1e-6 posh/zoom     ~1e-7 aardvark
  ~1e-8 ootp    0     aecia (absent from corpus)

What this script does NOT do
----------------------------
- It does not filter — every input row is written out, annotated.
- It only checks endpoint frequency. A pair where both endpoints are
  common but the only shortest path runs through obscure intermediates
  is still in here. That's a step-2 concern (BFS on candidates).

Requires: pip install wordfreq
"""

import argparse
import math
import sys
from collections import defaultdict
from pathlib import Path

try:
    from wordfreq import word_frequency
except ImportError:
    sys.exit("error: this script requires `wordfreq`. install with: pip install wordfreq")

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DIR = SCRIPT_DIR / "output"


def annotate(in_path: Path, out_path: Path) -> None:
    if not in_path.exists():
        sys.exit(f"error: input not found: {in_path}\n"
                 f"run `python3 scripts/word_pair_difficulty.py` first.")

    freq_cache: dict[str, float] = {}

    def freq(word: str) -> float:
        if word not in freq_cache:
            freq_cache[word] = word_frequency(word.lower(), "en")
        return freq_cache[word]

    print(f"  reading {in_path.name}")
    hist: dict[int, int] = defaultdict(int)
    rows = 0

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with in_path.open() as fin, out_path.open("w") as fout:
        header = fin.readline().rstrip("\n")
        fout.write(f"{header}\tfreq_a\tfreq_b\tmin_freq\n")
        for line in fin:
            line = line.rstrip("\n")
            fields = line.split("\t")
            word_a, word_b = fields[1], fields[2]
            fa, fb = freq(word_a), freq(word_b)
            mf = min(fa, fb)
            fout.write(f"{line}\t{fa:.3e}\t{fb:.3e}\t{mf:.3e}\n")
            bucket = math.floor(math.log10(mf)) if mf > 0 else -99
            hist[bucket] += 1
            rows += 1

    print(f"  wrote {rows:,} rows ({len(freq_cache):,} unique words looked up) → {out_path.name}")
    _print_histogram(hist, rows)
    _print_word_samples(freq_cache)


def _print_histogram(hist: dict[int, int], total: int) -> None:
    print(f"\n  min_freq distribution (log10 bucket):")
    print(f"    bucket       pairs       cumulative %")
    cum = 0
    for bucket in sorted(hist, reverse=True):
        count = hist[bucket]
        cum += count
        cum_pct = cum / total * 100
        label = "absent" if bucket == -99 else f"1e{bucket:+d}"
        print(f"    {label:>8s}  {count:>10,}        {cum_pct:>5.1f}%")
    print(f"  (cumulative % = how many pairs survive if you drop everything")
    print(f"   ranked below this bucket — lower bucket → looser threshold)")


def _print_word_samples(freq_cache: dict[str, float], per_bucket: int = 6) -> None:
    by_bucket: dict[int, list[str]] = defaultdict(list)
    for word, f in freq_cache.items():
        b = math.floor(math.log10(f)) if f > 0 else -99
        by_bucket[b].append(word)
    print(f"\n  sample words at each bucket (to help pick a threshold):")
    for bucket in sorted(by_bucket, reverse=True):
        words = sorted(by_bucket[bucket])
        sample = words[:per_bucket]
        if len(words) > per_bucket:
            sample.append(f"… +{len(words) - per_bucket} more")
        label = "absent" if bucket == -99 else f"1e{bucket:+d}"
        print(f"    {label:>8s}: {' '.join(sample)}")


def main():
    ap = argparse.ArgumentParser(description="annotate word-pair TSVs with wordfreq data")
    ap.add_argument("--in-dir", type=Path, default=DEFAULT_DIR,
                    help="directory containing pairs_3.tsv / pairs_4.tsv")
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_DIR,
                    help="where to write the annotated TSVs")
    ap.add_argument("--only", choices=["3", "4"], help="only process one wordlist")
    args = ap.parse_args()

    if args.only in (None, "3"):
        print("3-letter pairs:")
        annotate(args.in_dir / "pairs_3.tsv", args.out_dir / "pairs_3_annotated.tsv")
        print()
    if args.only in (None, "4"):
        print("4-letter pairs:")
        annotate(args.in_dir / "pairs_4.tsv", args.out_dir / "pairs_4_annotated.tsv")


if __name__ == "__main__":
    main()
