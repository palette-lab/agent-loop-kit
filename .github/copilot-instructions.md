# Copilot instructions

This repository is an agent-loop registry and CLI. Preserve the zero-runtime-dependency design unless the PR explicitly discusses why a dependency is needed.

When editing loops:

- keep loop JSON valid and run `npm run validate`;
- ensure every loop has concrete checks, stop conditions, evidence, and human approval gates;
- avoid copying text from other prompt libraries;
- prefer small, reviewable loop additions.

When editing code:

- run `npm test`;
- keep commands working on Node 20+;
- update README or docs when user-facing CLI behavior changes.
