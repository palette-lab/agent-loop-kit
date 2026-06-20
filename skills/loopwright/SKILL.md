---
name: loopwright
description: design, select, adapt, and verify practical AI agent loops with explicit task boundaries, checks, stop conditions, evidence requirements, and human approval gates. Use when the user asks for agent loops, coding-agent prompts, autonomous workflow prompts, loop-library style prompts, evaluation loops, repository-maintenance loops, or safe reusable agent procedures.
---

# Loopwright

Use this skill to help users design or adapt agent loops. A loop is a bounded reusable procedure for an AI agent. It must include a task boundary, iteration steps, quality checks, stop conditions, evidence, and human approval gates.

## Workflow

1. Identify the user's job-to-be-done and select the closest loop pattern from the bundled references or the current repository context.
2. Rewrite the loop for the user's exact environment, tools, permissions, and risk level.
3. Add stop conditions for success, blocked state, stalled progress, and budget exhaustion.
4. Add evidence requirements so the agent cannot claim completion without proof.
5. Add human approval gates for irreversible actions, production changes, credentials, privacy-sensitive data, security-sensitive work, publishing, payments, or external communication.
6. Return a copyable prompt plus a short explanation of when to use it.

## Quality rules

- Prefer one bounded task over broad ongoing autonomy.
- Include checks that can be verified by tests, logs, screenshots, citations, diffs, or reviewer notes.
- Do not weaken the quality bar during a run; create a new revision if the evaluation changes.
- Do not copy proprietary prompt text from another library.
- Escalate rather than guessing when product, legal, security, access, or irreversible decisions are required.

## Output template

```markdown
# <Loop name>

Use this when: <specific use case>

Prompt:
<copyable loop prompt>

Checks:
- <check>

Stop conditions:
- <success stop>
- <blocked stop>
- <budget or stalled stop>

Evidence to return:
- <evidence>

Human approval required before:
- <approval gate>
```

For examples and review criteria, see `references/loop-quality.md`.
