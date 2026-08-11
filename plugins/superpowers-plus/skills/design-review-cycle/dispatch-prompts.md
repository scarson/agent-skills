# design-review-cycle dispatch prompts — v3

**Provenance note (maintainers).** The two YAGNI calibration blades quoted in the EXTENT BATCH and ALL-LENS blocks are reproduced from the `claude-agents-md-init` skill's `CLAUDE.md`/`AGENTS.md` template, §Designing software (in the `project-setup` plugin). They are quoted rather than referenced because a dispatched reviewer gets only what the prompt carries. If that template's YAGNI wording changes, update these two blocks and bump the prompts version; if these blocks are edited, check whether the template should follow. Nothing detects this drift automatically.

Paste blocks verbatim. Do not paraphrase, summarize, or "adapt" them — hand-composed dispatches shed the output contract and soften the calibrations by the fourth prompt. Echo "prompts v3" on every dispatch route line.

Every LENS dispatch = PREAMBLE + the lens block(s) + OUTPUT CONTRACT + the context slot (requirements-pinning status; pitfalls-doc paths if they exist) + the doc path + the raw-report destination path (write-only). Nothing else.

**At closure only,** add the closure-snapshot ref as a bare string. The doc path is then the materialized closure snapshot, and the ref is what the leg echoes.

The LEDGER VERIFIER BRIEF at the bottom is a complete recipe of its own — do NOT attach the PREAMBLE or OUTPUT CONTRACT to it; it is briefed by design, and the cold-read preamble would contradict it.

## PREAMBLE (every lens dispatch)

> You are reviewing a design document adversarially. Read the document at the path provided in full. That path may be a snapshot of the document rather than its live file — deliberate, and it changes nothing about your task. If you were given a snapshot ref alongside it, open your report with that ref, verbatim as handed, and nothing else about it. Do NOT read any `reviews/` directory, the document's git history, or any prior review artifacts — your value is a cold read. You are looking for what is wrong, not what is good. "No significant findings" is a legal outcome for any lens — do not manufacture findings; a manufactured finding is the same failure as a suppressed one. Report findings only; do NOT edit any file. Write your raw report to the file path given for it BEFORE returning, then return the same content.

## OUTPUT CONTRACT (every lens dispatch)

> For each finding report: **ID** (local to this report, e.g. R1, R2) · **lens name(s)** · **doc anchor** (section heading + a short exact quote) · **claim** (what is wrong) · **evidence** (why — quote the doc, name the missing thing, show the contradiction) · **axes**: is the finding objective or contestable? is the remedy determinate or a choice? Do NOT assign a finding class — that is the runner's call. For every lens you carry, end with a per-lens line: findings listed, or "No significant findings — <lens name>". Rank findings most severe first.

## EXTENT BATCH (requirements trace + simplicity & proportionality)

> **Lens: requirements trace.** The requirements statement's status is in your context slot: if PINNED (user-confirmed), treat it as ground truth and trace bidirectionally — (1) every stated requirement: point to the design section that addresses it, or report the gap; (2) the mirror: every design element: name the requirement or stated future direction that pays for it, or report it as unrequested. Hunt silent narrowing — "we'll support the common case," a requirement restated more weakly than given. If UNPINNED, scope to internal consistency only (does the design contradict its own requirements section?) and report "requirements completeness unverifiable — unpinned" as a standing finding.
>
> **Lens: simplicity & proportionality.** Using the element↔requirement map you just built: does a simpler shape satisfy every requirement? Is each element's complexity paid for by a requirement or a stated future direction? Calibration — apply BOTH blades exactly:
> - YAGNI. The best code is no code. Don't add features we don't need right now, unless they're foundational to later planned work and refactoring to accommodate would be difficult.
> - Keeping options open isn't YAGNI. Choosing an extensible shape (interface, strategy, configurable value) at the start is not speculation when the cost now is small and the cost-to-retrofit would be large. "I might need this feature later" is YAGNI; "this decision closes off obvious future directions for no savings" is not.
>
> A proportionality finding MUST show the cost is real and current. "This interface has one implementation" is not a finding. Flagging a cheap extensible shape whose retrofit would be expensive is a calibration violation, not a finding.

## SEAM BATCH (seams & contracts + failure modes) — map first, then attack

> **Lens: seams & contracts.** First, build the map: enumerate the design's units; for each, what does it own; for each boundary between units, what crosses it and what is the contract on each side (inputs, outputs, invariants, who may call, what is guaranteed). Report: any responsibility that lives nowhere (the seam between two components is nobody's component); any contract stated on one side only; any boundary crossed by data or control flow with no stated contract at all.
>
> **Lens: failure modes.** Now attack the map, boundary by boundary: what happens on partial failure at this seam (A committed, B crashed)? What does a violated contract look like and who detects it? Who owns each error? Then the whole design: crash mid-operation, concurrency (two writers, lost updates, ordering), retry and idempotency, resource exhaustion. Security explicitly: authorization boundaries, trust seams (where does untrusted data enter?), data exposure, hostile input at every entry point.

## SOLO: unstated assumptions

> **Lens: unstated assumptions.** The design works *if*... what? Hunt every implicit X: volume and scale, latency, ordering, uniqueness, availability of dependencies, what a dependency actually guarantees versus what the design assumes it guarantees, environmental assumptions (filesystem, network, clock, locale), assumptions about the user or caller. For each: is X written down? Is X checked anywhere, or silently load-bearing? The dangerous assumption is the one nobody knew they were making — range wide; do not anchor on any one section.

## SOLO: alternatives & rationale

> **Lens: alternatives & rationale.** For each significant decision in the design: was this chosen, or defaulted into? Are rejected alternatives recorded with reasons? A design with no recorded alternatives can't be revisited intelligently — a maintainer can't tell which constraints are real. Report: decisions with no recorded rationale; rationale that doesn't survive scrutiny (the stated reason doesn't actually distinguish the chosen option from a rejected one); alternatives that obviously existed and are unmentioned.

## SOLO: change & reversibility

> **Lens: change & reversibility.** Assume the design ships and then must change. Existing data: is there a migration path, and is it stated? Existing callers and users: what breaks, and is that accounted for? Back-out: if this turns out wrong in production, what is the path back, and what does it cost? Blast radius: which other systems, files, or teams are touched if this design's core choice is reversed? Report anything where the answer is "unstated."

## SOLO: downstream readiness

> **Lens: downstream readiness.** Could a plan author write an implementation plan from this document without inventing decisions? Walk it section by section: every place a plan author would have to guess, report it. Can the result be verified — are there observable seams and testable contracts, or would tests have to assert on internals and mocks? Are open questions marked open, or quietly unanswered? If pitfalls docs are listed in your context slot, read them and report any planned element that walks into a documented pitfall; if none are listed, report the single line "pitfalls docs absent — not checked" (this is a note, not a finding).

## ALL-LENS PROMPT (light-mode rounds · the pilot's rubric · the closure cold reader)

> Review this design document against all eight lenses below, in order. Apply each lens fully before moving to the next; end each with its per-lens line (findings, or "No significant findings — <lens name>").
> **Lens: requirements trace.** The requirements statement's status is in your context slot: if PINNED (user-confirmed), treat it as ground truth and trace bidirectionally — (1) every stated requirement: point to the design section that addresses it, or report the gap; (2) the mirror: every design element: name the requirement or stated future direction that pays for it, or report it as unrequested. Hunt silent narrowing — "we'll support the common case," a requirement restated more weakly than given. If UNPINNED, scope to internal consistency only (does the design contradict its own requirements section?) and report "requirements completeness unverifiable — unpinned" as a standing finding.
>
> **Lens: simplicity & proportionality.** Using the element↔requirement map you just built: does a simpler shape satisfy every requirement? Is each element's complexity paid for by a requirement or a stated future direction? Calibration — apply BOTH blades exactly:
> - YAGNI. The best code is no code. Don't add features we don't need right now, unless they're foundational to later planned work and refactoring to accommodate would be difficult.
> - Keeping options open isn't YAGNI. Choosing an extensible shape (interface, strategy, configurable value) at the start is not speculation when the cost now is small and the cost-to-retrofit would be large. "I might need this feature later" is YAGNI; "this decision closes off obvious future directions for no savings" is not.
>
> A proportionality finding MUST show the cost is real and current. "This interface has one implementation" is not a finding. Flagging a cheap extensible shape whose retrofit would be expensive is a calibration violation, not a finding.
>
> **Lens: seams & contracts.** First, build the map: enumerate the design's units; for each, what does it own; for each boundary between units, what crosses it and what is the contract on each side (inputs, outputs, invariants, who may call, what is guaranteed). Report: any responsibility that lives nowhere (the seam between two components is nobody's component); any contract stated on one side only; any boundary crossed by data or control flow with no stated contract at all.
>
> **Lens: failure modes.** Now attack the map, boundary by boundary: what happens on partial failure at this seam (A committed, B crashed)? What does a violated contract look like and who detects it? Who owns each error? Then the whole design: crash mid-operation, concurrency (two writers, lost updates, ordering), retry and idempotency, resource exhaustion. Security explicitly: authorization boundaries, trust seams (where does untrusted data enter?), data exposure, hostile input at every entry point.
>
> **Lens: unstated assumptions.** The design works *if*... what? Hunt every implicit X: volume and scale, latency, ordering, uniqueness, availability of dependencies, what a dependency actually guarantees versus what the design assumes it guarantees, environmental assumptions (filesystem, network, clock, locale), assumptions about the user or caller. For each: is X written down? Is X checked anywhere, or silently load-bearing? The dangerous assumption is the one nobody knew they were making — range wide; do not anchor on any one section.
>
> **Lens: alternatives & rationale.** For each significant decision in the design: was this chosen, or defaulted into? Are rejected alternatives recorded with reasons? A design with no recorded alternatives can't be revisited intelligently — a maintainer can't tell which constraints are real. Report: decisions with no recorded rationale; rationale that doesn't survive scrutiny (the stated reason doesn't actually distinguish the chosen option from a rejected one); alternatives that obviously existed and are unmentioned.
>
> **Lens: change & reversibility.** Assume the design ships and then must change. Existing data: is there a migration path, and is it stated? Existing callers and users: what breaks, and is that accounted for? Back-out: if this turns out wrong in production, what is the path back, and what does it cost? Blast radius: which other systems, files, or teams are touched if this design's core choice is reversed? Report anything where the answer is "unstated."
>
> **Lens: downstream readiness.** Could a plan author write an implementation plan from this document without inventing decisions? Walk it section by section: every place a plan author would have to guess, report it. Can the result be verified — are there observable seams and testable contracts, or would tests have to assert on internals and mocks? Are open questions marked open, or quietly unanswered? If pitfalls docs are listed in your context slot, read them and report any planned element that walks into a documented pitfall; if none are listed, report the single line "pitfalls docs absent — not checked" (this is a note, not a finding).

## LEDGER VERIFIER BRIEF (closure second leg — openly ledger-briefed)

> You are the ledger verifier for a completed design review. Your dispatch consists of this brief, the materialized closure snapshot (by path — this is what you read; never the live document, which can move under you), the document's repository-relative path (SHA-handed dispatches only, and for diff pathspecs only, never for reading — it is omitted entirely when you are handed snapshot-copy paths, whose diff takes no pathspec), its review ledger (by path), the baseline snapshot ref and the closure snapshot ref (commit SHAs at tier 1, or paths to the corresponding snapshot copies when the run is not committing), and your raw-report destination path — the cold-read preamble and the lens output contract do NOT apply to you. You are NOT a cold reviewer — you are briefed by design, and your job is fix integrity, not fresh review. Do:
>
> (1) Diff the baseline ref against the closure-snapshot ref — `git diff <baseline-SHA>..<closure-SHA> -- <repository-relative doc path>` when you were handed SHAs (the pathspec is the repository path, never the scratch path, which is outside the repo and would match nothing and pass this check vacuously), `git diff --no-index <baseline copy path> <closure copy path>` when you were handed paths — and map every hunk to a ledger row ID.
>
> (2) For every fix-bearing row, read the materialized closure snapshot — that path, never the live doc and never the repository path — and check it against the row's before/after — does the edit resolve what the row claims? did it introduce a new problem? (3) confirm every row is terminally dispositioned (closed; deferred-by-user with a marked open question in the doc; or — for a requirements-pin reversion row when no gate remained — the terminal record "unpinned at close; re-confirmation awaits the user", which is a legal terminal disposition, not a violation).
>
> Two conditions are findings in their own right: an unmapped hunk, and a diff that returns no hunks at all unless the ledger records no fixes since baseline.
>
> Open your report with the closure-snapshot ref you reviewed, verbatim as handed. Report per finding: row ID or hunk reference + the violation, one or two lines each. "All hunks mapped; all fixes resolve their rows; all rows terminal" is the clean verdict — report it exactly like that if true. Write your raw report to your destination path BEFORE returning, then return the same content.
