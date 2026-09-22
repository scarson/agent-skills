// ABOUTME: Dependency-free conformance tests for software-delivery assessment artifacts.
// ABOUTME: The same validators power fixture tests and the --validate-run maintainer CLI.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path, { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CONNECTED_RECORD_ALLOWLIST,
  validateLoadedRun,
  validateRun
} from '../../plugins/superpowers-plus/skills/software-delivery-assessment/scripts/validate-artifacts.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const skillRoot = join(repoRoot, 'plugins', 'superpowers-plus', 'skills', 'software-delivery-assessment')
const fixtureRoot = join(skillRoot, 'test-fixtures')
const artifactRoot = join(fixtureRoot, 'artifacts')
const cycleGraphRoot = join(artifactRoot, 'cycle-addenda', '2026-08-29T0900Z-solo-cli-a1b2')
const cycleAddenda = Object.freeze([
  '2026-08-29T1100Z-solo-cli-validation-b1c2d3e4f5a6',
  '2026-08-29T1200Z-solo-cli-followup-c2d3e4f5a6b7'
].map(runId => join(cycleGraphRoot, 'addenda', runId)))
const authoringExample = join(skillRoot, 'examples', 'minimal-root', '2026-08-29T1000Z-example-0123456789ab')
const referencePath = join(skillRoot, 'references', 'delivery-evidence-snapshot.md')
const CANONICAL_NAMES = Object.freeze(['manifest.yaml', 'evidence.jsonl', 'claims.jsonl', 'report.md'])
const RUN_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{4}Z-[a-z0-9](?:[a-z0-9-]{0,47}[a-z0-9])?-[a-z0-9]{4,16}$/
const GENERATED_RUN_SUFFIX_PATTERN = /^[a-f0-9]{12,16}$/
const EVIDENCE_ID_PATTERN = /^ev-[a-z0-9][a-z0-9._-]{0,127}$/
const CLAIM_ID_PATTERN = /^cl-[a-z0-9][a-z0-9._-]{0,127}$/
const PROPOSITION_ID_PATTERN = /^pr-[a-z0-9][a-z0-9._-]{0,127}$/
const FINDING_PATTERN = /^ff-sha256-[a-f0-9]{64}$/
const OCCURRENCE_PATTERN = /^oc-[a-z0-9][a-z0-9._-]{0,127}$/
const RECOMMENDATION_PATTERN = /^rc-[a-z0-9][a-z0-9._-]{0,127}$/
const RELATION_PATTERN = /^rel-[a-z0-9][a-z0-9._-]{0,127}$/
const TOKEN_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,63}$/
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const OBSERVATION_KINDS = new Set([
  'documentation_declared', 'human_confirmed', 'repository_observed',
  'external_system_observed', 'dynamically_verified', 'operational_record', 'inference'
])
const CLAIM_STATES = new Set(['claimed', 'configured', 'demonstrated', 'contradicted', 'unknown', 'not_applicable'])
const CLAIM_RANK = Object.freeze({ unknown: 0, not_applicable: 0, claimed: 1, configured: 2, demonstrated: 3, contradicted: 3 })
const REFERENCE_ONLY_LIMITATIONS = new Set(['content_not_persisted', 'source_access_limited', 'window_limited', 'manual_interpretation'])
const REPORT_HEADINGS = Object.freeze([
  '# Scope and units', '# Status', '# Accepted gaps', '# Material unknowns',
  '# Unavailable sources', '# Undemonstrated paths'
])
const ALLOWLIST_TOKEN_FIELDS = new Set([
  'provider', 'object_type', 'opaque_object_id', 'status', 'ref', 'check_id',
  'check_name', 'ci_run_id', 'environment_name', 'deployment_id', 'incident_id'
])
const ALLOWLIST_TIME_FIELDS = new Set(['collected_at', 'window_start', 'window_end'])
const RELATION_TYPES = new Set(['validates_root', 'validates_addendum', 'supersedes_blocked_run', 'scope_expansion_of'])
const EXEMPLARS = Object.freeze({
  complete: join(artifactRoot, 'complete-root', '2026-08-29T0900Z-solo-cli-a1b2'),
  partial: join(artifactRoot, 'partial-root', '2026-08-29T0910Z-forge-jenkins-c3d4'),
  blocked: join(artifactRoot, 'blocked-root', '2026-08-29T0920Z-forge-jenkins-e5f6'),
  aborted: join(artifactRoot, 'aborted-root', '2026-08-29T0930Z-mixed-monorepo-g7h8')
})
const SOURCE_FIXTURES = Object.freeze({
  complete: join(fixtureRoot, 'solo-cli'),
  partial: join(fixtureRoot, 'forge-jenkins'),
  blocked: join(fixtureRoot, 'forge-jenkins'),
  aborted: join(fixtureRoot, 'mixed-monorepo')
})
const MAINTAINER_FILES = new Set(['expected.json', 'connected-evidence.jsonl', 'resume-connected-evidence.jsonl', 'evaluation-contexts.json'])

function sha256 (value) {
  return createHash('sha256').update(value).digest('hex')
}

function parseJsonLines (file) {
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  return raw.split('\n').filter(Boolean).map((line, index) => {
    try { return JSON.parse(line) } catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`) }
  })
}

function clone (value) {
  return structuredClone(value)
}

function canonicalJson (value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
}

function walkFiles (root) {
  const output = []
  function walk (dir) {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name)
      const rel = relative(root, full).split(sep).join('/').normalize('NFC')
      const stat = lstatSync(full)
      if (stat.isDirectory()) walk(full)
      else output.push({ full, rel, stat })
    }
  }
  walk(root)
  return output
}

function sourceFingerprint (root) {
  const records = walkFiles(root)
    .filter(({ rel }) => !MAINTAINER_FILES.has(path.posix.basename(rel)))
    .map(({ full, rel, stat }) => {
      if (stat.isSymbolicLink()) return `L\0${rel}\0${normalizeLinkTarget(readFileSync(full), { platform: process.platform })}\n`
      const bytes = readFileSync(full)
      return `F\0${rel}\0${bytes.length}\0${sha256(bytes)}\n`
    })
    .sort((a, b) => a.localeCompare(b, 'en'))
  return { digest: sha256(records.join('')), paths: records.map(record => record.split('\0')[1]) }
}

function normalizeLinkTarget (raw, { platform = 'posix', linkKind = 'symlink' } = {}) {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), 'utf8')
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  if (/[\0\r\n]/.test(text)) throw new Error('link target contains forbidden NUL or newline')
  let normalized = text.normalize('NFC')
  if (platform === 'win32') {
    normalized = normalized.replace(/\\/g, '/')
    if (/^(?:\/\/\?\/|\/\?\?\/)/.test(normalized)) throw new Error('Windows namespace link targets are not canonical')
    normalized = normalized.replace(/^([A-Z]):/, (_, drive) => `${drive.toLowerCase()}:`)
  }
  normalized = path.posix.normalize(normalized)
  if (normalized === '.') normalized = ''
  if (!normalized) throw new Error('link target must not be empty')
  if (linkKind === 'junction' && platform !== 'win32') throw new Error('junction target requires win32 platform')
  return normalized
}

function handledRecord (pathName, code, parameters) {
  const schemas = {
    empty_directory: {},
    binary_opaque_hashed: { byte_size: 'int', sha256: 'sha' },
    archive_not_extracted: { byte_size: 'int', sha256: 'sha' },
    generated_subtree_bounded: { enumerated_entries: 'int', max_entries: 'int', remainder: ['present_unknown_count'] },
    declared_exclusion: { reason_code: ['dependency_cache', 'generated_output', 'user_declared'] },
    resource_bound_truncation: { bound_code: ['max_files', 'max_bytes', 'max_depth'], limit: 'int', observed: 'int', remainder: ['present_unknown_count'] }
  }
  const schema = schemas[code]
  if (!schema) throw new Error(`unknown handling code: ${code}`)
  assert.deepEqual(Object.keys(parameters).sort(), Object.keys(schema).sort(), `${code} parameter keys`)
  for (const [key, rule] of Object.entries(schema)) {
    const value = parameters[key]
    if (rule === 'int') assert.ok(Number.isSafeInteger(value) && value >= 0, `${code}.${key} must be a non-negative safe integer`)
    else if (rule === 'sha') assert.match(value, SHA256_PATTERN)
    else assert.ok(rule.includes(value), `${code}.${key} has a closed value`)
  }
  return `H\0${pathName.normalize('NFC')}\0${code}\0${canonicalJson(parameters)}\n`
}

function predicateValueErrors (value, propositionId, prefix) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${prefix} observed_value must be a predicate_result object`]
  if (Object.keys(value).sort().join(',') !== 'proposition_id,type,value') errors.push(`${prefix} observed_value has extra or missing keys`)
  if (value.type !== 'predicate_result') errors.push(`${prefix} observed_value type must be predicate_result`)
  if (!PROPOSITION_ID_PATTERN.test(value.proposition_id || '')) errors.push(`${prefix} observed_value proposition_id is invalid`)
  if (value.proposition_id !== propositionId) errors.push(`${prefix} observed_value proposition_id must match record proposition_id`)
  if (![true, false, 'unknown'].includes(value.value)) errors.push(`${prefix} observed_value value must be true, false, or unknown`)
  return errors
}

function allowlistedFieldErrors (fields, prefix) {
  const errors = []
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return [`${prefix} persisted_fields must be an object`]
  for (const [key, value] of Object.entries(fields)) {
    if (!CONNECTED_RECORD_ALLOWLIST.includes(key)) errors.push(`${prefix} persisted field ${key} is not allowlisted`)
    else if (ALLOWLIST_TOKEN_FIELDS.has(key) && (typeof value !== 'string' || !TOKEN_PATTERN.test(value))) errors.push(`${prefix} ${key} must be a bounded token`)
    else if (ALLOWLIST_TIME_FIELDS.has(key) && (typeof value !== 'string' || !UTC_PATTERN.test(value))) errors.push(`${prefix} ${key} must be UTC`)
    else if (key === 'review_count' && (!Number.isSafeInteger(value) || value < 0)) errors.push(`${prefix} review_count must be a non-negative safe integer`)
  }
  return errors
}

function evidenceCeiling (record) {
  if (record.observation_kind === 'documentation_declared' || record.observation_kind === 'human_confirmed') return 1
  if (record.observation_kind === 'repository_observed') return 2
  if (record.observation_kind === 'external_system_observed') return record.external_observation_subtype === 'behavior_event' ? 3 : 2
  if (record.observation_kind === 'dynamically_verified' || record.observation_kind === 'operational_record') return 3
  return 3
}

function dispositionErrors (disposition, claim, prefix) {
  const errors = []
  if (!disposition || typeof disposition !== 'object' || Array.isArray(disposition)) return [`${prefix} disposition must be a discriminated object`]
  const types = new Set(['confirmed_gap', 'supported_capability', 'duplicate', 'false_positive', 'contradicted', 'not_verifiable', 'out_of_scope', 'not_applicable', 'user_deferred'])
  if (!types.has(disposition.type)) errors.push(`${prefix} disposition type is invalid`)
  if (!Array.isArray(disposition.evidence_ids)) errors.push(`${prefix} disposition must preserve evidence_ids`)
  if (!Array.isArray(disposition.unit_ids) || !disposition.unit_ids.includes(claim.unit_id)) errors.push(`${prefix} disposition must preserve affected unit links`)
  if (disposition.type === 'duplicate' && !FINDING_PATTERN.test(disposition.target_finding_fingerprint || '')) errors.push(`${prefix} duplicate disposition needs target_finding_fingerprint`)
  if (['confirmed_gap', 'false_positive', 'contradicted', 'not_verifiable', 'out_of_scope', 'not_applicable'].includes(disposition.type) && !disposition.rationale) errors.push(`${prefix} disposition needs rationale`)
  if (disposition.type === 'user_deferred') {
    const decision = disposition.user_decision
    if (!decision || !TOKEN_PATTERN.test(decision.decision_id || '') || !decision.actor || !UTC_PATTERN.test(decision.decided_at || '') || !decision.rationale) errors.push(`${prefix} user_deferred needs an attributed decision`)
  }
  return errors
}

function canonicalFindingFingerprint (claim) {
  const stable = {
    assertion: claim.assertion,
    capability: claim.capability,
    change_class: claim.change_class,
    predicate: claim.predicate,
    proposition_id: claim.proposition_id,
    unit_id: claim.unit_id
  }
  return `ff-sha256-${sha256(canonicalJson(stable))}`
}

function recommendationErrors (recommendation, claim, prefix) {
  const errors = []
  if (!RECOMMENDATION_PATTERN.test(recommendation?.recommendation_id || '')) errors.push(`${prefix} recommendation_id is invalid`)
  if (recommendation?.target_claim_id !== claim.claim_id) errors.push(`${prefix} recommendation target claim is dangling`)
  if (claim.finding && recommendation?.target_finding_fingerprint !== claim.finding.fingerprint) errors.push(`${prefix} recommendation finding target is dangling`)
  for (const key of ['desired_outcome', 'causal_mechanism', 'tradeoffs', 'dependencies', 'responsible_control_boundary', 'verification_method', 'observable_closure_evidence', 'ordering_rationale']) {
    if (!recommendation?.[key] || (Array.isArray(recommendation[key]) && recommendation[key].length === 0)) errors.push(`${prefix} recommendation missing ${key}`)
  }
  if (!['current_gap', 'future_trigger'].includes(recommendation?.horizon)) errors.push(`${prefix} recommendation horizon is invalid`)
  return errors
}

function validateAuthorizedPaths (manifest) {
  const errors = []
  for (const [authorizedKey, pathsKey] of [['commit_authorized', 'authorized_stage_paths'], ['plan_persistence_authorized', 'authorized_plan_paths']]) {
    const authorized = manifest[authorizedKey]
    const paths = manifest[pathsKey]
    if (typeof authorized !== 'boolean' || !Array.isArray(paths)) { errors.push(`${authorizedKey} and ${pathsKey} must always be present`); continue }
    if (!authorized && paths.length !== 0) errors.push(`${pathsKey} must be empty when ${authorizedKey} is false`)
    if (authorized && paths.length === 0) errors.push(`${pathsKey} must be non-empty when ${authorizedKey} is true`)
    const seen = new Set()
    for (const candidate of paths) {
      if (typeof candidate !== 'string' || candidate !== candidate.normalize('NFC') || candidate.includes('\\') || /^(?:[a-zA-Z]:|\/|\\\\)/.test(candidate) || /[*?\[\]{}]/.test(candidate)) { errors.push(`${pathsKey} contains an invalid path`); continue }
      const parts = candidate.split('/')
      if (parts.some(part => !part || part === '.' || part === '..')) errors.push(`${pathsKey} contains an invalid segment`)
      const key = candidate.toLowerCase()
      if (seen.has(key)) errors.push(`${pathsKey} contains a duplicate path`)
      seen.add(key)
    }
  }
  const planSet = new Set(manifest.authorized_plan_paths || [])
  const stageSet = new Set(manifest.authorized_stage_paths || [])
  if (!manifest.plan_persistence_authorized && [...stageSet].some(value => /(?:^|\/)plans?\//.test(value))) errors.push('commit-only authorization cannot create a remediation plan')
  if (manifest.persistence_mode === 'authorized_commit') {
    if (!manifest.commit_authorized) errors.push('authorized_commit requires commit_authorized')
    if (!manifest.pinned_output_dir || !RUN_ID_PATTERN.test(manifest.pinned_run_id || '')) errors.push('new-run authorized_commit requires pinned output directory and run ID')
    for (const plan of planSet) if (!stageSet.has(plan)) errors.push('committed plan must appear in authorized_stage_paths')
  } else if (manifest.persistence_mode !== 'write_only') errors.push('persistence_mode is invalid')
  if (!manifest.commit_authorized && manifest.persistence_mode !== 'write_only') errors.push('commit authorization false requires write_only')
  return errors
}

function isContainedPath (root, candidate) {
  const rel = relative(root, candidate)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !path.isAbsolute(rel))
}

function resolveAuthorizedCandidate (artifactHost, candidate) {
  if (typeof candidate !== 'string' || candidate !== candidate.normalize('NFC') || candidate.includes('\\') || /^(?:[a-zA-Z]:|\/|\\\\)/.test(candidate) || /[*?\[\]{}]/.test(candidate)) throw new Error('authorized path has invalid lexical form')
  const segments = candidate.split('/')
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) throw new Error('authorized path has invalid segment')
  const host = realpathSync(artifactHost)
  let cursor = host
  for (let index = 0; index < segments.length; index += 1) {
    const next = join(cursor, segments[index])
    if (!existsSync(next)) {
      const unresolved = join(cursor, ...segments.slice(index))
      if (!isContainedPath(host, unresolved)) throw new Error('authorized path escapes artifact host')
      return unresolved
    }
    const stat = lstatSync(next)
    const resolved = realpathSync(next)
    if (!isContainedPath(host, resolved)) throw new Error('authorized path link parent escapes artifact host')
    if (index < segments.length - 1 && !stat.isDirectory() && !stat.isSymbolicLink()) throw new Error('authorized path parent is not a directory')
    if (index === segments.length - 1 && (!stat.isFile() || stat.isSymbolicLink())) throw new Error('authorized path must resolve to a regular file')
    cursor = resolved
  }
  return cursor
}

function validateMaterialSources (manifest, claimIds) {
  const errors = []
  if (!Array.isArray(manifest.material_sources) || manifest.material_sources.length === 0) return ['manifest needs material_sources']
  const seen = new Set()
  for (const source of manifest.material_sources) {
    if (!TOKEN_PATTERN.test(source?.source_id || '') || seen.has(source.source_id)) errors.push('material source_id must be unique bounded token')
    seen.add(source?.source_id)
    if (source?.material !== true || !['covered', 'blocked', 'accepted_gap'].includes(source?.outcome)) errors.push(`material source ${source?.source_id} has invalid outcome`)
    if (!Array.isArray(source?.affected_conclusion_ids) || source.affected_conclusion_ids.some(id => !claimIds.has(id))) errors.push(`material source ${source?.source_id} has dangling affected conclusions`)
    if (source.outcome === 'covered' && (!Array.isArray(source.evidence_ids) || source.evidence_ids.length === 0)) errors.push(`covered source ${source.source_id} needs evidence`)
    if (source.outcome === 'blocked' && manifest.status !== 'blocked') errors.push(`blocked source ${source.source_id} requires blocked status`)
    if (source.outcome === 'accepted_gap') {
      if (manifest.status !== 'partial') errors.push(`accepted source gap ${source.source_id} requires partial status`)
      if (!source.decision || !TOKEN_PATTERN.test(source.decision.decision_id || '') || !source.decision.actor || !UTC_PATTERN.test(source.decision.decided_at || '') || !source.decision.rationale) errors.push(`accepted source gap ${source.source_id} needs attributed decision`)
    }
  }
  if (manifest.status === 'complete' && manifest.material_sources.some(source => source.outcome !== 'covered')) errors.push('complete status requires every material source covered')
  if (manifest.status === 'partial' && !manifest.material_sources.some(source => source.outcome === 'accepted_gap')) errors.push('partial status requires an accepted material gap')
  if (manifest.status === 'blocked' && !manifest.material_sources.some(source => source.outcome === 'blocked')) errors.push('blocked status requires an unresolved material source')
  return errors
}

function validateSourceAnchorTransition (before, after, changedPaths) {
  const errors = []
  if (before.repository_anchor.identity !== after.repository_anchor.identity) errors.push('artifact-only commit changed repository identity')
  if (before.post_fingerprint !== after.post_fingerprint) errors.push('artifact-only commit changed assessed source fingerprint')
  const prefix = `${before.output_subtree.replace(/\/$/, '')}/`
  if (changedPaths.some(candidate => !(candidate === before.output_subtree || candidate.startsWith(prefix)))) errors.push('artifact-only ancestry includes assessed-source changes')
  if (before.repository_anchor.current_revision === after.repository_anchor.current_revision) errors.push('artifact-only transition must advance current revision')
  if (after.repository_anchor.assessed_revision !== before.repository_anchor.assessed_revision) errors.push('artifact-only commit must retain assessed revision')
  return errors
}

function loadRun (runDir) {
  const entries = existsSync(runDir) ? readdirSync(runDir) : []
  const canonicalNames = entries.filter(name => CANONICAL_NAMES.includes(name)).sort()
  return {
    runDir,
    manifest: JSON.parse(readFileSync(join(runDir, 'manifest.yaml'), 'utf8')),
    evidence: parseJsonLines(join(runDir, 'evidence.jsonl')),
    claims: parseJsonLines(join(runDir, 'claims.jsonl')),
    report: readFileSync(join(runDir, 'report.md'), 'utf8').replace(/\r\n/g, '\n'),
    canonicalNames,
    entries
  }
}

function validateLoadedRunLegacy (run, expectedKind, canonicalNames = run.canonicalNames) {
  const errors = []
  const { manifest, evidence, claims, report } = run
  const allowedDirs = expectedKind === 'root' ? new Set(['addenda', 'lane-notes']) : new Set(['lane-notes'])
  if (canonicalNames.slice().sort().join(',') !== CANONICAL_NAMES.slice().sort().join(',')) errors.push('run must contain exactly four canonical files')
  for (const name of run.entries || []) if (!CANONICAL_NAMES.includes(name) && !allowedDirs.has(name)) errors.push(`unexpected top-level entry: ${name}`)
  if (manifest.artifact_schema_version !== 1 || manifest.method_version !== '1.0') errors.push('manifest version is invalid')
  if (manifest.run_kind !== expectedKind) errors.push('run_kind does not match expected kind')
  if (!['complete', 'partial', 'blocked', 'aborted'].includes(manifest.status)) errors.push('status is invalid')
  if (manifest.closed !== (manifest.status !== 'blocked')) errors.push('closed/status invariant failed')
  if (!UTC_PATTERN.test(manifest.anchored_at || '')) errors.push('anchored_at must be UTC seconds')
  if (manifest.output_subtree?.startsWith('/') || !manifest.output_subtree) errors.push('output_subtree must be a relative predeclared path')
  if (manifest.index_path !== 'addenda/index.jsonl') errors.push('root must predeclare addenda/index.jsonl')
  if (!manifest.repository_anchor?.identity || !manifest.repository_anchor?.assessed_revision || !manifest.repository_anchor?.current_revision) errors.push('repository anchor is incomplete')
  if (manifest.working_tree_state === 'dirty' && (!Array.isArray(manifest.working_tree_inventory) || manifest.working_tree_inventory.length === 0)) errors.push('dirty working tree needs inventory')
  if (!['clean', 'dirty'].includes(manifest.working_tree_state)) errors.push('working_tree_state is invalid')
  if (manifest.fingerprint_method !== 'sha256-path-bytes-v1' || !SHA256_PATTERN.test(manifest.pre_fingerprint || '') || !SHA256_PATTERN.test(manifest.post_fingerprint || '')) errors.push('fingerprint contract is invalid')
  if (manifest.snapshot_id !== `snap-sha256-${manifest.pre_fingerprint}`) errors.push('snapshot_id must bind pre_fingerprint')
  if (manifest.pre_fingerprint !== manifest.post_fingerprint && manifest.status === 'complete') errors.push('complete run cannot silently mix fingerprint drift')
  if (manifest.fingerprint_scope?.complete !== true && manifest.status === 'complete') errors.push('complete single-lane run requires complete fingerprint scope')
  if (Array.isArray(manifest.lane_snapshot_ids) && manifest.lane_snapshot_ids.some(id => id !== manifest.snapshot_id)) errors.push('lane snapshot IDs must equal snapshot_id')
  if (manifest.truncated_surface?.some(surface => surface.material && manifest.status === 'complete')) errors.push('material truncated surface cannot be complete')
  errors.push(...validateAuthorizedPaths(manifest))
  const evidenceIds = new Set()
  const evidenceById = new Map()
  for (const record of evidence) {
    const prefix = `evidence ${record.evidence_id}`
    if (!EVIDENCE_ID_PATTERN.test(record.evidence_id || '') || evidenceIds.has(record.evidence_id)) errors.push(`${prefix} ID is invalid or duplicate`)
    evidenceIds.add(record.evidence_id)
    evidenceById.set(record.evidence_id, record)
    if (!PROPOSITION_ID_PATTERN.test(record.proposition_id || '')) errors.push(`${prefix} proposition_id is invalid`)
    if (!OBSERVATION_KINDS.has(record.observation_kind)) errors.push(`${prefix} observation_kind is invalid`)
    if (!UTC_PATTERN.test(record.collected_at || '') || new Date(record.collected_at) < new Date(manifest.anchored_at)) errors.push(`${prefix} collected_at precedes anchored_at`)
    if (record.observation_kind === 'external_system_observed') {
      if (!['configuration_snapshot', 'behavior_event'].includes(record.external_observation_subtype)) errors.push(`${prefix} external subtype is invalid`)
    } else if ('external_observation_subtype' in record) errors.push(`${prefix} non-external record carries external subtype`)
    if (record.observation_kind === 'inference') {
      if (!Array.isArray(record.derived_from_evidence_ids) || record.derived_from_evidence_ids.length === 0) errors.push(`${prefix} inference needs derived evidence`)
    } else if ('derived_from_evidence_ids' in record) errors.push(`${prefix} non-inference carries derived evidence`)
    errors.push(...predicateValueErrors(record.observed_value, record.proposition_id, prefix))
    if (record.persistence_shape === 'reference_only') {
      if (!Array.isArray(record.limitations) || record.limitations.some(value => !REFERENCE_ONLY_LIMITATIONS.has(value))) errors.push(`${prefix} reference-only limitations are not closed`)
      if (record.opaque_locator && Object.values(record.opaque_locator).some(value => typeof value !== 'string' || /[?=&\s]/.test(value))) errors.push(`${prefix} reference-only locator is not opaque/query-free`)
      for (const forbidden of ['persisted_fields', 'text', 'log_excerpt', 'body', 'payload', 'headers', 'url']) if (forbidden in record) errors.push(`${prefix} reference-only record contains ${forbidden}`)
    } else if (record.persistence_shape === 'allowlisted_record') {
      errors.push(...allowlistedFieldErrors(record.persisted_fields, prefix))
    } else errors.push(`${prefix} persistence_shape is invalid`)
  }
  const claimIds = new Set()
  const findingIds = new Set()
  const occurrenceIds = new Set()
  const recommendationIds = new Set()
  for (const claim of claims) {
    const prefix = `claim ${claim.claim_id}`
    if (!CLAIM_ID_PATTERN.test(claim.claim_id || '') || claimIds.has(claim.claim_id)) errors.push(`${prefix} ID is invalid or duplicate`)
    claimIds.add(claim.claim_id)
    if (!PROPOSITION_ID_PATTERN.test(claim.proposition_id || '')) errors.push(`${prefix} proposition_id is invalid`)
    if (!CLAIM_STATES.has(claim.claim_state)) errors.push(`${prefix} state is invalid`)
    errors.push(...predicateValueErrors(claim.assertion, claim.proposition_id, prefix))
    const cited = [...(claim.supporting_evidence_ids || []), ...(claim.counterevidence_ids || [])]
    for (const id of cited) {
      const record = evidenceById.get(id)
      if (!record) errors.push(`${prefix} cites absent evidence ${id}`)
      else {
        if (record.proposition_id !== claim.proposition_id) errors.push(`${prefix} evidence proposition mismatch`)
        if (claim.claim_state !== 'contradicted' && CLAIM_RANK[claim.claim_state] > evidenceCeiling(record)) errors.push(`${prefix} exceeds evidence-state ceiling`)
        if (claim.claim_state === 'demonstrated' && record.observation_kind === 'external_system_observed' && record.external_observation_subtype === 'behavior_event' && canonicalJson(claim.source_window) !== canonicalJson(record.result_window)) errors.push(`${prefix} demonstrated window exceeds behavior event`)
      }
    }
    if (claim.claim_state === 'contradicted') {
      const supportValues = (claim.supporting_evidence_ids || []).map(id => evidenceById.get(id)?.observed_value?.value)
      const counterValues = (claim.counterevidence_ids || []).map(id => evidenceById.get(id)?.observed_value?.value)
      if (!supportValues.some(value => counterValues.some(other => value !== other))) errors.push(`${prefix} contradicted state needs conflicting observed values`)
    }
    if (claim.finding) {
      if (!FINDING_PATTERN.test(claim.finding.fingerprint || '') || claim.finding.fingerprint !== canonicalFindingFingerprint(claim)) errors.push(`${prefix} finding fingerprint is invalid`)
      if (findingIds.has(claim.finding.fingerprint)) errors.push(`${prefix} finding fingerprint occurrence is duplicated in one run`)
      findingIds.add(claim.finding.fingerprint)
      if (!OCCURRENCE_PATTERN.test(claim.finding.occurrence_id || '') || occurrenceIds.has(claim.finding.occurrence_id)) errors.push(`${prefix} occurrence ID is invalid or duplicate`)
      occurrenceIds.add(claim.finding.occurrence_id)
    }
    errors.push(...dispositionErrors(claim.disposition, claim, prefix))
    for (const recommendation of claim.recommendations || []) {
      errors.push(...recommendationErrors(recommendation, claim, prefix))
      if (recommendationIds.has(recommendation.recommendation_id)) errors.push(`${prefix} recommendation ID is duplicate`)
      recommendationIds.add(recommendation.recommendation_id)
    }
  }
  errors.push(...validateMaterialSources(manifest, claimIds))
  for (const source of manifest.material_sources || []) for (const id of source.evidence_ids || []) if (!evidenceIds.has(id)) errors.push(`material source ${source.source_id} cites absent evidence`)
  for (const lens of manifest.lenses || []) {
    if (!['required', 'supplemental', 'not_applicable'].includes(lens.disposition) || !['succeeded', 'failed', 'unassessed'].includes(lens.outcome) || !lens.reason) errors.push('lens record is invalid')
    if (manifest.status === 'complete' && lens.disposition === 'required' && lens.outcome !== 'succeeded') errors.push('complete run has an unsatisfied required lens')
  }
  if (evidence.some(record => record.observation_kind === 'dynamically_verified')) for (const key of ['isolation_used', 'not_isolated', 'execution_controls_applied', 'remained_reachable']) if (!(key in manifest)) errors.push(`dynamic evidence requires ${key}`)
  const headingPositions = REPORT_HEADINGS.map(heading => report.indexOf(heading))
  if (headingPositions.some(position => position < 0) || headingPositions.some((position, index) => index > 0 && position <= headingPositions[index - 1])) errors.push('report must begin with coverage-first headings in order')
  if (manifest.status === 'blocked' && !report.includes('# Resume instructions')) errors.push('blocked report needs resume instructions')
  for (const claim of claims) if (!report.includes(`\`${claim.claim_id}\``)) errors.push(`report missing exact claim citation ${claim.claim_id}`)
  for (const record of evidence) if (!report.includes(`\`${record.evidence_id}\``)) errors.push(`report missing exact evidence citation ${record.evidence_id}`)
  return errors
}

function validateRunLegacy (runDir, expectedKind) {
  const run = loadRun(runDir)
  const errors = validateLoadedRunLegacy(run, expectedKind, run.canonicalNames)
  if (path.basename(runDir) !== run.manifest.run_id) errors.push('directory basename must equal manifest run_id')
  if (!RUN_ID_PATTERN.test(run.manifest.run_id)) errors.push('run_id must match YYYY-MM-DDTHHMMZ-<scope>-<id>')
  return errors
}

function loadRunTree (rootDir) {
  const runs = [{ manifest: JSON.parse(readFileSync(join(rootDir, 'manifest.yaml'), 'utf8')), dir: rootDir }]
  const addenda = join(rootDir, 'addenda')
  if (existsSync(addenda)) for (const name of readdirSync(addenda)) {
    const manifestPath = join(addenda, name, 'manifest.yaml')
    if (existsSync(manifestPath)) runs.push({ manifest: JSON.parse(readFileSync(manifestPath, 'utf8')), dir: dirname(manifestPath) })
  }
  return runs
}

function reconstructGraph (runs) {
  const nodes = new Map(runs.map(run => [run.manifest.run_id, run]))
  const edges = runs.flatMap(run => run.manifest.relations || [])
  return { nodes, edges }
}

function validateGraph (runs) {
  const errors = []
  const nodes = new Map(runs.map(run => [run.manifest.run_id, run]))
  const relationIds = new Set()
  const edgeKeys = new Set()
  const adjacency = new Map([...nodes.keys()].map(id => [id, []]))
  for (const run of runs) {
    for (const relation of run.manifest.relations || []) {
      if (!RELATION_PATTERN.test(relation.relation_id || '')) errors.push('relation ID is invalid')
      else if (relationIds.has(relation.relation_id)) errors.push('duplicate relation ID')
      relationIds.add(relation.relation_id)
      if (!RELATION_TYPES.has(relation.type)) errors.push('relation type is invalid')
      if (relation.from_run_id !== run.manifest.run_id) errors.push('relation from_run_id must be owned by containing manifest')
      const edgeKey = `${relation.type}\0${relation.from_run_id}\0${relation.to_run_id}`
      if (edgeKeys.has(edgeKey)) errors.push('duplicate relation edge')
      edgeKeys.add(edgeKey)
      const from = nodes.get(relation.from_run_id)
      const to = nodes.get(relation.to_run_id)
      if (!to) { errors.push('relation target does not exist'); continue }
      if (!from) { errors.push('relation source does not exist'); continue }
      if (relation.from_run_id === relation.to_run_id) errors.push('relation self-edge is invalid')
      if (new Date(from.manifest.anchored_at) <= new Date(to.manifest.anchored_at)) errors.push('relation source must be later than target')
      if (from.manifest.artifact_host !== to.manifest.artifact_host) errors.push('relation crosses artifact-host lineage')
      if (relation.type === 'validates_root' && !(from.manifest.run_kind === 'addendum' && to.manifest.run_kind === 'root' && from.manifest.root_run_id === to.manifest.run_id)) errors.push('validates_root endpoint kinds are invalid')
      if (relation.type === 'validates_addendum' && !(from.manifest.run_kind === 'addendum' && to.manifest.run_kind === 'addendum' && from.manifest.root_run_id === to.manifest.root_run_id)) errors.push('validates_addendum endpoint kinds are invalid')
      if (relation.type === 'supersedes_blocked_run' && !(from.manifest.run_kind === 'root' && to.manifest.status === 'blocked')) errors.push('supersedes_blocked_run endpoint kinds are invalid')
      if (relation.type === 'scope_expansion_of' && from.manifest.run_kind !== 'root') errors.push('scope_expansion_of source must be a root')
      adjacency.get(relation.from_run_id)?.push(relation.to_run_id)
    }
  }
  const visiting = new Set()
  const visited = new Set()
  function visit (id) {
    if (visiting.has(id)) { errors.push('relation graph contains a cycle'); return }
    if (visited.has(id)) return
    visiting.add(id)
    for (const target of adjacency.get(id) || []) visit(target)
    visiting.delete(id)
    visited.add(id)
  }
  for (const id of nodes.keys()) visit(id)
  return errors
}

function indexRecord (manifest) {
  if (!RUN_ID_PATTERN.test(manifest.run_id || '') || manifest.run_kind !== 'addendum' || !RUN_ID_PATTERN.test(manifest.root_run_id || '')) throw new Error('invalid addendum index identity')
  return {
    run_id: manifest.run_id,
    root_run_id: manifest.root_run_id,
    anchored_at: manifest.anchored_at,
    status: manifest.status,
    closed: manifest.closed,
    relation_types: [...new Set((manifest.relations || []).map(relation => relation.type))].sort(),
    locator: `addenda/${manifest.run_id}/manifest.yaml`
  }
}

function canonicalIndexLines (manifests) {
  return manifests.map(indexRecord)
    .sort((a, b) => a.anchored_at.localeCompare(b.anchored_at) || a.run_id.localeCompare(b.run_id))
    .map(record => JSON.stringify(record))
}

function rebuildIndex (rootDir) {
  const manifests = loadRunTree(rootDir).slice(1).map(run => run.manifest)
  const lines = canonicalIndexLines(manifests)
  const indexPath = join(rootDir, 'addenda', 'index.jsonl')
  mkdirSync(dirname(indexPath), { recursive: true })
  writeFileSync(indexPath, lines.length ? `${lines.join('\n')}\n` : '')
  return lines
}

function materializeAddendum (rootDir, addendumDir, destDir) {
  cpSync(rootDir, destDir, { recursive: true })
  const target = join(destDir, 'addenda', path.basename(addendumDir))
  mkdirSync(dirname(target), { recursive: true })
  cpSync(addendumDir, target, { recursive: true })
  rebuildIndex(destDir)
}

function reserveRunDirectory (baseDir, { timestamp, scope, randomBytesFn = randomBytes, maxAttempts = 4 }) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const suffix = randomBytesFn(6).toString('hex')
    if (!GENERATED_RUN_SUFFIX_PATTERN.test(suffix)) throw new Error('run suffix must provide at least 48 bits encoded as 12 hex characters')
    const runId = `${timestamp}-${scope}-${suffix}`
    const candidate = join(baseDir, runId)
    try { mkdirSync(candidate); return { runId, runDir: candidate } } catch (error) { if (error.code !== 'EEXIST') throw error }
  }
  throw new Error('could not reserve a collision-free run directory')
}

function readReferenceAllowlist () {
  const body = readFileSync(referencePath, 'utf8')
  const section = body.match(/## connected-record-allowlist\n([\s\S]*?)(?:\n## |$)/)?.[1] || ''
  return [...section.matchAll(/^- `([^`]+)`$/gm)].map(match => match[1])
}

const cliIndex = process.argv.indexOf('--validate-run')
if (cliIndex >= 0) {
  const expectedKind = process.argv[cliIndex + 1]
  const runDir = process.argv[cliIndex + 2]
  if (!['root', 'addendum'].includes(expectedKind) || !runDir) {
    console.error('usage: --validate-run <root|addendum> <run-dir>')
    process.exit(2)
  }
  const errors = validateRun(resolve(runDir), expectedKind)
  if (errors.length) { for (const error of errors) console.error(error); process.exit(1) }
  console.log('valid')
  process.exit(0)
}

const requiredPaths = [referencePath, ...Object.values(EXEMPLARS)]
const artifactsReady = requiredPaths.every(existsSync)

test('artifact reference and four root exemplars exist', () => {
  assert.deepEqual(requiredPaths.filter(file => !existsSync(file)), [])
})

test('canonical runtime root example passes artifact conformance', () => {
  assert.equal(existsSync(authoringExample), true, 'runtime authoring example is missing')
  assert.deepEqual(validateRun(authoringExample, 'root'), [])
})

test('Task 5 two-addendum graph exemplar exists', () => {
  assert.deepEqual([cycleGraphRoot, ...cycleAddenda, join(cycleGraphRoot, 'addenda', 'index.jsonl')].filter(file => !existsSync(file)), [])
})

if ([cycleGraphRoot, ...cycleAddenda].every(existsSync)) {
  test('cycle graph root and both addenda satisfy artifact and graph conformance', () => {
    assert.deepEqual(validateRun(cycleGraphRoot, 'root'), [])
    for (const addendum of cycleAddenda) assert.deepEqual(validateRun(addendum, 'addendum'), [], addendum)
    const runs = loadRunTree(cycleGraphRoot)
    assert.equal(runs.length, 3)
    assert.deepEqual(validateGraph(runs), [])
    const expectedIndex = `${canonicalIndexLines(runs.slice(1).map(run => run.manifest)).join('\n')}\n`
    assert.equal(readFileSync(join(cycleGraphRoot, 'addenda', 'index.jsonl'), 'utf8').replace(/\r\n/g, '\n'), expectedIndex)
  })

  test('cycle exemplar preserves frozen root and first-addendum bytes', () => {
    for (const name of CANONICAL_NAMES) {
      assert.deepEqual(readFileSync(join(cycleGraphRoot, name)), readFileSync(join(EXEMPLARS.complete, name)), `frozen root ${name}`)
    }
    const before = cycleAddenda.flatMap(dir => CANONICAL_NAMES.map(name => [join(dir, name), sha256(readFileSync(join(dir, name)))]))
    rebuildIndex(cycleGraphRoot)
    for (const [file, digest] of before) assert.equal(sha256(readFileSync(file)), digest, `index rebuild mutated ${file}`)
  })

  test('addendum manifests bind target claims, decisions, evidence windows, and owned graph edges', () => {
    const rootId = path.basename(cycleGraphRoot)
    for (const addendum of cycleAddenda) {
      const run = loadRun(addendum)
      assert.equal(run.manifest.root_run_id, rootId)
      assert.ok(Array.isArray(run.manifest.target_claim_ids) && run.manifest.target_claim_ids.includes('cl-local-verification'))
      assert.ok(Array.isArray(run.manifest.decisions))
      assert.ok(Array.isArray(run.manifest.evidence_windows) && run.manifest.evidence_windows.length > 0)
      assert.ok(run.manifest.relations.every(relation => relation.from_run_id === run.manifest.run_id))
      for (const mutate of [
        manifest => { delete manifest.root_run_id },
        manifest => { manifest.target_claim_ids = [] },
        manifest => { manifest.evidence_windows = [] },
        manifest => { manifest.relations[0].from_run_id = rootId }
      ]) {
        const invalid = clone(run)
        mutate(invalid.manifest)
        assert.notDeepEqual(validateLoadedRun(invalid, 'addendum'), [])
      }
    }
  })

  test('a blocked addendum resumes in place only after later affirmative evidence', () => {
    const open = loadRun(cycleAddenda[0])
    open.manifest.status = 'blocked'
    open.manifest.closed = false
    open.manifest.material_sources[0].outcome = 'blocked'
    open.manifest.lenses[0].outcome = 'failed'
    open.manifest.resume_anchors = {
      repository: { identity: 'fixture-solo-cli', revision: 'fixture-baseline-1' },
      working_tree_inventory: [],
      scope: { slug: 'solo-cli', unit_ids: ['solo-cli'] },
      source_windows: [{
        predicate: 'effective',
        source_identity: { provider: 'local', object_type: 'command', opaque_object_id: 'node-verify-mjs' },
        collection_window: { start: '2026-08-29T11:01:00Z', end: '2026-08-29T11:02:00Z' },
        result_window: { start: '2026-08-29T11:01:00Z', end: '2026-08-29T11:02:00Z' },
        freshness_class: 'current'
      }]
    }
    open.evidence[0].observed_value.value = 'unknown'
    open.claims[0].assertion.value = 'unknown'
    open.claims[0].claim_state = 'unknown'
    open.claims[0].disposition = { type: 'not_verifiable', rationale: 'current verification result is unavailable', evidence_ids: ['ev-cycle-local-test'], unit_ids: ['solo-cli'] }
    open.report = open.report.replace('# Validation result', '# Resume instructions\n\nRe-observe the same bounded command after revalidating all anchors.\n\n# Validation result')
    assert.deepEqual(validateLoadedRun(open, 'addendum'), [])

    const resumed = clone(open)
    resumed.manifest.status = 'complete'
    resumed.manifest.closed = true
    resumed.manifest.material_sources[0].outcome = 'covered'
    resumed.manifest.lenses[0].outcome = 'succeeded'
    delete resumed.manifest.resume_anchors
    resumed.evidence[0].collected_at = '2026-08-29T11:32:00Z'
    resumed.evidence[0].observed_value.value = true
    resumed.claims[0].assertion.value = true
    resumed.claims[0].claim_state = 'demonstrated'
    resumed.claims[0].source_window = { start: '2026-08-29T11:31:00Z', end: '2026-08-29T11:32:00Z' }
    resumed.claims[0].disposition = { type: 'supported_capability', evidence_ids: ['ev-cycle-local-test'], unit_ids: ['solo-cli'] }
    resumed.manifest.evidence_windows[0] = {
      source_id: 'local-verification',
      predicate: 'effective',
      freshness_class: 'current',
      collection_window: { start: '2026-08-29T11:31:00Z', end: '2026-08-29T11:32:00Z' },
      result_window: { start: '2026-08-29T11:31:00Z', end: '2026-08-29T11:32:00Z' }
    }
    assert.equal(resumed.manifest.run_id, open.manifest.run_id)
    assert.deepEqual(validateLoadedRun(resumed, 'addendum'), [])
  })

  test('plan-only authority is valid and scope expansion cannot originate from an addendum', () => {
    const planOnly = loadRun(cycleAddenda[1])
    planOnly.manifest.plan_persistence_authorized = true
    planOnly.manifest.authorized_plan_paths = ['docs/plans/solo-cli-remediation.md']
    assert.deepEqual(validateLoadedRun(planOnly, 'addendum'), [])

    const scopeExpansion = clone(planOnly)
    scopeExpansion.manifest.relations.push({
      relation_id: 'rel-scope-expansion-invalid',
      type: 'scope_expansion_of',
      from_run_id: scopeExpansion.manifest.run_id,
      to_run_id: scopeExpansion.manifest.root_run_id
    })
    assert.match(validateLoadedRun(scopeExpansion, 'addendum').join('\n'), /addendum relation type is invalid/)
  })
}

if (artifactsReady) {
  test('shipped connected-record allowlist equals the fixture authority exactly', () => {
    assert.deepEqual(readReferenceAllowlist().sort(), [...CONNECTED_RECORD_ALLOWLIST].sort())
  })

  test('all four positive root exemplars satisfy path-aware conformance and fingerprints', () => {
    for (const [kind, runDir] of Object.entries(EXEMPLARS)) {
      assert.deepEqual(validateRun(runDir, 'root'), [], kind)
      const manifest = JSON.parse(readFileSync(join(runDir, 'manifest.yaml'), 'utf8'))
      const calculated = sourceFingerprint(SOURCE_FIXTURES[kind])
      assert.equal(manifest.pre_fingerprint, calculated.digest, `${kind} pre fingerprint`)
      assert.equal(manifest.post_fingerprint, calculated.digest, `${kind} post fingerprint`)
    }
  })

  test('fingerprint record grammar has the fixed cross-platform digest vector', () => {
    const abc = sha256(Buffer.from('abc'))
    const records = [
      handledRecord('arc.zip', 'archive_not_extracted', { byte_size: 3, sha256: abc }),
      handledRecord('bin.dat', 'binary_opaque_hashed', { byte_size: 3, sha256: abc }),
      handledRecord('deep', 'resource_bound_truncation', { bound_code: 'max_depth', limit: 4, observed: 4, remainder: 'present_unknown_count' }),
      handledRecord('empty', 'empty_directory', {}),
      handledRecord('generated', 'generated_subtree_bounded', { enumerated_entries: 8, max_entries: 8, remainder: 'present_unknown_count' }),
      `L\0link\0${normalizeLinkTarget('src/a.txt')}\n`,
      `F\0src/a.txt\0${3}\0${abc}\n`,
      handledRecord('vendor', 'declared_exclusion', { reason_code: 'dependency_cache' })
    ]
    assert.equal(sha256(records.join('')), '8f0275d0c564f049b6eebde9910a922b177ce714d2a432ae51081456bf4200e6')
    assert.throws(() => handledRecord('x', 'unknown', {}), /unknown handling code/)
    assert.throws(() => handledRecord('x', 'empty_directory', { extra: true }), /parameter keys/)
    assert.throws(() => handledRecord('x', 'binary_opaque_hashed', { byte_size: -1, sha256: abc }), /byte_size/)
  })

  test('link target normalization is deterministic and rejects hostile spellings', () => {
    assert.equal(normalizeLinkTarget('./src//a.txt'), normalizeLinkTarget('src/a.txt'))
    assert.equal(normalizeLinkTarget('cafe\u0301'), normalizeLinkTarget('caf\u00e9'))
    assert.equal(normalizeLinkTarget('SRC\\a.txt', { platform: 'win32' }), 'SRC/a.txt')
    assert.equal(normalizeLinkTarget('C:\\src\\a.txt', { platform: 'win32' }), 'c:/src/a.txt')
    assert.throws(() => normalizeLinkTarget('src\na.txt'), /newline/)
    assert.throws(() => normalizeLinkTarget('\\\\?\\C:\\src', { platform: 'win32', linkKind: 'junction' }), /namespace/)
  })

  test('negative mutations fail the intended contract invariants', () => {
    const complete = loadRun(EXEMPLARS.complete)
    const cases = [
      ['missing canonical file', run => run.canonicalNames.pop(), /four canonical/],
      ['duplicate evidence ID', run => run.evidence.push(clone(run.evidence[0])), /duplicate/],
      ['fuzzy citation', run => { run.report = run.report.replaceAll(`\`${run.claims[0].claim_id}\``, run.claims[0].claim_id) }, /claim citation/],
      ['reordered headings', run => { run.report = run.report.replace('# Scope and units', '# TEMP').replace('# Status', '# Scope and units').replace('# TEMP', '# Status') }, /coverage-first/],
      ['evidence before anchor', run => { run.evidence[0].collected_at = '2026-08-29T08:00:00Z' }, /precedes anchored_at/],
      ['repository exceeds ceiling', run => { run.claims[0].claim_state = 'demonstrated' }, /evidence-state ceiling/],
      ['bare disposition', run => { run.claims[0].disposition = 'supported_capability' }, /discriminated object/],
      ['lost unit links', run => { run.claims[0].disposition.unit_ids = [] }, /affected unit/],
      ['complete material gap', run => { run.manifest.material_sources[0].outcome = 'blocked' }, /blocked source|complete status/],
      ['allowlist content tunnel', run => { run.evidence[0].persistence_shape = 'allowlisted_record'; run.evidence[0].persisted_fields = { provider: 'local', log_excerpt: 'source body' } }, /not allowlisted/],
      ['allowlist nested content', run => { run.evidence[0].persistence_shape = 'allowlisted_record'; run.evidence[0].persisted_fields = { provider: 'local', status: { body: 'source' } } }, /bounded token/],
      ['proposition mismatch', run => { run.evidence[0].observed_value.proposition_id = 'pr-other' }, /must match record/],
      ['recommendation closure absent', run => { delete run.claims[0].recommendations[0].observable_closure_evidence }, /observable_closure_evidence/],
      ['fingerprint drift hidden', run => { run.manifest.post_fingerprint = '0'.repeat(64) }, /silently mix fingerprint drift/],
      ['bad lane snapshot', run => { run.manifest.lane_snapshot_ids = ['snap-sha256-' + '0'.repeat(64)] }, /lane snapshot/]
    ]
    for (const [name, mutate, expected] of cases) {
      const run = clone(complete)
      mutate(run)
      assert.match(validateLoadedRun(run, 'root', run.canonicalNames).join('\n'), expected, name)
    }
  })

  test('blocked roots require resume instructions and current-anchor re-observation', () => {
    const blocked = loadRun(EXEMPLARS.blocked)
    const withoutInstructions = clone(blocked)
    withoutInstructions.report = withoutInstructions.report.replace('# Resume instructions', '# Follow up')
    assert.match(validateLoadedRun(withoutInstructions, 'root').join('\n'), /resume instructions/)
    const anchor = blocked.manifest.resume_anchors.source_windows[0]
    assert.equal(anchor.freshness_class, 'current')
    assert.ok(anchor.predicate && anchor.source_identity && anchor.collection_window && anchor.result_window)
  })

  test('finding identity is stable across windows and changes with material meaning', () => {
    const claim = loadRun(EXEMPLARS.complete).claims[0]
    const later = clone(claim)
    later.source_window = { start: '2027-01-01T00:00:00Z', end: '2027-02-01T00:00:00Z' }
    assert.equal(canonicalFindingFingerprint(claim), canonicalFindingFingerprint(later))
    later.assertion.value = false
    assert.notEqual(canonicalFindingFingerprint(claim), canonicalFindingFingerprint(later))
  })

  test('artifact-only commits preserve the assessed-source anchor and reject source changes', () => {
    const before = loadRun(EXEMPLARS.blocked).manifest
    const after = clone(before)
    after.repository_anchor.current_revision = 'artifact-commit-2'
    assert.deepEqual(validateSourceAnchorTransition(before, after, [`${before.output_subtree}/manifest.yaml`]), [])
    assert.match(validateSourceAnchorTransition(before, after, ['src/cli.mjs']).join('\n'), /assessed-source changes/)
  })

  test('derived addenda index has closed fields, stable ordering, and safe locators', () => {
    const rootId = '2026-08-29T0900Z-solo-cli-a1b2'
    const first = { run_id: '2026-08-29T1100Z-check-a-a1b2', root_run_id: rootId, run_kind: 'addendum', anchored_at: '2026-08-29T11:00:00Z', status: 'complete', closed: true, relations: [{ type: 'validates_root' }] }
    const second = { run_id: '2026-08-29T1200Z-check-b-b2c3', root_run_id: rootId, run_kind: 'addendum', anchored_at: '2026-08-29T12:00:00Z', status: 'partial', closed: true, relations: [{ type: 'validates_root' }, { type: 'validates_addendum' }] }
    assert.deepEqual(canonicalIndexLines([second, first]), canonicalIndexLines([first, second]))
    const parsed = JSON.parse(canonicalIndexLines([first])[0])
    assert.deepEqual(Object.keys(parsed), ['run_id', 'root_run_id', 'anchored_at', 'status', 'closed', 'relation_types', 'locator'])
    assert.equal(parsed.locator, `addenda/${first.run_id}/manifest.yaml`)
    assert.throws(() => canonicalIndexLines([{ ...first, run_id: '../escape' }]), /invalid addendum index identity/)
  })

  test('run directory reservation uses 48-bit suffixes, exclusive creation, retry, and refusal', () => {
    const temp = mkdtempSync(join(tmpdir(), 'delivery-run-id-'))
    try {
      const timestamp = '2026-08-29T1400Z'
      const scope = 'solo-cli'
      mkdirSync(join(temp, `${timestamp}-${scope}-aaaaaaaaaaaa`))
      const values = [Buffer.from('aaaaaaaaaaaa', 'hex'), Buffer.from('bbbbbbbbbbbb', 'hex')]
      const reserved = reserveRunDirectory(temp, { timestamp, scope, randomBytesFn: () => values.shift() })
      assert.equal(reserved.runId, `${timestamp}-${scope}-bbbbbbbbbbbb`)
      assert.ok(existsSync(reserved.runDir))
      assert.throws(() => reserveRunDirectory(temp, { timestamp, scope, randomBytesFn: () => Buffer.from('aaaaaaaaaaaa', 'hex'), maxAttempts: 2 }), /collision-free/)
    } finally { rmSync(temp, { recursive: true, force: true }) }
  })

  test('manifest basename and ID checks are path-aware', () => {
    const temp = mkdtempSync(join(tmpdir(), 'delivery-artifact-path-'))
    try {
      cpSync(EXEMPLARS.complete, join(temp, 'wrong-name'), { recursive: true })
      assert.match(validateRun(join(temp, 'wrong-name'), 'root').join('\n'), /directory basename/)
      const invalid = join(temp, '2026-bad')
      cpSync(EXEMPLARS.complete, invalid, { recursive: true })
      const manifestPath = join(invalid, 'manifest.yaml')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifest.run_id = '2026-bad'
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      assert.match(validateRun(invalid, 'root').join('\n'), /run_id must match/)
    } finally { rmSync(temp, { recursive: true, force: true }) }
  })

  test('material-source and disposition variants cannot erase candidates', () => {
    const complete = loadRun(EXEMPLARS.complete)
    const variants = [
      ['material source omitted', run => { run.manifest.material_sources = [] }, /needs material_sources/],
      ['accepted gap lacks decision', run => { run.manifest.status = 'partial'; run.manifest.material_sources[0].outcome = 'accepted_gap'; delete run.manifest.material_sources[0].decision }, /needs attributed decision/],
      ['duplicate lacks target', run => { run.claims[0].disposition = { type: 'duplicate', evidence_ids: ['ev-local-tests'], unit_ids: ['solo-cli'] } }, /target_finding_fingerprint/],
      ['false positive lacks rationale', run => { run.claims[0].disposition = { type: 'false_positive', evidence_ids: ['ev-local-tests'], unit_ids: ['solo-cli'] } }, /needs rationale/],
      ['user deferral lacks attribution', run => { run.claims[0].disposition = { type: 'user_deferred', evidence_ids: ['ev-local-tests'], unit_ids: ['solo-cli'], user_decision: { decision_id: 'defer' } } }, /attributed decision/]
    ]
    for (const [name, mutate, expected] of variants) {
      const run = clone(complete)
      mutate(run)
      assert.match(validateLoadedRun(run, 'root').join('\n'), expected, name)
    }
  })

  test('reference-only and allowlisted values reject content-shaped persistence', () => {
    const complete = loadRun(EXEMPLARS.complete)
    const variants = [
      ['plain observed string', record => { record.observed_value = 'log body' }, /predicate_result object/],
      ['extra observed body', record => { record.observed_value.body = 'log body' }, /extra or missing keys/],
      ['free limitation', record => { record.limitations = ['copied source body'] }, /limitations are not closed/],
      ['query locator', record => { record.opaque_locator.opaque_object_id = 'file?token=value' }, /query-free/],
      ['URL-shaped extra field', record => { record.url = 'https://example.invalid/?token=value' }, /contains url/]
    ]
    for (const [name, mutate, expected] of variants) {
      const run = clone(complete)
      mutate(run.evidence[0])
      assert.match(validateLoadedRun(run, 'root').join('\n'), expected, name)
    }
  })

  test('authorization path grammar and plan/commit independence are table-driven', () => {
    const complete = loadRun(EXEMPLARS.complete)
    const variants = [
      ['empty authorized stages', run => { run.manifest.authorized_stage_paths = [] }, /non-empty/],
      ['dot segment', run => { run.manifest.authorized_stage_paths[0] = './manifest.yaml' }, /invalid segment/],
      ['parent traversal', run => { run.manifest.authorized_stage_paths[0] = '../manifest.yaml' }, /invalid segment/],
      ['drive absolute', run => { run.manifest.authorized_stage_paths[0] = 'C:/manifest.yaml' }, /invalid path/],
      ['glob', run => { run.manifest.authorized_stage_paths[0] = 'docs/**/manifest.yaml' }, /invalid path/],
      ['case-equivalent duplicate', run => { run.manifest.authorized_stage_paths.push(run.manifest.authorized_stage_paths[0].toUpperCase()) }, /duplicate/],
      ['commit-only plan creation', run => { run.manifest.authorized_stage_paths[0] = 'docs/plans/remediation.md' }, /commit-only authorization/],
      ['committed plan missing from stage set', run => { run.manifest.plan_persistence_authorized = true; run.manifest.authorized_plan_paths = ['docs/plans/remediation.md'] }, /committed plan must appear/]
    ]
    for (const [name, mutate, expected] of variants) {
      const run = clone(complete)
      mutate(run)
      assert.match(validateLoadedRun(run, 'root').join('\n'), expected, name)
    }
  })

  test('authorized absent leaves revalidate containment after parent replacement', () => {
    const host = mkdtempSync(join(tmpdir(), 'delivery-host-'))
    const outside = mkdtempSync(join(tmpdir(), 'delivery-outside-'))
    try {
      mkdirSync(join(host, 'docs', 'delivery-assessments'), { recursive: true })
      const candidate = 'docs/delivery-assessments/new-run/manifest.yaml'
      assert.match(resolveAuthorizedCandidate(host, candidate), /manifest\.yaml$/)
      rmSync(join(host, 'docs'), { recursive: true, force: true })
      symlinkSync(outside, join(host, 'docs'), process.platform === 'win32' ? 'junction' : 'dir')
      assert.throws(() => resolveAuthorizedCandidate(host, candidate), /escapes artifact host|link parent/)
    } finally {
      rmSync(host, { recursive: true, force: true })
      rmSync(outside, { recursive: true, force: true })
    }
  })

  test('relation graph enforces ownership, endpoint kinds, temporal direction, uniqueness, and acyclicity', () => {
    const old = clone(loadRun(EXEMPLARS.blocked).manifest)
    const newer = clone(old)
    newer.run_id = '2026-08-29T1000Z-forge-jenkins-a1b2'
    newer.anchored_at = '2026-08-29T10:00:00Z'
    newer.status = 'partial'
    newer.closed = true
    newer.relations = [{ relation_id: 'rel-supersedes-blocked', type: 'supersedes_blocked_run', from_run_id: newer.run_id, to_run_id: old.run_id }]
    const runs = [{ manifest: old, dir: 'old' }, { manifest: newer, dir: 'new' }]
    assert.deepEqual(validateGraph(runs), [])
    const variants = [
      ['unknown target', graph => { graph[1].manifest.relations[0].to_run_id = '2026-08-29T0800Z-missing-a1b2' }, /target does not exist/],
      ['wrong owner', graph => { graph[1].manifest.relations[0].from_run_id = old.run_id }, /owned by containing manifest/],
      ['self edge', graph => { graph[1].manifest.relations[0].to_run_id = newer.run_id }, /self-edge/],
      ['duplicate relation ID', graph => { graph[1].manifest.relations.push(clone(graph[1].manifest.relations[0])) }, /duplicate relation ID|duplicate relation edge/],
      ['reversed edge', graph => { graph[0].manifest.relations = [{ relation_id: 'rel-reversed', type: 'scope_expansion_of', from_run_id: old.run_id, to_run_id: newer.run_id }] }, /later than target/]
    ]
    for (const [name, mutate, expected] of variants) {
      const graph = clone(runs)
      mutate(graph)
      assert.match(validateGraph(graph).join('\n'), expected, name)
    }
  })

  test('CLI validator shares helpers, prints failures, and returns meaningful exit codes', () => {
    const validatorFile = join(skillRoot, 'scripts', 'validate-artifacts.mjs')
    const valid = spawnSync(process.execPath, [validatorFile, 'root', EXEMPLARS.complete], { encoding: 'utf8' })
    assert.equal(valid.status, 0, valid.stderr)
    assert.match(valid.stdout, /valid/)
    const temp = mkdtempSync(join(tmpdir(), 'delivery-cli-'))
    try {
      cpSync(EXEMPLARS.complete, join(temp, 'bad'), { recursive: true })
      rmSync(join(temp, 'bad', 'claims.jsonl'))
      const invalid = spawnSync(process.execPath, [validatorFile, 'root', join(temp, 'bad')], { encoding: 'utf8' })
      assert.notEqual(invalid.status, 0)
      assert.match(invalid.stderr, /ENOENT|four canonical/)
    } finally { rmSync(temp, { recursive: true, force: true }) }
  })
}

export {
  RUN_ID_PATTERN,
  canonicalFindingFingerprint,
  canonicalIndexLines,
  loadRun,
  loadRunTree,
  materializeAddendum,
  normalizeLinkTarget,
  rebuildIndex,
  reconstructGraph,
  resolveAuthorizedCandidate,
  reserveRunDirectory,
  sourceFingerprint,
  validateLoadedRun,
  validateGraph,
  validateRun,
  validateSourceAnchorTransition
}
