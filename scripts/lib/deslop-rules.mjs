/**
 * Shared de-slop rules and catalog reader.
 *
 * The scanner and the editor hook both need these. Keeping one copy is the
 * same lesson copy-classify.mjs taught: two tools with their own copy of a
 * rule set drift, and the drift is invisible until something slips through.
 */
import { readFileSync } from 'node:fs'

import ts from 'typescript'

import { CATALOG, PROPER_NOUNS, ROOT, config } from './config.mjs'

export { CATALOG, PROPER_NOUNS, ROOT, config }


export const CHECKS = [
  {
    id: 'em-dash-join',
    what: 'Em dash welding two half-thoughts. Split into sentences, or use a colon.',
    test: (t) => /\S\s—\s\S/.test(t) && !/^[^—]{0,12}—/.test(t),
  },
  {
    id: 'semicolon',
    what: 'Semicolon. House style is a period.',
    test: (t) => t.includes(';'),
  },
  {
    id: 'dot-dot-dot',
    what: 'Three dots instead of the ellipsis character.',
    test: (t) => t.includes('...'),
  },
  {
    id: 'abstraction-triad',
    what: 'Three abstractions in a row. Name one concrete thing instead.',
    test: (t) => /\w+ \w+, \w+ [\w ]+, and \w+ [\w ]+/.test(t) && t.length > 55,
  },
  {
    id: 'too-long',
    what: 'Long enough that nobody reads it. Cut it in half, then check no fact was lost.',
    // Sample content is shown to the reader as an example of a good long
    // answer. Length is the point of it, so shortening one defeats it.
    keyTest: (k) => !config.exemptFromLength.some((p) => new RegExp(p).test(k)),
    test: (t) => t.replace(/\{[^}]*\}/g, '').length > 140,
  },
  {
    id: 'passive-voice',
    what: 'Passive construction. Let the subject do the thing.',
    test: (t) => /\b(will|has|have|had|can|could|should|must|may) be(en)? \w+ed\b/i.test(t),
  },
  {
    id: 'empty-intensifier',
    what: 'Adverb carrying no information.',
    test: (t) => /\b(successfully|currently|actually|basically|simply|really|very)\b/i.test(t),
  },
  {
    id: 'hedge',
    what: 'Hedged claim. Say whether it happens.',
    test: (t) => /\b(may|might)\s+\w+|\bcan help\b|\bcould potentially\b/i.test(t),
  },
  {
    id: 'filler',
    what: 'Filler word.',
    // A bare `just` is not a tell here: every occurrence in this catalog is
    // legitimate ("just now", "not just its casing", "Just this title"). Only
    // the minimising `just <verb>` -- "just click", "just add" -- is filler.
    test: (t) =>
      /\b(simply|in order to|note that|kindly)\b/i.test(t) ||
      /\bjust (click|add|type|enter|select|choose|press|hit|run|paste)\b/i.test(t),
  },
  {
    id: 'please-in-validation',
    what: '"Please" in front of a validation message.',
    test: (t) => /^please\b/i.test(t),
  },
  {
    id: 'reassurance-tail',
    what: 'Tail that tells the reader what they already know. Cut the sentence.',
    // 47 messages end on "Please try again" beside a retry button. The advice
    // is correct and nobody needed it. Constraint notation -- "(max 500
    // characters)" -- is not this, so parentheses are not part of the test.
    test: (t) =>
      /(please try again|try again later|don't worry|no worries|you can always|feel free to|whenever you're ready)/i.test(
        t,
      ),
  },
  {
    id: 'vague-error',
    what: 'Error names no cause and no recovery.',
    test: (t) =>
      /^(an )?(unexpected|unknown) error( occurred)?\.?$/i.test(t) ||
      /^(request|validation|operation) failed\.?$/i.test(t) ||
      /^something went wrong\.?$/i.test(t),
  },
  {
    id: 'teasing-heading',
    what: 'Heading that names nothing.',
    keyTest: (k) => /\.(title|heading)\d*$/.test(k),
    test: (t) => /^(nothing here|oops|uh oh|hmm|whoops|all done|welcome)\b/i.test(t.trim()),
  },
]


export function readCatalog() {
  const src = readFileSync(CATALOG, 'utf8')
  const sf = ts.createSourceFile(CATALOG, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const out = []
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1

  const walk = (obj, path) => {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue
      const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null
      if (!name) continue
      const key = path ? `${path}.${name}` : name
      if (ts.isStringLiteral(prop.initializer)) {
        out.push({ key, text: prop.initializer.text, line: lineOf(prop) })
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
  return out
}

