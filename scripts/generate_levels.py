"""
Soar Boar — Level Pack Generator (level-generation pipeline, step 2)
=====================================================================
Produces a curated list of (start, end, par, paths) levels for "This That"
mode, drop-in shaped for `game/pairs.js`.

  paths — total number of distinct shortest paths in the full word graph.
          1 means "exactly one solution"; higher numbers mean the player
          has multiple equally-short routes. Useful as a difficulty
          indicator independent of par.

The path *content* the original pairs.js included is intentionally
dropped — the game never reads it at runtime (it computes shortest
paths on the fly via bfsPath in game/index.html). Internally this
script still materializes a canonical all-common path to *verify*
each pair is solvable using recognizable words, but it's not written
to the output.

Inputs:
  - scripts/output/pairs_<N>.tsv   (from word_pair_difficulty.py)
  - game/wordlist<N>.js            (graph rebuild for path materialization)
  - game/starters<N>.js            (curated endpoint pool — default source)

Filters (in order):
  1. Endpoints — both word_a and word_b must be in the curated starters pool.
     Override with --endpoint-source=wordfreq to use a wordfreq threshold instead.
  2. Path commonness — at least one shortest path must exist where every
     node has wordfreq >= --path-threshold. The materialized path uses
     this all-common subgraph, so what ships in pairs.js is guaranteed
     solvable using only recognizable words.

Selection:
  3. Distance distribution via --distribution "4:30,5:40,6:40,7:30,8:5"
     (default ramps from par-4 warm-ups to single-path par-7 grinders).
  4. Diversity: no word appears as start or end in more than
     --max-appearances levels (default 2).
  5. Within each distance bucket: pick by --strategy.
       hardest (default) — sort by path_count ascending, then
                            avg_branching ascending. Fewer paths and
                            tighter corridors = brain-bending puzzles.
       random            — shuffle (seeded) and take in order. Use
                            this for variety / less-punishing packs.
  6. Final output sorted ascending by composite difficulty score so the
     campaign ramps from easy to hard.

Output:
  scripts/output/pairs.generated.js  (drop-in replacement for game/pairs.js,
  written to scripts/output/ so you can diff before copying over).

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
             strategy: str, max_appearances: int, seed: int) -> None:

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

    print(f"[6/6] selecting levels  "
          f"(distribution={distribution}, strategy={strategy}, "
          f"max_appearances={max_appearances}, seed={seed})")
    by_distance: dict[int, list[dict]] = defaultdict(list)
    for c in path_filtered:
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
    ap.add_argument("--seed", type=int, default=42, help="rng seed for sampling")
    ap.add_argument("--out", type=Path, default=None,
                    help="output path (default: scripts/output/pairs.generated.js)")
    args = ap.parse_args()

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
    )


if __name__ == "__main__":
    main()
