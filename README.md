# deslop

A Claude Code skill that cuts machine-written interface copy. The defect it
targets is bloat, not error: an agent writing UI text answers uncertainty with
another sentence, where a designer would answer it with placement or an undo.
So the fix is deletion, checked against the code.

```
now  "Not interested — remove this item (recoverable from Trash)"
cut  "Not interested"
```

A tooltip on an X. The reader knows what an X does.

## Install

```bash
git clone https://github.com/playcations/deslop-skill
cd deslop-skill && npm install       # typescript, for the catalog parser
ln -s "$PWD" ~/.claude/skills/deslop
```

Then, in each project you want to run it on:

```bash
cp /path/to/deslop-skill/deslop.config.example.json ./deslop.config.json
$EDITOR deslop.config.json           # point "catalog" at your message catalog
```

and fill in `references/binding.md` with your project's settled decisions:
failure openings, terminology, which tests assert on copy. A blank section
reads as "no opinion", and a pass will invent one.

The scripts read a TypeScript catalog exporting one nested object named `en`.
For any other shape, `readCatalog()` in `scripts/lib/deslop-rules.mjs` is the
only place that needs to change.

## How it works

Ask Claude in plain language. "The settings screen reads like a robot wrote
it", "tighten this error message". The skill triggers on the complaint, not on
a keyword.

It works a fixed checklist, spelled out in `SKILL.md`: scope the batch, verify
every string against the code that renders it, cut per the rules in
`references/cuts.md`, score the result, name the calls that could go either
way, then propose before/after pairs for approval. It never rewrites
unattended. Copy that contradicts what the code does is reported separately
and first, because that is a bug, and you may want the code changed instead.

The scripts also run on their own, from your project root:

```bash
node /path/to/deslop-skill/scripts/deslop-scan.mjs               # mechanical tells, by key and line
node /path/to/deslop-skill/scripts/deslop-scan.mjs --ns settings # one namespace
node /path/to/deslop-skill/scripts/deslop-sweep.mjs --apply      # deterministic punctuation fixes
node /path/to/deslop-skill/scripts/deslop-measure.mjs proposal.json
```

`deslop-measure.mjs` scores a proposed batch, `[{key, before, after}]` with
`after: null` for lines left alone. It exits non-zero if a rewrite introduces
a tell or breaks a `{param}` placeholder.

## License

MIT. See [LICENSE](LICENSE).
