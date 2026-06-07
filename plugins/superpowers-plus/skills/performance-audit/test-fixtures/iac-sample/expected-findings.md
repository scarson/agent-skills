# Expected Findings — IaC fixture (Terraform/OpenTofu)

**Purpose:** exercise the **IaC companion pack** + the **State & dependency-graph model** + the
`iac/terraform.md` module on a deliberately-inefficient Terraform root (`main.tf`) for a power-utility
data-platform account. This fixture is **config-shaped** (HCL), not application code — the lanes
exercised are the IaC-remapped ones (redundant re-planning / state & provider I/O / graph parallelism /
provider currency). Illustrative (not applied). The IaC pack is a *companion*; here it is the scope.

**Pack slice to provide:** `iac.md` lane slices + the **State & dependency-graph model** section +
`iac/terraform.md`. Do NOT let the agent read this rubric.

## Planted issues (should be found)

| # | Location | Lane / module | Issue |
|---|----------|---------------|-------|
| 1 | `aws_instance.worker` `count` | idiom-currency / terraform | **`count` over a variable-length list** → index-shift destroy/recreate when a middle element changes; use `for_each` keyed by a stable id |
| 2 | `module.monitoring` `depends_on` | concurrency / terraform | **module-level `depends_on`** gates every resource in the module behind the entire `security` module → collapses graph parallelism |
| 3 | `data.aws_ami.app` `most_recent` | data-access / terraform | **`most_recent = true` live AMI lookup** re-queried every plan (provider round-trip + churn); pin a specific id |
| 4 | `data.terraform_remote_state.network` | data-access / terraform | **`terraform_remote_state` chain** read on every plan — couples lifecycles + backend round-trip; prefer a published output / SSM |
| 5 | `aws_instance.worker` `depends_on` | concurrency / terraform | **redundant explicit `depends_on`** on a resource already referenced via `vpc_security_group_ids` → pure serialization |

*(Structural backdrop, creditable if raised: the single monolithic `backend "s3"` state means every plan
refreshes the whole account — the dominant real-world lever. A run that flags the monolithic-state /
state-split point is finding the highest-value issue, not padding.)*

## Beyond-the-pack (floor-not-ceiling — bonus, not a recall requirement)

| Location | Issue | Why it's beyond the pack |
|----------|-------|--------------------------|
| `null_resource.publish` `triggers` | `triggers = { always_run = timestamp() }` makes the resource **recreate on every apply** (and re-run the `local-exec`), because `timestamp()` returns a new value each plan | No loaded bullet names the **`timestamp()`/`uuid()`-in-triggers perpetual-diff** footgun — the pack names `count`/`for_each`, `depends_on`, data sources, remote-state, `-parallelism`, but not this. The agent must reason that an always-changing input forces a perpetual diff → per-apply churn (wasted work every run, plus the provisioner side-effects). Finding it rewards out-reasoning; missing it is not a recall miss, but consistent misses ⇒ checklist-drift. |

## Decoy (should NOT be flagged)

| Location | Why it must be ignored |
|----------|------------------------|
| `aws_iam_role_policy_attachment.app` `depends_on` | unlike #5, this `depends_on` **is load-bearing** — the instance profile must exist first and **no attribute reference links them**, so the explicit edge is the only thing expressing a genuine hidden ordering. The terraform module says to *reserve* `depends_on` for exactly this. Flagging it as "redundant serialization" is a precision/checklist failure (the agent must distinguish it from #5, which *is* redundant). |

## Honeypot (boundary test for bug-no-chase)

| Location | Issue | Perf-related? | Expected handling |
|----------|-------|---------------|-------------------|
| `aws_security_group.app` ingress (HONEYPOT B) | SSH (port 22) open to `0.0.0.0/0` | **No** | **Do NOT report as a perf finding** and do NOT chase; record to Suspected Bugs if noticed (a security/correctness defect, not a tooling-performance cost) |

*(No perf-pursue honeypot (an "A") here: IaC config doesn't naturally exhibit the defeated-cache /
bug-IS-the-slowness pattern that app-code fixtures use. That's an honest shape limitation, not a gap —
the `timestamp()` beyond-the-pack already exercises perpetual-diff reasoning.)*

## Scoring

- **Recall** = (# of {1..5} found) / 5. #1 should name `for_each`; #2 should name module-level scope;
  #5 must be distinguished from the decoy (both are `depends_on`, only #5 is redundant).
- **Precision** = the `aws_iam_role_policy_attachment` decoy not flagged (or explicitly kept on
  genuine-hidden-ordering grounds); zero fabricated findings.
- **Beyond-the-pack** = the `timestamp()`-in-`triggers` perpetual-recreate flagged → bonus signal the
  agent reasons about always-changing inputs rather than walking the bullet list.
- **Honeypot** = the open-SSH rule not reported as perf and not chased (record-and-move-on if noticed).

## How to run

Dispatch lane subagents (algorithmic, data-access, concurrency — and idiom-currency offline at LOW
confidence) with the shared preamble + that lane body from `../../lane-prompts.md`, the `iac.md` lane
slice + **State & dependency-graph model** + the `terraform` module, and this directory as scope.
Collect findings; score against the tables above. Do not let the subagent read this file.

## Last run

**2026-06-05, Sonnet (4 lanes: algorithmic / data-access / concurrency / idiom-currency) — GREEN.**
Recall **5/5** (every planted issue found by all four lanes). The **beyond-the-pack (`timestamp()`-in-
`triggers` perpetual-recreate) was found by all four lanes — with NO nudge in the prompts**, a clean blind
result (each reasoned that `timestamp()` returns a new value every plan → per-apply churn). The
`aws_iam_role_policy_attachment` **decoy was explicitly examined and rejected** by the concurrency lane on
genuine-hidden-ordering grounds (no attribute link). The open-SSH **honeypot** was recorded to Suspected
Bugs as "security/correctness, not a performance problem" by every lane, not chased. **Valid extra:** the
data-access lane surfaced the **monolithic-state full-estate-refresh** backdrop as the highest-leverage I/O
problem — the dominant real-world lever. **Zero fabrications.** The run validates the IaC companion pattern
end-to-end: the ops-remapped lanes + the **State & dependency-graph model** drove correct findings, the
`count`-vs-`for_each` churn was framed as recreate-cost, and the tooling-vs-runtime scope boundary held (no
lane drifted into auditing instance types / SG rules as *performance*).
