#!/usr/bin/env node
/**
 * Reports the mechanical tells of machine-written interface copy in the string
 * catalog, with key and line so each can be gone to directly.
 *
 *   node scripts/deslop-scan.mjs                  summary + findings
 *   node scripts/deslop-scan.mjs --ns jobs        one namespace at a time
 *   node scripts/deslop-scan.mjs --json           machine-readable
 *
 * Only mechanical patterns. Whether a sentence actually says anything is a
 * judgement call and lives in the deslop skill, not here. A finding is a
 * candidate for review, never an instruction to rewrite: "comprehensive" is
 * slop in a feature blurb and correct in this product's description of its own
 * record-keeping.
 */
import { CATALOG, CHECKS, PROPER_NOUNS, readCatalog } from './lib/deslop-rules.mjs'

const argv = process.argv.slice(2)
const nsIndex = argv.indexOf('--ns')
const ns = nsIndex !== -1 ? argv[nsIndex + 1] : null
const asJson = argv.includes('--json')

const all = readCatalog()
const messages = ns ? all.filter((m) => m.key.startsWith(`${ns}.`)) : all

// --- mechanical checks -----------------------------------------------------

const findings = []
for (const msg of messages) {
  for (const check of CHECKS) {
    if (check.keyTest && !check.keyTest(msg.key)) continue
    if (check.test(msg.text)) findings.push({ ...msg, check: check.id, what: check.what })
  }
}

// --- consistency -----------------------------------------------------------

const openers = { 'Failed to': 0, 'Unable to': 0, 'Could not': 0, "Couldn't": 0 }
for (const m of messages) {
  for (const o of Object.keys(openers)) if (m.text.startsWith(o)) openers[o] += 1
}

const drift = []
for (const noun of PROPER_NOUNS) {
  const upper = messages.filter((m) => m.text.includes(noun)).length
  const lower = messages.filter((m) => m.text.includes(noun.toLowerCase())).length
  if (upper && lower) drift.push({ noun, upper, lower })
}

const byText = new Map()
for (const m of messages) {
  if (!byText.has(m.text)) byText.set(m.text, [])
  byText.get(m.text).push(m.key)
}
const vagueDuplicates = [...byText]
  .filter(([text, keys]) => keys.length > 4 && CHECKS.find((c) => c.id === 'vague-error').test(text))
  .sort((a, b) => b[1].length - a[1].length)

if (asJson) {
  process.stdout.write(JSON.stringify({ findings, openers, drift }, null, 2))
  process.exit(0)
}

console.log(`Catalog: ${messages.length} messages${ns ? ` in "${ns}"` : ''}`)
console.log(`Mechanical findings: ${findings.length}\n`)

const byCheck = new Map()
for (const f of findings) {
  if (!byCheck.has(f.check)) byCheck.set(f.check, [])
  byCheck.get(f.check).push(f)
}

for (const [id, list] of [...byCheck].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${'─'.repeat(72)}`)
  console.log(`${id}  (${list.length})`)
  console.log(`  ${list[0].what}`)
  for (const f of list.slice(0, ns ? 100 : 6)) {
    console.log(`\n  en.ts:${f.line}  ${f.key}`)
    console.log(`      ${JSON.stringify(f.text.slice(0, 100))}`)
  }
  if (!ns && list.length > 6) console.log(`\n  … ${list.length - 6} more (use --ns <namespace>)`)
  console.log()
}

console.log('─'.repeat(72))
console.log('Consistency\n')
console.log('  Failure openings (pick one):')
for (const [o, n] of Object.entries(openers)) if (n) console.log(`    ${String(n).padStart(4)}  ${o} …`)

if (drift.length) {
  console.log('\n  Product nouns used both ways:')
  for (const d of drift) console.log(`    ${d.noun}: ${d.upper} Title Case vs ${d.lower} lowercase`)
}

if (vagueDuplicates.length) {
  console.log('\n  Vague errors repeated across many call sites:')
  for (const [text, keys] of vagueDuplicates.slice(0, 5)) {
    console.log(`    ${String(keys.length).padStart(4)}x  ${JSON.stringify(text)}`)
  }
  console.log('    Each is a place where nobody said what actually went wrong.')
}
