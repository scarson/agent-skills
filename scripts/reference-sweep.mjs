#!/usr/bin/env node
// ABOUTME: Sweeps markdown files for reference patterns that tend to go dangling or opaque in
// persistent artifacts — positional pointers, bare numeric references, session shorthand labels.
// Hits are judgment triggers for the self-identifying-references rule (authoritative source: the
// project-setup CLAUDE.md/AGENTS.md template, §Self-identifying references), never automatic
// failures: quoted counter-examples and legends flag too. Read every hit; exit code is always 0.

import { readFileSync } from 'node:fs'

const PATTERNS = [
  {
    name: 'positional-pointer',
    hint: 'points at a location, not a thing — name the target or use a §-reference with orientation',
    regex: /\b(?:see|per|from|in|of|the|described|mentioned|noted|listed|explained)\s+(?:above|below|earlier)\b|\b(?:above|below|earlier)\s+(?:rule|section|list|table|note|step|example)\b/gi
  },
  {
    name: 'bare-numeric-pointer',
    hint: 'a number whose legend lives elsewhere — name the thing instead',
    regex: /\b(?:hook|item|step|rule|point|clause|case|note)s?\s\(\d+\)|§\s?\d+(?![\w.-]*[a-z])(?!\s*\()/gi
  },
  {
    name: 'session-shorthand-label',
    hint: 'working-session shorthand with no anchor outside its conversation — replace with the meaning',
    regex: /\b(?:Option|Approach|Decision|Recommendation|Alternative|Followup|Follow-up|Scenario)\s+[A-Z]\b(?!\w)/g
  },
  {
    name: 'bare-finding-id',
    hint: 'a ledger/finding ID cited without orientation — append what it names, e.g. `L53 (the supersede-auto-invocation requirement)`',
    regex: /\b[FLRG]\d{1,3}\b(?!\d)(?!\s*[(—-])/g
  }
]

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: reference-sweep.mjs <file.md> [more files...]')
  console.error('')
  console.error('Prints candidate self-identifying-reference violations with file:line locations.')
  console.error('Every hit needs human/agent judgment — legends, quoted counter-examples, and')
  console.error('linear step lists flag too. Exit code is always 0; this is a review aid, not a lint.')
  process.exit(2)
}

let total = 0
for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    console.error(`${file}: ${error.message}`)
    continue
  }
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0
      const match = pattern.regex.exec(line)
      if (!match) continue
      total++
      console.log(`${file}:${i + 1}: [${pattern.name}] ${match[0].trim()}`)
      console.log(`    ${line.trim().slice(0, 160)}`)
      console.log(`    ↳ ${pattern.hint}`)
    }
  })
}

console.log(total === 0
  ? 'reference sweep: no candidate hits'
  : `reference sweep: ${total} candidate hit${total === 1 ? '' : 's'} — each needs judgment, none is automatically a violation`)
