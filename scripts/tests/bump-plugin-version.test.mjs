// ABOUTME: Tests for scripts/bump-plugin-version.mjs. Covers digit arithmetic, refusal to write
// when the manifests already disagree, the catalog version being recomputed from HEAD rather
// than advanced in place, and that a bump touches only the version line of each file.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const bumper = join(repoRoot, 'scripts', 'bump-plugin-version.mjs')
const checker = join(repoRoot, 'scripts', 'check-plugin-versions.mjs')

// Plugin-relative manifest paths, mirroring the bumper's own list. The bare `plugin.json` is the
// Agent Plugins spec location; the two dotted ones are the Claude Code and Codex locations.
const MANIFEST_FILES = ['plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json']

function git (cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function writeJson (path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

function makeFixture (plugins, catalogVersion = '1.0.0') {
  const dir = mkdtempSync(join(tmpdir(), 'plugin-bump-test-'))
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  git(dir, 'config', 'commit.gpgsign', 'false')

  const names = Object.keys(plugins)
  for (const [name, version] of Object.entries(plugins)) {
    for (const manifest of MANIFEST_FILES) {
      writeJson(join(dir, 'plugins', name, manifest), {
        name,
        version,
        description: 'fixture plugin',
        keywords: ['a', 'b']
      })
    }
    mkdirSync(join(dir, 'plugins', name, 'skills', 'demo'), { recursive: true })
    writeFileSync(join(dir, 'plugins', name, 'skills', 'demo', 'SKILL.md'), 'original\n')
  }

  writeJson(join(dir, '.claude-plugin', 'marketplace.json'), {
    name: 'fixture',
    metadata: { description: 'fixture', version: catalogVersion },
    plugins: names.map(n => ({ name: n, source: `./plugins/${n}` }))
  })
  writeJson(join(dir, '.agents', 'plugins', 'marketplace.json'), {
    name: 'fixture',
    plugins: names.map(n => ({ name: n, source: { source: 'local', path: `./plugins/${n}` } }))
  })

  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'initial')
  return dir
}

function bump (dir, ...args) {
  try {
    const output = execFileSync('node', [bumper, ...args], { cwd: dir, encoding: 'utf8' })
    return { code: 0, output }
  } catch (err) {
    return { code: err.status ?? 1, output: (err.stdout ?? '') + (err.stderr ?? '') }
  }
}

function versionOf (dir, plugin, manifest) {
  const path = join(dir, 'plugins', plugin, manifest)
  return JSON.parse(readFileSync(path, 'utf8')).version
}

function catalogVersion (dir) {
  const path = join(dir, '.claude-plugin', 'marketplace.json')
  return JSON.parse(readFileSync(path, 'utf8')).metadata.version
}

const fixtures = []
function fixture (plugins, catalog) {
  const dir = makeFixture(plugins, catalog)
  fixtures.push(dir)
  return dir
}

test.after(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true })
})

test('patch bump advances the last digit in every manifest', () => {
  const dir = fixture({ alpha: '0.4.0' })
  const { code, output } = bump(dir, 'alpha', 'patch')
  assert.equal(code, 0, output)
  for (const manifest of MANIFEST_FILES) {
    assert.equal(versionOf(dir, 'alpha', manifest), '0.4.1', manifest)
  }
})

test('minor bump zeroes the patch digit', () => {
  const dir = fixture({ alpha: '0.4.7' })
  bump(dir, 'alpha', 'minor')
  assert.equal(versionOf(dir, 'alpha', '.claude-plugin/plugin.json'), '0.5.0')
})

test('major bump zeroes minor and patch', () => {
  const dir = fixture({ alpha: '0.4.7' })
  bump(dir, 'alpha', 'major')
  assert.equal(versionOf(dir, 'alpha', '.claude-plugin/plugin.json'), '1.0.0')
})

test('catalog version moves the same digit as the plugin', () => {
  const dir = fixture({ alpha: '0.4.0' }, '0.7.0')
  bump(dir, 'alpha', 'minor')
  assert.equal(catalogVersion(dir), '0.8.0')
})

test('two patch bumps in one release move the catalog once', () => {
  const dir = fixture({ alpha: '0.4.0', beta: '0.1.0' }, '0.7.0')
  bump(dir, 'alpha', 'patch')
  bump(dir, 'beta', 'patch')
  assert.equal(catalogVersion(dir), '0.7.1')
  assert.equal(versionOf(dir, 'alpha', '.claude-plugin/plugin.json'), '0.4.1')
  assert.equal(versionOf(dir, 'beta', '.claude-plugin/plugin.json'), '0.1.1')
})

test('a patch bump followed by a minor bump leaves the catalog one minor ahead of HEAD', () => {
  const dir = fixture({ alpha: '0.4.0', beta: '0.1.0' }, '0.7.0')
  bump(dir, 'alpha', 'patch')
  assert.equal(catalogVersion(dir), '0.7.1')
  bump(dir, 'beta', 'minor')
  assert.equal(catalogVersion(dir), '0.8.0')
})

test('bump order does not change the catalog result', () => {
  const first = fixture({ alpha: '0.4.0', beta: '0.1.0' }, '0.7.0')
  bump(first, 'alpha', 'minor')
  bump(first, 'beta', 'patch')

  const second = fixture({ alpha: '0.4.0', beta: '0.1.0' }, '0.7.0')
  bump(second, 'beta', 'patch')
  bump(second, 'alpha', 'minor')

  assert.equal(catalogVersion(first), catalogVersion(second))
  assert.equal(catalogVersion(first), '0.8.0')
})

test('refuses to write when the manifests already disagree', () => {
  const dir = fixture({ alpha: '0.4.0' })
  const path = join(dir, 'plugins', 'alpha', '.codex-plugin/plugin.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.version = '0.9.0'
  writeJson(path, json)

  const { code, output } = bump(dir, 'alpha', 'patch')
  assert.equal(code, 1)
  assert.match(output, /disagree|mismatch/i)
  assert.equal(versionOf(dir, 'alpha', 'plugin.json'), '0.4.0', 'must not have written')
  assert.equal(versionOf(dir, 'alpha', '.claude-plugin/plugin.json'), '0.4.0', 'must not have written')
  assert.equal(versionOf(dir, 'alpha', '.codex-plugin/plugin.json'), '0.9.0', 'must not have written')
})

test('refuses to write when the root manifest is the one out of step', () => {
  const dir = fixture({ alpha: '0.4.0' })
  const path = join(dir, 'plugins', 'alpha', 'plugin.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.version = '0.9.0'
  writeJson(path, json)

  const { code, output } = bump(dir, 'alpha', 'patch')
  assert.equal(code, 1)
  assert.match(output, /disagree|mismatch/i)
  assert.equal(versionOf(dir, 'alpha', '.claude-plugin/plugin.json'), '0.4.0', 'must not have written')
})

test('unknown plugin fails without writing', () => {
  const dir = fixture({ alpha: '0.4.0' }, '0.7.0')
  const { code, output } = bump(dir, 'nope', 'patch')
  assert.equal(code, 1)
  assert.match(output, /nope/)
  assert.equal(catalogVersion(dir), '0.7.0')
})

test('invalid digit argument fails without writing', () => {
  const dir = fixture({ alpha: '0.4.0' })
  const { code } = bump(dir, 'alpha', 'sideways')
  assert.notEqual(code, 0)
  assert.equal(versionOf(dir, 'alpha', '.claude-plugin/plugin.json'), '0.4.0')
})

test('missing arguments fail', () => {
  const dir = fixture({ alpha: '0.4.0' })
  assert.notEqual(bump(dir, 'alpha').code, 0)
  assert.notEqual(bump(dir).code, 0)
})

test('a bump changes only the version line of each file', () => {
  const dir = fixture({ alpha: '0.4.0' }, '0.7.0')
  bump(dir, 'alpha', 'minor')
  const numstat = git(dir, 'diff', '--numstat').trim().split('\n')
  assert.equal(numstat.length, 4, `expected 4 changed files, got:\n${numstat.join('\n')}`)
  for (const line of numstat) {
    const [added, removed] = line.split('\t')
    assert.equal(added, '1', `${line}: formatting was not preserved`)
    assert.equal(removed, '1', `${line}: formatting was not preserved`)
  }
})

test('the checker passes after a content change plus a bump', () => {
  const dir = fixture({ alpha: '0.4.0' })
  writeFileSync(join(dir, 'plugins', 'alpha', 'skills', 'demo', 'SKILL.md'), 'changed\n')
  bump(dir, 'alpha', 'minor')
  git(dir, 'add', '-A')
  const result = execFileSync('node', [checker, '--staged'], { cwd: dir, encoding: 'utf8' })
  assert.match(result, /passed/)
})
