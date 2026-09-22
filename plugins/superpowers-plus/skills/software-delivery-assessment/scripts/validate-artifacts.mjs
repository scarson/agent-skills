// ABOUTME: Dependency-free runtime validator for delivery-assessment root and addendum artifacts.
// ABOUTME: It reads one four-file run, prints every conformance error, and never mutates the run.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path, { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CONNECTED_RECORD_ALLOWLIST = Object.freeze([
  'provider', 'object_type', 'opaque_object_id', 'collected_at',
  'window_start', 'window_end', 'status', 'ref', 'check_id', 'check_name',
  'ci_run_id', 'environment_name', 'deployment_id', 'incident_id', 'review_count'
])

const CANONICAL_NAMES = Object.freeze(['manifest.yaml', 'evidence.jsonl', 'claims.jsonl', 'report.md'])
export const RUN_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{4}Z-[a-z0-9](?:[a-z0-9-]{0,47}[a-z0-9])?-[a-z0-9]{4,16}$/
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
const ADDENDUM_RELATION_TYPES = new Set(['validates_root', 'validates_addendum'])

function sha256 (value) {
  return createHash('sha256').update(value).digest('hex')
}

function parseJsonLines (file) {
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  return raw.split('\n').filter(Boolean).map((line, index) => {
    try { return JSON.parse(line) } catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`) }
  })
}

function canonicalJson (value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
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

export function canonicalFindingFingerprint (claim) {
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

function validateAddendumFields (manifest) {
  const errors = []
  if (!RUN_ID_PATTERN.test(manifest.root_run_id || '') || manifest.root_run_id === manifest.run_id) errors.push('addendum root_run_id is invalid')
  if (!Array.isArray(manifest.target_claim_ids) || manifest.target_claim_ids.length === 0 || manifest.target_claim_ids.some(id => !CLAIM_ID_PATTERN.test(id))) errors.push('addendum needs target_claim_ids')
  if (!Array.isArray(manifest.decisions)) errors.push('addendum decisions must be an array')
  for (const decision of manifest.decisions || []) {
    if (!TOKEN_PATTERN.test(decision?.decision_id || '') || !decision.actor || !UTC_PATTERN.test(decision.decided_at || '') || !decision.rationale) errors.push('addendum decision is incomplete')
  }
  if (!Array.isArray(manifest.evidence_windows) || manifest.evidence_windows.length === 0) errors.push('addendum needs evidence_windows')
  for (const window of manifest.evidence_windows || []) {
    if (!TOKEN_PATTERN.test(window?.source_id || '') || !window.predicate || !['historical', 'current'].includes(window.freshness_class) || !UTC_PATTERN.test(window.collection_window?.start || '') || !UTC_PATTERN.test(window.collection_window?.end || '') || !UTC_PATTERN.test(window.result_window?.start || '') || !UTC_PATTERN.test(window.result_window?.end || '')) errors.push('addendum evidence window is incomplete')
  }
  if (!Array.isArray(manifest.relations) || manifest.relations.length === 0) errors.push('addendum needs an owned validation relation')
  const relationIds = new Set()
  const relationEdges = new Set()
  for (const relation of manifest.relations || []) {
    if (!RELATION_PATTERN.test(relation?.relation_id || '') || relationIds.has(relation.relation_id)) errors.push('addendum relation ID is invalid or duplicate')
    relationIds.add(relation?.relation_id)
    if (!ADDENDUM_RELATION_TYPES.has(relation?.type)) errors.push('addendum relation type is invalid')
    if (relation?.from_run_id !== manifest.run_id) errors.push('addendum relation must be owned by containing manifest')
    if (!RUN_ID_PATTERN.test(relation?.to_run_id || '') || relation.to_run_id === manifest.run_id) errors.push('addendum relation target is invalid')
    const edge = `${relation?.type}\0${relation?.from_run_id}\0${relation?.to_run_id}`
    if (relationEdges.has(edge)) errors.push('addendum relation edge is duplicate')
    relationEdges.add(edge)
  }
  return errors
}

export function loadRun (runDir) {
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

export function validateLoadedRun (run, expectedKind, canonicalNames = run.canonicalNames) {
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
  if (expectedKind === 'root' && manifest.index_path !== 'addenda/index.jsonl') errors.push('root must predeclare addenda/index.jsonl')
  if (expectedKind === 'addendum') errors.push(...validateAddendumFields(manifest))
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
    } else if (record.persistence_shape === 'allowlisted_record') errors.push(...allowlistedFieldErrors(record.persisted_fields, prefix))
    else errors.push(`${prefix} persistence_shape is invalid`)
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
  if (manifest.status === 'blocked' && (!manifest.resume_anchors?.repository || !manifest.resume_anchors?.scope || !manifest.resume_anchors?.working_tree_inventory || !Array.isArray(manifest.resume_anchors?.source_windows))) errors.push('blocked artifact needs complete resume anchors')
  for (const claim of claims) if (!report.includes(`\`${claim.claim_id}\``)) errors.push(`report missing exact claim citation ${claim.claim_id}`)
  for (const record of evidence) if (!report.includes(`\`${record.evidence_id}\``)) errors.push(`report missing exact evidence citation ${record.evidence_id}`)
  return errors
}

export function validateRun (runDir, expectedKind) {
  const run = loadRun(runDir)
  const errors = validateLoadedRun(run, expectedKind, run.canonicalNames)
  if (path.basename(runDir) !== run.manifest.run_id) errors.push('directory basename must equal manifest run_id')
  if (!RUN_ID_PATTERN.test(run.manifest.run_id)) errors.push('run_id must match YYYY-MM-DDTHHMMZ-<scope>-<id>')
  return errors
}

export function runCli (args = process.argv.slice(2)) {
  const [expectedKind, runDir] = args
  if (!['root', 'addendum'].includes(expectedKind) || !runDir) {
    console.error('usage: node validate-artifacts.mjs <root|addendum> <run-dir>')
    return 2
  }
  try {
    const errors = validateRun(resolve(runDir), expectedKind)
    if (errors.length) {
      for (const error of errors) console.error(error)
      return 1
    }
    console.log('valid')
    return 0
  } catch (error) {
    console.error(error.message)
    return 1
  }
}

const modulePath = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === modulePath) process.exitCode = runCli()
