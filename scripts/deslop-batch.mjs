#!/usr/bin/env node
/**
 * Emits one namespace of the catalog as a numbered batch for the rewrite panel.
 *
 *   node scripts/deslop-batch.mjs jobs                  every message in `jobs`
 *   node scripts/deslop-batch.mjs jobs --flagged        only ones the scan flagged
 *   node scripts/deslop-batch.mjs jobs --json           machine-readable
 *
 * Every panel member gets byte-identical input from this, so differences
 * between their rewrites come from the lens rather than from one of them
 * having seen a different slice of the catalog.
 */
import { readFileSync } from 'node:fs'

import ts from 'typescript'

import { CATALOG } from './lib/config.mjs'


function readCatalog() {
  const sf = ts.createSourceFile(
    CATALOG, readFileSync(CATALOG, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
  )
  const out = []
  const walk = (obj, path) => {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue
      const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null
      if (!name) continue
      const key = path ? `${path}.${name}` : name
      if (ts.isStringLiteral(prop.initializer)) out.push({ key, text: prop.initializer.text })
      else if (ts.isObjectLiteralExpression(prop.initializer)) walk(prop.initializer, key)
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
  return out
}

const [ns, ...flags] = process.argv.slice(2)
if (!ns) {
  console.error('usage: deslop-batch.mjs <namespace> [--flagged] [--json]')
  process.exit(2)
}

let messages = readCatalog().filter((m) => m.key.startsWith(`${ns}.`))

if (flags.includes('--flagged')) {
  // Same mechanical checks the scanner uses, so the batch matches the report.
  const flagged = (t) =>
    /\S\s—\s\S/.test(t) ||
    t.replace(/\{[^}]*\}/g, '').length > 140 ||
    /\b(will|has|have|had|can|could|should|must|may) be(en)? \w+ed\b/i.test(t) ||
    /^(an )?(unexpected|unknown) error( occurred)?\.?$/i.test(t) ||
    /^(request|validation|operation) failed\.?$/i.test(t) ||
    /\b(may|might)\s+\w+|\bcan help\b/i.test(t) ||
    /\b(successfully|currently|actually|basically|simply|really|very)\b/i.test(t)
  messages = messages.filter((m) => flagged(m.text))
}

if (flags.includes('--json')) {
  process.stdout.write(JSON.stringify(messages, null, 2))
  process.exit(0)
}

console.log(`# Namespace: ${ns}   (${messages.length} messages)\n`)
messages.forEach((m, i) => {
  console.log(`${i + 1}. ${m.key}`)
  console.log(`   ${JSON.stringify(m.text)}`)
})
