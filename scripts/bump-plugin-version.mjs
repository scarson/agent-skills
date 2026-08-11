#!/usr/bin/env node
// ABOUTME: Bumps a plugin's version in all three manifests — the Agent Plugins root plugin.json,
// .claude-plugin, and .codex-plugin — plus the marketplace catalog version, in one operation, so the
// copies cannot drift apart. Every place the version appears is written here; see docs/releasing.md
// for when to run it and which digit to move.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/
const DIGITS = ['major', 'minor', 'patch']
// Plugin-relative paths of every manifest carrying a version. The bare `plugin.json` is the Agent
// Plugins spec location (§5.1: clients MUST check for a manifest at plugin.json in the plugin root);
// the two dotted ones are where Claude Code and Codex look today.
const MANIFEST_FILES = ['plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json']
const CATALOG = '.claude-plugin/marketplace.json'

function die (message) {
  console.error(message)
  process.exit(1)
}

function usage () {
  console.error('usage: bump-plugin-version.mjs <plugin-name> <major|minor|patch>')
  console.error('')
  console.error('  minor  a new skill, or a change to what a skill does')
  console.error('  patch  wording, typo, formatting, or docs-only edits')
  process.exit(2)
}

const [plugin, digit, ...rest] = process.argv.slice(2)
if (!plugin || !digit || rest.length > 0) usage()
if (!DIGITS.includes(digit)) {
  console.error(`unknown bump digit: ${digit}`)
  usage()
}

function git (...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

let repoRoot
try {
  repoRoot = git('rev-parse', '--show-toplevel').trim()
} catch {
  die('not inside a git repository')
}

const abs = path => join(repoRoot, path)

if (!existsSync(abs(`plugins/${plugin}`))) {
  die(`no such plugin: ${plugin} (expected plugins/${plugin}/)`)
}

/** Advance a version string by one digit, zeroing everything below it. */
function advance (version, which) {
  const match = SEMVER.exec(version)
  if (!match) die(`version "${version}" is not three dot-separated integers`)
  const [major, minor, patch] = match.slice(1).map(Number)
  if (which === 'major') return `${major + 1}.0.0`
  if (which === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function readJson (path) {
  let text
  try {
    text = readFileSync(abs(path), 'utf8')
  } catch {
    die(`${path}: cannot read`)
  }
  try {
    return JSON.parse(text)
  } catch (err) {
    die(`${path}: not valid JSON (${err.message})`)
  }
}

/**
 * Write JSON with the two-space indentation and trailing newline the existing manifests use, so the
 * resulting diff is confined to the version line.
 */
function writeJson (path, value) {
  writeFileSync(abs(path), JSON.stringify(value, null, 2) + '\n')
}

function readJsonAtHead (path) {
  try {
    return JSON.parse(git('show', `HEAD:${path}`))
  } catch {
    return null
  }
}

// --- Validate every manifest before writing anything -----------------------------------------------

const manifestPaths = MANIFEST_FILES.map(file => `plugins/${plugin}/${file}`)
const manifests = manifestPaths.map(readJson)
const currentVersions = manifests.map((json, i) => {
  if (typeof json.version !== 'string') die(`${manifestPaths[i]}: no version string`)
  return json.version
})

if (new Set(currentVersions).size > 1) {
  die(
    `${plugin}: manifest versions already disagree —\n` +
    currentVersions.map((version, i) => `    ${MANIFEST_FILES[i]} is ${version}`).join('\n') + '\n' +
    'Reconcile them by hand first; bumping now would silently pick one and discard the rest.'
  )
}

const current = currentVersions[0]
const next = advance(current, digit)

// The catalog version is derived from its value at HEAD advanced by this bump's digit, then floored
// at whatever is already on disk. Recomputing from HEAD stops a second bump from double-advancing
// the catalog; taking the maximum stops a later small bump from regressing an earlier larger one
// (a patch bump after a minor bump must not rewrite 0.8.0 back down to 0.7.1). Together they make
// the result depend only on the largest digit moved in the release, never on bump order.
function compareVersions (a, b) {
  const left = SEMVER.exec(a).slice(1).map(Number)
  const right = SEMVER.exec(b).slice(1).map(Number)
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i]
  }
  return 0
}

const catalog = readJson(CATALOG)
if (typeof catalog?.metadata?.version !== 'string') {
  die(`${CATALOG}: no metadata.version string`)
}
const catalogAtHead = readJsonAtHead(CATALOG)
const catalogBase = typeof catalogAtHead?.metadata?.version === 'string'
  ? catalogAtHead.metadata.version
  : catalog.metadata.version
const catalogCurrent = catalog.metadata.version
if (!SEMVER.test(catalogCurrent)) die(`${CATALOG}: metadata.version "${catalogCurrent}" is not three dot-separated integers`)
const catalogCandidate = advance(catalogBase, digit)
const catalogNext = compareVersions(catalogCandidate, catalogCurrent) > 0 ? catalogCandidate : catalogCurrent

// --- Write ----------------------------------------------------------------------------------------

manifests.forEach((json, i) => {
  json.version = next
  writeJson(manifestPaths[i], json)
  console.log(`${manifestPaths[i]}: ${current} -> ${next}`)
})

if (catalogNext === catalogCurrent) {
  console.log(`${CATALOG}: metadata.version already ${catalogCurrent} for this release, unchanged`)
} else {
  catalog.metadata.version = catalogNext
  writeJson(CATALOG, catalog)
  console.log(`${CATALOG}: metadata.version ${catalogCurrent} -> ${catalogNext}`)
}
