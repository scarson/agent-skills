---
name: handoff
description: Use when context is about to be lost — approaching auto-compaction, ending a long session, wrapping a multi-agent coordination cycle, before dispatching a follow-up agent who won't share hot context, or when the user asks for a "handoff" / "checkpoint" / "where are we" / "session summary" / "what's left".
---

# Handoff

## Terminology

<!-- approved-block: rfc2119-terminology v1 — authoritative copy: ../../approved-blocks.md -->
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
<!-- /approved-block: rfc2119-terminology -->

## Overview

Context built during a substantial work session costs hours of agent time to reconstruct; writing it down costs minutes. A handoff is the act of capturing that context into durable artifacts BEFORE it evaporates — compaction, session end, fresh-agent dispatch, whatever triggers the loss.

**Core principles (two asymmetries):**

1. **Cheap to document, expensive-to-impossible to reconstruct.** Hot context is a non-renewable resource. Anything worth putting in a status report to the user is worth putting in a durable artifact first — a handoff doc, a living plan, a coordination log, a pitfalls entry, an outstanding-items doc. The status report to the user is ephemeral; the artifact is persistent. Write the artifact; let the status report reference it.

2. **Review is cheap, mistakes in handoffs are expensive.** A review round that finds nothing costs ~10 minutes of agent time. A handoff that ships with an undocumented seam, a stale plan banner, or a missing follow-up can cost downstream readers 30+ minutes each to reconstruct, multiplied across every future dispatch that touches the gap. The asymmetry favors more review, not less. Err on the side of an extra round when any doubt exists.

## When to use

- Session is approaching auto-compaction (high context usage)
- Ending any session that produced non-trivial state (decisions, discoveries, in-flight work)
- Wrapping a multi-agent coordination cycle — plans shipped, PRs opened, follow-ups queued
- Before dispatching a follow-up agent whose context will not include yours
- Human partner asks for a "handoff", "checkpoint", "where are we", "session summary", "what's left"
- Noticing that state is split across status reports, PR notes, and the session transcript but not fully in any one durable place

## Core discipline

A handoff MUST do seven things. Skipping any of the first five degrades the handoff into a status report; skipping the sixth strands the finished prompt inside a file the human partner has to open and re-extract by hand; skipping the seventh ships state the next agent reads as current when it is not.

1. **Mine hot context at lossless detail.** The handoff author MUST make multiple passes through the session's recent work, explicitly fighting recency bias. Mid-session decisions, seams in half-shipped work, and "little follow-up to-dos" are the items that get lost — the items a status report would skim but a future agent will need.

2. **Update every living artifact that is now stale.** Plans, design docs, coord logs, outstanding-items, pitfalls, skill files — any file that described state accurately BEFORE the session and no longer does MUST be updated to match reality. State MUST NOT live only in PR notes or status reports.

3. **Create artifacts that don't exist yet but should.** A new followups doc, a new pitfall entry, a new design-decision record, a new parked-ideas entry — if the session produced durable material that no existing artifact covers, the handoff author MUST create the artifact rather than leaving the material in the handoff doc alone.

4. **Identify seams.** Anywhere two pieces of work meet — a PR that was merged while another was rebasing, a deferred task whose upstream just shipped, a merge race between concurrent branches — MUST be explicitly documented. Seams are where context is silently lost between agents.

5. **Cover at least 6 adversarial perspectives on the handoff itself.** Five canonical perspectives plus at least one session-specific perspective the agent chooses based on what actually happened this session. Every one of the six gets applied. See §Adversarial review below for how many rounds follow. One-pass handoffs miss seams; review from several distinct perspectives catches them.

6. **Emit the continuation prompt into the session, verbatim, in a copyable code block.** The handoff doc remains the authoritative artifact, but the continuation prompt is the one part a human partner acts on immediately — usually by pasting it into a fresh agent. It MUST appear in the session text, not only in the doc. See §Phase 5 below.

7. **Write volatile state as readings, and open the continuation prompt with a grounding step.** Anything the doc asserts that can change without the doc changing — branch, tip, PR state, live jobs, deploys — is stamped with when it was observed and written in past tense, never as present-tense fact. The prompt's step 0 tells the successor to re-ground before acting. The handoff is frozen the moment it is written; the world it describes is not. See §Volatile state and §Phase 5.

## Process

### Phase 1: Mine hot context

Multiple explicit passes. Do not rely on a single scan.

**Pass 1 — Recent decisions.** What decisions were made in the last hour of this session? Who made them, what was the rationale, what alternatives were considered?

**Pass 2 — Mid-session (combat recency bias).** Scroll further back. What decisions were made 2-6 hours ago that haven't been referenced recently? These are the ones most likely to be lost.

**Pass 3 — Little follow-up to-dos.** "Oh, and I should also..." items. "Worth capturing as a pitfall later." "Defer to a follow-up cycle." If you can remember saying it but don't see it in a committed artifact, it's a candidate.

**Pass 4 — Seams between work units.** Where did one track hand off to another? Where did a merge race happen? Where did a gate open or close? Where did an agent's assumption turn out wrong?

**Pass 5 — What a naive agent would need.** Read your own state from the perspective of a fresh agent who has none of your context. What glossary terms do they need? What file paths? What status at what commit? What's the next logical action and why?

Each pass SHOULD produce items. If a pass produces zero, you aren't looking hard enough — scan again with a different lens.

### Phase 2: Route to artifacts (not just the handoff doc)

Everything mined in Phase 1 goes somewhere durable. The handoff doc is ONE destination, not the only one. Route each item:

| Kind of content | Goes to |
|---|---|
| State that updates an existing plan (phase shipped, deferred, scope edited) | Plan's per-phase Execution Status banners + top-of-plan summary |
| Cross-agent coordination state (what shipped, merge SHAs, who owns what) | Project's coordination log (CHANGELOG, a dedicated coord-log doc, a section of a status doc — whatever the project uses) |
| Speculative thinking worth preserving but not committing to | Project's parked-ideas or backlog location |
| Newly-learned traps (implementation or testing pitfalls) | Project's known-issues / pitfalls / gotchas doc |
| Methodology insights worth codifying | Skill files (or a queue of skill-update candidates) |
| Everything else — session arc, priority queue, in-flight state, next actions | The handoff doc itself |

Routing correctly keeps the handoff doc focused. A handoff doc that duplicates content living in the plan is noise; a handoff doc that POINTS at the plan and summarizes status is signal.

### Phase 3: Write

Write in this order:

1. Run the checks that produce this session's volatile-state observations, before writing any of them down. Everything in the next step and in the manifest is transcribed from what those checks returned.
2. Update living artifacts first (plans, coord log, outstanding-items, pitfalls).
3. Create any new artifacts identified in Phase 2.
4. Write the handoff doc LAST, referencing the updated artifacts rather than duplicating their content.

The handoff doc structure SHOULD include:

- **Headline state** — branch, tip SHA, pushed?, worktrees live, PRs open where the session has them; outside a repo, whatever plays the same role (running jobs, deployed environments, scratch paths that get cleaned, external tickets). Every claim here is volatile; write the whole block under §Volatile state below. It decays fastest and it is what a fresh agent acts on first.
- **What shipped this session** — concrete artifact pointers, not narrative
- **In-flight work** — what's running, where, under whose ownership
- **Ready-to-dispatch** — queued work with prerequisites and where the prerequisites land
- **Not yet started** — items that have been scoped but not worked
- **Deferred items** — each with a semantic description of what needs to happen before the item is pickable + a link to the likely-unblocker artifact (its plan page, its task, its PR — whichever is authoritative per the project's Living Document Contract conventions). Prose condition + link is durable across paraphrases and scope edits; exact-string coordination across multiple agents is not.
- **Operational guardrails accumulated this session** — so a fresh agent doesn't re-discover them
- **Priority queue** — numbered, with dependencies
- **Continuation prompt** — paste-ready prompt for a fresh agent resuming the work, written inside a fenced code block so it can be copied out of the doc in one action without dragging surrounding prose along. This same prompt is also emitted into the session in Phase 5.

#### Volatile state — write it as a reading, not a fact

A handoff is frozen at the moment it is written; the world it describes is not. **Volatile means anything the doc asserts that can change without the doc changing.** Git and forge state is the dominant instance — current branch, tip SHA, pushed?, PR open / merged / closed, live worktrees, CI — but it is an instance, not the definition: a running or queued job, a deployed environment, a scratch path that gets cleaned up, an external ticket or shared doc someone else edits are all volatile on the same terms, and a handoff written outside a repo still carries plenty of them. What is durable is the reasoning: decisions, rationale, seams, deferral conditions, guardrails. The rules below attach to the volatile class wherever it appears (headline state, in-flight work, ready-to-dispatch, and deferred items all carry it), and they MUST NOT be generalized into blanket distrust of the doc — the durable content is the reason the handoff exists.

Handoffs get written at the end of a cycle, when work is queued to land — often minutes before a merge — so volatile claims are recorded at the moment of highest impending change, and a wrong belief about git state makes a successor act, not merely misunderstand.

- **Stamp it with an observation you actually made.** Transcribe every volatile block from a check you ran this session or output you read — a CI page, a dashboard, a command's result — never from memory. Stamp once per observation block, not once per line: UTC time always, plus the tip SHA where the session has one, so a handoff written outside a repo stamps the time and says nothing about SHAs. Where a SHA exists it is the tip of the work being handed off, never the handoff commit's own.
- **Never fabricate an unsatisfiable field.** Where a stamp, SHA, PR number, or check does not exist for this session, drop it and say so in one line — never fill it with a plausible-looking value to satisfy the rule. A requirement that cannot be met honestly in a supported scenario is a prompt to invent, and an invented SHA is worse than an absent one: it makes the handoff look anchored while the reader's first command fails against a commit that never existed.
- **Write it in observational past tense.** `As of <sha> / <UTC>, PR #123 was open` — never `PR #123 IS NOT MERGED`. Assertive present tense, and emphatic capitals especially, read as ground truth and survive skimming intact; an as-of reading reads as a measurement, which is what it is.
- **Resolve every actionable outcome wherever an action depends on the state.** Four rules, in order:
  - **Where.** Only at queued or deferred items whose next step differs by what the state turns out to be. Resolving every volatile claim is unbounded and produces branches written for their own sake.
  - **Placement.** At the item, where the reader acts — never at the claim. Step 0 carries the same cautions, but step 0 is read once at the top and the action is read at the item.
  - **How many branches.** Every outcome the state can actually take. A PR is open, merged, or closed-without-merge; a default two strands the reader on the third.
  - **The closed-unmerged branch routes through a contents check**, never straight to re-creating the work. Commits that were cherry-picked, applied by hand, or superseded land while their PR still reads closed-unmerged, so "closed unmerged → re-create it" walks a successor into the failure this section exists to prevent.

  Example: `If #123 merged, phases 1-3 are landed — start at phase 4. If still open, the next action is <X>. If closed unmerged, confirm the change is actually absent from <target branch> before re-creating anything, then <Y>.`

### Phase 4: Adversarial review (six perspectives minimum; repeat while yielding)

A single-pass handoff author has blind spots the author cannot see. Five canonical perspectives plus one session-specific perspective find them.

Run these rounds sequentially, documenting findings at each:

**Round 1 — Naive fresh agent.** Would someone starting from zero context understand what to do? Where are the undefined jargon terms, assumed-context references, or missing glossary entries? Fix every instance.

**Round 2 — Recency-bias audit.** Re-read with the assumption that recent items are over-represented. What mid-session items are under-documented? What hot-context decisions haven't made it into the handoff? Add them.

**Round 3 — Seam auditor.** Where do two work units meet? Is the meeting point documented clearly enough that neither side's fresh-agent successor will be surprised? Look at: merge races, upstream-shipped-downstream-still-waiting transitions, cross-agent coord-log entries, rebases that absorbed changes from other branches, deferred-work references that depend on another agent's progress.

**Round 4 — Operational guardrails auditor.** What operational rules did this session establish or reinforce? Commit discipline, branch rules, merge patterns, dispatch conventions. Are they in a durable place (CLAUDE.md, skill files, pitfalls) or did they only live in the session transcript? If the latter, persist them.

**Round 5 — Loss-averse auditor.** What would a loss of hot context destroy that the handoff doesn't yet capture? What "oh by the way" items are still only in the transcript? Scan explicitly for the phrase "worth capturing later" or similar in-session markers.

**Round 6 — Session-specific perspective (agent-chosen).** The canonical rounds 1-5 cover known-in-general failure modes. This session has its own character — security-heavy, perf-critical, cross-platform, methodology-novel, tooling-pioneering, something else — and that character has its own failure modes the canonical rounds won't catch. The agent MUST choose a perspective specifically relevant to what actually happened this session and review from it.

Requirements for the Round 6 perspective choice:

- MUST be a perspective not already covered by rounds 1-5. Don't repeat "seam auditor" with a different label.
- MUST be specifically relevant to THIS session — grounded in the session's content, not a generic auditor template. If the session shipped auth code, "security auditor" is legitimate; if the session was pure docs, it isn't.
- MUST be named and described explicitly in the handoff under a heading like `### Round 6 — [chosen perspective] — [N findings applied]` so future readers can see the reasoning.
- SHOULD be concrete enough to produce findings. "General quality pass" is too vague; "cross-platform failure modes I haven't tested on Linux yet" is actionable.

If the agent genuinely cannot identify a session-specific perspective after trying, that itself is a finding — document "Round 6: no session-specific perspective identified; session content matches canonical rounds 1-5 adequately" with a one-sentence justification. Rare; default to finding one.

**Additional rounds (7+) — driven by yield, not by count.** Six perspectives is the coverage floor, not a repetition quota. If the agent identifies an additional perspective that might catch issues rounds 1-6 didn't, the agent MAY (and often SHOULD) run it. Review is cheap; a handoff mistake ships downstream reconstruction cost that compounds. Err toward an extra round while rounds are still producing material findings — and stop when one produces none. A round run to reach a number, after findings have stopped, manufactures them, and a manufactured finding is the same defect as a suppressed one: both stop the review from tracking the handoff.

Rules for additional rounds:

- Each additional round MUST be named + described explicitly like Round 6 — a stated lens that does work. The lens MAY be high-level (e.g., "read top-to-bottom with fresh eyes for overall coherence and framing") if the canonical rounds focused on specific angles and a holistic pass might catch structural issues. What makes a round legitimate is a stated lens, not a specific level of abstraction.
- Rounds MUST NOT be re-labeled duplicates of rounds already run. A Round 7 that's actually Round 3 with a different name doesn't count. Non-redundancy is the bar.

Sessions that often reward extra rounds beyond the floor: multi-stream or multi-agent coordination cycles, security-sensitive work, technically complex work that crosses multiple layers or runtimes, handoffs into an agent that will operate with significantly reduced tooling or permissions than the current session, or any session where the agent has a nagging sense that something's still off.

**Loop rule (applies to ALL rounds — canonical + additional).** When a round produces material findings, the agent MUST re-run the rounds whose subject matter the resulting fixes touched — a fix to a deferred item's unblock condition re-opens the seam auditor; a rewritten continuation prompt re-opens the naive-fresh-agent round. Then, before declaring the handoff complete, run one full pass through every round. Exit when that full pass produces zero material findings. Re-running every round after every finding is the expensive tail and rarely earns its keep; one targeted re-run plus one clean full sweep catches the same regressions, and the sweep is what proves it.

### Phase 5: Emit the continuation prompt into the session

Review can rewrite the continuation prompt, so this phase runs after Phase 4 has settled — never before. Emitting early ships a prompt the review rounds then invalidate.

The closing status report to the human partner ends with the continuation prompt reproduced in the session text. That block:

- **Is the same text as the handoff doc's continuation prompt, character for character.** Whatever survived Phase 4 is what gets emitted. The doc stays authoritative; the session block is a copy of it, not a summary of it, not a shortened variant, and not a pointer to go read it.
- **Sits inside a fenced code block**, so the human partner copies it in one action with no editing afterward. If the prompt itself contains fenced code, wrap it in a longer fence (four or more backticks) so the inner fences survive.
- **Is preceded by one line naming the handoff doc's path**, so the reader knows where the durable copy lives and what the block came from.
- **Is the last thing in the report.** It's what the reader acts on; nothing goes below it.
- **Opens with the grounding step**, as the prompt's step 0, fitted to this session from the shape below. Fitting happens once, before either copy exists; the character-for-character rule above then binds the two emitted copies to each other, not either of them to the shape. The prompt is what a fresh agent consumes — paste-ready, stripped of the doc's surrounding prose — so it is where the volatile claims travel and where the correction has to travel with them. A project-level convention would not travel: the prompt routinely gets pasted into a different repo, project, or tool than the one whose conventions the author had in mind.

**The grounding step.** Everything inside the fence is successor-facing and goes into the prompt. The authoring rules follow it; nothing in the fence is a note to yourself.

```
0. Ground yourself before doing anything else. The state described below was
   observed at <UTC time>, except where an entry below says otherwise. The
   world may have moved since — finding that it did is the normal case, not an
   anomaly.

   Answer these before acting on anything below, using whatever commands your
   environment provides. An error or an empty result is information, not a
   malfunction: a missing remote branch usually means it merged and was deleted.
   - Per repository listed: what is checked out, is the working tree clean,
     what is the tip, is the handed-off commit on a remote, do the named
     branches and worktrees still exist?
   - Per PR listed: open, merged, or closed-unmerged; merged as what commit;
     what do its checks say?
   - Per other live thing listed — a deploy, a job, a ticket: still as described?

   Two things those answers do NOT settle, both failing toward redoing shipped
   work:
   - A squash or rebase merge rewrites the commit, so the handed-off tip is not
     an ancestor of the target branch even when the work shipped. Absence from
     the target branch is not absence of the work.
   - A PR's state is authoritative only for whether THAT PR merged. Work whose
     commits were cherry-picked, applied by hand, or superseded lands while its
     PR reads closed-unmerged. When PR state and the target branch's contents
     disagree, the contents win — confirm a change is really absent before
     re-creating anything.

   Then reconcile: where this document and live state disagree about anything
   volatile, live state is right and this document is stale. Everything else
   here — decisions, rationale, seams, deferral conditions — still stands.
   State having moved usually means work described as pending has already
   landed; that is not a reason to redo it. If it moved in a way this document
   does not account for — unfamiliar commits, a force-push, someone else's work
   in flight — stop and ask rather than improvising a reconciliation.

   What to check, and what it looked like when observed:
   <the manifest — see below>
```

**The manifest is what you substitute, not commands.** One line per volatile thing the handoff names, carrying the identifiers a check needs and the state observed:

```
repo   <absolute path>  (clone <url>)  branch <name>  tip <sha>  — clean, pushed
PR     <N> in <project/repo on this forge>            — open, checks green
deploy <environment/service>                          — <build> live since <time>
job    <identifier + where it runs>                   — <state> @ <time>; successor cannot re-verify (no access)
ticket <id + system>                                  — UNVERIFIED (no credentials this session)
```

Identifiers survive travel; commands do not. Drop a line only when the handoff claims nothing of that kind — a *negative* claim is still a claim, so "no live worktrees" stays on the list, because another agent may have created one since. Where nothing at all is checkable, the manifest says exactly that in one line rather than disappearing, so a reader can tell "nothing to verify" from "verification was skipped."

**Every entry carries what you actually observed, transcribed from a check you ran or read — never recalled.** Two independent things can be true of an entry, so do not collapse them into one slot:

- **Observed, but re-checking needs access you cannot assume they have** — a credentialed dashboard, a host behind a VPN. Record the observation *and* name what a re-check requires: `build 481 live since 14:20; re-check needs deploy-dashboard credentials`. Phrase it as a property of the resource, never as a prediction about the reader, and never drop the reading.
- **Never observed at all** — you could not reach it either. `UNVERIFIED (<reason>)`, with the reason saying why: `no forge CLI in this sandbox`, `dashboard needs credentials this session lacks`.

Never invent an observation, and never drop a claim to avoid the gap. Recollection counts as fabrication here: it passes as an observation unless you hold the line at transcribed-from-a-check.

**Worked example — GitHub and git, to adapt, not to copy.** This is one instantiation of the questions above. The commands are illustrative: write the ones your project's forge and shell actually take. If you choose to carry commands into a fitted step 0 rather than leaving the successor to write their own, keep each on its own line and free of `&&` and trailing-backslash continuations, which break in Windows PowerShell — commands that ship have to survive a paste into a shell you did not pick.

```
cd <repo root>
git fetch --all --prune
git status -sb
git log --oneline -5
git branch -r --contains <tip sha>     # is this exact commit on a remote?
git ls-remote <push remote> <branch>   # empty = branch gone, usually merged
git worktree list
gh pr view <N> --repo <owner/name> --json state,mergedAt,mergeCommit,statusCheckRollup
```

Azure DevOps uses `az repos pr show`, GitLab `glab mr view`; any of them works if it answers the three PR questions. Forge queries need no checkout — qualify them to the repository and they run from anywhere, including a session with no clone at all.

**Run your checks in Phase 3; confirm in Phase 5.** The Phase 3 run produces the observations the manifest records. After Phase 4 settles, glance at them once more. If something moved, update the affected entries and items and treat it as a finding under the loop rule: re-run the rounds those fixes touch, then the full pass. Glance once and do not chase perfect freshness — the manifest records an observation, not a guarantee, and step 0 covers the gap between the last observation and the successor's first action.

**What the fence protects.** Step 0 is never optional and always comes first.

**Four rules hold in every handoff**, whatever it hands off: live state beats the document; divergence this document does not account for stops and asks rather than improvising; state having moved usually means pending work already landed, which is not a reason to redo it; and an error or empty result from a check is information, not a malfunction. The third is the anti-redo default — the only one still standing in a handoff with no repository, once the two cautions below drop out.

**Two more hold wherever the session hands off repository or PR state, and MUST appear together:** absence from the target branch is not absence of the work; and a PR's state settles only whether that PR merged, so when it disagrees with the target branch's contents, the contents win.

Everything else — which repositories, which questions apply, which commands answer them — fits the session.

This applies to every handoff — including ones where no fresh agent is being dispatched yet, ones where the human partner is ending the session, and ones where the handoff doc is committed and pushed. Whether the prompt gets used is the human partner's call to make; having it in front of them is what makes that call cheap.

Emitting the prompt in chat does not substitute for any part of Phases 1-4. It is the delivery step for work already done, not a shortcut around doing it.

## Red flags (STOP)

These mean the handoff is not yet complete:

- "The PR notes cover it" — PR notes disappear from context for anyone not looking at that specific PR. Move it to the handoff or plan.
- "I'll add it if someone asks" — They won't ask; they'll reconstruct wrong.
- "The commit messages have it" — Commit messages rot into archaeology. Not a substitute.
- "The user already saw this in chat" — User context is also ephemeral. Not a substitute.
- "The plan is accurate enough" — Run the per-phase banner check. If any phase shipped or deferred without its banner being updated, the plan is not accurate enough.
- "Only the headlines matter" — The "little follow-up to-dos" are precisely what gets lost. Headlines aren't enough.
- "One pass is fine" — Single-pass handoffs miss seams. Apply all six perspectives, including the session-specific one.
- "The canonical rounds covered everything" — They cover known-in-general failure modes, not this session's specific character. Round 6 exists because sessions differ.
- "I'll capture it at the end" — By the end you've forgotten the mid-session discoveries. Capture as you go or re-mine hot context in Phase 1.
- "The continuation prompt is in the doc, they can open it" — Opening a file, finding the section, and selecting the right span is friction on the one step the human partner takes most often. Reproduce it in the session.
- "I'll describe the next steps instead of pasting the prompt" — A description isn't paste-ready. The prompt goes in the session verbatim, in a code block.
- "The PR state was accurate when I committed it" — And false ten minutes later, because the handoff is usually the last act before the merge. Write-time accuracy isn't the bar; a reader who can't tell a frozen reading from a current fact is the defect. Stamp it, write it in observational past tense, and resolve the outcomes wherever an action depends on the answer.

## Common rationalizations (rebuttals)

| Rationalization | Reality |
|---|---|
| "The handoff is getting long" | Length is not the problem; missing content is. A handoff that captures everything beats one that loses a deferral condition or coordination seam, regardless of line count. Multi-hour sessions routinely produce handoffs well over 1,000 lines — that's fine when each line is earning its place. Trim only when content is redundant, never because the doc "feels big." The converse holds too: "each line earning its place" is the actual bar, so cover the substance and don't pad with filler sections, restated summaries, or boilerplate scaffolding. Rank what you write by value, not by count — lead with the state and decisions a fresh agent acts on first, and let the long tail of minor items sit below as a referenced list rather than the headline. |
| "This is my final session anyway" | Other agents read handoffs too. And future-you is a different agent. |
| "I'll just tell the next agent verbally" | You won't be there. The next agent will start cold. |
| "Review rounds slow me down" | They do. They also catch seams that cost hours to reconstruct later. ~10 min of review beats 30+ min of downstream archaeology — the asymmetry is ~3x and compounds. |
| "Status report to the user IS the handoff" | No. The user's chat context is ephemeral. Durable artifacts are the handoff. The status report references them — and reproduces exactly one thing verbatim, the continuation prompt, because that's the piece the human partner acts on rather than reads. |
| "Pasting the full prompt in chat duplicates the doc" | Deliberately. The doc is the durable copy; the session block is the copyable one. This is the one place duplication is correct, because the two copies are produced at the same instant and the chat copy is discarded with the session — there's no window for them to drift. |
| "The prompt is long, I'll trim it for chat" | A trimmed prompt is a different prompt, and it's the one that gets pasted. Emit what Phase 4 signed off on. |
| "I already updated the plan" | Did you update ALL the plans that this session touched? Coord log? Outstanding-items? Pitfalls? Usually at least one is missed. |
| "The next agent can check git themselves" | They can, and they won't — a confident declarative sentence in a handoff doesn't present itself as a question worth verifying. That's why step 0 names the specific things to check and what each looked like when observed, rather than offering a caveat the reader has to decide to act on. |

## Checklist

Before declaring the handoff complete, verify:

- [ ] Phase 1 mining pass produced items at each of the 5 lenses (recent, mid-session, little follow-ups, seams, naive-agent)
- [ ] Every living artifact this session touched has been updated to match current reality
- [ ] Any new durable artifact that should exist (but didn't) has been created
- [ ] Each deferred item has a prose description of its unblock condition + a link to the likely-unblocker artifact (plan, task, PR). No exact-string gate-key coordination — semantic description + live link is resilient to paraphrase and scope change; exact strings break on either.
- [ ] The handoff doc points at updated artifacts rather than duplicating their content
- [ ] The continuation prompt is paste-ready and self-contained, and lives in a fenced code block inside the handoff doc
- [ ] The continuation prompt is reproduced verbatim in a fenced code block at the end of the closing session report, preceded by the handoff doc's path — emitted after Phase 4 review settled, not before
- [ ] Every volatile claim, wherever it appears, is written in observational past tense and stamped once per observation block (UTC always, SHA where one exists) — transcribed from a check run this session, never recalled; every actionable outcome is resolved at the queued item whose next step depends on it
- [ ] Step 0 comes first and carries all four universal rules (live state wins; unaccounted divergence stops and asks; moved state usually means work landed, not a reason to redo it; an error or empty result is information), **both** landed-work cautions wherever repo or PR state is handed off, the questions, and the manifest — no authoring notes inside the fence, no forge, shell, or OS assumed
- [ ] The manifest has one entry per volatile thing named, negative claims included, each carrying an observation made this session, `re-check needs <access>` where re-checking needs access the reader may lack, or bare `UNVERIFIED (<reason>)` where it was never observed — never an invented value, never a claim dropped to close the gap
- [ ] All 6 adversarial perspectives applied (5 canonical + at least 1 agent-chosen session-specific; further rounds run while they were still yielding); the final full pass through every round run produced zero material findings
- [ ] Every session-specific round (Round 6 and any 7+ the agent elected to run) is documented by name in the handoff with its findings count; perspective choices are specific to this session's content, not generic templates or re-labels of canonical rounds
- [ ] The handoff is committed to a durable location (not just a chat message)

## Social proof (pattern observation, not a measured study)

The observations below are recurring patterns from multi-session coordination work, not a controlled comparison — read them at that strength.

Observed across multi-session coordination cycles: handoffs written with per-phase plan banners + deferred-item prose conditions + route-to-the-right-artifact discipline reduce downstream dispatch prompts from lengthy "figure out what's done" archaeology sessions to short pointers ("see plan.md Phase N banner — upstream condition now holds — execute"). The cost asymmetry favors upstream documentation heavily and compounds across every subsequent dispatch that consumes the handoff.

Handoffs written without that discipline create the opposite: state scattered across PR notes, commit messages, and session transcripts, with each downstream agent paying the reconstruction cost anew. The compounding works both directions.

## Related conventions

- **Plan banner format.** When Phase 2 routing updates a plan that follows a Living Document Contract (per-phase ✅/🚧/⏸/⬜ Execution Status banners plus a top-of-plan summary table), the handoff author MUST preserve that format when writing new banner content. If the project uses `/writing-plans-enhanced` or an equivalent convention for plan structure, that convention governs the shape of plan updates made during handoff; this skill does not redefine it.

- **Canonical coordination log.** Each project SHOULD designate ONE location for cross-agent coordination state (CHANGELOG, a dedicated coord-log doc, a section of a status doc — whatever the project uses). Phase 2 routing sends cross-agent state there. Handoffs that route to whichever location is canonical for the project stay greppable; handoffs that invent new locations fragment the record.

## The bottom line

The handoff is the session's proof of work for the next agent. Hot context costs hours to build and minutes to preserve. Mine lossy, route everywhere it belongs, update what's stale, review adversarially, commit — then put the continuation prompt in your partner's hands, in the session, ready to paste.

If a future agent reconstructs state you already knew, the handoff failed. If they resume in 2 minutes instead of 30, it succeeded.
