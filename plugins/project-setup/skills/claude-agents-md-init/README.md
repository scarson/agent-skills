# claude-agents-md-init

Initializes project-root agent-guidance files (`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex / Cursor / Cline / other AGENTS.md-aware frameworks) from a single bundled template, tuned for modern Claude (Opus 4.7+; reviewed against Opus 4.8, Sonnet 5, and Fable 5) and forward-compatible with other coding agents.

## What this does

Installs one bundled template as one or both of two sibling files at the project root:

- **`CLAUDE.md`** — consumed by Claude Code (`claude.ai/code`)
- **`AGENTS.md`** — consumed by Codex, Cursor, Cline, Aider, and the growing set of AGENTS.md-aware frameworks

Both outputs come from the same template ([references/claude-agents-md-template.md](references/claude-agents-md-template.md)) and are substantively identical except for two substitution points:

- The **intro line** (`[AGENT_INTRO]`) — per-target phrasing about which framework the file guides
- The **Sibling-sync reminder** (`[SIBLING_FILE]`) — points each file at its sibling so future editors know to keep the pair in sync

The skill also applies four universal substitutions (`[PROJECT NAME]`, `[USER NAME]`, `[PRIMARY BRANCH]`, `[BRIEF PROJECT DESCRIPTION]`) identically across both outputs. `[USER NAME]` resolves to the literal `the user` when the repo is team-shared — see the v2.12 changelog entry.

## Why one skill for two files

Claude Code and Codex/Cursor/Cline are used side-by-side in many teams. The rules governing agent collaboration are ~95% identical across frameworks — principles, TDD discipline, version control conventions, testing standards, debugging process, and so on. Only a handful of mentions are framework-specific (the intro line, tool names like "TodoWrite" vs. equivalents, specific invocation syntax for the Skill tool). Maintaining two parallel skills with two parallel templates introduces drift risk for little gain.

**Single source of truth + per-target substitutions + Sibling-sync reminder at the top of each output** is the design: the two files are in sync by construction at install time, and the reminder keeps them in sync over time as humans and agents edit them.

### The Sibling-sync reminder

At the top of each output file, immediately after the intro, the template inserts a prominent note:

> **Sibling sync.** This file has a sibling at `<other file>` carrying the same rules for <other framework>. When updating either, update the other — the two should stay identical except for framework-specific phrasing (agent names, tool names).

The reminder is load-bearing for drift prevention. When a user or agent edits `CLAUDE.md` weeks or months after install, the reminder at the top says "edit AGENTS.md too." Without it, the two files silently diverge.

### Divergence detection before filling the gap

When the skill is asked to fill a gap — one file exists, the other doesn't — it runs an **alignment check** on the existing file before standing up the sibling from the template. The check greps for six structural markers (the Terminology heading and RFC 2119 reference, the Principles heading and its `Rule #1:` lead, the Our-relationship and Proactiveness headings). If fewer than four markers are present, the existing file is classified as `DIVERGENT`.

Creating a template-based sibling against a `DIVERGENT` existing file would produce an out-of-sync pair at minute zero. The first cross-sync operation later would face a large structural diff — exactly the mess the sibling-sync reminder is designed to prevent.

So the skill STOPs and surfaces four options to the user:

- **(a) Align the existing file to the template first.** Recommended default if the user can spare a few minutes. Exit, align, re-run.
- **(b) Create the missing sibling as a literal copy of the existing file.** Preserves content exactly; ignores the template for this install.
- **(c) Proceed with template-based creation anyway.** Accept the divergence; document it so future sync operations aren't surprising.
- **(d) Abort.**

The STOP is explicit and deliberate — this is one of the few places where the skill does NOT auto-proceed.

### Sync-block injection for template-aligned-but-unsynced files

Projects that ran an earlier version of this skill (or hand-authored a template-aligned CLAUDE.md before this skill existed) won't have the sibling-sync reminder block. The skill detects these (classified as `TEMPLATE_ALIGNED_NO_SYNC`) and injects the block at the top — between the intro line and the `## Terminology` section — without touching any other content. The injection is safe, minimal, and reported separately in the final summary.

Concretely: running `claude-agents-md-init` against a project that has a template-aligned CLAUDE.md but no AGENTS.md (and no sync block on the CLAUDE.md) will produce:

1. A new AGENTS.md created from the template with the sync block
2. The existing CLAUDE.md gets its sibling-sync block injected (no other changes)
3. Both files now carry the sync reminder pointing at each other

## When to use

Invoke when:

- Bootstrapping a new project that will use Claude Code and/or other coding agents
- An existing project has neither `CLAUDE.md` nor `AGENTS.md`, or only one of them
- You want to align an old single-framework file with current cross-framework conventions (use the "merge universal sections" option in Step 4)

Do NOT invoke for:

- Editing content in an existing file that's already current (use a normal edit flow)
- Projects where one of the files has been heavily customized and you don't want template-driven changes

## Target modes

The `--target` flag controls which file(s) to write:

| Target | Behavior |
|---|---|
| `claude` | Writes `CLAUDE.md` only |
| `agents` | Writes `AGENTS.md` only |
| `both` (default) | Writes both — the happy path for mixed-framework teams |

Smart default based on existing file state:
- Neither file exists → `both`
- Only `CLAUDE.md` exists → `agents` (fill the gap without touching the existing file)
- Only `AGENTS.md` exists → `claude`
- Both exist → `both` (but Step 4 handles each existing file's replace/merge/skip decision independently)

## Placement

| File | Path |
|---|---|
| Installed CLAUDE.md | `./CLAUDE.md` at the project root |
| Installed AGENTS.md | `./AGENTS.md` at the project root |
| Backup (if an existing file was replaced) | `./<FILENAME>.backup-<timestamp>` |

Subdirectory copies are supported by Claude Code's auto-discovery (useful for monorepos / per-package context) but aren't managed by this skill.

## Dogfood mode

The skill supports a non-destructive output-filename override:

- `--output-filename CLAUDE-TMP.md` (for `claude` target) or the equivalent for agents
- Writes to the overridden filename regardless of whether the canonical file exists
- Skips the existing-file backup-and-replace logic
- Report includes a `diff` hint so the user can compare the template output to the existing canonical file

Useful when dogfooding template changes against a project with substantial existing content.

## Composition with sister skills

This skill is designed to compose with the other `project-setup` skills:

- **`git-strategy-init`** — installs `docs/git-strategy.md`. The agent-md template's "Keeping a clean git graph" section references this file.
- **`pitfalls-docs-init`** — installs `docs/pitfalls/implementation-pitfalls.md` and `docs/pitfalls/testing-pitfalls.md`. The agent-md template's "Language / Framework Gotchas" and "Development Workflow" sections reference these.
- **`project-init`** — wrapper that sequences all three init skills for one-command bootstrap. `claude-agents-md-init` runs first so later skills have well-formed CLAUDE.md + AGENTS.md files to append references into.

Each sub-skill has zero hard dependencies on the others — references that don't yet resolve are dangling until the companion skill runs, which is acceptable because the files are read by a human+agent pair who will notice and unblock.

## Design decisions

### Model tuning (Opus 4.7+; v2.3 reviewed against Opus 4.8 / Sonnet 5 / Fable 5; v2.7 against Opus 5; v2.9 against the Claude 5 context-engineering guidance)

The template encodes lessons from a tuning pass performed on a real Claude 4.7 CLAUDE.md. The relevant behavior changes from Anthropic's 4.7 migration guide that shaped the template:

| 4.7 behavior change | Template response |
|---|---|
| More literal instruction following, especially at lower effort levels | RFC 2119 terminology block governs all MUST / MUST NOT tokens; scoped STOP rules (avoid unqualified "ALWAYS STOP"); TDD scope explicitly enumerated; task-tracking guidance scoped to 3+ step work |
| Fewer subagents by default *(inverted by Opus 5 — see v2.7)* | "When to dispatch parallel subagents" callout, since v2.7 asking for both directions: when to delegate and what isn't worth an agent |
| Response length varies by use case *(superseded by Opus 5 — see v2.7)* | Chat verbosity still uncalibrated here; written-document length calibrated in §Thinking documentation since v2.7 |
| More direct tone, less validation-forward phrasing | Persona-based anti-sycophancy framing removed in v2.3 (current models are direct by default); the concrete push-back rules in §Our relationship carry the intent, with an explicit "agree plainly when agreement is warranted" clause; the old specific-phrase bans (e.g. "You're absolutely right!") remain dropped as obsolete |
| Built-in progress updates | No scaffolding for forced interim status messages |
| Better file-system memory | Three-layer memory pattern (pitfalls / user-scoped memory / per-phase reports) prescribed explicitly |
| Stricter effort calibration | Rules that trigger the TDD / debugging / thinking-doc workflows call out their skill operationalization explicitly |

**v2.3 review pass (2026-07)** checked the template against Anthropic's Opus 4.8, Sonnet 5, and Fable 5 migration guidance. The structural bets held up (RFC 2119 keywords as the emphasis mechanism, bias-to-action, no forced-progress scaffolding — both new models narrate well unprompted), and three families of adjustment landed:

- **Opus 4.8 is more deliberate and asks more often by default.** Unqualified STOP-and-ask rules compound that. Rule #1 is now scoped to MUST/MUST NOT rules and carries an autonomous-mode valve (conservative interpretation + recorded judgment call + DONE_WITH_CONCERNS instead of deadlocking when no human is available); the session-start uncommitted-changes STOP is scoped to task-overlapping changes; the systematic-debugging framework is scoped to non-obvious issues; todo bookkeeping no longer requires approval.
- **Both models follow instructions more literally.** Emotional-emphasis language ("…IS FAILURE", all-caps phrases that aren't RFC 2119 keywords) was de-escalated — plainly stated rules bind identically and don't distort prioritization. The persona-based anti-sycophancy line was removed; the concrete push-back rules remain, guarded against overcorrection on already-direct models.
- **Tool-specific callouts drift.** TodoWrite and "the journal tool" were replaced with harness-agnostic phrasing (todo/task-tracking tool; project memory/journal mechanism with a TODO naming it) — harnesses vary across versions, and AGENTS.md consumers never had those tools. The stale "Opus 4.7 spawns fewer subagents" note became condition-based delegation-trigger guidance (current models under-reach for subagents unless told *when* to delegate — *inverted at Opus 5; see the v2.7 pass below*).

**v2.7 review pass (2026-07)** checked the template against Anthropic's Opus 5 prompting guide. Method note, because it governs what landed: that guide's prompt snippets are introduced as *examples* of a mechanism ("**for example**", "describe the cadence you want"), and it makes a wording-level efficacy claim exactly once — that the general form beats naming thinking tags. Its *behavioral findings* (responses and written documents run longer; narration and correction-narration increase; explicit verification instructions cause over-verification; delegation is readier) are the load-bearing content; the suggested wordings are remediation examples, not validated artifacts. So this pass treats the findings as input and writes the template's own wording, exactly as v2.3 did. Its removals also rest on firmer ground than its additions — the guide states a measured result for removing verification scaffolding ("reduces wasted tokens with no loss in quality") and states no comparable result for anything it suggests adding. Four changes landed:

- **The delegation note inverted.** Opus 5 delegates readily; the v2.3 guidance told project authors to write triggers that *encourage* delegation. The TODO now asks for both directions and names what isn't worth an agent (work finishable in a handful of tool calls; double-checking your own output; several agents where one would do). It deliberately makes no claim about "current models" — asserting a model generation's disposition is what went stale twice now.
- **`superpowers:verification-before-completion` dropped from the skills table.** A standing "before claiming work is done, run the verification skill" row is the final-verification-step scaffolding the guide names explicitly; on a model that self-verifies unprompted it compounds rather than adds.
- **Written-document length calibrated in §Thinking documentation**, where the counter-pressure lives ("the asymmetry favors over-capturing", plus the three-layer memory pattern's deliberate redundancy). The new line separates reasoning density from structural padding rather than weakening the capture rule.
- **§Completeness over shortcuts gained a scope boundary.** Boil-lakes governs how completely to cover a scope and said nothing about *changing* it — a gap that matters more on a model prone to scope expansion. One clause now closes it.

Three of the guide's suggestions were **considered and declined**, recorded here so they aren't re-proposed each release:

- **Progress-update cadence scaffolding.** The template's standing bet — no forced interim status messages — is the same class of decision the v2.3 pass confirmed held up. Reversing it on the strength of an illustrative snippet isn't warranted, and narration cadence is the most harness-specific of the three; it belongs in a user-level `CLAUDE.md`, not a project template that also emits `AGENTS.md`.
- **A correction-narration rule.** Claude Code's own harness already carries one, so a template copy would be a differently-worded near-duplicate — precisely the drift §Self-identifying references warns about — and for `AGENTS.md` consumers it's an Opus-5-specific fix aimed at models it doesn't describe.
- **A trailing tone reminder.** The guide recommends pairing a conciseness instruction with a reminder near the end of a long prompt. With no chat-verbosity block adopted, it would reinforce nothing.

**v2.9 review pass (2026-08)** checked the template against Anthropic's "The new rules of context engineering for Claude 5 generation models" (July 2026), via the full assessment at `docs/specs/2026-08-07-claude-agents-md-template-context-engineering-assessment.md`. Method note: the blog's thesis (80% of Claude Code's system prompt removed; rules→judgment, examples→interfaces, progressive disclosure, say-it-once) targets *always-loaded* context, which is exactly what this template emits — but its rules→judgment shift explicitly does not extend to contracts, user policy, or adversarial settings, which is the test each section was graded against. Four changes landed, all under unchanged headings:

- **§TDD and §Systematic Debugging Process stopped restating the skills they route to.** Both sections carried inline procedure bodies (the five red-green steps; the four debugging phases) duplicating `superpowers:test-driven-development` and `superpowers:systematic-debugging`, which the Skills & Subagents table already routes to — the drift-plus-double-load pattern the blog names directly ("create a verification skill and reference it from your CLAUDE.md"). Each is now mandate + trigger condition + authoritative-skill pointer. The root-cause-not-symptom mandate and the failed-trivial-fix escalation rule stay inline: they are policy, not procedure.
- **§Naming and §Code Comments compressed to policy.** The anti-pattern enumerations and good-names list were near-literal matches for the comment guidance the blog describes deleting from Claude Code's own system prompt — armor against failure modes the Claude 5 generation mostly no longer exhibits. What stands is what judgment cannot derive: ABOUTME headers with the existing-codebase precedence note, comment preservation, the evergreen-comments rule, the generated-code exception — plus the blog's own replacement form, "match the surrounding code's comment density and idiom."
- **§Learning and Memory's naming TODO resolves to auto-memory on Claude Code.** The blog's memory shift is real but harness-specific; the TODO now says so instead of listing only external mechanisms.
- **The per-project comment-examples TODO was dropped** — mandated example blocks are the "give Claude examples" pattern the blog inverts; the compressed policy parentheticals carry the orientation.

Considered and **deferred or declined** in this pass, recorded so they aren't re-proposed each release:

- **Target-conditional emission** (a leaner CLAUDE.md and a fuller AGENTS.md from the same template) — deferred, not declined. The assessment called it the most actionable structural idea, and the skill's substitution machinery could support it. It was not taken now because its premise is weaker than the assessment assumed: this marketplace ships Agent Plugins manifests, so the superpowers skills route on AGENTS.md frameworks too, and the two-variant maintenance cost (every future edit reasoning about both variants, doubled sibling-sync surface) buys mostly the §Learning and Memory delta. Revisit if the capability gap between the sibling frameworks widens.
- **Cutting §Thinking documentation, §Self-identifying references, or §Our relationship / §Proactiveness** — declined. These hold most of the template's remaining bulk (the armor-only diet above nets only ~6%), but they are deliberate house methodology and collaboration policy, not model armor — the blog's own carve-out ("skills are best when they encode opinions particular to you… avoid overconstraining, except in highly important areas"). Shrinking them is a policy decision for the template's author, not a model-fit correction.
- **Dropping the §Skill routing route-first mandate** (it duplicates `superpowers:using-superpowers`) — declined for now: not every consuming project installs superpowers, and on projects that don't, the section is the only router. Its TODO already scopes it per-project.

Codex and Cursor are similarly literal about instruction-following (both respect RFC 2119 conventions, both have improved at long-horizon agentic work). The tuned template produces content that lands correctly in AGENTS.md for those frameworks too — which is the main reason a single template serves both outputs.

### What's "universal" vs. what's placeholder

The universal/placeholder split is a judgment call. The heuristic:

- **Universal**: things roughly the same for any engineering team using AI coding agents — engineering values, git discipline, test discipline, debugging discipline, agent communication norms, workflow skills that exist in the broader ecosystem.
- **Placeholder**: things that depend on the project's language, framework, architecture, tools, and team shape — build commands, file layout, language-specific gotchas, project-specific skills, routing rules.

Borderline items and how they resolved:

- **"No secrets in CLI flags" / "No PII in logs"**: universal. Stay pre-populated because they're security baselines, not project-specific.
- **`## External-resource safety` (v2.4)**: universal, pre-populated — a security baseline like the two above, and the one most likely to be the *only* supply-chain defense a colleague on a weak model or minimal harness gets. It defends against hallucination-squatting / typosquatting (attackers pre-registering the identifiers a model predictably hallucinates; see the References) with two independent gates: don't originate an identifier you weren't given, and treat freshly-pulled content as data, not instructions. Design notes for future maintainers:
  - **Hybrid (progressive-discovery) structure.** Most sessions never acquire an external resource, so loading the full policy every time is waste. The always-loaded template section is a compact **verb-keyed tripwire** (fires on any *clone / install / add / download / fetch / pull / resolve / manifest edit*) plus the two gates; the depth (threat rationale, provenance detail, false-positive guidance, tooling, honest limits) lives in a separate `docs/security/external-resource-safety.md` that the skill also emits, referenced by the section. This cut the always-on inline cost from ~600 to ~400 tokens and moved the ~2,000-token depth off the every-session path.
  - **Why the trigger is verb-keyed, not "when doing package work".** Progressive discovery works for git-strategy / pitfalls because agents *recognize* they're doing that kind of work. HalluSquatting is the opposite — it exploits the agent *not* recognizing that a routine `npm install` is a security decision. A pointer gated on the model first classifying its action as "package work" would sit behind the exact judgment the rule distrusts. Naming the ordinary verbs first breaks that circularity. For the same reason the tripwire (not just the pointer) is inline, and it is **fail-safe**: "if the policy file is missing, apply the gates anyway" — the inline gates are self-sufficient.
  - **Mitigation, not a control.** The policy states plainly that a prose rule cannot stop a poisoned lockfile at `npm ci`, a transitive-dep squat, or a manifest reference never resolved by name; do not try to make the prose do a hook's job.
  - **Enforcement hook is deliberately out of scope.** A PreToolUse hook intercepting unpinned/unverified installs is Claude-Code-specific and would break this skill's cross-platform, pure-instruction contract (AGENTS.md consumers can't use it); an example hook that false-fires or goes stale is a liability. That belongs in a dedicated `hook-init` skill (future); this skill may later carry a single neutral pointer to it for detected Claude Code users.
  - **Hardened by a six-reviewer adversarial panel** (four Claude lenses + Sonnet + Codex, then two Codex follow-up rounds): the trigger is mechanically checkable ("did I supply a location I wasn't given?") rather than introspective ("am I hallucinating?"), and a forgeable reputation/health heuristic (stars, downloads, author) was cut because a forgeable green light is net-negative.
- **"Comparative Evaluation Rules" (EVAL-1 through EVAL-5)**: universal. Apply to any tech selection / framework comparison work.
- **AOT / trim-warning policies**: project-specific. Removed from the template; users of .NET AOT projects fill them into the Language/Framework Gotchas placeholder.
- **Superpowers skills table**: universal. Pre-populated because the skills are widely used across Claude Code and cross-agent workflows. Projects that don't use superpowers should delete or replace the table.

### Why not two parallel skills

Considered: `claude-md-init` + `agents-md-init` as siblings, each with its own template. Ruled out because:

1. The two templates would be 95%+ identical; keeping them in sync by manual propagation adds maintenance cost and drift risk.
2. Teams that use both frameworks (the primary target audience) would need to run two skills and confirm two sets of substitutions.
3. The Sibling-sync reminder approach keeps the files aligned over the long term — but only if they start identical, which requires single-source generation.

The chosen design (one skill, one template, per-target substitutions, Sibling-sync reminder) gets all three benefits.

### Portability

The skill uses only shell and file I/O primitives. It does not invoke `TodoWrite`, `AskUserQuestion`, `Skill`, or any Claude-Code-specific tool. Any agent framework that can read a markdown skill, execute shell commands, and read/write files can run it.

## Maintenance

If the template needs updating:

1. Edit `references/claude-agents-md-template.md` in this skill.
2. The change takes effect on the next `claude-agents-md-init` run for any project.
3. If an existing project wants the updates, re-run the skill and choose the "merge universal sections" option for each target, or edit the files by hand — the Sibling-sync reminder nudges the editor to hit both. **Exception (v2.4+):** the `## External-resource safety` section is a security baseline, so re-running the skill *proactively offers* to inject it into an aligned file that lacks it (additive, previewed, both-or-neither) and to create the shared `docs/security/external-resource-safety.md` policy file it points at, rather than waiting for the merge option — see SKILL.md Step 4 `MISSING_SECURITY_SECTION` and Step 5.7.

The template is long (~35 KB). That's intentional — it's a full working document, not a stub. When editing, preserve the section order:

```
1. Title + intro line ([AGENT_INTRO])
2. Sibling-sync reminder ([SIBLING_FILE])
3. Terminology (RFC 2119/8174)
4. Project Overview [PLACEHOLDER]
5. Principles
6. Foundational rules
7. External-resource safety
8. Our relationship
9. Proactiveness
10. Designing software
11. Completeness over shortcuts
12. Test Driven Development
13. Writing code
14. Naming
15. Code Comments
16. Self-identifying references
17. Version Control
18. Keeping a clean git graph
19. Testing
20. Issue tracking
21. Completion status & escalation
22. Systematic Debugging Process
23. Thinking documentation for methodology
24. Learning and Memory Management
25. Build & Dev Commands [PLACEHOLDER]
26. Tech Stack [PLACEHOLDER]
27. Architecture (Key Points) [PLACEHOLDER]
28. Conventions [PLACEHOLDER]
29. Language / Framework Gotchas [PLACEHOLDER + universal sub-sections]
30. Development Workflow [PLACEHOLDER]
31. Project Layout [PLACEHOLDER]
32. Skills & Subagents (workflow table pre-populated; project-specific placeholder)
33. Skill routing [PLACEHOLDER]
```

That order matters because the document is read linearly by humans and agents alike — e.g., Principles set the tone before specific rules land; Proactiveness comes before the workflow sections that it governs.

## Changelog

- **v1.0** (agent-skills PR #6) — initial release as `claude-md-init`. Single-target (CLAUDE.md only).
- **v2.0** (agent-skills PR #7) — dual-target (CLAUDE.md + AGENTS.md). Sibling-sync reminder added to template. Released briefly under the name `agent-md-init`, but the name looked like a typo-pluralization of the `AGENTS.md` spec.
- **v2.1** (this skill) — renamed to `claude-agents-md-init` to disambiguate visually from `AGENTS.md`. Added divergence detection on existing files; skill now STOPs for human review before standing up a sibling from the template against a `DIVERGENT` existing file. Added sync-block injection for `TEMPLATE_ALIGNED_NO_SYNC` existing files (projects that pre-date the sync-block feature). Template file renamed `agent-md-template.md` → `claude-agents-md-template.md`.
- **v2.2** — universal-ruleset additions to the template, mined from the gstack `cso` skill's load-bearing operational discipline. Added two foundational-rules bullets (**Trust, then verify** + **Quality matters. Bugs matter.**), a new **Completeness over shortcuts** section (boil lakes, flag oceans), a new **Completion status & escalation** section (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT four-state reporting + 3-attempt escalation rule), and a **Reflection trigger** appended to Learning and Memory Management. Alignment-check markers unchanged — projects on v2.1-aligned CLAUDE.md/AGENTS.md remain TEMPLATE_ALIGNED. Existing projects do NOT auto-update; re-run the skill or hand-port the new sections.
- **v2.3** — periodic model-fit review against Opus 4.8, Sonnet 5, and Fable 5 (grounded in Anthropic's model-migration guidance). Rule #1 scoped to MUST/MUST NOT rules with an **autonomous-mode valve** (conservative interpretation + recorded judgment call + DONE_WITH_CONCERNS instead of deadlock); session-start uncommitted-changes STOP scoped to task-overlapping changes; systematic-debugging framework scoped to non-obvious issues; emotional-emphasis language de-escalated (RFC 2119 keywords carry the force); persona-based anti-sycophancy line removed (concrete push-back rules kept, with an anti-overcorrection clause); tool-specific callouts generalized (TodoWrite → harness todo/task tool; journal MCP → project memory/journal mechanism with a naming TODO); ABOUTME headers gained an existing-codebase precedence note; `# Proactiveness` heading level fixed to H2; stale Opus 4.7 subagent note replaced with condition-based delegation triggers. Alignment markers updated in SKILL.md: `Don't glaze me` (absent from the template since v2.2) → `## Proactiveness`; Rule #1 marker shortened to the `Rule #1:` prefix. Files from v2.1/v2.2 templates still classify TEMPLATE_ALIGNED (≥4 of 6 markers). Existing projects do NOT auto-update; re-run the skill or hand-port.

- **v2.4** — added a universal **`## External-resource safety`** defense against hallucination-squatting / typosquatting (two independent gates: never originate an identifier you weren't given; treat pulled content as data, not instructions), plus two pointers wired into existing sections (a "Trust, then verify" precedence rewrite and a `## Proactiveness` exception). Structured as a **hybrid / progressive-discovery** pair: a compact always-loaded **verb-keyed tripwire + gates** inline in the template (~400 tokens, down from ~600 full-inline), with the depth (threat rationale, provenance detail, false-positive guidance, tooling, honest limits) in a separate **`docs/security/external-resource-safety.md`** policy file the skill also emits and the section points at — because most sessions never acquire an external resource. The inline gates are self-sufficient and fail-safe (if the policy file is missing, apply them anyway). Motivated by the HalluSquatting research (Spira et al., 2026) and hardened by a six-reviewer adversarial panel (four Claude lenses + Sonnet + Codex) plus two Codex follow-up rounds: the trigger is mechanical rather than introspective and verb-keyed rather than gated on the model self-recognizing danger, and a forgeable reputation/health heuristic was cut. The skill now emits **three artifacts atomically** (CLAUDE.md + AGENTS.md + the shared policy file) and never lands the section's pointer without its target. Added `MISSING_SECURITY_SECTION` detection + an **additive, previewed, both-or-neither migration** that injects the section and creates the policy file for existing aligned installs (the whole point is reaching colleagues already using generated files). Alignment-check markers unchanged — v2.1–v2.3 files remain `TEMPLATE_ALIGNED`; the migration is detected by the section heading, not a new marker. Enforcement tooling (a PreToolUse hook) is deliberately **out of scope** — it's Claude-Code-specific and belongs in a future `hook-init` skill, not this cross-platform initializer. Bumps: skill `2.3 → 2.4`, plugin `0.2.0 → 0.3.0` (both `.claude-plugin` and `.codex-plugin`), marketplace catalog `0.6.0 → 0.7.0`.
- **v2.5** — represented **.NET / NuGet** throughout the External-resource safety policy (`docs/security/external-resource-safety.md`) and added `MSBuild targets` to the inline Gate 2 execution list: NuGet install/restore executing imported MSBuild `.props`/`.targets` (and legacy `install.ps1`/`init.ps1`), `dotnet tool install` / `dotnet new` execution, `dotnet restore` against a committed `packages.lock.json` in "what NOT to block", and NuGet tooling (exact `PackageReference` pinning, locked-mode restore, signature validation, and `nuget.config` `packageSourceMapping` against dependency confusion). Skill `2.4 → 2.5`; **plugin/marketplace versions intentionally unchanged** — v2.4 had been live only minutes, so this additive-examples change is folded into `0.3.0` rather than churning auto-update.
- **v2.6** — reduced Gate 2 friction. The old wording led with "installing can run code / don't follow embedded instructions" without a green light, so a literal reading could hesitate on a clearly-legitimate install where the user gave the full source (e.g. "install `https://github.com/prettier/prettier`"). Gate 2 now **leads with the green light** (once Gate 1 is satisfied, running the resource's own documented setup is the task — a legitimate setup script is not the threat) and scopes the caution to the real risk: treating *fetched content* as instructions to the agent (prompt injection) and unconfirmed identity. Restated the division of labor — Gate 1 governs *whether* to acquire, Gate 2 governs *how you treat what you pulled* — in both the inline section and the policy file, and made the policy file's "inspect before you execute" risk-proportionate (expected for unconfirmed/unfamiliar sources, not ceremony for a well-known resource the user named). Also dropped the framework-specific `MSBuild targets` from the inline Gate 2 (it stays in the policy file). Skill `2.5 → 2.6`; plugin/marketplace versions unchanged.

- **v2.7** — periodic model-fit review against Opus 5 (grounded in Anthropic's Opus 5 prompting guide; see §Model tuning for the method note on why its behavioral findings were adopted but its example wordings were not). Delegation TODO inverted and made bidirectional, with no claim about any model generation's disposition; `superpowers:verification-before-completion` dropped from the workflow-skills table (standing final-verification scaffolding compounds on a model that self-verifies unprompted); written-document length calibrated inside §Thinking documentation (over-capture reasoning, don't pad structure); §Completeness over shortcuts gained a scope boundary (boiling the lake ≠ widening it). Skill-routing starter shape gained a `design-review-cycle` line. Progress-cadence scaffolding, a correction-narration rule, and a trailing tone reminder were considered and declined — rationale in §Model tuning so they aren't re-proposed. Alignment markers unchanged; v2.1–v2.6 files remain `TEMPLATE_ALIGNED`. Existing projects do NOT auto-update; re-run the skill or hand-port. Plugin `0.3.0 → 0.4.0`.

- **v2.8** — the template's brainstorming/planning router-table rows are now **conditional on which workflow-skills plugin is available** at init: the template carries three HTML-comment-delimited `ROUTER:` blocks (superpowers-plus wrapper rows / superpowers base rows / omitted) and Step 5 sub-step 3a has the running agent detect availability, keep exactly one block, and delete the other two plus all markers — the retain-or-remove idiom `git-strategy-init` already uses for its §Release branch section. Detection is cross-platform (available-skills listing or plugin-cache directory, ask the user if undeterminable); no platform-specific probe lives in the template. Both siblings keep the same block, and the other Skills & Subagents rows are unconditional. Alignment markers unchanged — v2.1–v2.7 files remain `TEMPLATE_ALIGNED`. Existing projects do NOT auto-update; re-run the skill or hand-port the router-table rows. Bumps: skill `2.7 → 2.8`, plugin `0.4.1 → 0.5.0` (both `.claude-plugin` and `.codex-plugin`), marketplace catalog `0.18.0 → 0.19.0`.
- **v2.9** (2026-08) — context-engineering review against Anthropic's "The new rules of context engineering for Claude 5 generation models" (July 2026 blog post) and the in-repo assessment at `docs/specs/2026-08-07-claude-agents-md-template-context-engineering-assessment.md`. The template no longer restates procedures it also routes to as skills: §TDD and §Systematic Debugging Process collapse to mandate + trigger + authoritative-skill pointer (the five red-green steps and four debugging phases are the skills' to own; the root-cause mandate and the failed-trivial-fix escalation rule stay inline). §Naming and §Code Comments compress to policy — the anti-pattern enumerations, good-names list, and per-project comment-examples TODO are dropped as armor matching guidance the blog itself deleted, while ABOUTME headers + precedence, comment preservation, the evergreen-comments rule, and the generated-code exception all stand, and comments gain "match the surrounding code's comment density and idiom". §Learning and Memory's naming TODO now names Claude Code's built-in auto-memory as the default resolution. Net 6,765 → 6,376 words — the honest ceiling of the armor-only diet; the remaining bulk is deliberate house policy (see §Model tuning for the v2.9 declined/deferred list, including the deferred target-conditional-emission idea). Alignment markers unchanged; v2.1–v2.8 files remain `TEMPLATE_ALIGNED`. Existing projects do NOT auto-update; re-run the skill or hand-port — the collapsed sections are drop-in body replacements under unchanged headings. Bumps: skill `2.8 → 2.9`, plugin `0.6.0 → 0.7.0`, marketplace catalog `0.25.1 → 0.26.0`.

- **v2.10** (2026-08) — closed a verification gap found on a live update run. Every check the skill prescribed validated the *shape* of the output (no `ROUTER:` markers, no unresolved tokens, intact TODO blocks, normalized sibling equality, 6/6 alignment markers); none compared output against input, so a full regeneration that merged project content forward passed all of them while silently dropping three lines (an AOT pitfall entry and two `<!-- ... -->` project notes). Step 5 gains sub-step 8, a **content-preservation gate**: for every file rewritten or edited in place — DIVERGENT merge, `--merge-template`, sync-block injection, security-section injection — and for a sibling created as a copy, compute the set of non-blank lines present in the pre-change backup and absent from the written file, then **classify every hit** as intentional template-text replacement or accidental drop, restoring the drops and reporting the replacements as behavior deltas. Silence is not the pass condition; an explicit classification is. Specified by semantics (a whole-line, order-insensitive set difference) with a `grep -Fxv -f` one-liner as one illustration, annotated with why `-F`, `-x`, and the blank-line strip are each load-bearing (drop `-x` with a blank pattern present and the empty pattern matches every line, so the check reports nothing and reads as a clean pass) — no bundled script, POSIX shell not required. Sub-step 5's backup rule broadened from "existing file selected for replacement" to any file the run rewrites or edits, since the backup is now the gate's *input* rather than only an undo path, and the skill now states explicitly that backups survive until the gate has run and reported. Does not apply to a clean create; on the declared destructive replace (DIVERGENT option (b)) it reports a count rather than a classification. Template unchanged, alignment markers unchanged. Bumps: skill `2.9 → 2.10`, plugin `0.7.0 → 0.8.0`.

- **v2.11** (2026-08) — corrected the NuGet tooling bullets in `references/external-resource-safety.md`, which told a reader to do one thing that is already done and two things that do not always work. **"Enable package signature validation" was stale everywhere**, not merely imprecise: verification runs during restore with no configuration — always on Windows, by default since the .NET 8 SDK on Linux, and deliberately off on macOS, which Microsoft recommends leaving alone. A reader trying to comply reaches for `signatureValidationMode=require`, which is certificate allow-listing rather than verification, and which `dotnet restore` cannot honor because it lists `trustedSigners` among the settings it ignores — so the bullet led toward config that reads as enforcement in review while doing nothing on a Linux leg. That control is now described as what it is, and scoped to Windows-only pipelines where it does work. **The lockfile and locked-mode bullets keep their advice but gain the two conditions under which it breaks**: `packages.lock.json` is PackageReference-only (`packages.config` is already a flat pinned list), and locked mode cannot coexist with per-RID publishing (`dotnet publish -r <rid>`), because the lock file records an exact runtime-identifier set — each RID-specific restore mismatches with `NU1004`, and declaring every RID up front fails too, since passing one narrows the set against the file's many. **A new bullet covers the gate that was missing entirely**: NuGet auditing already runs on restore but only warns, so an advisory prints into a green build unless `NU1901`–`NU1904` are raised through `WarningsAsErrors`; it carries the two limits that decide whether that gate exists at all — `NuGetAuditMode` defaults to `direct` below `net10.0`, and on `packages.config` the gate **cannot be built**, since MSBuild severity properties are unsupported there and audit needs VS 17.10+ rather than the dotnet CLI. That last one is the reason the bullets split on PackageReference vs `packages.config` rather than on "modern .NET vs .NET Framework": Framework projects support PackageReference and merely default away from it, so the project format predicts which advice applies and the runtime label does not. Accepting a single finding is pointed at `NuGetAuditSuppress` with the advisory URL rather than a subtree exemption, which keeps the gate live for everything else. Found while applying this policy to a .NET 10 AOT repo, where the audit gate's first run surfaced a high-severity advisory that had been printing on every restore under a green build. Alignment markers unchanged. Existing projects do NOT auto-update; re-run the skill or hand-port — the changed bullets are a drop-in replacement for the list under §Tooling. Bumps: skill `2.10 → 2.11`, plugin `0.10.0 → 0.11.0`, marketplace catalog `0.45.0 → 0.46.0`.

- **v2.12** (2026-08) — two fixes, both about identity baked into a tracked file.

  **Team repos no longer get one person's name.** `CLAUDE.md` and `AGENTS.md` are committed, so a `[USER NAME]` collected at init is read by every teammate's agent — which then addresses all of them as whoever happened to run the skill. Step 1 now infers an **audience** (`personal` / `team`) from repo authorship and the remote's namespace, Step 3 surfaces it for confirmation, and `team` mode skips the name question outright. Nine of the eleven `[USER NAME]` sites name an *addressee* ("ask X", "warn X") and are fully handled by substituting the literal `the user`. The other two **assert an identity**, where substitution alone is not enough — `Address your human partner as "the user"` is worse than the bug — so they additionally became `AUDIENCE:` variant blocks, reusing the keep-one-delete-the-markers idiom v2.8 introduced for the router table. Those two sites are still substituted like every other one; the blocks choose the *wording*, not the value. (An earlier draft exempted them from substitution and would have shipped a literal `[USER NAME]` into personal-mode output — caught by an independent Codex review.) The team variants say something different rather than something blank: one tells the agent not to infer a name from git history, the other states that the section's first-person voice means whoever is driving the current session. §Our relationship's `I`/`my` voice is deliberately left alone — a pronoun resolves to the current driver, which is exactly right on a shared repo; only the proper noun broke.

  **The template is now forge-neutral.** Two lines hardcoded `gh`, in a skill that has no forge detection and no business acquiring any. The no-squash rationale and the merge-discipline bullet now state the *invariant* ("merge commits only", "never squash, never rebase") and leave the exact command to `docs/git-strategy.md` §Mechanics for auto-merge, which `git-strategy-init` writes per forge; "not GitHub UI" became "not the forge's web UI". This is strictly more correct on every forge, including GitHub, and it satisfies the template's own §Self-identifying references rule. Companion change in `git-strategy-init` 1.3 → 1.4, which gained first-class Azure DevOps support.

  Alignment markers unchanged — v2.1–v2.11 files remain `TEMPLATE_ALIGNED`. Existing projects do NOT auto-update; re-run the skill or hand-port. A personal-mode re-run produces a near-empty diff. Bumps: skill `2.11 → 2.12`, plugin `0.11.0 → 0.12.0`.

- **v2.13** (2026-08) — named `docs/handoffs/` in the template, so the layout it teaches covers the one artifact type it previously left unplaced. §Project Layout's Shape A tree annotates `docs/` with handoffs alongside plans, pitfalls, and design docs, and the `ROUTER: superpowers-plus` block gained a `superpowers-plus:handoff` row carrying the trigger and the destination (`docs/handoffs/<date>-<topic>-handoff.md`). The row is plus-only because no base-`superpowers` equivalent exists; the `superpowers-base` and `none` blocks are unchanged. Companion to `superpowers-plus` 0.39.0 → 0.40.2 (0.40.0 plus two Codex-review patches), which pins that path in the `handoff` skill itself — previously the skill named no output location at all, and agents fell back to whichever artifact directory a project happened to have populated, most often `docs/plans/`. Alignment markers unchanged; v2.1–v2.12 files remain `TEMPLATE_ALIGNED`. Existing projects do NOT auto-update; re-run the skill or hand-port the two lines. Bumps: skill `2.12 → 2.13`, plugin `0.12.0 → 0.13.2` (the two patch releases fold in Codex-review fixes: two places in SKILL.md reported the plus block's router rows as a fixed pair, which the third row made stale, and this entry's own companion-version reference had gone stale).

## References

- Anthropic Opus 5 prompting guide (`prompting-claude-opus-5`) — informed the v2.7 review pass; its behavioral findings were adopted, its example wordings were not copied (see §Model tuning)
- Anthropic Opus 4.7 migration guide — informed the 4.7-tuned language in the template
- Anthropic Opus 4.8 / Sonnet 5 / Fable 5 migration guidance (behavioral-shift sections) — informed the v2.3 review pass
- AGENTS.md convention — emerging standard for non-Claude agent guidance (Codex, Cursor, Cline, Aider, and others)
- Spira, Cohen, Feldman, Bitton, Wool, Nassi, *"Beware of Agentic Botnets: … Adversarial HalluSquatting"* (Tel Aviv University / Technion / Intuit, 2026) — the hallucination-squatting research that motivated the `## External-resource safety` section (v2.4)
- `git-strategy-init` SKILL.md — sibling skill; established the workflow pattern this skill follows
- `pitfalls-docs-init` SKILL.md — sibling skill; established the template-bundling pattern and cross-reference discipline
