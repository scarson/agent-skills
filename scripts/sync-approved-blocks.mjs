#!/usr/bin/env node
// ABOUTME: Verifies (or repairs) the inline copies of approved language blocks that skills carry
// between <!-- approved-block: ... --> markers, against the authoritative text in each plugin's
// approved-blocks.md. Run by .githooks/pre-commit; see plugins/<plugin>/approved-blocks.md.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BLOCK_DOC = 'approved-blocks.md'
const HEADING = /^## ([a-z0-9][a-z0-9-]*) v(\d+)\s*$/
const USED_BY = /^Used by:/
const MARKER_PATH = /`([^`]+\.md)`/g

// One regex for both ends of a copy: the leading slash distinguishes them. The inner text is parsed
// afterwards rather than in the pattern, so a malformed marker is reported instead of skipped.
const MARKER = /<!--\s*(\/?)approved-block:\s*([\s\S]*?)\s*-->/g
const OPEN_INNER = /^([a-z0-9][a-z0-9-]*) v(\d+)(\s|$)/
const CLOSE_INNER = /^([a-z0-9][a-z0-9-]*)$/

function usage (message) {
  console.error(message)
  console.error('usage: sync-approved-blocks.mjs [--check | --write]')
  console.error('')
  console.error('  --check  verify every inline copy matches its authoritative block (default)')
  console.error('  --write  refresh every inline copy from the authoritative block')
  process.exit(2)
}

function parseArgs (argv) {
  if (argv.length === 0) return { mode: 'check' }
  if (argv.length > 1) usage(`unexpected argument: ${argv[1]}`)
  if (argv[0] === '--check') return { mode: 'check' }
  if (argv[0] === '--write') return { mode: 'write' }
  usage(`unknown argument: ${argv[0]}`)
}

const { mode } = parseArgs(process.argv.slice(2))

function git (...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

let repoRoot
try {
  repoRoot = git('rev-parse', '--show-toplevel').trim()
} catch {
  console.error('not inside a git repository')
  process.exit(2)
}

const errors = []
const fail = message => errors.push(message)
const rewritten = []

/** Strip only leading and trailing newlines, so trailing spaces still register as drift. */
function trimNewlines (text) {
  return text.replace(/^\n+/, '').replace(/\n+$/, '')
}

function listPlugins () {
  try {
    return readdirSync(join(repoRoot, 'plugins'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
  } catch {
    return []
  }
}

/** Every .md file under dir, returned as paths relative to the plugin root, sorted. */
function listMarkdown (pluginDir, subdir) {
  const found = []
  const walk = relativeDir => {
    let entries
    try {
      entries = readdirSync(join(pluginDir, relativeDir), { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = `${relativeDir}/${entry.name}`
      if (entry.isDirectory()) walk(relativePath)
      else if (entry.isFile() && entry.name.endsWith('.md')) found.push(relativePath)
    }
  }
  walk(subdir)
  return found
}

/**
 * Parse an approved-blocks.md into name -> { version, usedBy, content }.
 *
 * A block runs from its `## <name> v<N>` heading to the next such heading or end of file. The
 * "Used by:" declaration may wrap across lines and ends at the first blank line; everything after it
 * is the block's authoritative text.
 */
function parseBlockDoc (text, docPath) {
  const blocks = new Map()
  const lines = text.split('\n')
  const starts = []
  lines.forEach((line, i) => {
    const match = HEADING.exec(line)
    if (match) starts.push({ index: i, name: match[1], version: Number(match[2]) })
  })

  starts.forEach((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : lines.length
    const body = lines.slice(start.index + 1, end)

    const usedByStart = body.findIndex(line => USED_BY.test(line))
    if (usedByStart === -1) {
      fail(`${docPath}: block "${start.name}" has no "Used by:" line`)
      return
    }
    let usedByEnd = usedByStart
    while (usedByEnd + 1 < body.length && body[usedByEnd + 1].trim() !== '') usedByEnd++

    const declaration = body.slice(usedByStart, usedByEnd + 1).join('\n')
    const usedBy = [...declaration.matchAll(MARKER_PATH)].map(match => match[1])
    if (usedBy.length === 0) {
      fail(`${docPath}: block "${start.name}" lists no files under "Used by:" (paths go in backticks)`)
    }

    const content = trimNewlines(body.slice(usedByEnd + 1).join('\n'))
    if (content === '') {
      fail(`${docPath}: block "${start.name}" has no text after its "Used by:" line`)
      return
    }

    if (blocks.has(start.name)) {
      fail(`${docPath}: block "${start.name}" is declared twice`)
      return
    }
    blocks.set(start.name, { version: start.version, usedBy, content })
  })

  return blocks
}

/**
 * Locate every marker-wrapped copy in a file. Returns { copies, problems }: copies carry byte
 * offsets so --write can splice new text in without disturbing anything else.
 */
function findCopies (text, filePath) {
  const copies = []
  const problems = []
  let open = null

  for (const match of text.matchAll(MARKER)) {
    const [whole, slash, inner] = match
    const start = match.index
    const end = start + whole.length

    if (slash === '') {
      const parsed = OPEN_INNER.exec(inner)
      if (!parsed) {
        problems.push(`${filePath}: malformed opening marker <!-- approved-block: ${inner} --> (expected "<name> vN")`)
        continue
      }
      if (open) {
        problems.push(`${filePath}: opening marker for "${parsed[1]}" appears before "${open.name}" is closed`)
        continue
      }
      open = { name: parsed[1], version: Number(parsed[2]), markerText: whole, start, end }
      continue
    }

    const parsed = CLOSE_INNER.exec(inner)
    if (!parsed) {
      problems.push(`${filePath}: malformed closing marker <!-- /approved-block: ${inner} -->`)
      continue
    }
    if (!open) {
      problems.push(`${filePath}: closing marker for "${parsed[1]}" has no opening marker`)
      continue
    }
    if (parsed[1] !== open.name) {
      problems.push(`${filePath}: block "${open.name}" is closed by a marker for "${parsed[1]}"`)
      open = null
      continue
    }
    copies.push({
      name: open.name,
      version: open.version,
      markerText: open.markerText,
      openStart: open.start,
      contentStart: open.end,
      contentEnd: start,
      closeStart: start,
      closeEnd: end
    })
    open = null
  }

  if (open) problems.push(`${filePath}: block "${open.name}" is opened but never closed`)
  return { copies, problems }
}

/**
 * A short, quotable account of where two texts diverge -- lines, not rendered prose. The excerpt is
 * centred on the first differing character, because these blocks are single long paragraphs and a
 * head-truncated quote would show two identical-looking prefixes.
 */
function describeDrift (expected, actual) {
  const lines = []
  const want = expected.split('\n')
  const got = actual.split('\n')
  const WINDOW = 60

  if (want.length !== got.length) {
    lines.push(`      copy has ${got.length} line${got.length === 1 ? '' : 's'}, authoritative has ${want.length} — likely line-wrap drift`)
  }

  let shown = 0
  for (let i = 0; i < Math.max(want.length, got.length) && shown < 3; i++) {
    if (want[i] === got[i]) continue
    shown++
    let column = 0
    while (want[i]?.[column] !== undefined && want[i][column] === got[i]?.[column]) column++
    const excerpt = value => {
      if (value === undefined) return '(absent)'
      const from = Math.max(0, column - WINDOW / 2)
      const to = Math.min(value.length, column + WINDOW)
      return (from > 0 ? '…' : '') + JSON.stringify(value.slice(from, to)) + (to < value.length ? '…' : '')
    }
    lines.push(`      line ${i + 1} col ${column + 1} authoritative: ${excerpt(want[i])}`)
    lines.push(`      line ${i + 1} col ${column + 1} copy:          ${excerpt(got[i])}`)
  }
  return lines
}

// --- Walk every plugin -----------------------------------------------------------------------------

let checkedCopies = 0
let checkedBlocks = 0

for (const plugin of listPlugins()) {
  const pluginDir = join(repoRoot, 'plugins', plugin)
  const docPath = `plugins/${plugin}/${BLOCK_DOC}`
  const hasDoc = existsSync(join(pluginDir, BLOCK_DOC))

  const files = listMarkdown(pluginDir, 'skills')
  const parsed = new Map()
  for (const file of files) {
    const absolute = join(pluginDir, file)
    const text = readFileSync(absolute, 'utf8')
    if (!text.includes('approved-block:')) continue
    const { copies, problems } = findCopies(text, `plugins/${plugin}/${file}`)
    for (const problem of problems) fail(problem)
    if (copies.length > 0) parsed.set(file, { absolute, text, copies })
  }

  if (!hasDoc) {
    for (const file of parsed.keys()) {
      fail(`plugins/${plugin}/${file}: carries approved-block markers but plugins/${plugin} has no ${BLOCK_DOC}`)
    }
    continue
  }

  const blocks = parseBlockDoc(readFileSync(join(pluginDir, BLOCK_DOC), 'utf8'), docPath)
  checkedBlocks += blocks.size

  // Which files actually carry a copy of each block, for the "Used by" reconciliation below.
  const carriers = new Map([...blocks.keys()].map(name => [name, new Set()]))

  for (const [file, entry] of parsed) {
    const label = `plugins/${plugin}/${file}`
    let updated = entry.text
    let dirty = false

    // Splice from the end so earlier offsets stay valid.
    for (const copy of [...entry.copies].reverse()) {
      const block = blocks.get(copy.name)
      if (!block) {
        fail(`${label}: block "${copy.name}" is not declared in ${docPath}`)
        continue
      }
      carriers.get(copy.name).add(file)
      checkedCopies++

      const content = trimNewlines(updated.slice(copy.contentStart, copy.contentEnd))
      const contentMatches = content === block.content
      const versionMatches = copy.version === block.version

      if (contentMatches && versionMatches) continue

      if (mode === 'write') {
        const marker = copy.markerText.replace(
          new RegExp(`(approved-block:\\s*${copy.name} )v${copy.version}\\b`),
          `$1v${block.version}`
        )
        updated = updated.slice(0, copy.openStart) +
          marker + '\n' + block.content + '\n' +
          updated.slice(copy.closeStart)
        dirty = true
        continue
      }

      if (!versionMatches) {
        fail(
          `${label}: block "${copy.name}" copy is marked v${copy.version} but ${docPath} declares v${block.version}.\n` +
          '    Fix: node scripts/sync-approved-blocks.mjs --write'
        )
      }
      if (!contentMatches) {
        fail(
          [
            `${label}: block "${copy.name}" copy has drifted from ${docPath}`,
            ...describeDrift(block.content, content),
            '    Fix: node scripts/sync-approved-blocks.mjs --write'
          ].join('\n')
        )
      }
    }

    if (dirty) {
      writeFileSync(entry.absolute, updated)
      rewritten.push(label)
    }
  }

  for (const [name, block] of blocks) {
    const actual = carriers.get(name)
    for (const listed of block.usedBy) {
      if (!actual.has(listed)) {
        fail(
          `${docPath}: block "${name}" lists \`${listed}\` under "Used by" but that file carries no copy.\n` +
          `    Fix: add the markers to plugins/${plugin}/${listed}, or drop it from the "Used by" line.`
        )
      }
    }
    for (const file of actual) {
      if (!block.usedBy.includes(file)) {
        fail(
          `${docPath}: block "${name}" is copied into \`${file}\` but that file is not listed under "Used by".\n` +
          '    Fix: add it to the "Used by" line so the next edit knows where to land.'
        )
      }
    }
  }
}

// --- Report ----------------------------------------------------------------------------------------

for (const label of rewritten) console.log(`${label}: refreshed from the authoritative block`)

if (errors.length > 0) {
  console.error(`\napproved-block sync check failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nThe authoritative text lives in plugins/<plugin>/approved-blocks.md — edit it there, never in a copy.\n')
  process.exit(1)
}

if (mode === 'write') {
  console.log(rewritten.length === 0
    ? 'approved-block sync: every copy already matched, nothing rewritten'
    : `approved-block sync: rewrote ${rewritten.length} cop${rewritten.length === 1 ? 'y' : 'ies'}`)
} else {
  console.log(`approved-block sync check passed (${checkedCopies} cop${checkedCopies === 1 ? 'y' : 'ies'} of ${checkedBlocks} block${checkedBlocks === 1 ? '' : 's'})`)
}
