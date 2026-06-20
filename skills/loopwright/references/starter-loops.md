# Accessibility First UI Loop

Improves UI through accessibility checks before visual polish is considered complete.

```text
Use the Accessibility First UI Loop for [ui_scope, user_tasks, accessibility_standard].

First define the task boundary, success criteria, allowed actions, required evidence, risk level, and budget. Work in bounded iterations. In each iteration:
- List core user tasks and the elements required to complete them with keyboard, screen reader, and pointer.
- Audit semantics, focus order, labels, contrast, target size, errors, and responsive behavior.
- Fix the most blocking accessibility issue first, then verify it with automated and manual checks.
- Repeat until no task-blocking accessibility issue remains in scope.
- Document any remaining non-blocking issues and owners.

Quality gates before completion:
- keyboard path works
- labels and roles are meaningful
- focus is visible
- contrast acceptable
- errors are announced

Stop when one of these is true:
- core tasks pass accessibility gates
- design decision blocks fix
- budget ends

Finish with:
- audit findings
- before-after screenshots
- manual test notes
- automated check output

Escalate for human approval before: shipping with task-blocking accessibility issue, changing design system tokens.
```

# Answer First Page Refresh Loop

Refreshes pages so humans and AI answer engines can extract clear, cited, current answers.

```text
Use the Answer First Page Refresh Loop for [page, target_queries, source_policy].

First define the task boundary, success criteria, allowed actions, required evidence, risk level, and budget. Work in bounded iterations. In each iteration:
- List target queries and the exact answer each page should provide in the first useful section.
- Check crawlability, indexability, title intent, internal links, schema, freshness, and source support.
- Rewrite the page to answer first, then explain, then show steps or examples.
- Add citations or primary-source links for factual claims and remove unsupported filler.
- Rerun the same query and page checks to verify no high-impact gap remains.

Quality gates before completion:
- answer appears early
- sources support factual claims
- title and headings match intent
- internal links help next action
- crawl checks pass

Stop when one of these is true:
- priority queries map to answer-ready pages
- source material missing
- budget ends

Finish with:
- query map
- before-after page diff
- crawl or lint output
- remaining gaps

Escalate for human approval before: making legal, medical, or financial claims, changing brand positioning.
```

# API Contract Compatibility Loop

Protects public APIs by testing backward compatibility, error contracts, and documentation before changes land.

```text
Use the API Contract Compatibility Loop for [api_surface, change, compatibility_policy].

First define the task boundary, success criteria, allowed actions, required evidence, risk level, and budget. Work in bounded iterations. In each iteration:
- Identify public methods, endpoints, schemas, status codes, errors, rate limits, and documented examples affected by the change.
- Classify the change as additive, compatible behavior change, deprecation, or breaking change.
- Add contract tests or golden examples for current and intended behavior.
- Update docs and migration notes only after tests prove the contract.
- Escalate any breaking change that lacks versioning, migration, or approval.

Quality gates before completion:
- affected API surface listed
- compatibility class declared
- contract tests pass
- docs match tests
- migration path exists if needed

Stop when one of these is true:
- compatible change is ready
- breaking change needs approval
- policy conflict blocks work

Finish with:
- API surface table
- contract test output
- docs diff
- compatibility decision

Escalate for human approval before: breaking change, removing deprecated API, changing rate limits.
```

# Architecture Pressure Test Loop

Stress-tests a proposed architecture against change scenarios before implementation locks in.

```text
Use the Architecture Pressure Test Loop for [proposal, scenarios, constraints].

First define the task boundary, success criteria, allowed actions, required evidence, risk level, and budget. Work in bounded iterations. In each iteration:
- State the architecture, non-goals, constraints, and assumptions in a decision record.
- Create realistic pressure scenarios for scale, failure, security, migration, operability, and team ownership.
- For each scenario, trace how the design changes, fails, or recovers.
- Have a critic list the highest-impact objections and require evidence for each response.
- Revise the architecture or explicitly accept tradeoffs with owners and review dates.

Quality gates before completion:
- decision record exists
- major quality attributes are exercised
- objections are resolved or accepted
- migration and rollback paths are described

Stop when one of these is true:
- no unresolved high-impact objection remains
- decision owner accepts documented risk
- same objections repeat without new evidence

Finish with:
- decision record
- scenario table
- objection log
- final recommendation

Escalate for human approval before: irreversible platform commitment, security boundary changes, major cost increase.
```

# Background Job Idempotency Loop

Hardens jobs and workflows so retries, duplicates, and partial failures do not corrupt state.

```text
Use the Background Job Idempotency Loop for [job, side_effects, retry_policy].

First define the task boundary, success criteria, allowed actions, required evidence, risk level, and budget. Work in bounded iterations. In each iteration:
- Map every side effect, external call, database write, notification, and checkpoint in the job.
- Define the idempotency key, dedupe window, transaction boundary, and retry behavior for each side effect.
- Create tests for duplicate delivery, partial failure, timeout, and retry after success.
- Patch the job so repeated execution converges to one correct final state.
- Add observability for dedupe hits, retries, and terminal failures.

Quality gates before completion:
- side effects mapped
- duplicate tests pass
- partial failures handled
- observability added
- manual recovery documented

Stop when one of these is true:
- job is idempotent under tested failures
- external system lacks safe semantics
- risk owner accepts limitation

Finish with:
- side-effect map
- failure tests
- implementation diff
- sample telemetry

Escalate for human approval before: changing payment or billing side effects, discarding duplicate events.
```

# Browser Automation Proof Loop

Verifies browser agent tasks through repeatable setup, screenshots, DOM evidence, and side-effect checks.

```text
Use the Browser Automation Proof Loop for [web_task, test_account, side_effect_policy].

First define the task boundary, success criteria, allowed actions, required evidence, risk level, and budget. Work in bounded iterations. In each iteration:
- Define the task, allowed site, test account, forbidden actions, and proof required for completion.
- Start from a known browser state and capture initial evidence.
- Execute one bounded browser action at a time, recording screenshots or DOM evidence for important state changes.
- Before any side effect, verify destination, data, and approval requirement.
- Finish with proof that the intended state changed and no forbidden side effect occurred.

Quality gates before completion:
- known initial state
- evidence captured at key steps
- side effects verified before action
- final state proved

Stop when one of these is true:
- task proved complete
- approval required for side effect
- site blocks automation
- uncertain destination

Finish with:
- initial and final screenshots
- DOM snippets
- action log
- side-effect confirmation

Escalate for human approval before: purchases, messages to real users, irreversible account changes.
```

# Champion Challenger Prompt Loop

Improves prompts or policies by promoting challengers only when holdout evidence beats the champion.

```text
Use the Champion Challenger Prompt Loop for [champion, working_set, holdout_set, promotion_margin].

First define the task boundary, success criteria, allowed actions, required evidence, risk level, and budget. Work in bounded iterations. In each iteration:
- Save the current champion, score, must-pass checks, working set, holdout set, and budget.
- Diagnose one recorded failure and change exactly one meaningful part of the challenger.
- Evaluate on the working set first, then use holdouts only for promotion decisions.
- Promote the challenger only if it beats the champion by the margin without weakening any must-pass check.
- Keep an experiment log so every rejected idea teaches something.

Quality gates before completion:
- holdouts remain untouched during design
- one change per round
- must-pass checks preserved
- promotion rule applied

Stop when one of these is true:
- target score reached
- no progress for two rounds
- budget ends

Finish with:
- champion and challenger versions
- scores
- experiment log
- remaining failures

Escalate for human approval before: changing holdouts, changing promotion margin, shipping prompt to production.
```

# Changelog to Announcement Loop

Turns shipped changes into user-facing release notes without overstating impact.

```text
Use the Changelog to Announcement Loop for [change_log, audience, proof_links].

First define the task boundary, success criteria, allowed actions, required evidence, risk level, and budget. Work in bounded iterations. In each iteration:
- Separate shipped user-visible changes from internal work, experiments, and unreleased plans.
- Verify each included change against the product, docs, commits, or release artifacts.
- Group changes by user problem and write what changed, why it matters, and how to try it.
- Remove claims that cannot be verified or that promise future behavior.
- Ask for publishing approval after presenting the draft and source evidence.

Quality gates before completion:
- only shipped changes included
- each item verified
- user value clear
- no roadmap promises
- approval requested

Stop when one of these is true:
- draft ready for approval
- no meaningful shipped changes exist
- verification missing

Finish with:
- included and excluded change list
- source links
- draft announcement

Escalate for human approval before: publishing, customer commitments, pricing or availability claims.
```
