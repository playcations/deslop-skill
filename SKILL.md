---
name: deslop
description: Fix interface copy that reads like a machine wrote it, by cutting it down and checking it against the code. Use this whenever the user says the app's text sounds AI-written, generic, wordy, hedgy or off; when they want to edit or review UI copy, labels, buttons, headings, empty states, error messages, tooltips or microcopy; when they point at em dashes, inconsistent terminology or tone; when they ask to tighten, clarify or humanise wording; and after any code-generation pass adds new strings. Use it even if they never say "copy" or "slop" and just complain that a screen reads badly.
---

# De-slop the interface copy

The primary defect is bloat, not error. The copy is true and says what nobody
needed said. So the work is deletion, and the measure of a pass is words
removed with no fact lost.

Read `references/cuts.md` before editing anything. It is the standard.

## Do this

Copy the checklist and work it. Steps 1 and 2 are not optional and not
reorderable — a rewrite of a false statement is a better-worded false statement.

```
- [ ] 1. Scope the batch    (pointed → the lines they named; sweep → run the scan)
- [ ] 2. Verify             (is it copy? is it true? which tests pin it?)
- [ ] 3. Cut                (single pass over the batch, per cuts.md)
- [ ] 4. Measure            (deslop-measure.mjs — words down, no tell introduced)
- [ ] 5. Name the forks     (two defensible answers → the user decides, not you)
- [ ] 6. Propose            (before/after, contradictions first, pinned tests named)
- [ ] 7. Apply on approval, then verify
```

Never rewrite unattended. This is the product's voice and it belongs to the user.

## 1. Scope

**Pointed** — "fix these three phrases". Skip the scan; they did the finding. No
inventory, no sweep, nothing they did not ask about.

Pointed is not isolated. Read what renders **around** the target — heading above,
button beside, sibling paragraphs — or you cannot see repetition, contradiction,
or a term used two ways. Fix the target, list the neighbours for the user.

**Sweep** — "go through the admin section". Run the scan; finding is half the job.
Work one surface at a time so terminology decisions stay consistent.

When in doubt it is pointed.

Scope is text a user reads: labels, headings, body, errors, empty states,
tooltips, accessible names. Not layout, colour, spacing or motion — note a
visual problem in one line and move on. Rendered behaviour is still copy: seven
rows announcing one sentence through `aria-live` is a text defect.

## 2. Verify

**Is it copy at all?** String extraction is imperfect. Classes that reached this
catalog and were removed: SQL fragments, Tailwind class lists, `fontFamily`
values, HTTP headers, a seed password, exception class names. Each one, reworded
during an editorial pass, breaks something silently. Sweep for them —
`references/binding.md` has the grep. Open the call site before recommending
removal: `'DELETE ME'` looks like a stray literal and is the placeholder
guarding a destructive reset. Report confirmed cases. Do not improve them.

**Is it true?** The highest-value finding is a sentence that contradicts what the
software does. Grep the key, read the handler, and confirm the message describes
what actually happens. Confirm any named feature or navigation path exists.
Count from the code — if you are about to write "six tiles", the number comes
from the component.

Read every message in scope, then the components and handlers behind them. **Do
not divide the work by topic.** Partitioning scored worse than a single reviewer
reading everything, because each partition read a third of the code and none of
them saw the sentence that contradicted a handler two directories away.

Produce these six lists before writing a single rewrite:

| List | Each entry carries |
|---|---|
| `contradictions` | key, the claim, `file:line` proving it false, and whether the fix is copy or code |
| `deadKeys` | key, and why you believe nothing renders it |
| `nonCopy` | key, and what the string actually is |
| `renderDefects` | what goes wrong on screen that no single string shows |
| `certified` | keys you read against the code and found accurate |
| `unverifiable` | keys whose claim you could not settle, and what blocked you |

`certified` is not bookkeeping. Two reviewers were used here because each one
certified as correct a line the other caught, so **re-read your own `certified`
list once and try to break it** before moving on. That second look is the part a
single pass has to buy deliberately — it comes free with two agents and not
otherwise.

`unverifiable` is how a single pass stays honest. An unsettled claim belongs in
its own list, never quietly in `certified`.

Report contradictions separately, and first. They are bugs, and the user may
want the code changed rather than the copy.

Three rules that have each caught this skill out:

- **Two names are not drift until you confirm they name the same thing.**
  One pair that looked like drift here turned out to be a page and a tab inside
  it. Consistency is the one rule whose fix is more dangerous than the defect.
- **Absence is the easiest thing to get wrong.** One empty grep is not evidence.
  Search three names, check cron and maintenance paths, find the governing
  constant. Then write "I could not find X", never "X does not exist".
- **Verification is scoped to strings that render.** A wrong comment, a stale
  docstring, a missing landmark: not copy, however satisfying to find. One line
  at the end, then move on.

**Which tests pin it?** Copy is asserted on by tests. Find out which targets are
pinned and say so in the proposal. A batch that silently breaks nineteen suites
is not finished work.

**How much verification.** *Pointed* — read the two or three call sites
yourself, and say the check was single-pass. *Sweep* — several agents, same
brief, same scope, **not** partitioned, unioned.

Verification has low recall and high variance, and this is the measured shape of
it. On one 54-message namespace, two verifiers found 9 contradictions and a
third independent pass found 15. **The two sets shared no key at all.** Neither
run was lazy: each read the namespace end to end, and they still drifted into
different parts of the code — the pair clustered on one feature's keys, the
single pass on two others.

So: never report a verification pass as complete. Write "what this pass found",
and expect the next pass to find a disjoint set. When the copy has to be right,
the lever is more independent verify passes — not more rewriters, which measured
almost nothing on the same batch.

## 3. Cut

One pass over the batch against `references/cuts.md`. This is the default and it
is usually enough — the cut rules are explicit, and most messages resolve to
delete-a-sentence, delete-a-clause, or `UNCHANGED`.

`UNCHANGED` is a real answer. A batch with no `UNCHANGED` means you edited for
the sake of it.

## 4. Measure

```bash
node scripts/deslop-measure.mjs proposal.json    # [{key, before, after}]
```

Words down, `tellsIntroduced` zero, `structureBreaks` zero. The script exits
non-zero on the last two. Read every `dropped` line — that is the script asking
whether you cut a fact.

A pass that added words and cleared no tell is a regression, however good the
process that produced it. Report the numbers in the proposal.

## 5. Name the forks

Some messages have two defensible answers. Say so — do not pick silently, and do
not spend agents manufacturing a third opinion.

A fork is worth naming when you would defend both lines: a deletion where the
neighbouring copy might already carry the meaning, a term that reads as jargon
to a newcomer and as precision to the user, a page description that is the
product's voice rather than a task instruction.

Give the user both lines, one sentence each on what the choice costs, and your
recommendation. Four of these on a 54-message namespace is normal. They are the
part of the job that is genuinely theirs, and handing them over is cheaper and
more honest than another pass of machinery.

The rest of the batch does not wait on them. Propose it.

## What not to do

Not a word blacklist. "Comprehensive" is slop in `Comprehensive job tracking`
and correct in `your comprehensive professional record`. Judge what a sentence
*does*. The marketing-AI vocabulary is measurably absent here anyway — see
`cuts.md`.

Do not move or extract strings. Different job, different tool.

**Do not spawn a panel of rewriters.** This skill used to convene four editorial
standards per batch and pick per line. Measured against a single pass on the
same 54 messages, it cut half as many words for four times the tokens, and two
of its four seats were prescribing formulas that add words. One pass against
`cuts.md` is the method. Redundancy belongs in step 2, where it measurably pays.

**Verified true is not worth saying.** A button firing an all-sites permission
prompt is a real finding and still does not belong in the paragraph — the
browser discloses it better, at the moment of use.

## The project binding

`references/binding.md` carries the project binding: where the catalog lives,
the house decisions already settled, which tests pin a string, the hooks, and
the verification commands. Read it before touching a batch — the settled
decisions are what stop a pass relitigating the product's voice.

Everything above it is portable. If `binding.md` still has its placeholder
sections, fill them in with the user before the first sweep.
