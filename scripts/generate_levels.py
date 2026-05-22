"""
Soar Boar — Level Pack Generator (level-generation pipeline, step 2)
=====================================================================
Produces a curated `pairs.js`-shaped JSON list of (start, end, par, paths)
levels for the This That word-ladder mode, drawing from the ranked pair
TSV that `word_pair_difficulty.py` produces.

Quick start
-----------
    pip install wordfreq
    python3 scripts/generate_levels.py
    # → scripts/output/pairs.generated.js

The defaults give 145 levels, par 4–8, biased toward single-shortest-path
puzzles. Diff against game/pairs.js and copy over when you're happy.

Output format
-------------
    { "start": "FAME", "end": "FOSS", "par": 4, "paths": 1 }

  start, end   — the two endpoint words
  par          — shortest-path distance in hops
  paths        — number of distinct shortest paths in the full word graph
                 (1 = exactly one solution route; higher = more lenient)

CLI options
-----------
Sizing & distribution
  --distribution "4:30,5:40,6:40,7:30,8:5"
                       per-distance quotas; the sum is the total level count.
                       Set whatever combination you want (e.g. "5:100" for
                       100 par-5 puzzles).

Within-bucket selection
  --strategy hardest   sort each par bucket by (path_count, avg_branching)
                       ascending — picks the most constrained pairs first.
  --strategy random    shuffle each bucket (seeded) and take in order, for
                       variety.

Numeric filters (applied before bucketing; combine freely)
  --min-paths N        require path_count >= N (default: no minimum)
  --max-paths N        require path_count <= N (default: no maximum)
  --min-difficulty X   require composite difficulty score >= X
  --max-difficulty X   require composite difficulty score <= X

Endpoint pool
  --endpoint-source starters    (default) only words in game/starters<N>.js
                                may be endpoints — matches the existing
                                pairs.js generation behavior.
  --endpoint-source wordfreq    use a wordfreq threshold instead.
  --endpoint-threshold 1e-5     min wordfreq when source=wordfreq.

Path commonness
  --path-threshold 1e-7         min wordfreq for any word on the verified
                                all-common shortest path. Lower = more
                                obscure intermediates allowed.

Diversity
  --max-appearances 2  no word may appear as start or end in more than
                       this many levels (default 2). Set to a high number
                       for fewer constraints, or 1 for maximum variety.

Misc
  --wordlist 4 | 3     which game wordlist to source from (default 4).
  --seed 42            RNG seed (only affects --strategy random).
  --out PATH           override the output location.

Common recipes
--------------
Default: punishing campaign of 145 levels, par 4–8, mostly single-path.
    python3 scripts/generate_levels.py

Easier, more varied 100-level pack (random within each bucket):
    python3 scripts/generate_levels.py \\
      --distribution "3:30,4:40,5:30" --strategy random

Only show pairs with exactly one solution (hardest possible):
    python3 scripts/generate_levels.py --max-paths 1

Mid-difficulty pack (2–10 solutions per puzzle, scores 50–70):
    python3 scripts/generate_levels.py \\
      --min-paths 2 --max-paths 10 \\
      --min-difficulty 50 --max-difficulty 70

Filter pipeline (for the curious)
---------------------------------
1. Endpoints   — both endpoints must be in the chosen endpoint pool.
2. All-common  — verify at least one shortest path exists where every
                 word has wordfreq >= --path-threshold.
3. Numeric     — apply --min/--max-paths and --min/--max-difficulty.
4. Diversity   — greedy pass: skip any pair whose words have hit
                 --max-appearances.
5. Quota       — for each distance d in --distribution, pick at most
                 distribution[d] survivors via --strategy.
6. Order       — final list sorted ascending by composite difficulty.

Requires: pip install wordfreq
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from collections import defaultdict, deque
from pathlib import Path

try:
    from wordfreq import word_frequency
except ImportError:
    sys.exit("error: pip install wordfreq")

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
GAME_DIR = REPO_ROOT / "game"
OUTPUT_DIR = SCRIPT_DIR / "output"


def load_words(path: Path, pattern: str = r'"([A-Za-z]+)"') -> list[str]:
    return [w.upper() for w in re.findall(pattern, path.read_text())]


def build_adj(words: list[str]) -> dict[str, list[str]]:
    n = len(words[0])
    buckets: dict[str, list[str]] = {}
    for w in words:
        for i in range(n):
            buckets.setdefault(w[:i] + "*" + w[i + 1:], []).append(w)
    adj: dict[str, list[str]] = {w: [] for w in words}
    for bucket in buckets.values():
        if len(bucket) < 2:
            continue
        for w in bucket:
            for v in bucket:
                if v != w:
                    adj[w].append(v)
    for w in adj:
        adj[w].sort()
    return adj


def bfs(start: str, adj: dict[str, list[str]]):
    """BFS that records distances and a single canonical parent per node
    (lexicographically smallest, due to sorted adjacency lists)."""
    dist = {start: 0}
    parent = {start: None}
    q = deque([start])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                parent[v] = u
                q.append(v)
    return dist, parent


def reconstruct_path(end: str, parent: dict[str, str | None]) -> list[str]:
    path = [end]
    while parent[path[-1]] is not None:
        path.append(parent[path[-1]])
    path.reverse()
    return path


def load_candidates(tsv_path: Path):
    with tsv_path.open() as f:
        header = f.readline().rstrip("\n").split("\t")
        expected = ["rank", "word_a", "word_b", "distance",
                    "path_count", "avg_branching", "difficulty"]
        if header != expected:
            sys.exit(f"error: unexpected header in {tsv_path}: {header}")
        for line in f:
            fields = line.rstrip().split("\t")
            yield {
                "word_a":        fields[1],
                "word_b":        fields[2],
                "distance":      int(fields[3]),
                "path_count":    int(fields[4]),
                "avg_branching": float(fields[5]),
                "difficulty":    float(fields[6]),
            }


def parse_distribution(spec: str) -> dict[int, int]:
    result = {}
    for chunk in spec.split(","):
        d, n = chunk.split(":")
        result[int(d.strip())] = int(n.strip())
    return result


def format_level(c: dict) -> str:
    return (
        f'  {{ "start": {json.dumps(c["word_a"])}, '
        f'"end": {json.dumps(c["word_b"])}, '
        f'"par": {c["distance"]}, '
        f'"paths": {c["path_count"]} }}'
    )


def generate(wordlist_path: Path, tsv_path: Path, starters_path: Path,
             out_path: Path, *, endpoint_source: str, endpoint_threshold: float,
             path_threshold: float, distribution: dict[int, int],
             strategy: str, max_appearances: int, seed: int,
             min_paths: int | None, max_paths: int | None,
             min_difficulty: float | None, max_difficulty: float | None) -> None:

    print(f"[1/6] loading wordlist  ({wordlist_path.name})")
    words = load_words(wordlist_path)
    word_set = set(words)
    print(f"      {len(words):,} words")

    print(f"[2/6] computing word frequencies")
    freq = {w: word_frequency(w.lower(), "en") for w in words}

    print(f"[3/6] determining endpoint pool ({endpoint_source})")
    if endpoint_source == "starters":
        starter_words = {w for w in load_words(starters_path) if w in word_set}
        endpoint_pool = starter_words
        print(f"      {len(endpoint_pool):,} from {starters_path.name}")
    elif endpoint_source == "wordfreq":
        endpoint_pool = {w for w in words if freq[w] >= endpoint_threshold}
        print(f"      {len(endpoint_pool):,} with freq >= {endpoint_threshold}")
    else:
        sys.exit(f"error: unknown endpoint source {endpoint_source}")

    print(f"[4/6] building common-word subgraph (freq >= {path_threshold})")
    adj = build_adj(words)
    common_words = {w for w in words if freq[w] >= path_threshold}
    common_adj = {w: [v for v in adj[w] if v in common_words] for w in common_words}
    print(f"      {len(common_words):,} common words "
          f"({len(common_words) / len(words) * 100:.1f}% of wordlist)")

    print(f"[5/6] filtering candidate pairs")
    candidates = list(load_candidates(tsv_path))
    print(f"      {len(candidates):,} loaded")

    endpoint_filtered = [
        c for c in candidates
        if c["word_a"] in endpoint_pool and c["word_b"] in endpoint_pool
    ]
    print(f"      {len(endpoint_filtered):,} have both endpoints in endpoint pool")

    by_source: dict[str, list[dict]] = defaultdict(list)
    for c in endpoint_filtered:
        by_source[c["word_a"]].append(c)

    path_filtered: list[dict] = []
    for source in by_source:
        if source not in common_words:
            continue
        dist_common, parent_common = bfs(source, common_adj)
        for c in by_source[source]:
            target = c["word_b"]
            if target in dist_common and dist_common[target] == c["distance"]:
                c["path"] = reconstruct_path(target, parent_common)
                path_filtered.append(c)
    print(f"      {len(path_filtered):,} have an all-common shortest path")

    numeric_filters_active = any(
        v is not None for v in (min_paths, max_paths, min_difficulty, max_difficulty)
    )
    if numeric_filters_active:
        range_filtered = [
            c for c in path_filtered
            if (min_paths is None or c["path_count"] >= min_paths)
            and (max_paths is None or c["path_count"] <= max_paths)
            and (min_difficulty is None or c["difficulty"] >= min_difficulty)
            and (max_difficulty is None or c["difficulty"] <= max_difficulty)
        ]
        bounds = []
        if min_paths is not None or max_paths is not None:
            bounds.append(f"paths in [{min_paths or '∅'},{max_paths or '∅'}]")
        if min_difficulty is not None or max_difficulty is not None:
            bounds.append(f"difficulty in [{min_difficulty or '∅'},{max_difficulty or '∅'}]")
        print(f"      {len(range_filtered):,} survive numeric filters ({'; '.join(bounds)})")
    else:
        range_filtered = path_filtered

    print(f"[6/6] selecting levels  "
          f"(distribution={distribution}, strategy={strategy}, "
          f"max_appearances={max_appearances}, seed={seed})")
    by_distance: dict[int, list[dict]] = defaultdict(list)
    for c in range_filtered:
        by_distance[c["distance"]].append(c)

    rng = random.Random(seed)
    selected: list[dict] = []
    appearances: dict[str, int] = defaultdict(int)
    for d in sorted(distribution):
        target_n = distribution[d]
        pool = by_distance.get(d, [])[:]
        if strategy == "hardest":
            # Fewer paths first, then tighter corridor.
            pool.sort(key=lambda c: (c["path_count"], c["avg_branching"]))
        else:
            rng.shuffle(pool)
        picked = 0
        for c in pool:
            if picked >= target_n:
                break
            if appearances[c["word_a"]] >= max_appearances:
                continue
            if appearances[c["word_b"]] >= max_appearances:
                continue
            selected.append(c)
            appearances[c["word_a"]] += 1
            appearances[c["word_b"]] += 1
            picked += 1
        marker = " " if picked == target_n else " (SHORT)"
        print(f"        distance {d}: picked {picked}/{target_n} "
              f"from pool of {len(pool):,}{marker}")

    selected.sort(key=lambda c: c["difficulty"])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        f.write('/* Auto-generated by scripts/generate_levels.py.\n')
        f.write(f'   Wordlist: {wordlist_path.name}    Source: {tsv_path.name}\n')
        f.write(f'   Endpoint source: {endpoint_source}'
                f'{f" (threshold {endpoint_threshold})" if endpoint_source == "wordfreq" else ""}\n')
        f.write(f'   Path threshold: {path_threshold}    '
                f'Distribution: {distribution}\n')
        f.write(f'   Strategy: {strategy}    '
                f'Diversity: max_appearances={max_appearances}    '
                f'Seed: {seed}\n')
        if numeric_filters_active:
            parts = []
            if min_paths is not None:    parts.append(f"min_paths={min_paths}")
            if max_paths is not None:    parts.append(f"max_paths={max_paths}")
            if min_difficulty is not None: parts.append(f"min_difficulty={min_difficulty}")
            if max_difficulty is not None: parts.append(f"max_difficulty={max_difficulty}")
            f.write(f'   Numeric filters: {", ".join(parts)}\n')
        f.write(f'   {len(selected)} levels.\n')
        f.write('*/\n')
        f.write('const THIS_THAT_PAIRS = [\n')
        f.write(",\n".join(format_level(c) for c in selected))
        f.write("\n];\n")

    print(f"\nwrote {len(selected)} levels → {out_path}")
    _print_summary(selected, appearances)


def _print_summary(selected: list[dict], appearances: dict[str, int]) -> None:
    if not selected:
        return
    print(f"\nsummary:")
    diffs = [c["difficulty"] for c in selected]
    print(f"  difficulty range: {min(diffs):.2f} … {max(diffs):.2f}")
    print(f"  unique words used: {len(appearances):,}")
    reused = sum(1 for n in appearances.values() if n > 1)
    print(f"  words appearing in >1 level: {reused:,}")
    sample = sorted(selected, key=lambda c: c["difficulty"])
    print(f"\nfirst 3 (easiest):")
    for c in sample[:3]:
        print(f"  {c['word_a']:>5} → {c['word_b']:<5}  par {c['distance']}  "
              f"score {c['difficulty']:.2f}  path: {' '.join(c['path'])}")
    print(f"last 3 (hardest):")
    for c in sample[-3:]:
        print(f"  {c['word_a']:>5} → {c['word_b']:<5}  par {c['distance']}  "
              f"score {c['difficulty']:.2f}  path: {' '.join(c['path'])}")


def main():
    ap = argparse.ArgumentParser(description="generate a curated level pack for This That mode")
    ap.add_argument("--wordlist", choices=["3", "4"], default="4",
                    help="which wordlist to use (default: 4)")
    ap.add_argument("--endpoint-source", choices=["starters", "wordfreq"], default="starters",
                    help="endpoint pool: starters list or wordfreq threshold")
    ap.add_argument("--endpoint-threshold", type=float, default=1e-5,
                    help="min wordfreq for endpoints when --endpoint-source=wordfreq")
    ap.add_argument("--path-threshold", type=float, default=1e-7,
                    help="min wordfreq for words on the materialized path")
    ap.add_argument("--distribution", default="4:30,5:40,6:40,7:30,8:5",
                    help='per-distance quotas, e.g. "4:30,5:40,6:40,7:30,8:5"')
    ap.add_argument("--strategy", choices=["hardest", "random"], default="hardest",
                    help='within-bucket pick: "hardest" sorts by path_count then '
                         'avg_branching ascending; "random" shuffles (seeded)')
    ap.add_argument("--max-appearances", type=int, default=2,
                    help="max times any word may appear as start or end")
    ap.add_argument("--min-paths", type=int, default=None,
                    help="require path_count >= N (default: no minimum)")
    ap.add_argument("--max-paths", type=int, default=None,
                    help="require path_count <= N (default: no maximum)")
    ap.add_argument("--min-difficulty", type=float, default=None,
                    help="require composite difficulty score >= X")
    ap.add_argument("--max-difficulty", type=float, default=None,
                    help="require composite difficulty score <= X")
    ap.add_argument("--seed", type=int, default=42, help="rng seed for sampling")
    ap.add_argument("--out", type=Path, default=None,
                    help="output path (default: scripts/output/pairs.generated.js)")
    args = ap.parse_args()

    if (args.min_paths is not None and args.max_paths is not None
            and args.min_paths > args.max_paths):
        sys.exit(f"error: --min-paths ({args.min_paths}) > --max-paths ({args.max_paths})")
    if (args.min_difficulty is not None and args.max_difficulty is not None
            and args.min_difficulty > args.max_difficulty):
        sys.exit(f"error: --min-difficulty ({args.min_difficulty}) > "
                 f"--max-difficulty ({args.max_difficulty})")

    if args.wordlist == "4":
        wordlist = GAME_DIR / "wordlist.js"
        starters = GAME_DIR / "starters.js"
        tsv = OUTPUT_DIR / "pairs_4.tsv"
        default_out = OUTPUT_DIR / "pairs.generated.js"
    else:
        wordlist = GAME_DIR / "wordlist3.js"
        starters = GAME_DIR / "starters3.js"
        tsv = OUTPUT_DIR / "pairs_3.tsv"
        default_out = OUTPUT_DIR / "pairs3.generated.js"

    for p in (wordlist, tsv) + ((starters,) if args.endpoint_source == "starters" else ()):
        if not p.exists():
            sys.exit(f"error: missing input {p}\n"
                     f"(run scripts/word_pair_difficulty.py first if pairs_<N>.tsv is missing)")

    generate(
        wordlist_path=wordlist,
        tsv_path=tsv,
        starters_path=starters,
        out_path=args.out or default_out,
        endpoint_source=args.endpoint_source,
        endpoint_threshold=args.endpoint_threshold,
        path_threshold=args.path_threshold,
        distribution=parse_distribution(args.distribution),
        strategy=args.strategy,
        max_appearances=args.max_appearances,
        seed=args.seed,
        min_paths=args.min_paths,
        max_paths=args.max_paths,
        min_difficulty=args.min_difficulty,
        max_difficulty=args.max_difficulty,
    )


if __name__ == "__main__":
    main()
