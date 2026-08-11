#!/usr/bin/env node
// ABOUTME: Verifies that every lens paragraph reproduced inside a dispatch-prompts.md ALL-LENS block
// is byte-identical to the same lens in its own source block. The duplication is deliberate -- a
// dispatched reviewer must receive a whole block verbatim -- so this checks the copies rather than
// removing them. Run by .githooks/pre-commit.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PLUGINS = 'plugins'
const SIDECAR = 'dispatch-prompts.md'

// A section is a `## HEADING` and everything up to the next one. Source blocks are the ones a single
// dispatch pastes; the aggregate block reproduces their lenses for the all-lens dispatches.
const HEADING = /^## (.+?)\s*$/
const SOURCE_HEADING = /^(EXTENT BATCH|SEAM BATCH|SOLO:)/
const AGGREGATE_HEADING = /^ALL-LENS/
// `> **Lens: seams & contracts.** ...` -- the name is the key, the whole line is the compared text.
const LENS = /^>\s*\*\*Lens:\s*([^.*]+?)\.?\*\*/

function usage (message) {
  console.error(message)
  console.error('usage: check-lens-block-sync.mjs [--check]')
  console.error('')
  console.error('  --check  verify every ALL-LENS lens matches its source block (default)')
  process.exit(2)
}

function parseArgs (argv) {
  const rest = argv.slice(2).filter((a) => a !== '--check')
  if (rest.length) usage(`unknown argument: ${rest[0]}`)
}

/** Split a markdown file into { heading -> body lines } at `## ` boundaries. */
function sections (text) {
  const out = new Map()
  let current = null
  for (const line of text.split('\n')) {
    const m = line.match(HEADING)
    if (m) {
      current = m[1]
      out.set(current, [])
    } else if (current !== null) {
      out.get(current).push(line)
    }
  }
  return out
}

/** Every lens paragraph in a body, keyed by lens name. */
function lenses (body) {
  const out = new Map()
  for (const line of body) {
    const m = line.match(LENS)
    if (m) out.set(m[1].trim().toLowerCase(), line.trimEnd())
  }
  return out
}

/** Locate every dispatch-prompts.md under plugins/<plugin>/skills/<skill>/. */
function sidecars (root) {
  const found = []
  const pluginsDir = join(root, PLUGINS)
  if (!existsSync(pluginsDir)) return found
  for (const plugin of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!plugin.isDirectory()) continue
    const skillsDir = join(pluginsDir, plugin.name, 'skills')
    if (!existsSync(skillsDir)) continue
    for (const skill of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue
      const path = join(skillsDir, skill.name, SIDECAR)
      if (existsSync(path)) found.push({ rel: `${PLUGINS}/${plugin.name}/skills/${skill.name}/${SIDECAR}`, path })
    }
  }
  return found
}

/**
 * Compare one file's aggregate block against its source blocks.
 * Returns a list of human-readable problems; empty means clean.
 */
function checkFile (rel, text) {
  const problems = []
  const secs = sections(text)

  const aggregateNames = [...secs.keys()].filter((h) => AGGREGATE_HEADING.test(h))
  // No aggregate block means there is no copy to keep in sync -- not a pass, just nothing to test.
  if (aggregateNames.length === 0) return { problems, hasAggregate: false }
  if (aggregateNames.length > 1) {
    problems.push(`${rel}: more than one ALL-LENS block (${aggregateNames.join(', ')}) -- cannot tell which is authoritative`)
    return { problems, hasAggregate: true }
  }

  const source = new Map()
  const origin = new Map()
  for (const [heading, body] of secs) {
    if (!SOURCE_HEADING.test(heading)) continue
    for (const [name, line] of lenses(body)) {
      if (source.has(name)) {
        problems.push(`${rel}: lens "${name}" is defined in two source blocks (${origin.get(name)}, ${heading})`)
        continue
      }
      source.set(name, line)
      origin.set(name, heading)
    }
  }

  const aggregate = lenses(secs.get(aggregateNames[0]))

  for (const [name, line] of aggregate) {
    if (!source.has(name)) {
      problems.push(`${rel}: lens "${name}" appears in ${aggregateNames[0]} but in no source block`)
      continue
    }
    if (source.get(name) !== line) {
      problems.push(
        `${rel}: lens "${name}" has drifted between ${origin.get(name)} and ${aggregateNames[0]}\n` +
        `    ${origin.get(name)}:\n      ${source.get(name)}\n` +
        `    ${aggregateNames[0]}:\n      ${line}`
      )
    }
  }

  for (const name of source.keys()) {
    if (!aggregate.has(name)) {
      problems.push(`${rel}: lens "${name}" is in ${origin.get(name)} but missing from ${aggregateNames[0]}`)
    }
  }

  return { problems, hasAggregate: true }
}

function main () {
  parseArgs(process.argv)
  const root = process.cwd()
  const files = sidecars(root)

  const problems = []
  let withAggregate = 0
  for (const { rel, path } of files) {
    const { problems: found, hasAggregate } = checkFile(rel, readFileSync(path, 'utf8'))
    problems.push(...found)
    if (hasAggregate) withAggregate += 1
  }

  if (problems.length) {
    console.error('lens-block sync check FAILED:')
    for (const p of problems) console.error(`  ${p}`)
    console.error('')
    console.error('The duplication is deliberate: a dispatched reviewer receives a whole block verbatim,')
    console.error('so an ALL-LENS block reproduces each lens rather than pointing at it. Edit the lens in')
    console.error('BOTH places -- its source block and the ALL-LENS block -- so the two stay byte-identical.')
    process.exit(1)
  }

  console.log(`lens-block sync check passed (${withAggregate} of ${files.length} dispatch-prompts.md files carry an ALL-LENS block)`)
}

main()
