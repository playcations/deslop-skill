#!/usr/bin/env python3
"""
Mechanically check a deslop eval answer for the structural assertions.

    python3 code-check.py <answer.md> [answer.md ...]
    python3 code-check.py --baseline          # print the frozen panel baseline

Only the mechanically decidable assertions live here. Whether a run correctly
resolved a judgement call - a page-vs-tab naming question, say -
still needs reading, because a grep cannot tell a right answer from a wrong one
that uses the same words.

Everything about lens membership, clustering and WRONG IF is gone with the
panel. What is left is what an answer has to show regardless of how it was
produced: the pair, the restraint, and the number.
"""
import re
import sys
from pathlib import Path

# The panel arm, measured once against the single pass on the same 54-message
# `jobs` batch, then retired. Kept so nobody rebuilds it on a hunch: it is four
# times the cost for half the compression, and its rewriters found nothing the
# single pass did not. The verification redundancy was the part worth keeping,
# and that moved into SKILL.md step 2.
BASELINE = {
    "arm": "4 lenses + 2 verifiers + converge, 7 agents",
    "tokens": 1_009_631,
    "wall_clock_min": 33,
    "messages_changed": "17/54",
    "word_delta_pct": -11.0,
    "tells_cleared": 1,
    "contradictions": 9,
    "single_pass_tokens": 240_147,
    "single_pass_word_delta_pct": -21.3,
    "single_pass_contradictions": 15,
    "contradiction_overlap": 0,  # disjoint sets; verification has low recall
}

# An answer that proposes copy without a before/after pair cannot be checked by
# anything downstream, including the user.
CHECKS = {
    "shows before and after": lambda t: len(
        re.findall(r"^\s*(now|before)\b|→|\bwas\b.*\bnow\b", t, re.I | re.M)
    ),
    "leaves something alone": lambda t: len(
        re.findall(r"unchanged|already (good|fine)|leave (it|as)", t, re.I)
    ),
    "quantifies the reduction": lambda t: len(
        re.findall(r"\bwords?\b.*[-−]\d|\d+\s*→\s*\d+|\bdeslop-measure\b|\b\d+%\s*(shorter|fewer)", t, re.I)
    ),
    "separates contradictions from wording": lambda t: len(
        re.findall(r"contradict|\bfalse claim|does not match the code|file:line|\.tsx?:\d+", t, re.I)
    ),
}

# Spawning rewriters is the retired method, so an answer that did it is wrong
# however good the copy came out.
FORBIDDEN = {
    "convened a rewrite panel": lambda t: len(
        re.findall(r"\bconvene[ds]?\b.*\bpanel\b|\bfour lenses\b|\blens:\s|\bpanel of\b", t, re.I)
    ),
}


def check(path: Path) -> bool:
    text = path.read_text(errors="replace")
    print(f"\n{path}")
    ok = True
    for name, fn in CHECKS.items():
        n = fn(text)
        ok &= n > 0
        print(f"  {'PASS' if n > 0 else 'FAIL'}  {name:38} {n}")
    for name, fn in FORBIDDEN.items():
        n = fn(text)
        ok &= n == 0
        print(f"  {'PASS' if n == 0 else 'FAIL'}  {name:38} {n}")
    return ok


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] == "--baseline":
        print("Retired panel arm, measured against the single pass on one batch:")
        for k, v in BASELINE.items():
            print(f"  {k:34} {v}")
        print("\nDo not rebuild the panel. These numbers are why it went.")
        sys.exit(0)
    sys.exit(0 if all(check(Path(a)) for a in args) else 1)
