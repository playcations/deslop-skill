#!/usr/bin/env node
/**
 * Scores a proposed batch of copy rewrites on outcome rather than process.
 *
 *   node scripts/deslop-measure.mjs proposal.json
 *   node scripts/deslop-measure.mjs proposal.json --json
 *   cat proposal.json | node scripts/deslop-measure.mjs
 *
 * Input is `[{ key, before, after }]`. `after: null` means "left alone", which
 * is a real answer and is counted as such rather than skipped.
 *
 * Why this exists: the deslop evals scored 100% while the catalog still read
 * like a machine wrote it. Every assertion asked whether the ritual ran -- did
 * it convene the panel, did it cluster before scoring, did it print WRONG IF.
 * None asked whether the copy got shorter or a tell went away. Nine iterations
 * of a skill can improve that score without improving a single sentence.
 *
 * So: words out, tells cleared, tells introduced, structure intact, facts kept.
 * A rewrite that adds words and clears nothing is a regression however good the
 * process was that produced it.
 */
import { readFileSync } from 'node:fs'

import { CHECKS } from './lib/deslop-rules.mjs'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const file = args.find((a) => !a.startsWith('--'))

/** Placeholders and tags are structure, not prose. Neutralise before counting. */
const prose = (t) => t.replace(/\{[^}]*\}/g, ' X ').replace(/<[^>]*>/g, ' ')
const words = (t) => prose(t).trim().split(/\s+/).filter(Boolean).length

/** `{name}` and `{count, plural, ...}` both contribute the name only. */
const params = (t) =>
  [...t.matchAll(/\{\s*([A-Za-z0-9_]+)/g)].map((m) => m[1]).sort()
const tags = (t) => [...t.matchAll(/<\/?([A-Za-z][A-Za-z0-9]*)/g)].map((m) => m[1]).sort()

/** Which rules a string trips. The scanner's rules, so one definition of a tell. */
const tells = (key, text) =>
  CHECKS.filter((c) => (!c.keyTest || c.keyTest(key)) && c.test(text)).map((c) => c.id)

/**
 * Facts worth not losing: numbers, and words the original capitalised
 * mid-sentence. Both survive rewording when the meaning survives, so one going
 * missing is a cue to read the pair. Sentence-initial capitals are excluded --
 * they move whenever a sentence is cut, and that is the point of the exercise.
 */
function facts(text) {
  const t = prose(text)
  const nums = [...t.matchAll(/\b\d[\d,.]*\b/g)].map((m) => m[0])
  const proper = [...t.matchAll(/(?<![.!?]\s|^)\b([A-Z][A-Za-z0-9]+)\b/g)].map((m) => m[1])
  return [...new Set([...nums, ...proper])]
}

const raw = readFileSync(file ?? 0, 'utf8')
let pairs
try {
  pairs = JSON.parse(raw)
} catch (err) {
  console.error(`Could not parse the proposal as JSON: ${err.message}`)
  process.exit(2)
}
if (!Array.isArray(pairs)) {
  console.error('Expected a JSON array of { key, before, after }.')
  process.exit(2)
}

const rows = []
for (const { key, before, after } of pairs) {
  if (typeof before !== 'string') {
    console.error(`${key}: missing "before"`)
    process.exit(2)
  }
  const unchanged = after == null || after === before
  const now = unchanged ? before : after

  const wasTells = tells(key, before)
  const nowTells = tells(key, now)

  rows.push({
    key,
    unchanged,
    before,
    after: unchanged ? null : after,
    wordsBefore: words(before),
    wordsAfter: words(now),
    cleared: wasTells.filter((t) => !nowTells.includes(t)),
    introduced: nowTells.filter((t) => !wasTells.includes(t)),
    remaining: wasTells.filter((t) => nowTells.includes(t)),
    paramBreak: params(before).join() !== params(now).join(),
    tagBreak: tags(before).join() !== tags(now).join(),
    factsLost: facts(before).filter((f) => !facts(now).includes(f)),
  })
}

const changed = rows.filter((r) => !r.unchanged)
const wb = rows.reduce((n, r) => n + r.wordsBefore, 0)
const wa = rows.reduce((n, r) => n + r.wordsAfter, 0)
const sum = (f) => rows.reduce((n, r) => n + f(r).length, 0)

const summary = {
  messages: rows.length,
  changed: changed.length,
  unchanged: rows.length - changed.length,
  wordsBefore: wb,
  wordsAfter: wa,
  wordDeltaPct: wb ? Math.round(((wa - wb) / wb) * 1000) / 10 : 0,
  tellsCleared: sum((r) => r.cleared),
  tellsIntroduced: sum((r) => r.introduced),
  tellsRemaining: sum((r) => r.remaining),
  structureBreaks: rows.filter((r) => r.paramBreak || r.tagBreak).length,
  factsLost: sum((r) => r.factsLost),
}

if (asJson) {
  console.log(JSON.stringify({ summary, rows }, null, 2))
} else {
  const pct = summary.wordDeltaPct
  console.log(`${summary.messages} messages: ${summary.changed} changed, ${summary.unchanged} left alone`)
  console.log(`words       ${wb} → ${wa}  (${pct > 0 ? '+' : ''}${pct}%)`)
  console.log(`tells       ${summary.tellsCleared} cleared, ${summary.tellsIntroduced} introduced, ${summary.tellsRemaining} still there`)
  console.log(`structure   ${summary.structureBreaks} broken`)
  console.log(`facts       ${summary.factsLost} missing from the rewrite`)

  for (const r of rows) {
    const notes = []
    if (r.paramBreak) notes.push(`BROKE {param}: ${params(r.before).join()} → ${params(r.after).join()}`)
    if (r.tagBreak) notes.push(`BROKE <tag>: ${tags(r.before).join()} → ${tags(r.after).join()}`)
    if (r.introduced.length) notes.push(`introduced ${r.introduced.join(', ')}`)
    if (r.factsLost.length) notes.push(`dropped ${r.factsLost.join(', ')}`)
    if (!r.unchanged && r.wordsAfter > r.wordsBefore) notes.push(`+${r.wordsAfter - r.wordsBefore} words`)
    if (r.unchanged && r.remaining.length) notes.push(`left alone but still trips ${r.remaining.join(', ')}`)
    if (!notes.length) continue
    console.log(`\n  ${r.key}`)
    console.log(`    now  ${JSON.stringify(r.before)}`)
    if (r.after != null) console.log(`    cut  ${JSON.stringify(r.after)}`)
    for (const n of notes) console.log(`    ! ${n}`)
  }
}

// A structure break is a compile error and an introduced tell is a regression.
// Both are worth failing a batch over; word count and lost facts are judgement.
process.exit(summary.structureBreaks || summary.tellsIntroduced ? 1 : 0)
