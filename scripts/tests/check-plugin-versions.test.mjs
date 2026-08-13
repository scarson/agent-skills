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
// Agent Plugins spec location every conformant client reads; the dotted one is Claude Code's.
const MANIFEST_FILES = ['plugin.json', '.claude-plugin/plugin.json']
const AGENT_PLUGINS_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'

/** Manifest body for `manifest`; only the root one declares the Agent Plugins schema. */
function manifestBody (manifest, name, version) {
  return manifest === 'plugin.json'
    ? { $schema: AGENT_PLUGINS_SCHEMA, name, version }
    : { name, version }
}

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
      writeJson(join(dir, 'plugins', name, manifest), manifestBody(manifest, name, version))
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

function setSchema (dir, plugin, schema) {
  const path = join(dir, 'plugins', plugin, 'plugin.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.$schema = schema
  writeJson(path, json)
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
  setVersion(dir, 'alpha', 'plugin.json', '0.9.0')
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
  writeFileSync(join(dir, 'plugins', 'alpha', '.claude-plugin/plugin.json'), '{ not json\n')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /JSON/i)
})

// .codex-plugin was retired once Codex began reading the portable root plugin.json. A copy left
// behind in a working tree is no longer a manifest this checker knows about, so its version must
// not be able to fail the run.
test('a leftover .codex-plugin manifest is not treated as a manifest', () => {
  const dir = fixture({ alpha: '0.1.0' })
  writeJson(join(dir, 'plugins', 'alpha', '.codex-plugin/plugin.json'), { name: 'alpha', version: '0.9.0' })
  bumpEveryManifest(dir, 'alpha', '0.2.0')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 0, output)
})

// ...but it is still a file under plugins/, so deleting one is a change to the plugin like any
// other. The companion above proves a stale version there cannot fail the run; this proves that
// exemption did not also exempt it from the bump requirement.
test('deleting a leftover .codex-plugin manifest still requires a bump', () => {
  const dir = fixture({ alpha: '0.1.0' })
  writeJson(join(dir, 'plugins', 'alpha', '.codex-plugin/plugin.json'), { name: 'alpha', version: '0.1.0' })
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'leftover')
  rmSync(join(dir, 'plugins', 'alpha', '.codex-plugin'), { recursive: true, force: true })
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /alpha/)
})

// The bump loop only walks what listPlugins() returns, so anything that drops a plugin from that
// list drops it out of the check entirely. Keying discovery off the manifests made deleting them
// all a way to do exactly that -- a three-file escape before .codex-plugin was retired, a
// two-file one after. Discovery keys off any tracked path under plugins/<name>/ instead.
test('deleting every manifest while skills remain is caught, not silently exempted', () => {
  const dir = fixture({ alpha: '0.1.0' })
  for (const manifest of MANIFEST_FILES) {
    rmSync(join(dir, 'plugins', 'alpha', manifest))
  }
  for (const file of ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json']) {
    const path = join(dir, file)
    const json = JSON.parse(readFileSync(path, 'utf8'))
    json.plugins = json.plugins.filter(p => p.name !== 'alpha')
    writeJson(path, json)
  }
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1, output)
  assert.match(output, /plugins\/alpha\/plugin\.json/)
  assert.match(output, /missing/)
})

// $schema is what makes Codex select the root manifest at all. Lose it and Codex falls through to
// .claude-plugin/plugin.json, which carries no skills pointer -- so the plugin loads with no
// skills rather than failing loudly. Retiring .codex-plugin removed the fallback that used to
// absorb this, which is what promoted the exact value to something worth gating on.
test('a root manifest with no $schema fails even when the version is bumped', () => {
  const dir = fixture({ alpha: '0.1.0' })
  touchSkill(dir, 'alpha')
  bumpEveryManifest(dir, 'alpha', '0.2.0')
  const path = join(dir, 'plugins', 'alpha', 'plugin.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))
  delete json.$schema
  writeJson(path, json)
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /\$schema/)
  assert.match(output, /missing/)
})

test('a root manifest whose $schema is not the Agent Plugins URI fails', () => {
  const dir = fixture({ alpha: '0.1.0' })
  setSchema(dir, 'alpha', 'https://agent-plugins.org/schemas/9.9.9/plugin.schema.json')
  git(dir, 'add', '-A')
  const { code, output } = check(dir, '--staged')
  assert.equal(code, 1)
  assert.match(output, /\$schema/)
  assert.match(output, /9\.9\.9/)
})

test('the .claude-plugin manifest is not required to declare a $schema', () => {
  const dir = fixture({ alpha: '0.1.0' })
  const path = join(dir, 'plugins', 'alpha', '.claude-plugin/plugin.json')
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).$schema, undefined)
  const { code, output } = check(dir, '--against', 'HEAD')
  assert.equal(code, 0, output)
})

test('newly added plugin needs no bump', () => {
  const dir = fixture({ alpha: '0.1.0' })
  for (const manifest of MANIFEST_FILES) {
    writeJson(join(dir, 'plugins', 'gamma', manifest), manifestBody(manifest, 'gamma', '0.1.0'))
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
