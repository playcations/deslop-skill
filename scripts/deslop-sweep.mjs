#!/usr/bin/env node
/**
 * Applies the mechanical half of the de-slop pass to the configured catalog.
 *
 *   node scripts/deslop-sweep.mjs           preview every change, write nothing
 *   node scripts/deslop-sweep.mjs --apply   rewrite the catalog
 *
 * Only unambiguous edits live here: punctuation and one-word-for-another where
 * the meaning cannot shift. Anything requiring a judgement about what a
 * sentence is trying to say belongs in the deslop skill and a human review.
 *
 * Keys are never touched. Values only.
 */
import { readFileSync, writeFileSync } from 'node:fs'

import ts from 'typescript'

import { relative } from 'node:path'

import { CATALOG } from './lib/config.mjs'


/**
 * Namespaces holding internal notes rather than product copy. The brand-marks
 * page is a design sandbox: its descriptions are notes to whoever is picking a
 * logo, and its semicolons are correct.
 */
const SKIP_KEY = /^brand\.marks\b/

const RULES = [
  {
    id: 'ellipsis',
    what: 'Three dots to the ellipsis character',
    apply: (t) => t.replace(/\.\.\./g, '…'),
  },
  {
    id: 'failure-opener',
    what: 'One opening for a failure: "Failed to …"',
    // Sentence-initial only. Mid-sentence "could not" is ordinary English.
    apply: (t) => t.replace(/^(Unable to|Could not|Couldn't) /, 'Failed to '),
  },
  {
    id: 'semicolon',
    what: 'Semicolon to a full stop',
    apply: (t) =>
      t.replace(/(\S);\s+([a-z])/g, (_, before, letter) => `${before}. ${letter.toUpperCase()}`),
  },
  {
    id: 'please-prefix',
    what: 'Drop "Please" fronting a validation message',
    apply: (t) =>
      /^please\s+\w/i.test(t)
        ? t.replace(/^please\s+(\w)/i, (_, c) => c.toUpperCase())
        : t,
  },
]

// ---------------------------------------------------------------------------

function collect() {
  const src = readFileSync(CATALOG, 'utf8')
  const sf = ts.createSourceFile(CATALOG, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const out = []
  const walk = (obj, path) => {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue
      const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null
      if (!name) continue
      const key = path ? `${path}.${name}` : name
      if (ts.isStringLiteral(prop.initializer)) {
        out.push({
          key,
          text: prop.initializer.text,
          start: prop.initializer.getStart(sf),
          end: prop.initializer.getEnd(),
        })
      } else if (ts.isObjectLiteralExpression(prop.initializer)) {
        walk(prop.initializer, key)
      }
    }
  }
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'en') {
      let init = node.initializer
      if (init && ts.isAsExpression(init)) init = init.expression
      if (init && ts.isObjectLiteralExpression(init)) walk(init, '')
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return { src, entries: out }
}

function quote(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
}

/** Placeholders and rich-text tags must survive untouched. */
function structureOf(text) {
  return JSON.stringify([...text.matchAll(/\{[^}]*\}|<\/?[\w-]+>/g)].map((m) => m[0]))
}

const apply = process.argv.includes('--apply')
const { src, entries } = collect()

const changes = []
for (const entry of entries) {
  if (SKIP_KEY.test(entry.key)) continue
  let next = entry.text
  const applied = []
  for (const rule of RULES) {
    const after = rule.apply(next)
    if (after !== next) {
      applied.push(rule.id)
      next = after
    }
  }
  if (next === entry.text) continue

  // A rewrite that alters placeholders or tags is a bug, not an edit.
  if (structureOf(next) !== structureOf(entry.text)) {
    console.error(`REFUSED (structure changed): ${entry.key}`)
    continue
  }
  changes.push({ ...entry, next, applied })
}

const byRule = new Map()
for (const c of changes) for (const r of c.applied) byRule.set(r, (byRule.get(r) ?? 0) + 1)

console.log(`${changes.length} messages change${apply ? '' : ' (preview)'}\n`)
for (const rule of RULES) {
  const n = byRule.get(rule.id) ?? 0
  if (!n) continue
  console.log(`${'─'.repeat(70)}\n${rule.id}  (${n})  ${rule.what}\n`)
  const sample = changes.filter((c) => c.applied.includes(rule.id)).slice(0, 6)
  for (const c of sample) {
    console.log(`  ${c.key}`)
    console.log(`    -  ${JSON.stringify(c.text.slice(0, 88))}`)
    console.log(`    +  ${JSON.stringify(c.next.slice(0, 88))}`)
  }
  console.log()
}

if (!apply) {
  console.log('Preview only. Re-run with --apply to write.')
  process.exit(0)
}

let out = src
for (const c of [...changes].sort((a, b) => b.start - a.start)) {
  out = out.slice(0, c.start) + quote(c.next) + out.slice(c.end)
}
writeFileSync(CATALOG, out, 'utf8')
console.log(`Wrote ${changes.length} messages to ${relative(process.cwd(), CATALOG)}`)
