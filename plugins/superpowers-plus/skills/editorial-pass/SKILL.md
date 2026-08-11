---
name: editorial-pass
description: Use on a review-certified document after its cycle completes — auto-invoked by plan-review-cycle and design-review-cycle at their completed terminals, or standalone on any finalized doc carrying review scar tissue (grafted qualifiers, run-on fix sentences, in-line review litigation). Meaning-preserving legibility rewrite under a closed remedy set — a dispatched editor rewrites, an independent verifier judges every changed hunk against the certified baseline, drift reverts to certified text (at most one informed second attempt) — landing as one polish commit on top of certification. Never edits substance; never reopens a review.
---

# Editorial Pass

## Terminology

<!-- approved-block: rfc2119-terminology v1 — authoritative copy: ../../approved-blocks.md -->
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
<!-- /approved-block: rfc2119-terminology -->

## What success is

> Success is the same document, easier to parse: every normative claim of the certified text — no more, no fewer, no weaker, no stronger — rendered in prose a fresh-context reader parses correctly on the first pass. Meaning preservation outranks polish everywhere they conflict: when in doubt, the certified wording wins. Reverting to certified text is never a failure of this pass; drifting from it is the only one.

Why the pass exists: adversarial review cycles converge on correct-but-scarred prose. Fixes written to close findings graft qualifiers onto sentences, rulings accrete as meta-commentary, and the certified doc ends up reading like a contract lawyers fought over. Its consumers are fresh-context executors who never complain about ugly sentences but faithfully implement misparsed ones — so illegibility is a correctness hazard, not a cosmetic one. At the same time, every awkward clause was adversarially placed, which is why cleanup without independent verification is how certified meaning quietly drifts. Hence this pass's shape: frozen baseline, closed remedies, hunk-by-hunk verification, revert as the default under doubt.

## Authority — closed remedies

The pass's remedy set is closed. The only legal outcomes for any changed hunk are: **accept** the verified rewrite, **revert** to the certified text, or (once per pass, under §Disposition) a full **second attempt**. Consequences, all binding:

- The pass MUST NOT make substantive edits, add content, or fix defects — in the rewrite or in the baseline. An apparent substantive defect in the certified content is surfaced to the user as a `BASELINE NOTE:` line in the pass report, with the content left untouched; acting on it is a new review, not this pass.
- The pass cannot raise findings, reopen, or extend the review cycle that certified the doc. Nothing here feeds a ledger disposition, a gate, or a round table.
- The runner never hand-edits a candidate. Patch-ups are how graft dynamics re-enter; disposition is mechanical (accept / revert / re-attempt), and reverts restore the baseline hunk's bytes exactly.

## When to use / when NOT to use

**Use:** automatically, when invoked by `plan-review-cycle` or `design-review-cycle` at a completed terminal (both hand over the doc path and the certification commit SHA; design-review-cycle adds the ledger path). Standalone, on any finalized prose document the user wants polished without meaning change — the current text is then the baseline by definition.

**When NOT to use:** mid-review-cycle, or on a doc whose design-review run is open (Terminal state blank or `stopped awaiting user` — held anchors and a live gate outrank polish); on code; when the user is asking for substantive edits (that is authorship, not this pass); on a doc that is mostly verbatim-protected content (nothing rewritable — say so and stop).

## Protocol

### Step 0 — baseline (three tiers)

Probe first: is the doc inside a git work tree, and may the runner commit (project rules, hooks)? Never block on the answer — degrade and disclose:

- **Tier 1 — full protocol** (work tree, committing allowed). The baseline is the certified snapshot, identified by its bytes rather than by which commit last touched the path. Cycle-invoked: the handed SHA, and the runner MUST verify the doc's working-tree bytes are byte-identical to that SHA's blob (`git show <sha>:<doc>`); any difference aborts the pass with a one-line report (never rewrite an uncertified baseline). Compare blobs, not the doc's latest commit — a completion commit that touched only the ledger and raw reports leaves the doc's last path-commit behind the handed SHA while the certified bytes are exactly right. Standalone with the doc clean at HEAD: HEAD is the baseline.
- **Tier 2 — repo present, commit unavailable** (project rules forbid agent commits, hooks fail, unusual state). Baseline as tier 1 when a certification SHA was handed over and its blob matches. When no such SHA exists, the baseline is the doc's current certified bytes, copied to a session scratch file before any other step exactly as in tier 3, and the substitution is disclosed. The polished result is staged (or left in the working tree per the project's convention), stats go to the pass report instead of a commit message, and the degradation is disclosed.
- **Tier 3 — no repo, or standalone on a dirty doc.** Copy the current doc's bytes to a session scratch file (temp directory or the harness scratchpad — never into the project) BEFORE any other step; that copy is the baseline for verification and reverts. Disclose that no durable audit trail exists and report the scratch path so the user can keep the pre-polish text.

### Step 1 — rewrite (dispatched editor)

Dispatch a subagent editor — never the runner: the runner's session produced or reviewed the grafts and will defend them. The dispatch is the EDITOR PROMPT from [`dispatch-prompts.md`](dispatch-prompts.md) pasted verbatim, plus the UNTOUCHABLES block, the baseline doc path, and a scratch candidate destination path — nothing else (no ledger, no review history, no findings). The editor returns a complete rewritten document to the candidate path.

**Where the framework cannot dispatch subagents at all, the pass does not run.** Skip it, leave the certified text untouched, and disclose in one line: `editorial-pass: skipped — no subagent dispatch available; certified text unchanged`. A skip is a legal terminal for the pass as a whole — not a fourth hunk remedy, and not a failure. The runner MUST NOT stand in for either dispatch: Step 2's verifier would be equally unavailable, so a runner rewrite is unverifiable by construction.

### Step 2 — verify (independent verifier)

Dispatch a fresh verifier subagent: VERIFIER PROMPT verbatim + UNTOUCHABLES + baseline path + candidate path + report destination. It diffs the two files and returns a per-hunk verdict — PRESERVED or DRIFTED — with doubt resolving to DRIFTED, plus any `BASELINE NOTE:` lines. The editor and the verifier MUST be separate dispatches sharing no context. The verifier SHOULD be cross-model when an automated cross-provider primitive is available (a sibling skill wrapping another provider's CLI, that CLI via Bash, or an API); if none is available the runner MUST NOT block — fall back to a same-provider dispatch at the same tier and disclose the substitution in the pass report. Cross-model CLI runs launch backgrounded with output to a log file (they routinely outlast foreground timeouts); slowness never lowers the effort dial.

### Step 3 — disposition (mechanical)

Count the verifier's DRIFTED hunks:

- **None** → accept the candidate; go to Step 4.
- **Localized drift** — DRIFTED hunks ≤ 3, or ≤ 10% of changed hunks, whichever is greater → restore those hunks' baseline bytes exactly, accept the rest, go to Step 4. The result then contains only verifier-passed or certified text, so restored hunks need no re-verification.
- **Systemic drift** — beyond that threshold → ONE second attempt. A fresh editor dispatch produces a full rewrite from the certified baseline (EDITOR PROMPT + SECOND-ATTEMPT ADDENDUM), handed the attempt-1 candidate and the first verifier's drift findings by path: unflagged phrasing passed independent verification and is worth preserving; flagged hunks are re-derived from baseline text. It is never a patch of attempt 1. Then a FRESH verifier — not the first: an agent re-checking work that implemented its own guidance approves the guidance rather than re-testing the meaning — judges the FULL baseline↔candidate-2 diff (a re-roll can drift where attempt 1 was clean), without sight of the first verifier's findings. Remaining DRIFTED hunks revert to certified text — never spliced from attempt 1; cross-attempt splicing is graft-making by another name. Hard stop at two attempts: a third is the whack-a-mole loop re-entering through the side door, and the revert default is what lets this pass run unaudited.

### Step 4 — landing

- **Tier 1:** write the final text and commit immediately on top of the certification commit, pathspec-limited to the doc (plus the ledger when invoked by design-review-cycle) — never a bare `git add`. The commit message MUST carry: the certified SHA, attempts used, and hunks rewritten / reverted. That message is the canonical audit pointer for both invoking skills: the certified text is the parent commit, and `git diff <certified>..<polish> -- <doc>` is the drift audit.
- **Tier 1 with nothing to land.** When every hunk reverted, the final text is byte-identical to the certified baseline — a legal outcome under §Step 3, not a failure. For plan-review-cycle and standalone invocations there is then no ledger line either, so the pathspec has no change in it: create no commit, and never an empty one. The certification commit remains the current ref, and the pass reports `certified <ref> → <ref> (no change)`. Design-review-cycle invocations still commit in this case, because the ledger line below is itself a change.
- **Design-review-cycle invocations additionally** append one line to the ledger run header, riding the polish commit: `Polish: certified <ref> → polished in this commit · attempts <n> · hunks rewritten <r>, reverted <v> · prompts v1`. The line carries no polished SHA — a commit cannot contain its own hash. The commit carrying the line IS the polished ref, and `git log -1 -- <ledger>` supplies it numerically. That line and the polish commit are sanctioned by the invoking skill as its single post-terminal exception.
- **Tier 2:** write and stage; stats and disclosure go to the pass report. **Tier 3:** write the file; stats, disclosure, and the scratch baseline path go to the pass report.
- **Always,** end with the one-line pass report to the session: `editorial-pass: attempts <n> · hunks rewritten <r>, reverted <v> · certified <ref> → <ref|working tree|unchanged> · prompts v1`, followed by any disclosures (tier degradation, cross-model fallback, dispatch unavailable) and any `BASELINE NOTE:` lines verbatim.

## What the rewrite may touch

The binding list is the UNTOUCHABLES block in [`dispatch-prompts.md`](dispatch-prompts.md), attached to every dispatch — dispatched agents get only what the prompt carries. In outline: headings, code, paths, literal values, marker-wrapped and block-quoted blocks, requirements statements with their status lines, ledger pointer lines, Living Document Contract blocks, execution-status banners, and deferral markers are verbatim-protected — a changed byte there is drift regardless of meaning. RFC 2119 keywords keep their exact word and capitalization through any rewrite of their sentence. Ruling notes at contested spans may be tightened, never deleted or relocated. Sections keep their order and their content — rewriting happens within sections, never across headings.

## Dispatch tier

Editor and verifier both run at the flagship tier at high reasoning effort — the latest Claude Opus, or the current OpenAI flagship, or successors at that tier — unless the user overrides; premium/max tiers (Claude Fable, GPT-Pro-class) only on explicit user request. The verifier's task is correctness-critical (drift detection over certified content) and the editor's requires recognizing load-bearing nuance; neither is a place to economize below the plugin's floor.
