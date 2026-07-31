# Binding this to a project

## Contents

- What the scripts expect
- `deslop.config.json`
- House decisions
- Which tests pin a string
- Hooks
- Verify

Everything in `SKILL.md` and `cuts.md` is portable. This file is the part that
is yours, and it is worth filling in properly — the settled decisions below are
what stop a pass relitigating your product's voice every time it runs.

Keep it in the skill directory beside `cuts.md`, and answer every heading. A
blank section reads as "no opinion", and the pass will invent one.

## What the scripts expect

A single TypeScript module exporting one nested object of string messages:

```ts
export const en = {
  jobs: {
    empty: { title: 'No saved jobs' },
    failedToLoad: 'Failed to load jobs',
  },
} as const
```

Keys are dotted paths built from the nesting. Values are strings, optionally
carrying `{param}` placeholders and `<tag>…</tag>` markup. The parser reads the
declaration named `en`; it does not execute the module, so imports and helpers
in the file are ignored.

If your catalog is JSON, or a flat map, or several files, the scripts need a
different reader. `readCatalog()` in `scripts/lib/deslop-rules.mjs` is the only
place that knows the shape.

## `deslop.config.json`

Copy `deslop.config.example.json` to your project root. The scripts find it by
walking up from the working directory, and its location defines the project
root. Point `DESLOP_CONFIG` at a specific file to override.

| Field | What it is |
|---|---|
| `catalog` | Path to the message catalog, relative to the config file. Required. |
| `properNouns` | Product names that are legitimately Title Case, so the scan can report a noun spelled both ways without flagging every capital. |
| `exemptFromLength` | Key patterns, as regex source strings, that the length rule skips. For sample content shown to the reader as an example of a good long answer, where length is the point. |

## House decisions

**Fill these in.** They are settled and a pass must not reopen them. Delete the
placeholders and write yours.

- **Failure opening.** One of `Failed to …`, `Unable to …`, `Could not …`. Pick
  one and convert the others.
- **Semicolons.** Allowed, or replaced with a period.
- **Ellipsis.** `…` or `...`.
- **Case.** Sentence case for body text is the usual answer, with Title Case
  reserved for the product nouns listed in the config.
- **Terminology.** Any concept your product names in a way that looks wrong and
  is not. Write down the pairs that are *deliberately* different, because
  "one term per concept" is the rule whose fix is most likely to break working
  copy.

## Which tests pin a string

```bash
grep -rn "<the exact string>" tests/ src --include='*.test.ts' --include='*.test.tsx'
```

Record here how your suite asserts on copy. Tests that read the catalog follow
a reword for free; tests asserting rendered text will legitimately fail and need
updating in the same commit. A batch that silently breaks nineteen suites is not
finished work.

## Hooks

`scripts/deslop-hook.mjs` runs on Edit/Write and at Stop. Register it in your
agent's settings so it fires whether or not the skill was invoked — copy
regressions arrive from code-generation passes that never think about wording.

It reports only messages the current session changed. Reporting every standing
finding on every edit trains the reader to skim past it, which is worse than no
hook. It never writes to source and never touches git.

## Verify

Record the commands that prove a batch did not break anything:

```bash
# type check
# the test files that assert on rendered copy
# the test files that read the catalog
node scripts/deslop-scan.mjs
```

Glob widely enough. Two source-asserting suites once broke and went unnoticed
for several rounds because the verification command only globbed `.tsx`.

## Out of scope

Say what the pass must not touch. Prompt text sent to a model is the common one:
rewriting a prompt risks changing model output, and a French user's content
coming back in English is a product bug rather than a copy bug.
