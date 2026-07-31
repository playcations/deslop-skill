#!/usr/bin/env node
/**
 * Proves the scripts run against a catalog that is not the one they were
 * written for. The fixture plants one instance of each cut class, plus a
 * message that is already good and a sample answer that the length rule must
 * skip — the two things a scanner gets wrong when it is too eager.
 */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const CWD = resolve(ROOT, 'test/fixture')
const run = (script, args = []) =>
  execFileSync('node', [resolve(ROOT, 'scripts', script), ...args], {
    cwd: CWD,
    encoding: 'utf8',
    env: { ...process.env, DESLOP_CONFIG: resolve(CWD, 'deslop.config.json') },
  })

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n        ${detail}`}`)
  if (!ok) failed++
}

console.log('scan')
const scan = JSON.parse(run('deslop-scan.mjs', ['--json']))
const ids = new Set(scan.findings.map((f) => f.check ?? f.id))
for (const want of ['reassurance-tail', 'em-dash-join', 'dot-dot-dot', 'teasing-heading']) {
  check(`flags ${want}`, ids.has(want), `saw ${[...ids].join(', ')}`)
}
const flagged = new Set(scan.findings.map((f) => f.key))
check('leaves a good message alone', !flagged.has('orders.good'))

// exemptFromLength exempts the length rule and nothing else, so assert on that
// rule rather than on the key being clean. The fixture answer is 232 characters
// and would otherwise be the loudest finding in the file.
const tooLong = scan.findings.filter((f) => f.check === 'too-long').map((f) => f.key)
check('exempts sample content from the length rule', !tooLong.includes('orders.sample.answer'),
  `too-long fired on ${tooLong.join(', ') || 'nothing'}`)

console.log('measure')
const proposal = JSON.stringify([
  { key: 'orders.failedToConnect', before: 'Failed to connect. Please try again.', after: 'Failed to connect.' },
  { key: 'orders.good', before: 'Nothing to reorder yet. Add an item first.', after: null },
  { key: 'orders.count', before: 'Imported {done} of {total}', after: 'Imported {done} of {all}' },
])
let out = '',
  code = 0
try {
  out = execFileSync('node', [resolve(ROOT, 'scripts/deslop-measure.mjs')], {
    cwd: CWD,
    input: proposal,
    encoding: 'utf8',
    env: { ...process.env, DESLOP_CONFIG: resolve(CWD, 'deslop.config.json') },
  })
} catch (err) {
  out = err.stdout ?? ''
  code = err.status
}
check('counts the words down', /words\s+\d+ → \d+\s+\(-/.test(out), out.split('\n')[1])
check('clears the reassurance tail', /1 cleared/.test(out))
check('catches a renamed placeholder', /BROKE \{param\}/.test(out))
check('exits non-zero on a broken batch', code === 1, `exit ${code}`)

console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
