// ABOUTME: Incremental packaging and provenance tests for software-delivery assessment skills.
// ABOUTME: Task 3 owns only references, README, source map, and the guarded CC BY notice.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const pluginRoot = join(repoRoot, 'plugins', 'superpowers-plus')
const skillRoot = join(repoRoot, 'plugins', 'superpowers-plus', 'skills', 'software-delivery-assessment')
const cycleSkillRoot = join(repoRoot, 'plugins', 'superpowers-plus', 'skills', 'software-delivery-assessment-cycle')
const files = Object.freeze({
  readme: join(skillRoot, 'README.md'),
  sourceMap: join(skillRoot, 'SOURCE-MAP.md'),
  license: join(skillRoot, 'LICENSE-CC-BY-4.0'),
  contract: join(skillRoot, 'references', 'delivery-evidence-snapshot.md'),
  method: join(skillRoot, 'references', 'assessment-method.md'),
  capability: join(skillRoot, 'references', 'capability-model.md'),
  agentic: join(skillRoot, 'references', 'agentic-delivery.md'),
  testing: join(skillRoot, 'references', 'testing-model.md'),
  evaluation: join(skillRoot, 'references', 'evaluation-protocol.md')
})
const TASK3_REQUIRED = Object.values(files)
const assessmentSkill = join(skillRoot, 'SKILL.md')
const cycleSkill = join(cycleSkillRoot, 'SKILL.md')
const cycleReadme = join(cycleSkillRoot, 'README.md')
const authoringExampleTarget = 'examples/minimal-root/2026-08-29T1000Z-example-0123456789ab/manifest.yaml'
const artifactValidatorTarget = 'scripts/validate-artifacts.mjs'
const artifactValidator = join(skillRoot, artifactValidatorTarget)
const PINNED_REVISION = '8ea936b6160656ccf8ce54834adb643494eb1ef9'
const NOTICE_SHA256 = 'ac59425cad3606f03f0943d98819b6af35200561ba1e0fd779ea3d5ace5d33c9'
const ADAPTED_FILES = Object.freeze(['references/agentic-delivery.md', 'references/capability-model.md', 'references/testing-model.md'])
const AGENTIC_UPSTREAM_FILES = Object.freeze([
  'content/en/docs/agentic-cd/_index.md',
  'content/en/docs/agentic-cd/architecture/small-batch-sessions.md',
  'content/en/docs/agentic-cd/evaluation/ai-eval-methodology.md',
  'content/en/docs/agentic-cd/getting-started/repo-readiness.md',
  'content/en/docs/agentic-cd/operations/pipeline-enforcement.md',
  'content/en/docs/agentic-cd/operations/pitfalls-and-metrics.md',
  'content/en/docs/agentic-cd/specification/first-class-artifacts.md'
])
const FILE_LEVEL_NOTICE = 'CC BY 4.0-adapted expression is limited to `skills/software-delivery-assessment/references/agentic-delivery.md`, `skills/software-delivery-assessment/references/capability-model.md`, and `skills/software-delivery-assessment/references/testing-model.md`; see `skills/software-delivery-assessment/SOURCE-MAP.md`, `skills/software-delivery-assessment/LICENSE-CC-BY-4.0`, and `skills/software-delivery-assessment/README.md` for provenance and license details.'
const RFC2119_BLOCK = `<!-- approved-block: rfc2119-terminology v1 — authoritative copy: ../../approved-blocks.md -->
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
<!-- /approved-block: rfc2119-terminology -->`

function sha256 (value) {
  return createHash('sha256').update(value).digest('hex')
}

function markdownTargets (body) {
  return [...body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map(match => match[1].trim().replace(/^<|>$/g, ''))
    .filter(target => target && !target.startsWith('#') && !/^[a-z]+:/i.test(target))
    .map(target => decodeURIComponent(target.split('#')[0]))
}

function assertRelativeLinksResolve (file, contentRoot = skillRoot) {
  const body = readFileSync(file, 'utf8')
  const root = realpathSync(contentRoot)
  for (const target of markdownTargets(body)) {
    assert.equal(isAbsolute(target), false, `${file} uses an absolute markdown target: ${target}`)
    const candidate = resolve(dirname(file), target)
    assert.ok(existsSync(candidate), `${file} has a broken relative link: ${target}`)
    const resolved = realpathSync(candidate)
    const rel = relative(root, resolved)
    assert.ok(rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel)), `${file} link escapes skill root: ${target}`)
  }
}

test('Task 5 cycle skill and README exist', () => {
  assert.deepEqual([cycleSkill, cycleReadme].filter(file => !existsSync(file)), [])
})

if (existsSync(cycleSkill) && existsSync(cycleReadme)) {
  test('cycle skill is discoverable, compact, and routes the shared runtime contract', () => {
    const body = readFileSync(cycleSkill, 'utf8')
    const frontmatter = body.match(/^---\n([\s\S]*?)\n---\n/)?.[1] || ''
    assert.match(frontmatter, /^name: software-delivery-assessment-cycle$/m)
    assert.match(frontmatter, /^\s+version: "1\.0"$/m)
    assert.match(frontmatter, /^description: .*closed software delivery assessment.*addendum/im)
    assert.ok(body.split(/\r?\n/).length < 350, 'cycle skill must stay under 350 lines')
    assertRelativeLinksResolve(cycleSkill, join(repoRoot, 'plugins', 'superpowers-plus', 'skills'))
    for (const target of [
      '../software-delivery-assessment/README.md',
      '../software-delivery-assessment/references/delivery-evidence-snapshot.md',
      '../software-delivery-assessment/scripts/validate-artifacts.mjs'
    ]) assert.ok(markdownTargets(body).includes(target), `cycle skill missing route ${target}`)
  })

  test('cycle skill keeps freeze, scope, planning, commit, and execution authority independent', () => {
    const body = readFileSync(cycleSkill, 'utf8')
    for (const required of [
      'closed-root-freeze',
      'resume-anchor-validity',
      'addenda-provenance-graph',
      'affirmative-closure-only',
      'scope expansion',
      'plan_persistence_authorized',
      'commit_authorized',
      'authorized_plan_paths',
      'authorized_stage_paths',
      'MUST NOT implement remediation',
      'MUST NOT push'
    ]) assert.ok(body.includes(required), `cycle skill missing boundary: ${required}`)
    assert.match(body, /plan authorization[^.]*does not imply commit authorization/i)
    assert.match(body, /commit authorization[^.]*does not imply plan authorization/i)
    assert.match(body, /scope expansion[^.]*new linked assessment/i)
  })
}

test('Task 6 plugin README registers twenty skills and the assessment workflow', () => {
  const readme = readFileSync(join(pluginRoot, 'README.md'), 'utf8')
  assert.match(readme, /\bTwenty skills\b/)
  for (const target of [
    'skills/software-delivery-assessment/SKILL.md',
    'skills/software-delivery-assessment-cycle/SKILL.md',
    'skills/software-delivery-assessment/README.md'
  ]) assert.ok(markdownTargets(readme).includes(target), `plugin README missing ${target}`)
  assert.match(readme, /docs\/delivery-assessments\//)
  assert.match(readme, /assessment[^.]*creates[^.]*root/i)
  assert.match(readme, /cycle[^.]*addendum/i)
  assert.doesNotMatch(readme, /\*\*No bundled scripts\.\*\*/)
})

test('Task 6 manifests agree, remain MIT, and carry the exact adapted-file notice', () => {
  const rootManifest = JSON.parse(readFileSync(join(pluginRoot, 'plugin.json'), 'utf8'))
  const claudeManifest = JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8'))
  assert.equal(rootManifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json')
  assert.equal(rootManifest.version, claudeManifest.version)
  assert.equal(rootManifest.license, 'MIT')
  assert.equal(claudeManifest.license, 'MIT')
  assert.ok(rootManifest.description.endsWith(FILE_LEVEL_NOTICE))
  assert.ok(claudeManifest.description.endsWith(FILE_LEVEL_NOTICE))
  assert.match(rootManifest.extensions?.['com.openai']?.interface?.longDescription || '', /Twenty workflow skills/)
  for (const name of ['software-delivery-assessment', 'software-delivery-assessment-cycle']) {
    assert.ok(rootManifest.extensions['com.openai'].interface.longDescription.includes(name), `root manifest longDescription missing ${name}`)
  }
})

test('Task 6 approved block registry and durable-skill release guidance include both skills', () => {
  const approved = readFileSync(join(pluginRoot, 'approved-blocks.md'), 'utf8')
  for (const path of ['skills/software-delivery-assessment/SKILL.md', 'skills/software-delivery-assessment-cycle/SKILL.md']) {
    assert.ok(approved.includes(`\`${path}\` §Terminology`), `approved block registry missing ${path}`)
  }
  const releasing = readFileSync(join(repoRoot, 'docs', 'releasing.md'), 'utf8')
  for (const name of ['software-delivery-assessment', 'software-delivery-assessment-cycle']) assert.ok(releasing.includes(name), `release guidance missing ${name}`)
  assert.doesNotMatch(releasing, /Skills in `superpowers-plus` emit nothing durable/)
})

test('Task 6 exact-byte artifact formats are LF-pinned', () => {
  const attributes = readFileSync(join(repoRoot, '.gitattributes'), 'utf8').replace(/\r\n/g, '\n')
  for (const line of ['LICENSE-* text eol=lf', '*.jsonl text eol=lf', 'Jenkinsfile text eol=lf', 'Dockerfile text eol=lf', '*.sql text eol=lf']) {
    assert.ok(attributes.split('\n').includes(line), `.gitattributes missing ${line}`)
  }
})

const task3Ready = TASK3_REQUIRED.every(existsSync)

test('Task 3 reference and provenance files exist', () => {
  assert.deepEqual(TASK3_REQUIRED.filter(file => !existsSync(file)), [])
})

if (task3Ready) {
  test('all Task 3 relative markdown links resolve inside the skill', () => {
    for (const file of TASK3_REQUIRED.filter(file => file.endsWith('.md'))) assertRelativeLinksResolve(file)
  })

  test('README and source map record pinned source identity and attribution', () => {
    for (const file of [files.readme, files.sourceMap]) {
      const body = readFileSync(file, 'utf8')
      for (const required of [
        PINNED_REVISION,
        'https://github.com/bdfinst/cd-migration',
        'CD Migration Authors',
        'MinimumCD.org',
        'Dojo Consortium',
        'CC BY 4.0'
      ]) assert.ok(body.includes(required), `${file} missing ${required}`)
      assert.match(body, /^## Changes$/m, `${file} needs a separate Changes section`)
    }
  })

  test('README changelog starts at version 1.1 and names only adapted references as adapted', () => {
    const readme = readFileSync(files.readme, 'utf8')
    assert.match(readme, /^## Changelog\n\n### 1\.1\b/m)
    const adaptedSection = readme.match(/^## Adapted files\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] || ''
    for (const file of ADAPTED_FILES) assert.ok(adaptedSection.includes(file), `README adapted section missing ${file}`)
    assert.equal((adaptedSection.match(/references\/[a-z0-9-]+\.md/g) || []).sort().join(','), [...ADAPTED_FILES].sort().join(','))
  })

  test('source map maps exactly the three adapted reference files and seven admitted agentic sources', () => {
    const sourceMap = readFileSync(files.sourceMap, 'utf8')
    const mapped = [...sourceMap.matchAll(/^\| `(references\/[a-z0-9-]+\.md)` \|/gm)].map(match => match[1]).sort()
    assert.deepEqual(mapped, [...ADAPTED_FILES].sort())
    const agenticRow = sourceMap.match(/^\| `references\/agentic-delivery\.md` \| (.+) \|$/m)?.[1] || ''
    const upstream = [...agenticRow.matchAll(/`([^`]+\.md)`/g)].map(match => match[1]).sort()
    assert.deepEqual(upstream, [...AGENTIC_UPSTREAM_FILES].sort())
  })

  test('agentic authority requires independent attribution or operation', () => {
    const agentic = readFileSync(files.agentic, 'utf8')
    assert.match(agentic, /independently attributable governing decision or independently operated control/i)
    assert.doesNotMatch(agentic, /(?:^|\s)attributed governing decision or independently operated control/i)
    assert.doesNotMatch(agentic, /separate attributable decision/i)
  })

  test('guarded upstream notice and canonical legal-code pointer have exact bytes', () => {
    const body = readFileSync(files.license, 'utf8').replace(/\r\n/g, '\n')
    const marker = 'Canonical legal code:'
    const markerIndex = body.indexOf(marker)
    assert.ok(markerIndex > 0, 'license marker missing')
    const notice = body.slice(0, markerIndex)
    assert.ok(notice.endsWith('\n'), 'marker must immediately follow the notice final newline')
    assert.equal(notice.endsWith('\n\n'), false, 'marker must not have an inserted blank separator')
    assert.equal(sha256(notice), NOTICE_SHA256)
    assert.match(body.slice(markerIndex), /^Canonical legal code:\nhttps:\/\/creativecommons\.org\/licenses\/by\/4\.0\/legalcode\n?$/)
    for (const required of ['CD Migration Authors', 'MinimumCD.org', 'Dojo Consortium', 'CC BY 4.0']) assert.ok(notice.includes(required), `notice missing ${required}`)
  })

  test('no public delivery-evidence-snapshot skill directory is created', () => {
    assert.equal(existsSync(join(repoRoot, 'skills', 'delivery-evidence-snapshot')), false)
  })

  test('evaluation Git preflight is independent of global identity', () => {
    const protocol = readFileSync(files.evaluation, 'utf8')
    for (const required of ['user.name', 'user.email', 'user.useConfigOnly=true', 'core.longpaths=true']) {
      assert.ok(protocol.includes(required), `evaluation protocol missing ${required}`)
    }
    assert.match(protocol, /Fail preflight if local identity is absent/)
  })

  test('agentic semantic gate separates consequential WIP failures from exact-reporting quality', () => {
    const protocol = readFileSync(files.evaluation, 'utf8')
    assert.match(protocol, /agentic-authority-and-scope[^\n]*hard miss[^\n]*misapplies the overlay/i)
    assert.match(protocol, /configured (?:work|WIP)[^\n]*demonstrated effectiveness/i)
    assert.match(protocol, /claims concurrency is safe[^\n]*without behavior evidence/i)
    assert.match(protocol, /expand(?:ing)? concurrency[^\n]*without behavior evidence/i)
    assert.match(protocol, /exact one-review limit[^\n]*queue-growth pause[^\n]*acquisition recommendation[^\n]*nonblocking quality signal/i)
  })
}

test('Task 4 assessment skill exists', () => {
  assert.equal(existsSync(assessmentSkill), true)
})

if (existsSync(assessmentSkill)) {
  test('assessment frontmatter is discoverable, versioned, and continuity-neutral', () => {
    const body = readFileSync(assessmentSkill, 'utf8')
    const frontmatter = body.match(/^---\n([\s\S]*?)\n---\n/)?.[1] || ''
    assert.match(frontmatter, /^name: software-delivery-assessment$/m)
    const description = frontmatter.match(/^description: (.+)$/m)?.[1] || ''
    for (const term of ['software delivery', 'continuous delivery', 'testing', 'assessment']) {
      assert.ok(description.toLowerCase().includes(term), `assessment description missing ${term}`)
    }
    assert.match(description, /whether or not delivery is continuous/i)
    const skillVersion = frontmatter.match(/^\s+version: "(\d+\.\d+)"$/m)?.[1]
    assert.equal(skillVersion, '1.1')
    const readme = readFileSync(files.readme, 'utf8')
    const newestChangelog = readme.match(/^## Changelog\n\n### (\d+\.\d+)\b/m)?.[1]
    assert.equal(skillVersion, newestChangelog)
  })

  test('assessment skill is a compact six-phase runtime spine', () => {
    const body = readFileSync(assessmentSkill, 'utf8')
    assert.ok(body.includes(RFC2119_BLOCK), 'assessment skill must carry the exact RFC 2119 approved block')
    assert.ok(body.split(/\r?\n/).length < 500, 'assessment skill must stay under 500 lines')
    for (const phase of [
      '## Phase 1: Anchor',
      '## Phase 2: Preflight',
      '## Phase 3: Acquire',
      '## Phase 4: Analyze',
      '## Phase 5: Reconcile',
      '## Phase 6: Report, close, or pause'
    ]) assert.ok(body.includes(phase), `assessment skill missing ${phase}`)
    for (const status of ['complete', 'partial', 'blocked', 'aborted']) assert.match(body, new RegExp(`\\b${status}\\b`))
    for (const forbiddenHeading of ['## manifest fields', '## connected-record-allowlist', '## Capability model', '## Testing model']) {
      assert.equal(body.includes(forbiddenHeading), false, `assessment skill duplicates routed reference material: ${forbiddenHeading}`)
    }
  })

  test('blocked status preserves supported conflicts and trajectory conclusions', () => {
    const body = readFileSync(assessmentSkill, 'utf8')
    assert.match(body, /coverage pass across every material source/i)
    assert.match(body, /configuration\/behavior conflicts/i)
    assert.match(body, /changes across time windows/i)
    assert.match(body, /blocked[^.]*must not suppress supported bounded conclusions or their recommendations/i)
  })

  test('assessment ships and requires its dependency-free artifact validator', () => {
    assert.equal(existsSync(artifactValidator), true, 'runtime artifact validator is missing')
    const body = readFileSync(assessmentSkill, 'utf8')
    assert.ok(markdownTargets(body).includes(artifactValidatorTarget), 'assessment skill must route to the runtime artifact validator')
    assert.match(body, /run the artifact validator[^.]*before reporting persistence success/i)
    assert.match(body, /validator errors[^.]*blocked/i)
  })

  test('assessment skill routes exact runtime contracts without routing evaluator machinery', () => {
    assertRelativeLinksResolve(assessmentSkill)
    const body = readFileSync(assessmentSkill, 'utf8')
    for (const target of [
      'README.md',
      'references/delivery-evidence-snapshot.md',
      'references/assessment-method.md',
      'references/capability-model.md',
      'references/agentic-delivery.md',
      'references/testing-model.md',
      authoringExampleTarget
    ]) assert.ok(markdownTargets(body).includes(target), `assessment skill missing relative route ${target}`)
    assert.equal(body.includes('evaluation-protocol.md'), false)
    assert.match(body, /Before (?:the )?first manifest write[\s\S]{0,240}\*\*manifest-json-subset\*\*/)
    assert.match(body, /Before (?:the )?first manifest write[\s\S]{0,320}\*\*writer-preflight\*\*/)
    assert.match(body, /Before (?:any )?open blocked-root mutation[\s\S]{0,280}\*\*resume-anchor-validity\*\*/)
  })

  test('agentic routing is conditional per unit and change class without assuming CD foundations', () => {
    const body = readFileSync(assessmentSkill, 'utf8')
    const route = body.match(/^- \[[^\]]*agentic[^\]]*\]\(references\/agentic-delivery\.md\): ([\s\S]*?)(?=\n- |\n\n)/im)?.[1] || ''
    assert.ok(route.length > 0, 'assessment skill must include a routed agentic-delivery runtime bullet')
    for (const required of ['materially author', 'approve', 'operate', 'release', 'delivery unit', 'change class', 'not_applicable']) {
      assert.ok(route.includes(required), `assessment skill agentic route missing ${required}`)
    }
    assert.match(route, /continuous-delivery foundations[^.]*does not suppress|does not suppress[^.]*continuous-delivery foundations/i)

    const capability = readFileSync(files.capability, 'utf8')
    assert.ok(markdownTargets(capability).includes('agentic-delivery.md'), 'capability model must route to agentic-delivery.md')
    const conditionalSection = capability.match(/^## Conditional agentic delivery\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] || ''
    assert.ok(conditionalSection.length > 0, 'capability model must retain a conditional agentic route')
    assert.equal((conditionalSection.match(/^- /gm) || []).length, 0, 'capability model must not duplicate agentic question bullets')

    const reconcile = body.match(/^## Phase 5: Reconcile\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] || ''
    assert.match(reconcile, /every domain of each loaded overlay[^.]*bounded conclusion[^.]*named unknown[^.]*cannot affect the assessment/i)
    assert.match(reconcile, /combined supported conclusion[^.]*must not suppress[^.]*material counterevidence/i)
  })

  test('assessment persistence, output-host, and remediation boundaries are explicit', () => {
    const body = readFileSync(assessmentSkill, 'utf8')
    for (const required of [
      'artifact_persistence: write_only',
      'commit_authorized: false',
      'authorized_stage_paths: []',
      'invocation-time',
      'docs/delivery-assessments/',
      'artifact host',
      'overlaps the assessed delivery-unit scope',
      'MUST NOT implement remediation',
      'MUST NOT push'
    ]) assert.ok(body.includes(required), `assessment skill missing boundary: ${required}`)
    assert.match(body, /writes? artifacts without staging or committing/i)
    assert.match(body, /several (?:repositories|hosts) are plausible[\s\S]{0,220}user-supplied output directory/i)
    assert.match(body, /commit_authorized: true[\s\S]{0,260}exact[\s\S]{0,120}authorized_stage_paths/)
  })
}
