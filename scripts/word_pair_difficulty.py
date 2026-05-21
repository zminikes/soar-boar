"""
Soar Boar — Word Pair Difficulty Calculator
============================================
For the "This That" word-ladder mode: compute the difficulty of getting
from every word A to every other word B in the 4- and 3-letter wordlists.

Mechanics modeled:
  - At each step you change exactly one letter to form another valid word.
  - The wordlist defines the graph (nodes = words, edges = one-letter-different).

Per (start, end) we compute three components:
  distance      — shortest path length (BFS hops)
  path_count    — number of distinct shortest paths
  avg_branching — mean degree of the nodes on the shortest-path DAG
                  (lower = more constrained = harder)

Composite score (sorted ascending = easiest → hardest):
  score = DIST_WEIGHT   * distance
        + PATH_WEIGHT   * (1 / log2(path_count + 1))   # fewer paths → bigger penalty
        + BRANCH_WEIGHT * (1 / avg_branching)          # tighter corridor → bigger penalty

Default weights (10 / 1 / 2) are starter values tuned by feel — distance
dominates, path_count and branching break ties. Re-rank by passing
different weights on the CLI once you've eyeballed the output.

Output: one TSV per wordlist. Run once, then derive ranked levels from the TSV.

Memory: peaks around 1 GB on the 4-letter run (all ~6.3M result rows are
held in memory before sorting). Tractable on a dev laptop; if you run on
a constrained box, do one wordlist at a time with --only.
"""

import argparse
import math
import re
import time
from collections import Counter, deque
from pathlib import Path

WORDLIST_RE = re.compile(r'"([A-Z]+)"')

REPO_ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = REPO_ROOT / "game"


def load_wordlist(path: Path) -> list[str]:
    return WORDLIST_RE.findall(path.read_text())


def build_graph(words: list[str]) -> dict[str, list[str]]:
    """Adjacency list keyed by word. O(N * L) via wildcard buckets."""
    n = len(words[0])
    buckets: dict[str, list[str]] = {}
    for w in words:
        for i in range(n):
            key = w[:i] + "*" + w[i + 1:]
            buckets.setdefault(key, []).append(w)
    adj: dict[str, list[str]] = {w: [] for w in words}
    for bucket in buckets.values():
        if len(bucket) < 2:
            continue
        for w in bucket:
            for v in bucket:
                if v != w:
                    adj[w].append(v)
    return adj


def bfs(start: str, adj: dict[str, list[str]]):
    """BFS from `start`. Returns dist, path_count, and DAG parents per node."""
    dist = {start: 0}
    paths = {start: 1}
    parents: dict[str, list[str]] = {start: []}
    q = deque([start])
    while q:
        u = q.popleft()
        du = dist[u]
        dv = du + 1
        pu = paths[u]
        for v in adj[u]:
            if v not in dist:
                dist[v] = dv
                paths[v] = pu
                parents[v] = [u]
                q.append(v)
            elif dist[v] == dv:
                paths[v] += pu
                parents[v].append(u)
    return dist, paths, parents


def dag_nodes(end: str, parents: dict[str, list[str]]) -> set[str]:
    """All nodes on any shortest path from start (implicit) to end."""
    seen = {end}
    stack = [end]
    while stack:
        v = stack.pop()
        for u in parents[v]:
            if u not in seen:
                seen.add(u)
                stack.append(u)
    return seen


def compute(words: list[str], out_path: Path,
            dist_w: float, path_w: float, branch_w: float) -> None:
    t0 = time.time()
    adj = build_graph(words)
    playable = [w for w in words if adj[w]]
    print(f"  words: {len(words)} total → {len(playable)} playable")

    rows: list[tuple] = []
    n = len(playable)
    log_every = max(1, n // 20)
    for i, s in enumerate(playable):
        if (i + 1) % log_every == 0:
            elapsed = time.time() - t0
            print(f"  BFS {i + 1}/{n}  ({elapsed:.1f}s, {len(rows):,} pairs so far)")
        dist, paths, parents = bfs(s, adj)
        for e, d in dist.items():
            if d == 0:
                continue
            nodes = dag_nodes(e, parents)
            ab = sum(len(adj[v]) for v in nodes) / len(nodes)
            pc = paths[e]
            score = (
                dist_w * d
                + path_w * (1.0 / math.log2(pc + 1))
                + branch_w * (1.0 / ab)
            )
            rows.append((score, d, pc, ab, s, e))

    print(f"  sorting {len(rows):,} pairs…")
    rows.sort()

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        f.write("rank\tstart\tend\tdistance\tpath_count\tavg_branching\tdifficulty\n")
        for rank, (score, d, pc, ab, s, e) in enumerate(rows, 1):
            f.write(f"{rank}\t{s}\t{e}\t{d}\t{pc}\t{ab:.3f}\t{score:.4f}\n")

    hist = Counter(r[1] for r in rows)
    print(f"  distance histogram:")
    for d in sorted(hist):
        print(f"    {d:>2}: {hist[d]:>10,}")
    unreachable = len(playable) * (len(playable) - 1) - len(rows)
    print(f"  unreachable pairs (different components): {unreachable:,}")
    print(f"  wrote {len(rows):,} pairs → {out_path}  ({time.time() - t0:.1f}s)")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out-dir", type=Path,
                    default=Path(__file__).resolve().parent / "output",
                    help="directory to write pairs_3.tsv and pairs_4.tsv")
    ap.add_argument("--dist-weight", type=float, default=10.0)
    ap.add_argument("--path-weight", type=float, default=1.0)
    ap.add_argument("--branch-weight", type=float, default=2.0)
    ap.add_argument("--only", choices=["3", "4"], help="only process one wordlist")
    args = ap.parse_args()

    if args.only in (None, "3"):
        print("3-letter wordlist:")
        compute(load_wordlist(GAME_DIR / "wordlist3.js"),
                args.out_dir / "pairs_3.tsv",
                args.dist_weight, args.path_weight, args.branch_weight)
    if args.only in (None, "4"):
        print("4-letter wordlist:")
        compute(load_wordlist(GAME_DIR / "wordlist.js"),
                args.out_dir / "pairs_4.tsv",
                args.dist_weight, args.path_weight, args.branch_weight)


if __name__ == "__main__":
    main()
