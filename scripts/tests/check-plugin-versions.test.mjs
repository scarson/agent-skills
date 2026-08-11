// ABOUTME: Tests for scripts/check-plugin-versions.mjs. Each case builds a throwaway git
// repository with a synthetic plugin layout, mutates it, and asserts the checker's exit code
// and message. Fixtures are real git repos because the checker's core question -- "did this
// plugin change without its version changing?" -- is only answerable against a git diff range.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const checker = join(repoRoot, 'scripts', 'check-plugin-versions.mjs')

// Plugin-relative manifest paths, mirroring the checker's own list. The bare `plugin.json` is the
// Agent Plugins spec location; the two dotted ones are the Claude Code and Codex locations.
const MANIFEST_FILES = ['plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json']

function git (cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function writeJson (path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

/**
 * Build a fixture repo with `plugins` = { name: version } and one committed skill file each.
 * Returns the repo path. The initial state always passes the checker.
 */
function makeFixture (plugins) {
  const dir = mkdtempSync(join(tmpdir(), 'plugin-version-test-'))
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  git(dir, 'config', 'commit.gpgsign', 'false')

  const names = Object.keys(plugins)
  for (const [name, version] of Object.entries(plugins)) {
    for (const manifest of MANIFEST_FILES) {
      writeJson(join(dir, 'plugins', name, manifest), { name, version })
    }
    mkdirSync(join(dir, 'plugins', name, 'skills', 'demo'), { recursive: true })
    writeFileSync(join(dir, 'plugins', name, 'skills', 'demo', 'SKILL.md'), 'original\n')
  }

  writeJson(join(dir, '.claude-plugin', 'marketplace.json'), {
    name: 'fixture',
    metadata: { version: '1.0.0' },
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

/** Run the checker against a fixture. Returns { code, output }. */
function check (dir, ...args) {
  try {
    const output = execFileSync('node', [checker, ...args], { cwd: dir, encoding: 'utf8' })
    return { code: 0, output }
  } catch (err) {
    return { code: err.status ?? 1, output: (err.stdout ?? '') + (err.stderr ?? '') }
  }
}

function setVersion (dir, plugin, manifest, version) {
  const path = join(dir, 'plugins', plugin, manifest)
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.version = version
  writeJson(path, json)
}

function bumpEveryManifest (dir, plugin, version) {
  for (const manifest of MANIFEST_FILES) setVersion(dir, plugin, manifest, version)
}

function touchSkill (dir, plugin, text = 'changed\n') {
  writeFileSync(join(dir, 'plugins', plugin, 'skills', 'demo', 'SKILL.md'), text)
}

const fixtures = []
function fixture (plugins) {
  const dir = makeFixture(plugins)
  fixtures.push(dir)
  return dir
}

test.after(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true })
})

test('clean tree with no plugin changes passes', () => {
  const dir = fixture({ alpha: '0.1.0' })
  const { code } = check(dir, '--against', 'HEAD')
  assert.equal(code, 0)
})

test('change outside plugins/ does not require a bump', () => {
  const dir = fixture({ alpha: '0.1.0' })
  writeFileSync(join(dir, 'README.md'), 'docs only\n')
  git(dir, 'add', '-A')
  const { code } = check(dir, '--staged')
  assert.equal(code, 0)
})

test('changed plugin without a version bump fails and names the plugin', () => {
  const dir = fixture({ alpha: '0.1.0', beta: '0.1.0' })
  touchSkill(dir, 'alpha')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /alpha/)
  assert.doesNotMatch(output, /beta/)
})

test('failure output includes a runnable bump command', () => {
  const dir = fixture({ alpha: '0.1.0' })
  touchSkill(dir, 'alpha')
  git(dir, 'add', '-A')
  const { output } = check(dir, '--staged')
  assert.match(output, /bump-plugin-version\.mjs alpha (minor|patch)/)
})

test('changed plugin with a version bump passes', () => {
  const dir = fixture({ alpha: '0.1.0' })
  touchSkill(dir, 'alpha')
  bumpEveryManifest(dir, 'alpha','0.2.0')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 0, output)
})

test('manifests carrying different versions fail even with no content change', () => {
  const dir = fixture({ alpha: '0.1.0' })
  setVersion(dir, 'alpha', '.codex-plugin/plugin.json', '0.9.0')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /alpha/)
  assert.match(output, /0\.1\.0/)
  assert.match(output, /0\.9\.0/)
})

test('a root manifest left behind by a bump fails', () => {
  const dir = fixture({ alpha: '0.1.0' })
  setVersion(dir, 'alpha', '.claude-plugin/plugin.json', '0.2.0')
  setVersion(dir, 'alpha', '.codex-plugin/plugin.json', '0.2.0')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /plugin\.json/)
  assert.match(output, /0\.1\.0/)
})

test('a missing root manifest fails and names the path', () => {
  const dir = fixture({ alpha: '0.1.0' })
  rmSync(join(dir, 'plugins', 'alpha', 'plugin.json'))
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /plugins\/alpha\/plugin\.json/)
  assert.match(output, /missing/)
})

test('bumping only one manifest fails despite the content change being bumped', () => {
  const dir = fixture({ alpha: '0.1.0' })
  touchSkill(dir, 'alpha')
  setVersion(dir, 'alpha', '.claude-plugin/plugin.json', '0.2.0')
  git(dir, 'add', '-A')
  const { code } = check(dir, '--staged')
  assert.equal(code, 1)
})

test('plugin missing from the agents marketplace file fails', () => {
  const dir = fixture({ alpha: '0.1.0' })
  const path = join(dir, '.agents', 'plugins', 'marketplace.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.plugins = []
  writeJson(path, json)
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /alpha/)
})

test('plugin missing from the claude marketplace file fails', () => {
  const dir = fixture({ alpha: '0.1.0' })
  const path = join(dir, '.claude-plugin', 'marketplace.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.plugins = []
  writeJson(path, json)
  git(dir, 'add', '-A')
  const { code } = check(dir, '--staged')
  assert.equal(code, 1)
})

test('version that is not three dot-separated integers fails', () => {
  const dir = fixture({ alpha: '0.1.0' })
  bumpEveryManifest(dir, 'alpha','0.2')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /0\.2\b/)
})

test('manifest that is not valid JSON fails without throwing', () => {
  const dir = fixture({ alpha: '0.1.0' })
  writeFileSync(join(dir, 'plugins', 'alpha', '.codex-plugin/plugin.json'), '{ not json\n')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /JSON/i)
})

test('newly added plugin needs no bump', () => {
  const dir = fixture({ alpha: '0.1.0' })
  for (const manifest of MANIFEST_FILES) {
    writeJson(join(dir, 'plugins', 'gamma', manifest), { name: 'gamma', version: '0.1.0' })
  }
  mkdirSync(join(dir, 'plugins', 'gamma', 'skills', 'demo'), { recursive: true })
  writeFileSync(join(dir, 'plugins', 'gamma', 'skills', 'demo', 'SKILL.md'), 'new\n')
  for (const [file, shape] of [
    ['.claude-plugin/marketplace.json', n => ({ name: n, source: `./plugins/${n}` })],
    ['.agents/plugins/marketplace.json', n => ({ name: n, source: { source: 'local', path: `./plugins/${n}` } })]
  ]) {
    const path = join(dir, file)
    const json = JSON.parse(readFileSync(path, 'utf8'))
    json.plugins.push(shape('gamma'))
    writeJson(path, json)
  }
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 0, output)
})

test('every failing plugin is reported, not just the first', () => {
  const dir = fixture({ alpha: '0.1.0', beta: '0.1.0' })
  touchSkill(dir, 'alpha')
  touchSkill(dir, 'beta')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /alpha/)
  assert.match(output, /beta/)
})

test('unstaged plugin change is ignored in --staged mode', () => {
  const dir = fixture({ alpha: '0.1.0' })
  touchSkill(dir, 'alpha')
  const { code } = check(dir, '--staged')
  assert.equal(code, 0)
})

test('unstaged plugin change is caught in --against mode', () => {
  const dir = fixture({ alpha: '0.1.0' })
  touchSkill(dir, 'alpha')
  const { code } = check(dir, '--against', 'HEAD')
  assert.equal(code, 1)
})

test('deleted plugin does not require a bump', () => {
  const dir = fixture({ alpha: '0.1.0', beta: '0.1.0' })
  rmSync(join(dir, 'plugins', 'beta'), { recursive: true, force: true })
  for (const file of ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json']) {
    const path = join(dir, file)
    const json = JSON.parse(readFileSync(path, 'utf8'))
    json.plugins = json.plugins.filter(p => p.name !== 'beta')
    writeJson(path, json)
  }
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 0, output)
})
