# What to cut

## Contents

- The default move
- Cut classes, with real pairs
- Tells that do not apply here
- What not to cut
- The pass

## The default move

Deletion. Not rewording.

An agent writing interface copy has one lever, words, and is rewarded for
helpfulness. So it answers uncertainty with a sentence where a designer would
answer it with placement, an affordance or an undo. The result is true, fluent,
and says what nobody needed said.

Your best answer is usually a shorter version of the same string. Your second
best is no string.

Test every line: **would a real product say this here?**

## Cut classes

Every pair below is real, taken from a shipping product's catalog.

### 1. Reassurance tail

Advice the reader already has, appended to a fact. On one 5,800-message
catalog, 47 messages carried one — the largest single class of slop in it.

```
now  "Failed to connect. Please try again."
cut  "Failed to connect."
```

The retry button is on screen. If it is not, the missing thing is a button.

### 2. The affordance, explained

```
now  "Not interested — remove this item (recoverable from Trash)"
cut  "Not interested"
```

A tooltip on an X. The reader knows what an X does, and the parenthetical
answers an unasked question. Destructive controls do not explain themselves —
undo carries reversibility, colour carries consequence.

### 3. The heading, restated

```
now  "Configure installation-wide behavior. Changes save automatically."
cut  "Changes save automatically."
```

The section heading already said what the section configures. First sentences
under a heading are the single richest source of cuttable words in a catalog.

### 4. The ceremony

```
now  "Are you sure you want to delete {name}? This action cannot be undone."
cut  "Delete {name}?"
```

"Are you sure" is not a question about anything. And check the handler before
keeping the second sentence: one delete dialog here claimed permanence over a
`deleted_at` soft delete.

### 5. The abstraction triad

Three nouns in a row where one concrete thing would do. Scanned as
`abstraction-triad`.

### 6. Hedge

`may`, `might`, `can help`, `could potentially`. Either it happens or it does
not. Say which, or say nothing.

### 7. Em dash welding two half-thoughts

House style, and usually a sign the sentence carries two ideas. Split it, then
ask whether the second one earns a sentence.

## Tells that do not apply here

Do not open with a word blacklist. Counted across one 5,800-message product
catalog: `seamless` 0, `unlock` 0, `robust` 0, `leverage` 0, `delve` 0,
`elevate` 0. The marketing-AI vocabulary that dominates advice about AI writing
barely appears in interface copy, because the strings are short and were written
against a screen.

Interface slop is structural, not lexical. Count sentences, not adjectives: 399
messages in that catalog carried two or more, and that is where the work was.
Run the count on your own catalog before assuming otherwise.

## What not to cut

**Facts.** A number, a provider name, a file type, a keyboard shortcut, a
constraint like `(max 500 characters)`. Length spent on a fact is not bloat.

**The actionable half.** `"Nothing to regenerate yet. Answer a question first."`
is two sentences and correct: state, then the way out. Cutting the second
sentence leaves the reader stuck.

**Sample content.** Strings that demonstrate to the reader what a good long
answer looks like. Length is their purpose. List their key patterns under
`exemptFromLength` in the config so the length rule stops flagging them.

**Copy that is already specific and load-bearing.** Most catalogs are mostly
fine. Changing good copy to different good copy is churn, and it spends the
review attention the bad lines need.

**`{param}` names, ICU plural syntax, rich-text tags.** Placeholders are
type-checked and the call site supplies a renderer per tag name.

## The pass

Per message, in order. Stop at the first that fires.

1. Is it copy at all? SQL, a class list, a header, an exception name — report it
   for removal, do not improve it.
2. Is it true? Read the handler. A better-worded false statement is worse than
   the original, because it now reads credibly.
3. Does the screen already say this? Cut.
4. Does a sentence carry no fact and no action? Cut the sentence.
5. Can the remaining sentence lose words without losing a fact? Cut the words.
6. Otherwise `UNCHANGED`.

A batch with no `UNCHANGED` means you edited for the sake of it.

Then score the batch:

```bash
node scripts/deslop-measure.mjs proposal.json
```

Words should go down. `tellsIntroduced` and `structureBreaks` must be zero —
the script exits non-zero if either is not. Read every `dropped` line: that is
the script asking whether you cut a fact, and sometimes you did.
