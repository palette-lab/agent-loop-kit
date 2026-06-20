# Loop quality reference

A good loop is practical, bounded, verifiable, safe, portable, and original.

## Required parts

- Task boundary: what the agent is allowed to work on.
- Inputs: repository, ticket, page, dataset, budget, target state, or scenario set.
- Iteration: what changes each round and what stays fixed.
- Checks: tests, review criteria, metrics, screenshots, citations, logs, or other proof.
- Stop conditions: success, blocked, stalled, and budget exits.
- Evidence: exact outputs the agent must return.
- Approval gates: actions that require a human.

## Risk gates

Require explicit approval for production writes, data deletion, credentials, customer communication, purchases, publishing, legal claims, security boundary changes, permission expansion, or irreversible migrations.

## Common failure patterns

- No stop condition.
- "Improve until good" with no measurable bar.
- Hidden assumptions about local setup or credentials.
- No requirement to rerun tests or verify results.
- No handling for blocked access or missing product decisions.
- No evidence table at the end.
