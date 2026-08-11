// ABOUTME: Tests for scripts/check-lens-block-sync.mjs. Each case writes a throwaway plugin tree
// holding a synthetic dispatch-prompts.md, then asserts the checker's exit code and message. The
// fixtures are real files because the tool's whole job is comparing bytes on disk -- a lens edited
// in its source block but not in the ALL-LENS copy is the failure mode it exists to catch.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const checker = join(repoRoot, 'scripts', 'check-lens-block-sync.mjs')

const SEAMS = '> **Lens: seams & contracts.** Name every boundary the design crosses — em dashes and all.'
const EXTENT = '> **Lens: requirements trace.** Trace bidirectionally; a requirement with no home is a finding.'

function write (path, text) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

/** A dispatch-prompts.md with one source block per lens plus an aggregate block. */
function sidecar ({ source = [SEAMS, EXTENT], aggregate = [SEAMS, EXTENT] } = {}) {
  return [
    '# demo dispatch prompts — v1',
    '',
    '## EXTENT BATCH (requirements trace)',
    '',
    source[1] ?? '',
    '',
    '## SEAM BATCH (seams & contracts)',
    '',
    source[0] ?? '',
    '',
    '## ALL-LENS PROMPT (light-mode rounds)',
    '',
    '> Review this design against every lens below, in order.',
    '',
    ...aggregate.filter(Boolean),
    ''
  ].join('\n')
}

function fixture (body) {
  const dir = mkdtempSync(join(tmpdir(), 'lens-sync-'))
  write(join(dir, 'plugins', 'demo', 'skills', 'demo-cycle', 'dispatch-prompts.md'), body)
  return dir
}

function run (cwd) {
  try {
    const stdout = execFileSync(process.execPath, [checker], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { code: 0, out: stdout }
  } catch (err) {
    return { code: err.status, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

test('passes when every ALL-LENS lens matches its source block byte for byte', () => {
  const dir = fixture(sidecar())
  try {
    const { code, out } = run(dir)
    assert.equal(code, 0)
    assert.match(out, /lens-block sync check passed/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('fails when a lens is edited in its source block but not in the ALL-LENS copy', () => {
  const edited = SEAMS.replace('Name every boundary', 'Name every boundary and every owner')
  const dir = fixture(sidecar({ source: [edited, EXTENT], aggregate: [SEAMS, EXTENT] }))
  try {
    const { code, out } = run(dir)
    assert.equal(code, 1)
    assert.match(out, /drifted between SEAM BATCH .* and ALL-LENS PROMPT/s)
    assert.match(out, /seams & contracts/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('fails when a lens is dropped from the ALL-LENS block', () => {
  const dir = fixture(sidecar({ aggregate: [SEAMS] }))
  try {
    const { code, out } = run(dir)
    assert.equal(code, 1)
    assert.match(out, /requirements trace.*missing from ALL-LENS PROMPT/s)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('fails when the ALL-LENS block invents a lens with no source block', () => {
  const orphan = '> **Lens: cost of delay.** Not defined anywhere else in this file.'
  const dir = fixture(sidecar({ aggregate: [SEAMS, EXTENT, orphan] }))
  try {
    const { code, out } = run(dir)
    assert.equal(code, 1)
    assert.match(out, /cost of delay.*in no source block/s)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('passes a sidecar with no ALL-LENS block at all', () => {
  const body = ['# demo — v1', '', '## SOLO: unstated assumptions', '', SEAMS, ''].join('\n')
  const dir = fixture(body)
  try {
    const { code, out } = run(dir)
    assert.equal(code, 0)
    assert.match(out, /0 of 1 dispatch-prompts.md files carry an ALL-LENS block/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('the real design-review-cycle sidecar is in sync', () => {
  const { code, out } = run(repoRoot)
  assert.equal(code, 0, out)
  assert.match(out, /lens-block sync check passed/)
})
