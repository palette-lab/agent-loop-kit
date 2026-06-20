# Examples

## Copy a loop into a coding agent

```bash
node bin/agent-loop-kit.mjs copy ticket-to-pr-proof
```

Paste the output into your coding agent with the issue link and repository context.

## Create an AGENTS.md for a repository

```bash
node bin/agent-loop-kit.mjs export-agents-md --out AGENTS.md completion-contract fresh-clone-contract ticket-to-pr-proof
```

## Create tool-specific instruction files

```bash
node bin/agent-loop-kit.mjs export-instructions --target claude --out CLAUDE.md completion-contract ticket-to-pr-proof
node bin/agent-loop-kit.mjs export-instructions --target gemini --out GEMINI.md completion-contract ticket-to-pr-proof
node bin/agent-loop-kit.mjs export-instructions --target cursor
node bin/agent-loop-kit.mjs export-instructions --target google-ai-studio
node bin/agent-loop-kit.mjs export-instructions --target google-stitch
```

## Find security loops

```bash
node bin/agent-loop-kit.mjs list --category security
node bin/agent-loop-kit.mjs search "least privilege"
```

## Build the website

```bash
node bin/agent-loop-kit.mjs build-site --out dist
```
