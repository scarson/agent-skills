#!/usr/bin/env node
// ABOUTME: Verifies that every plugin changed in a diff range had its version bumped, that the
// .claude-plugin and .codex-plugin manifests agree, and that the plugin sets in both marketplace
// files match the plugins/ directories. Run by .githooks/pre-commit; see docs/releasing.md.

import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SEMVER = /^\d+\.\d+\.\d+$/
const MANIFEST_DIRS = ['.claude-plugin', '.codex-plugin']
const CLAUDE_MARKETPLACE = '.claude-plugin/marketplace.json'
const AGENTS_MARKETPLACE = '.agents/plugins/marketplace.json'

function usage (message) {
  console.error(message)
  console.error('usage: check-plugin-versions.mjs [--staged | --against <ref>]')
  process.exit(2)
}

function parseArgs (argv) {
  if (argv.length === 0) return { mode: 'staged', base: 'HEAD' }
  if (argv[0] === '--staged') {
    if (argv.length > 1) usage(`unexpected argument: ${argv[1]}`)
    return { mode: 'staged', base: 'HEAD' }
  }
  if (argv[0] === '--against') {
    if (argv.length !== 2) usage('--against requires exactly one ref')
    return { mode: 'against', base: argv[1] }
  }
  usage(`unknown argument: ${argv[0]}`)
}

const { mode, base } = parseArgs(process.argv.slice(2))

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

/**
 * Read a repo-relative path from whichever tree this mode is validating. In --staged mode that is
 * the index, not the working tree: a version bumped on disk but left unstaged would not be part of
 * the commit, and reading from disk would wrongly let it pass.
 */
function readTarget (path) {
  if (mode === 'staged') {
    try {
      return git('show', `:${path}`)
    } catch {
      return null
    }
  }
  try {
    return readFileSync(join(repoRoot, path), 'utf8')
  } catch {
    return null
  }
}

function readBase (path) {
  try {
    return git('show', `${base}:${path}`)
  } catch {
    return null
  }
}

/** Parse JSON, recording a failure and returning null rather than throwing. */
function parseJson (text, path) {
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch (err) {
    fail(`${path}: not valid JSON (${err.message})`)
    return null
  }
}

function manifestPath (plugin, manifestDir) {
  return `plugins/${plugin}/${manifestDir}/plugin.json`
}

/** Plugin names present in the tree being validated. */
function listPlugins () {
  if (mode === 'staged') {
    const tracked = git('ls-files', '--cached', '--', 'plugins/').split('\n')
    const names = new Set()
    for (const path of tracked) {
      const match = /^plugins\/([^/]+)\/\.claude-plugin\/plugin\.json$/.exec(path.trim())
      if (match) names.add(match[1])
    }
    return [...names].sort()
  }
  try {
    return readdirSync(join(repoRoot, 'plugins'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
  } catch {
    return []
  }
}

/** Plugin names with at least one changed file in the diff range. */
function changedPlugins () {
  const args = mode === 'staged'
    ? ['diff', '--cached', '--name-only', '--', 'plugins/']
    : ['diff', '--name-only', base, '--', 'plugins/']
  const names = new Set()
  for (const path of git(...args).split('\n')) {
    const match = /^plugins\/([^/]+)\//.exec(path.trim())
    if (match) names.add(match[1])
  }
  return names
}

const plugins = listPlugins()
const changed = changedPlugins()

// --- Assertions 1, 2, 4, 5: per-plugin manifest agreement, bump requirement, version shape ------

for (const plugin of plugins) {
  const versions = {}
  let readable = true

  for (const manifestDir of MANIFEST_DIRS) {
    const path = manifestPath(plugin, manifestDir)
    const text = readTarget(path)
    if (text === null) {
      fail(`${path}: missing`)
      readable = false
      continue
    }
    const json = parseJson(text, path)
    if (json === null) {
      readable = false
      continue
    }
    if (typeof json.version !== 'string') {
      fail(`${path}: no version string`)
      readable = false
      continue
    }
    if (!SEMVER.test(json.version)) {
      fail(`${path}: version "${json.version}" is not three dot-separated integers`)
      readable = false
      continue
    }
    versions[manifestDir] = json.version
  }

  if (!readable) continue

  if (versions['.claude-plugin'] !== versions['.codex-plugin']) {
    fail(
      `${plugin}: manifest versions disagree — ` +
      `.claude-plugin is ${versions['.claude-plugin']}, .codex-plugin is ${versions['.codex-plugin']}. ` +
      'Both must carry the same version.'
    )
    continue
  }

  if (!changed.has(plugin)) continue

  const baseJson = parseJson(readBase(manifestPath(plugin, '.claude-plugin')), 'base manifest')
  // No manifest at the base ref means the plugin is new in this range; its version is an initial
  // value rather than a bump, so there is nothing to require.
  if (baseJson === null) continue

  if (baseJson.version === versions['.claude-plugin']) {
    fail(
      `${plugin}: files changed but version is still ${versions['.claude-plugin']}. ` +
      'An unbumped change is an undelivered change — Claude Code keys the install path off this version.\n' +
      `    Fix: node scripts/bump-plugin-version.mjs ${plugin} minor` +
      '   (use patch instead for wording, typo, or docs-only edits)'
    )
  }
}

// --- Assertion 3: plugin sets agree across both marketplace files and the plugins/ directories ---

function marketplaceNames (path) {
  const json = parseJson(readTarget(path), path)
  if (json === null) return null
  if (!Array.isArray(json.plugins)) {
    fail(`${path}: no plugins array`)
    return null
  }
  return json.plugins.map(entry => entry?.name).filter(name => typeof name === 'string').sort()
}

function reportSetDifference (label, expected, actual) {
  if (actual === null) return
  const missing = expected.filter(name => !actual.includes(name))
  const extra = actual.filter(name => !expected.includes(name))
  for (const name of missing) fail(`${label}: missing plugin "${name}" that exists in plugins/`)
  for (const name of extra) fail(`${label}: lists plugin "${name}" with no plugins/ directory`)
}

reportSetDifference(CLAUDE_MARKETPLACE, plugins, marketplaceNames(CLAUDE_MARKETPLACE))
reportSetDifference(AGENTS_MARKETPLACE, plugins, marketplaceNames(AGENTS_MARKETPLACE))

// --- Report ---------------------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`\nplugin version check failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nSee docs/releasing.md for the version bump convention.\n')
  process.exit(1)
}

const summary = changed.size === 0
  ? 'no plugin changes'
  : `${changed.size} plugin${changed.size === 1 ? '' : 's'} changed and bumped: ${[...changed].sort().join(', ')}`
console.log(`plugin version check passed (${summary})`)
