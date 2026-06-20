# Loop spec

A loop is a repeatable agent workflow with explicit boundaries. The minimum useful loop answers seven questions:

1. What job is this loop for?
2. What inputs must be known before starting?
3. What does the agent do in each bounded iteration?
4. What checks must pass before completion?
5. What stop conditions prevent infinite work?
6. What evidence must the agent return?
7. What requires human approval?

The canonical machine-readable form is `loops/<id>.json`. The schema is `schemas/loop.schema.json`.

## Field notes

- `id`: stable kebab-case identifier.
- `category`: one of agent, content, data, design, engineering, evaluation, operations, product, security.
- `riskLevel`: low, medium, or high. High-risk loops must have strong approval gates.
- `steps`: practical iteration steps. Avoid generic filler.
- `checks`: gates that can be verified by commands, review, screenshots, citations, logs, or test output.
- `stopConditions`: include success, blocked, stalled, and budget exits when relevant.
- `evidence`: what the agent must return so the human can trust the result.
- `humanApproval`: irreversible, privileged, or policy-sensitive actions.
- `compatibleAgents`: lowercase tool/runtime identifiers such as `codex`, `claude-code`, `cursor`, `gemini-cli`, `google-ai-studio`, and design-specific tools such as `google-stitch` when relevant.
