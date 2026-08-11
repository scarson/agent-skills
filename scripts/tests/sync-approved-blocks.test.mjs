// ABOUTME: Tests for scripts/sync-approved-blocks.mjs. Each case builds a throwaway repo holding a
// synthetic approved-blocks.md plus skills that carry marker-wrapped copies of it, then asserts the
// checker's exit code and message. Fixtures are real directories because the tool's whole job is
// comparing bytes on disk -- line-wrap drift between copies is the failure mode it exists to catch.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const syncer = join(repoRoot, 'scripts', 'sync-approved-blocks.mjs')

const CONTENT = 'Shared paragraph — one long line, em dashes and all, kept byte-identical everywhere.'
const BOTH = ['skills/one/SKILL.md', 'skills/two/SKILL.md']

function git (cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function write (path, text) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

/** The marker-wrapped form a skill is supposed to carry. */
function wrapped (name, version, content) {
  return `<!-- approved-block: ${name} v${version} — authoritative copy: ../../approved-blocks.md -->\n` +
    `${content}\n` +
    `<!-- /approved-block: ${name} -->`
}

function skillFile (body) {
  return `---\nname: demo\n---\n\n# Demo\n\n${body}\n\n## After\n\nTrailing prose.\n`
}

/**
 * Build a plugin whose approved-blocks.md declares one block. `usedBy` is what the doc claims,
 * `carriers` is which files actually carry a copy, and `copyVersion` / `copyContent` let a case
 * drift a copy away from the authoritative text.
 */
function makeFixture ({
  version = 1,
  usedBy = BOTH,
  carriers = BOTH,
  content = CONTENT,
  copyVersion = version,
  copyContent = content
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'approved-blocks-test-'))
  git(dir, 'init', '-q', '-b', 'main')

  const declaration = usedBy.map(file => `\`${file}\` §Demo`).join(' · ')
  write(join(dir, 'plugins', 'alpha', 'approved-blocks.md'),
    '# Approved language blocks — alpha\n\nHeader prose.\n\n' +
    `## demo-block v${version}\n\nUsed by: ${declaration}\n\n${content}\n`)

  for (const file of BOTH) {
    const body = carriers.includes(file)
      ? wrapped('demo-block', copyVersion, copyContent)
      : 'No copy here.'
    write(join(dir, 'plugins', 'alpha', file), skillFile(body))
  }

  git(dir, 'add', '-A')
  git(dir, '-c', 'user.email=test@example.com', '-c', 'user.name=Test', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'initial')
  return dir
}

/** Run the tool against a fixture. Returns { code, output }. */
function run (dir, ...args) {
  try {
    const output = execFileSync('node', [syncer, ...args], { cwd: dir, encoding: 'utf8' })
    return { code: 0, output }
  } catch (err) {
    return { code: err.status ?? 1, output: (err.stdout ?? '') + (err.stderr ?? '') }
  }
}

function read (dir, file) {
  return readFileSync(join(dir, 'plugins', 'alpha', file), 'utf8')
}

const fixtures = []
function fixture (options) {
  const dir = makeFixture(options)
  fixtures.push(dir)
  return dir
}

test.after(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true })
})

test('identical copies pass', () => {
  const dir = fixture()
  const { code, output } = run(dir, '--check')
  assert.equal(code, 0, output)
  assert.match(output, /2 copies of 1 block/)
})

test('--check is the default mode', () => {
  const dir = fixture()
  const { code, output } = run(dir)
  assert.equal(code, 0, output)
  assert.match(output, /passed/)
})

test('a plugin with no approved-blocks.md and no markers is ignored', () => {
  const dir = fixture()
  rmSync(join(dir, 'plugins', 'alpha'), { recursive: true, force: true })
  mkdirSync(join(dir, 'plugins', 'beta', 'skills', 'demo'), { recursive: true })
  writeFileSync(join(dir, 'plugins', 'beta', 'skills', 'demo', 'SKILL.md'), 'ordinary skill\n')
  const { code, output } = run(dir, '--check')
  assert.equal(code, 0, output)
})

test('content drift fails and names the file', () => {
  const dir = fixture({ copyContent: `${CONTENT.slice(0, -1)}!` })
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /skills\/one\/SKILL\.md/)
  assert.match(output, /drifted/)
})

test('drift is reported for every file that has it', () => {
  const dir = fixture({ copyContent: `${CONTENT} extra.` })
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /skills\/one\/SKILL\.md/)
  assert.match(output, /skills\/two\/SKILL\.md/)
})

test('line-wrap drift is caught and called out as such', () => {
  const dir = fixture({ copyContent: CONTENT.replace(' one long line,', '\none long line,') })
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /line-wrap drift/)
})

test('trailing whitespace alone is drift', () => {
  const dir = fixture({ copyContent: `${CONTENT} ` })
  const { code } = run(dir, '--check')
  assert.equal(code, 1)
})

test('drift report quotes the text around the first differing column', () => {
  const dir = fixture({ copyContent: CONTENT.replace('byte-identical', 'byte identical') })
  const { output } = run(dir, '--check')
  assert.match(output, /col \d+ authoritative/)
  assert.match(output, /byte-identical/)
  assert.match(output, /byte identical/)
})

test('version mismatch between marker and heading fails', () => {
  const dir = fixture({ version: 2, copyVersion: 1 })
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /skills\/one\/SKILL\.md/)
  assert.match(output, /v1/)
  assert.match(output, /v2/)
})

test('a file listed under Used by that carries no copy fails', () => {
  const dir = fixture({ usedBy: BOTH, carriers: ['skills/one/SKILL.md'] })
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /skills\/two\/SKILL\.md/)
  assert.match(output, /carries no copy/)
})

test('a copy in a file not listed under Used by fails', () => {
  const dir = fixture({ usedBy: ['skills/one/SKILL.md'], carriers: BOTH })
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /skills\/two\/SKILL\.md/)
  assert.match(output, /not listed under "Used by"/)
})

test('a copy of a block the doc does not declare fails', () => {
  const dir = fixture()
  write(join(dir, 'plugins', 'alpha', 'skills', 'three', 'SKILL.md'),
    skillFile(wrapped('ghost-block', 1, 'Text with no home.')))
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /ghost-block/)
  assert.match(output, /not declared/)
})

test('markers in a plugin with no approved-blocks.md fail', () => {
  const dir = fixture()
  write(join(dir, 'plugins', 'beta', 'skills', 'one', 'SKILL.md'),
    skillFile(wrapped('demo-block', 1, CONTENT)))
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /plugins\/beta\/skills\/one\/SKILL\.md/)
  assert.match(output, /no approved-blocks\.md/)
})

test('an unclosed marker fails instead of silently matching nothing', () => {
  const dir = fixture()
  const path = join(dir, 'plugins', 'alpha', 'skills', 'one', 'SKILL.md')
  writeFileSync(path, readFileSync(path, 'utf8').replace('<!-- /approved-block: demo-block -->', ''))
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /never closed/)
})

test('a block with no Used by line fails', () => {
  const dir = fixture()
  const path = join(dir, 'plugins', 'alpha', 'approved-blocks.md')
  writeFileSync(path, readFileSync(path, 'utf8').replace(/^Used by:.*$/m, 'Nobody uses this.'))
  const { code, output } = run(dir, '--check')
  assert.equal(code, 1)
  assert.match(output, /Used by/)
})

test('--write repairs drift and leaves the markers in place', () => {
  const dir = fixture({ copyContent: 'Something a well-meaning editor retyped by hand.' })
  const before = read(dir, 'skills/one/SKILL.md')
  assert.doesNotMatch(before, /byte-identical/)

  const { code, output } = run(dir, '--write')
  assert.equal(code, 0, output)
  assert.match(output, /rewrote 2 copies/)

  const after = read(dir, 'skills/one/SKILL.md')
  assert.equal(after, skillFile(wrapped('demo-block', 1, CONTENT)))
  assert.equal(run(dir, '--check').code, 0)
})

test('--write repairs a copy whose marker version is stale', () => {
  const dir = fixture({ version: 3, copyVersion: 1, copyContent: 'Old text.' })
  assert.equal(run(dir, '--write').code, 0)
  assert.match(read(dir, 'skills/one/SKILL.md'), /approved-block: demo-block v3 — authoritative copy/)
  assert.equal(run(dir, '--check').code, 0)
})

test('--write on an already-synced tree rewrites nothing', () => {
  const dir = fixture()
  const before = read(dir, 'skills/one/SKILL.md')
  const { code, output } = run(dir, '--write')
  assert.equal(code, 0, output)
  assert.match(output, /nothing rewritten/)
  assert.equal(read(dir, 'skills/one/SKILL.md'), before)
})

test('--write still reports problems it cannot repair', () => {
  const dir = fixture({ usedBy: BOTH, carriers: ['skills/one/SKILL.md'] })
  const { code, output } = run(dir, '--write')
  assert.equal(code, 1)
  assert.match(output, /skills\/two\/SKILL\.md/)
})

test('an unknown argument exits 2 with usage', () => {
  const dir = fixture()
  const { code, output } = run(dir, '--fix')
  assert.equal(code, 2)
  assert.match(output, /usage: sync-approved-blocks\.mjs/)
})
