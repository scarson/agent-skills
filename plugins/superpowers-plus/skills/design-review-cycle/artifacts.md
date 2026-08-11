# design-review-cycle artifacts — templates

## Review ledger

**Location:** `reviews/` subdirectory beside the design doc, named by the doc's exact basename — a design at `docs/specs/2026-07-26-widget-design.md` gets `docs/specs/reviews/2026-07-26-widget-design.ledger.md`. Project conventions override. Raw round reports sit beside it as `reviews/<doc-basename>.round-N-<slug>.md`. Re-invocation appends a new run section; prior runs are never rewritten. Snapshots are git commits at tier 1; where the run is not committing, §Repo assumptions in `SKILL.md` governs each snapshot's form and location, and snapshot references name those copies.

**Baseline field.** At tier 1 the run header's baseline-snapshot SHA is unknowable when the ledger is first written — the ledger is *inside* the baseline commit — so write a placeholder at Phase 0 step 5 and fill the SHA immediately after the baseline commit lands (the header is mutable; this is its first update). At tiers 2 and 3 there is no baseline commit and no placeholder step: the runner chooses the baseline copy's path up front, so the field is filled when the header is written. The copy itself is still taken at Phase 0 step 5's point, after the ledger pointer line lands in the doc. Either way the field is never left holding a placeholder at closure, and never filled with a ref the run did not produce.

**Template:**

```markdown
# Review ledger — <doc basename>

## Run 1 — <YYYY-MM-DD>

### Run header (mutable — update at every phase transition)

- **Doc:** <path> · **baseline snapshot:** `<baseline ref — SHA, or copy path when not committing>`
- **Mode:** light | full — **surface fired:** <name | none> — **evidence:** <one line>
- **Requirements:** pinned (user-confirmed) | unpinned — <one line>
- **Current phase:** <0–6>
- **Rounds** (record written AT DISPATCH, completed at return):

| Round | Route (reviewer · slice · scope · shape · context · model+effort · prompts vN) | Snapshot | Roster | Status |
|---|---|---|---|---|
| 1 | Pilot — self-review (session), all lenses, whole doc | `<round-snapshot ref>` | runner | complete |
| 2 | <route line> | `<round-snapshot ref>` | <N agents / lens assignments> | dispatched → 3 of 6 returned |

- **Per-lens coverage** (one row per whole-doc round; cell = finding IDs or NSF):

| Round | requirements trace | unstated assumptions | alternatives & rationale | seams & contracts | failure modes | change & reversibility | downstream readiness | simplicity & proportionality |
|---|---|---|---|---|---|---|---|---|
| 1 | L1, L2 | NSF | L3 | NSF | L4 | NSF | NSF | NSF |

- **Gate:** not posed | posed <date> | partial (<IDs answered>) | answered
- **Closure:** cold reader — pending | clean @ `<ref echoed by that leg>` | dirty · verifier — pending | clean @ `<ref echoed by that leg — MUST match>` | dirty · live-vs-snapshot re-compare — pending | identical | differed → re-snapshotted at `<new ref>`
- Terminal state: completed | abort to brainstorming | stopped awaiting user — written as the last ledger edit at every terminal and carried by that terminal's single closing commit (§Completion). Anchor-stability: the run is open while this line is blank OR reads stopped awaiting user (that terminal resumes — the posed gate stays live); only completed and abort release anchors.

### Index (append-only rows; State cells edited in place)

| ID | Round | Lens(es) | Class | Disposition | State |
|---|---|---|---|---|---|
| L1 | 1 | requirements trace | genuine choice | confirmed | open |

### Detail — L1

- **Anchor:** <section heading> — "<short exact quote>"
- **Claim:** <what is wrong> · **Evidence:** <why>
- **Axes:** objective | contestable · remedy determinate | choice · records | repairs — **source** (documentary gaps only): session | doc | repo | git `<SHA>` | snapshot copy `<path>`
- **Source raw:** round-N-<slug>.md, local ID <Rn> (ledger IDs are the authoritative namespace; raw IDs are reviewer-local)
- **Action:** <intended action — WRITTEN BEFORE THE EDIT> · **taken:** <what landed> · **Before:** "<quote>" · **After:** "<quote>"
```

## Round table

Emit after **every** round, including no-change rounds, derived by counting ledger index rows — never from memory. Column identity, scoped to review rounds only (gate rows, closure rows, and phase-minted rows — the Phase 0 standing entry, a gate fold's reversion row — sit outside it, carrying the minting phase in their Index Round cell: `P0`, `G1`): **raised = substantive + other; substantive = fixed + escalated; open accumulates escalated and unfixed items and drains at gates.** Every dispatch route line carries model + effort and the prompts-version echo. Deviation rationales go in footnotes, not cells.

Full-mode worked example (balances — check yours the same way):

| Round | Route | Raised | Substantive | Fixed | Escalated | Other | Open |
|---|---|---|---|---|---|---|---|
| 1 | Pilot — self-review (session), all lenses, whole doc | 11 | 9 | 6 | 3 | 2 | 3 |
| 2 | Fan-out — 6 dispatched subagents (Opus, high), all lenses, whole doc, cold, prompts v3 | 13 | 9 | 5 | 4 | 4 | 7 |
| 3 | Probe — seam batch, dispatched subagent (Opus, high), ledger-briefed, elective, prompts v3 [^a] | 3 | 2 | 2 | 0 | 1 | 7 |
| 4 | Gate — 7 resolved (6 folded, 1 deferred by user) [^g] | — | — | — | — | — | 0 |
| 5 | Re-sweep — extent batch + seam batch (gate restructured other findings' storage material), fan-out (Opus, high), cold, prompts v3 | 2 | 1 | 1 | 0 | 1 | 0 |
| 6a | Closure cold reader — dispatched subagent (Opus, high), all lenses, whole doc, cold, prompts v3 @ `a1b2c3d` | 0 | 0 | — | — | — | 0 |
| 6b | Closure ledger verifier — dispatched subagent (Opus, high), every hunk + row, ledger-briefed, prompts v3 @ `a1b2c3d` | 0 | 0 | — | — | — | 0 |

[^a]: Probe rationale: rounds 1–2 findings concentrated at the store/pipeline seam; elective, counts toward nothing. [^g]: Gate basis: round 2 yielded 9, all dispositioned; probe added nothing new to the list.

Light-mode worked example:

| Round | Route | Raised | Substantive | Fixed | Escalated | Other | Open |
|---|---|---|---|---|---|---|---|
| 1 | Pilot — self-review (session), all lenses, whole doc | 7 | 5 | 4 | 1 | 2 | 1 |
| 2 | Independent — dispatched subagent (Opus, high), all lenses, whole doc, cold, prompts v3 | 6 | 4 | 3 | 1 | 2 | 2 |
| 3 | Self-review of fixes, all lenses, whole doc | 2 | 1 | 1 | 0 | 1 | 2 |
| 4 | Gate — 2 resolved (2 folded) [^g2] | — | — | — | — | — | 0 |
| 5 | No re-sweep — every restructured span implements its own finding's fix or fold [^r] | — | — | — | — | — | 0 |
| 6a | Closure cold reader — dispatched subagent (Opus, high), all lenses, whole doc, cold, prompts v3 @ `e4f5a6b` | 0 | 0 | — | — | — | 0 |
| 6b | Closure ledger verifier — dispatched subagent (Opus, high), every hunk + row, ledger-briefed, prompts v3 @ `e4f5a6b` | 0 | 0 | — | — | — | 0 |

[^g2]: Gate basis: round 3 yielded 1 substantive, fixed; list stable. [^r]: The re-sweep check runs after every gate; this is its explicit not-fired record.

## Closure checklist

Print and tick before declaring completed:

- [ ] Live document re-compared to the materialized closure snapshot after both legs returned — record the result, and where they differed, the fresh snapshot ref and the fact that both legs were re-run against it
- [ ] Both legs clean @ the **same closure-snapshot ref**, each transcribed from the opening of that leg's own raw report — never the Phase 0 baseline, never blank, never a ref invented to fill the field. (SHA at tier 1, copy path otherwise — §Repo assumptions.)
- [ ] Every ledger row terminally dispositioned (deferred-by-user items marked as open questions in the doc; a no-gate-remaining pin reversion carries its terminal record "unpinned at close; re-confirmation awaits the user")
- [ ] Every lens has findings or no-significant-findings in the final whole-doc round's coverage record
- [ ] *If a named surface fired:* cross-model obligation met, or degradation disclosed
- [ ] Re-sweep fired after each gate, or its not-fired record with the diff-based reason
- [ ] Round table current and ledger-derived; final table in the summary

Then, as the final act: commit — pathspec-limited to the doc, the ledger, and the raw reports — and report the SHA. Never ask whether to commit. Where the run is not committing (§Repo assumptions tiers 2 and 3), stage or leave in place per that tier, and report the baseline ref and the closure copy path in place of a SHA.
