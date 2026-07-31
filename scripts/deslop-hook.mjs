#!/usr/bin/env node
/**
 * De-slop editor hook — PostToolUse + Stop.
 *
 * Warns about copy quality in messages this session changed: em-dash joins,
 * vague errors, hedging, passive voice, over-long lines. Editorial judgement
 * only.
 *
 * Diff-scoped, not file-scoped. The catalog holds 5,400 messages and a few
 * hundred standing findings. Reporting all of them every time someone edits one
 * line trains the agent to skim past the hook, which is worse than no hook.
 *
 * Scope note: whether copy is in the catalog AT ALL is extraction coverage, and
 * lives in scripts/extract-strings-hook.mjs. Both checks were briefly in this
 * file, which conflated i18n plumbing with editorial judgement — you could not
 * want warnings about wording without also being nagged about extraction.
 *
 * Contract: never break a turn. Always exit 0, whatever happens.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

import { config } from './lib/config.mjs'

const ROOT = config.root
const CATALOG_REL = relative(ROOT, config.catalog)

async function readStdin() {
  if (process.stdin.isTTY) return ''
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf-8')
}

/** Emit a system reminder to the agent. Silence when there is nothing to say. */
function emit(text) {
  if (!text) return
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } }),
  )
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return ''
  }
}

/** Message values added or changed in the working tree, versus HEAD. */
function changedMessages() {
  const diff = git(['diff', 'HEAD', '--unified=0', '--', CATALOG_REL])
  if (!diff) return []
  const out = []
  for (const line of diff.split('\n')) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue
    // `  someKey: 'the message',`
    const m = /^\+\s*'?([A-Za-z_][\w-]*)'?\s*:\s*'((?:[^'\\]|\\.)*)'/.exec(line)
    if (m) out.push({ key: m[1], text: m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\') })
  }
  return out
}

async function checkCatalogEdit() {
  const changed = changedMessages()
  if (!changed.length) return ''

  const { CHECKS } = await import('./lib/deslop-rules.mjs')
  const hits = []
  for (const msg of changed) {
    for (const check of CHECKS) {
      if (check.keyTest && !check.keyTest(msg.key)) continue
      if (check.test(msg.text)) hits.push({ ...msg, check: check.id, what: check.what })
    }
  }
  if (!hits.length) return ''

  const lines = [
    `[deslop] ${hits.length} slop finding${hits.length === 1 ? '' : 's'} in copy this session changed:`,
    '',
  ]
  for (const h of hits.slice(0, 8)) {
    lines.push(`  ${h.check} — ${h.key}`)
    lines.push(`      ${JSON.stringify(h.text.slice(0, 90))}`)
    lines.push(`      ${h.what}`)
  }
  if (hits.length > 8) lines.push(`  … and ${hits.length - 8} more`)
  lines.push('')
  lines.push('These are candidates, not orders. Leave a line alone if it is already right.')
  lines.push('The deslop skill has the rules; `node scripts/deslop-scan.mjs` has the full picture.')
  return lines.join('\n')
}

async function onPostToolUse(event) {
  const path = event?.tool_input?.file_path
  if (typeof path !== 'string') return ''
  const rel = relative(ROOT, resolve(path)).replace(/\\/g, '/')
  if (rel.startsWith('..')) return ''

  if (rel === CATALOG_REL) return checkCatalogEdit()
  return ''
}

/** One net summary at the end, so the agent is not nagged per edit. */
async function onStop() {
  const catalog = await checkCatalogEdit()
  if (!catalog) return ''
  return `${catalog}\n\nEnd-of-session pass. Nothing is blocked; the findings are for the next edit.`
}

async function main() {
  let raw = ''
  try {
    raw = await readStdin()
  } catch {
    process.exit(0)
  }

  let event = null
  try {
    event = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  try {
    const text = event?.hook_event_name === 'Stop' ? await onStop() : await onPostToolUse(event)
    emit(text)
  } catch {
    // A hook that breaks a turn is worse than a hook that misses a finding.
  }
  process.exit(0)
}

main()
