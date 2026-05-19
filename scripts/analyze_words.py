"""
Soar Boar — Word Position Difficulty Analysis
==============================================
Analyzes a 4-letter word list to determine how many valid neighbors
can be reached by changing each letter position. Used to assign point
values in the game: fewer neighbors = harder = more points.

Requires: pip install english-words wordfreq
"""

from collections import defaultdict
from english_words import get_english_words_set

try:
    from wordfreq import word_frequency
    USE_FREQ_FILTER = True
except ImportError:
    USE_FREQ_FILTER = False
    print("wordfreq not installed — skipping frequency filter. pip install wordfreq for better results.\n")

# ── Build word set ──────────────────────────────────────────────────────────

all_words = get_english_words_set(['web2'], lower=True, alpha=True)
four_set = set(w for w in all_words if len(w) == 4)

if USE_FREQ_FILTER:
    four_set = set(w for w in four_set if word_frequency(w, 'en') > 5e-7)

def get_neighbors(word, word_set):
    neighbors = []
    for pos in range(4):
        for c in 'abcdefghijklmnopqrstuvwxyz':
            if c == word[pos]:
                continue
            candidate = word[:pos] + c + word[pos+1:]
            if candidate in word_set:
                neighbors.append((pos, candidate))
    return neighbors

# Keep only words that have at least one neighbor
playable = set(w for w in four_set if get_neighbors(w, four_set))
print(f"Playable 4-letter words: {len(playable)}\n")

# ── Analyze neighbor counts per position ───────────────────────────────────

pos_counts = defaultdict(list)

for word in playable:
    for pos in range(4):
        count = sum(
            1 for c in 'abcdefghijklmnopqrstuvwxyz'
            if c != word[pos] and word[:pos] + c + word[pos+1:] in playable
        )
        pos_counts[pos].append(count)

print("Average neighbors reachable by changing each position:")
print("(Higher avg = easier = lower point value in game)\n")

labels = ['1st', '2nd', '3rd', '4th']
avgs = []
for pos in range(4):
    counts = pos_counts[pos]
    avg = sum(counts) / len(counts)
    reachable_pct = sum(1 for c in counts if c > 0) / len(counts) * 100
    avgs.append((avg, pos))
    print(f"  Position {pos+1} ({labels[pos]} letter):")
    print(f"    avg neighbors : {avg:.2f}")
    print(f"    ≥1 neighbor   : {reachable_pct:.1f}% of words")

print()

# ── Rank and suggest point values ──────────────────────────────────────────

avgs_sorted = sorted(avgs, reverse=True)  # easiest → hardest
point_values = {}
point_scale = [1, 2, 3, 4]

print("Ranking easiest → hardest → suggested points:\n")
for rank, (avg, pos) in enumerate(avgs_sorted):
    pts = point_scale[rank]
    point_values[pos] = pts
    print(f"  #{rank+1}  Position {pos+1} ({labels[pos]} letter)  avg={avg:.2f}  → {pts} pt{'s' if pts > 1 else ''}")

print()
print("Suggested scoring dict for the game:")
print(f"  POSITION_POINTS = {{{', '.join(str(pos)+': '+str(point_values[pos]) for pos in range(4))}}}")
print()

# ── Best starter words ──────────────────────────────────────────────────────

starter_candidates = []
for word in playable:
    n = len(get_neighbors(word, playable))
    starter_candidates.append((n, word))

starter_candidates.sort(reverse=True)
print("Top 20 starter words (most neighbors across all positions):")
for n, w in starter_candidates[:20]:
    print(f"  {w.upper()}  ({n} neighbors)")
