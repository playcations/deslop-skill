/**
 * Finds and loads `deslop.config.json`.
 *
 * The scripts live in this repo; the catalog they read lives in yours. So the
 * project root cannot be derived from the script's own path the way a
 * single-repo tool would. It is the directory holding the config file, found by
 * walking up from the working directory — the same contract as eslint or
 * prettier, and for the same reason.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'

const FILENAME = 'deslop.config.json'

/** The nearest ancestor of `from` holding a config file. */
function findConfig(from = process.cwd()) {
  let dir = resolve(from)
  for (;;) {
    const candidate = resolve(dir, FILENAME)
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

const DEFAULTS = {
  properNouns: [],
  // Sample content is shown to the reader as an example of a good long answer,
  // so the length rule has to be able to skip it. Keys, not text.
  exemptFromLength: [],
}

function load() {
  const path = process.env.DESLOP_CONFIG
    ? resolve(process.env.DESLOP_CONFIG)
    : findConfig()

  if (!path) {
    throw new Error(
      `No ${FILENAME} found in this directory or any parent.\n` +
        `Copy deslop.config.example.json to your project root and set "catalog".\n` +
        `Or point DESLOP_CONFIG at one.`,
    )
  }

  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${err.message}`)
  }

  if (!raw.catalog) {
    throw new Error(`${path} has no "catalog". Set it to your message catalog, e.g. "src/i18n/en.ts".`)
  }

  const root = dirname(path)
  const catalog = isAbsolute(raw.catalog) ? raw.catalog : resolve(root, raw.catalog)

  if (!existsSync(catalog)) {
    throw new Error(`Catalog not found at ${catalog} (from "catalog": ${JSON.stringify(raw.catalog)} in ${path}).`)
  }

  return { ...DEFAULTS, ...raw, root, catalog, configPath: path }
}

export const config = load()
export const { root: ROOT, catalog: CATALOG, properNouns: PROPER_NOUNS } = config
