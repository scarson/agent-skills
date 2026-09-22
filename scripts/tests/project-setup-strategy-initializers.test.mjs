import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const readRepo = (...parts) => readFileSync(join(repo, ...parts), 'utf8')
const corpus = JSON.parse(readRepo('scripts', 'tests', 'fixtures', 'project-setup-strategy-initializers.json'))

const fixtureIds = [
  'fixture-solo-cli-library',
  'fixture-forge-ci-separation',
  'fixture-offline-platform',
  'fixture-mixed-monorepo',
  'fixture-greenfield-history',
  'fixture-regulated-approval',
  'fixture-store-mediated-release',
  'fixture-forward-recovery',
  'fixture-counterfactual-axes',
  'fixture-non-git-invocation',
  'fixture-limited-ci',
  'fixture-progressive-baseline',
  'fixture-delivery-graph-validation',
  'fixture-evidence-cycle-rejection',
  'fixture-review-control-variants',
  'fixture-proportional-review-retention',
  'fixture-maintenance-recursion',
  'fixture-independent-fact-axes',
  'fixture-independent-review-anti-laundering',
  'fixture-external-transcript-lifecycle',
  'fixture-artifact-lineage-exceptions',
  'fixture-existing-strategies',
  'fixture-partial-custom-install',
  'fixture-unknown-equivalent',
  'fixture-wrapper-outcome-matrix',
  'fixture-cross-document-reverse-order',
  'fixture-partial-root-pair',
  'fixture-managed-region-adoption',
  'fixture-write-failure-injection',
  'fixture-hostile-path-layout',
  'fixture-concurrent-application',
  'fixture-schema-and-newlines',
  'fixture-secret-bearing-custom-prose',
  'fixture-proposal-invalidation'
]

const moduleIds = {
  testing: [
    'TESTING-MODULE-ORDINARY-CHANGE',
    'TESTING-MODULE-BOUNDARY-CONTRACTS',
    'TESTING-MODULE-TEST-DOUBLES',
    'TESTING-MODULE-TEST-DATA-PERSISTENT-STATE',
    'TESTING-MODULE-TIME-CONCURRENCY',
    'TESTING-MODULE-COMPATIBILITY-PLATFORM',
    'TESTING-MODULE-NONFUNCTIONAL-BEHAVIOR',
    'TESTING-MODULE-PRODUCTION-VERIFICATION',
    'TESTING-MODULE-FLAKE-QUARANTINE-SKIP',
    'TESTING-MODULE-EXCEPTIONS',
    'TESTING-MODULE-RETIREMENT',
    'TESTING-MODULE-MAINTENANCE-CONTRACTS'
  ],
  delivery: [
    'DELIVERY-MODULE-ORDINARY-CHANGE',
    'DELIVERY-MODULE-DELIVERY-UNITS',
    'DELIVERY-MODULE-ARTIFACTS',
    'DELIVERY-MODULE-DELIVERY-FLOW',
    'DELIVERY-MODULE-EVIDENCE-CONTROLS',
    'DELIVERY-MODULE-REVIEW-APPROVAL',
    'DELIVERY-MODULE-RECOVERY',
    'DELIVERY-MODULE-MAINTENANCE-CONTRACTS',
    'DELIVERY-MODULE-RETIREMENT'
  ]
}

const childOutcomes = [
  'CHANGED',
  'CURRENT_NO_OP',
  'USER_SKIPPED',
  'NOT_APPLICABLE',
  'BLOCKED_NO_CHANGE',
  'FAILED_NO_CHANGE',
  'FAILED_RESTORED',
  'FAILED_PARTIAL'
]

function assertContainsOnce (text, token) {
  const first = text.indexOf(token)
  assert.notEqual(first, -1, `missing stable token ${token}`)
  assert.equal(text.indexOf(token, first + token.length), -1, `duplicate stable token ${token}`)
}

function assertOrdered (text, tokens) {
  let cursor = -1
  for (const token of tokens) {
    const next = text.indexOf(token, cursor + 1)
    assert.ok(next > cursor, `${token} is missing or out of order`)
    cursor = next
  }
}

function assertBalancedManagedRegions (text, initializerId) {
  const begin = [...text.matchAll(new RegExp(`<!-- ${initializerId}:[a-z-]+ schema=1 begin -->`, 'g'))]
  const end = [...text.matchAll(new RegExp(`<!-- ${initializerId}:[a-z-]+ schema=1 end -->`, 'g'))]
  assert.ok(begin.length >= 3, `${initializerId} needs at least three managed regions`)
  assert.equal(end.length, begin.length, `${initializerId} managed regions are unbalanced`)
  assert.equal(new Set(begin.map(({ 0: marker }) => marker)).size, begin.length, `${initializerId} managed region begins must be unique`)
}

test('scenario corpus covers the exact approved fixture matrix with compact records', () => {
  assert.equal(corpus.schemaVersion, 1)
  assert.deepEqual(corpus.families, [
    'project-context-generalization',
    'strategy-model-correctness',
    'discovery-and-composition',
    'filesystem-and-transaction-safety'
  ])
  assert.deepEqual(corpus.cases.map(({ id }) => id), fixtureIds)
  assert.equal(new Set(fixtureIds).size, 34)

  for (const fixture of corpus.cases) {
    assert.deepEqual(Object.keys(fixture), ['id', 'family', 'stimulus', 'expected', 'forbidden', 'protects'])
    assert.ok(corpus.families.includes(fixture.family), `${fixture.id} has an unknown family`)
    assert.ok(Object.keys(fixture.stimulus).length > 0, `${fixture.id} has no stimulus`)
    assert.ok(fixture.expected.length > 0, `${fixture.id} has no expected semantic outcome`)
    assert.ok(fixture.forbidden.length > 0, `${fixture.id} has no forbidden inference`)
    assert.ok(fixture.protects.length > 0, `${fixture.id} protects no requirement`)
  }

  const hostilePath = corpus.cases.find(({ id }) => id === 'fixture-hostile-path-layout')
  assert.deepEqual(hostilePath.expected, [
    'Reject root escapes and block every symlink, junction, or reparse write until a real unlinked target path is established.'
  ])
  assert.deepEqual(hostilePath.forbidden, [
    'Do not treat user confirmation or platform-specific identity plumbing as authorization to write through a linked target.'
  ])
})

test('fixture requirement handles resolve to the approved design', () => {
  const design = readRepo('docs', 'specs', '2026-08-29-delivery-testing-strategy-initializers-design.md')
  const handles = new Set([...design.matchAll(/\*\*([a-z0-9-]+)\*\*/g)].map(match => match[1]))
  for (const fixture of corpus.cases) {
    for (const handle of fixture.protects) {
      assert.ok(handles.has(handle), `${fixture.id} cites unknown requirement ${handle}`)
    }
  }
})

test('fixture corpus does not contain evaluator-runtime or golden-prose fields', () => {
  const forbiddenKeys = ['requiredRuns', 'faultSchedule', 'guidedInputs', 'source', 'operator', 'selector', 'goldenProse']
  const visit = value => {
    if (Array.isArray(value)) return value.forEach(visit)
    if (value === null || typeof value !== 'object') return
    for (const [key, nested] of Object.entries(value)) {
      assert.equal(forbiddenKeys.includes(key), false, `evaluator-only field leaked into compact corpus: ${key}`)
      visit(nested)
    }
  }
  visit(corpus)
})

test('testing initializer exposes its stable document and schema contracts', () => {
  const skill = readRepo('plugins', 'project-setup', 'skills', 'testing-strategy-init', 'SKILL.md')
  const template = readRepo('plugins', 'project-setup', 'skills', 'testing-strategy-init', 'references', 'testing-strategy-template.md')
  const schema = readRepo('plugins', 'project-setup', 'references', 'strategy-record-schema.md')
  const protocol = readRepo('plugins', 'project-setup', 'references', 'strategy-initializer-protocol.md')

  assert.ok(skill.includes('version: "1.1"'))
  assert.ok(skill.includes('docs/testing-strategy.md'))
  assert.ok(skill.includes('strategy-initializer-protocol.md'))
  assert.ok(skill.includes('strategy-record-schema.md'))
  assertBalancedManagedRegions(template, 'project-setup:testing-strategy-init')
  for (const id of moduleIds.testing) assertContainsOnce(schema, id)
  for (const outcome of childOutcomes) assert.ok(protocol.includes(`\`${outcome}\``), `protocol missing ${outcome}`)
  assert.ok(protocol.includes('PROJECT_SETUP_CHILD_RESULT_V1'))
  assert.ok(protocol.includes('PROJECT_SETUP_RECEIPT_CANONICAL_V1'))
  assert.ok(protocol.includes("Each child's `Inputs` section and mandatory discovery workflow are the authority"))
  assert.ok(protocol.includes('PROJECT_SETUP_APPLY_LOCK_V1'))
  assert.ok(protocol.includes('Ordinary project files require exact kind and path containment, not platform-specific file IDs'))
  assert.ok(protocol.includes('Native ACL descriptor hashes, owner IDs, and other OS-forensic data are not required'))
})

test('shared strategy contract keeps compact records and proposal binding unambiguous', () => {
  const schema = readRepo('plugins', 'project-setup', 'references', 'strategy-record-schema.md')
  const protocol = readRepo('plugins', 'project-setup', 'references', 'strategy-initializer-protocol.md')

  assert.ok(schema.includes('compact projections of module records'))
  assert.ok(schema.includes('Delivery Flow is the graph projection owned by a Delivery Unit'))
  assert.ok(schema.includes('terminal disposition is a compact graph label, not a semantic record'))
  assert.ok(schema.includes("activation question is the module record's mutable `Label`"))
  assert.ok(schema.includes('when it consumes review evidence'))
  assert.ok(protocol.includes('invocation-local confirmation binding'))
  assert.ok(protocol.includes('collision-unambiguous framing'))
  assert.ok(protocol.includes('invocation memory during preview'))
})

test('delivery initializer exposes its stable document, graph, and evidence contracts', () => {
  const skill = readRepo('plugins', 'project-setup', 'skills', 'delivery-strategy-init', 'SKILL.md')
  const template = readRepo('plugins', 'project-setup', 'skills', 'delivery-strategy-init', 'references', 'delivery-strategy-template.md')
  const schema = readRepo('plugins', 'project-setup', 'references', 'strategy-record-schema.md')

  assert.ok(skill.includes('version: "1.1"'))
  assert.ok(skill.includes('docs/delivery-strategy.md'))
  assert.ok(skill.includes('strategy-initializer-protocol.md'))
  assert.ok(skill.includes('strategy-record-schema.md'))
  assert.ok(skill.includes('graph owned by a Delivery Unit'))
  assert.ok(skill.includes('not a per-review ledger'))
  assert.ok(skill.includes('valid unchanged snapshot is `CURRENT_NO_OP`'))
  assert.ok(skill.includes('unit-owned graph/Step'))
  assert.ok(skill.includes('Do not assign Lifecycle `DEFERRED` merely'))
  assert.ok(skill.includes('terminal is a named graph disposition, not a full Step record'))
  assertBalancedManagedRegions(template, 'project-setup:delivery-strategy-init')
  for (const id of moduleIds.delivery) assertContainsOnce(schema, id)
  assertOrdered(schema, ['DELIVERY-CONTROL-*', 'DELIVERY-EVIDENCE-NEED-*', 'VERIFICATION-GATE-*', 'VERIFICATION-SCOPE-*'])
})

test('agent-guidance initializer exposes the shared transaction and result contract', () => {
  const skill = readRepo('plugins', 'project-setup', 'skills', 'claude-agents-md-init', 'SKILL.md')
  const protocol = readRepo('plugins', 'project-setup', 'references', 'strategy-initializer-protocol.md')

  assert.ok(skill.includes('version: "2.15"'))
  assert.ok(skill.includes('../../references/strategy-initializer-protocol.md'))
  assert.ok(skill.includes('project-setup/claude-agents-md-init'))
  assert.ok(skill.includes('PROJECT_SETUP_CHILD_RESULT_V1'))
  assert.ok(skill.includes('USER_SKIPPED'))
  assert.ok(skill.includes('FAILED_RESTORED'))
  assert.ok(skill.includes('recoverable, verified multi-file transaction'))
  assert.ok(skill.includes('do not infer `CURRENT_NO_OP` from alignment markers alone'))
  assert.ok(skill.includes('every missing parent directory'))
  assert.ok(protocol.includes('An unreported directory creation is an unverified mutation'))
  assert.equal(skill.includes('three-artifact atomicity'), false)
})

test('git-strategy initializer validates existing policy before no-op and emits a child result', () => {
  const skill = readRepo('plugins', 'project-setup', 'skills', 'git-strategy-init', 'SKILL.md')

  assert.ok(skill.includes('version: "1.6"'))
  assert.ok(skill.includes('../../references/strategy-initializer-protocol.md'))
  assert.ok(skill.includes('project-setup/git-strategy-init'))
  assert.ok(skill.includes('PROJECT_SETUP_CHILD_RESULT_V1'))
  assert.ok(skill.includes('CURRENT_NO_OP'))
  assert.ok(skill.includes('substantive non-placeholder body'))
  assert.ok(skill.includes('empty, contradictory, truncated, or corrupted'))
  assert.ok(skill.includes('every existing root-guidance link'))
  assert.ok(skill.includes('BLOCKED_NO_CHANGE'))
  assert.ok(skill.includes('git check-ignore --no-index'))
  assert.ok(skill.includes('initializer defaults must not replace them'))
  assert.ok(skill.includes('Strategy repair has explicit replacement semantics'))
})

test('pitfalls initializer separates durable backups, preservation repair, and transaction restoration', () => {
  const skill = readRepo('plugins', 'project-setup', 'skills', 'pitfalls-docs-init', 'SKILL.md')

  assert.ok(skill.includes('version: "1.3"'))
  assert.ok(skill.includes('../../references/strategy-initializer-protocol.md'))
  assert.ok(skill.includes('project-setup/pitfalls-docs-init'))
  assert.ok(skill.includes('PROJECT_SETUP_CHILD_RESULT_V1'))
  assert.ok(skill.includes('USER_SKIPPED'))
  assert.ok(skill.includes('FAILED_RESTORED'))
  assert.ok(skill.includes('planned durable output'))
  assert.ok(skill.includes('candidate bytes before confirmation'))
  assert.ok(skill.includes('not transaction rollback'))
  assert.ok(skill.includes('only confirmed mutations'))
  assert.ok(skill.includes('Preserve project-owned Markdown structurally'))
  assert.ok(skill.includes('Only if a materialized edit is required'))
})

test('project-init uses the closed five-child order and aggregate protocol', () => {
  const skill = readRepo('plugins', 'project-setup', 'skills', 'project-init', 'SKILL.md')
  const children = [
    'project-setup/claude-agents-md-init',
    'project-setup/git-strategy-init',
    'project-setup/pitfalls-docs-init',
    'project-setup/testing-strategy-init',
    'project-setup/delivery-strategy-init'
  ]

  assert.ok(skill.includes('version: "2.0"'))
  const orderSection = skill.match(/The closed schema-version-1 order is:\s*([\s\S]*?)\n\nAll dependency edges/)
  assert.ok(orderSection, 'missing closed child order section')
  const parsedChildren = [...orderSection[1].matchAll(/^\d+\. `([^`]+)`/gm)].map((match) => match[1])
  assert.deepEqual(parsedChildren, children)

  const aggregateSection = skill.match(/Choose the first matching status:\s*([\s\S]*?)\n\nDo not collapse/)
  assert.ok(aggregateSection, 'missing closed aggregate table')
  const aggregateRows = aggregateSection[1]
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.includes('Condition') && !line.includes('---'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
  assert.deepEqual(aggregateRows, [
    ['Any child `FAILED_PARTIAL`', '`FAILED_PARTIAL`'],
    ['Else any child `FAILED_RESTORED`', '`FAILED_RESTORED`'],
    ['Else any child `FAILED_NO_CHANGE`', '`FAILED_NO_CHANGE`'],
    ['Else any child `BLOCKED_NO_CHANGE` or wrapper `CHILD_ENTRYPOINT_UNAVAILABLE`', '`BLOCKED_PARTIAL`'],
    ['Else any child `USER_SKIPPED` or `NOT_APPLICABLE`, or any wrapper user-skip diagnostic', '`COMPLETE_WITH_SKIPS`'],
    ['Else any child diagnostic `UNRESOLVED_ROUTE`', '`COMPLETE_WITH_UNRESOLVED_ROUTING`'],
    ['Otherwise', '`COMPLETE`']
  ])

  assert.ok(skill.includes('PROJECT_SETUP_AGGREGATE_RESULT_V1'))
  assert.ok(skill.includes('INVALID_CHILD_RESULT'))
  assert.ok(skill.includes('CHILD_ENTRYPOINT_UNAVAILABLE'))
  assert.ok(skill.includes('WRAPPER_USER_SKIPPED'))
  assert.ok(skill.includes('stoppedBefore'))
  assertContainsOnce(skill, '`FAILED_PARTIAL` is the only child-outcome global stop')
  assert.equal(skill.includes('PRE_INVOCATION_REVALIDATION_FAILED'), false)
  assert.equal(skill.includes('APPLIED_STATE_REVALIDATION_FAILED'), false)
})
