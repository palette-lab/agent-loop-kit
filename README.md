# Agent Loop Kit

Open, schema-validated loops for AI coding agents, evaluators, operators, security reviewers, designers, product teams, and content workflows.

Agent Loop Kit is a better starting point than a plain prompt gallery because every loop is:

- machine-readable JSON with a published schema;
- copyable as a plain prompt;
- searchable from a zero-dependency CLI;
- exportable into `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, and design-tool prompt briefs;
- exposed as MCP prompts, resources, and a search tool;
- gated by checks, stop conditions, evidence requirements, and human approval rules.

This project is not affiliated with any existing loop library. It is an original open-source implementation intended for practical agent engineering.

## Why now

Agent work has moved from one-off chat prompts to repository-aware agents, cloud coding agents, MCP tools, and project-level instruction files. A useful loop library in 2026 needs more than cards and copy buttons: it needs contracts that agents can follow and maintainers can validate.

## Quick start

```bash
# from the repository
npm test
npm run validate
node bin/agent-loop-kit.mjs search "fresh clone setup"
node bin/agent-loop-kit.mjs copy completion-contract
node bin/agent-loop-kit.mjs build-site --out dist
```

After publishing to npm, users can run:

```bash
npx agent-loop-kit search "prompt injection"
npx agent-loop-kit copy prompt-injection-threat-model
npx agent-loop-kit export-agents-md --out AGENTS.md completion-contract ticket-to-pr-proof
```

## CLI

```bash
agent-loop-kit list [--category engineering]
agent-loop-kit search <query> [--category security] [--tag mcp]
agent-loop-kit show <id> [--mode full|prompt|brief|json]
agent-loop-kit copy <id>
agent-loop-kit validate
agent-loop-kit export-agents-md [--out AGENTS.md] [loop-id...]
agent-loop-kit export-instructions --target claude|gemini|cursor|agents|google-ai-studio|google-stitch [--out path] [loop-id...]
agent-loop-kit build-site [--out dist]
agent-loop-kit new <id> [--category engineering]
```

## MCP server

The package includes a small stdio MCP server so compatible hosts can discover loops as prompts and resources.

```bash
node bin/agent-loop-mcp.mjs
```

Exposed capabilities:

- `prompts/list` and `prompts/get` for loop prompts;
- `resources/list` and `resources/read` for full markdown loop docs;
- `tools/list` and `tools/call` with `search_loops`.

## Agent integrations

Use the lowest-friction integration for your agent runtime:

- `AGENTS.md`: export selected loops for Codex, GitHub Copilot, and other repository-aware coding agents.
- `CLAUDE.md`: export Claude Code instructions with `agent-loop-kit export-instructions --target claude`.
- `GEMINI.md`: export Gemini CLI instructions with `agent-loop-kit export-instructions --target gemini`.
- Cursor rules: export `.cursor/rules/agent-loop-kit.mdc` with `agent-loop-kit export-instructions --target cursor`.
- Google AI Studio: export prompt briefs with `agent-loop-kit export-instructions --target google-ai-studio`.
- Google Stitch: export design-loop briefs with `agent-loop-kit export-instructions --target google-stitch`.
- MCP: run `node bin/agent-loop-mcp.mjs` from clients that support stdio MCP servers.
- Skill bundle: use `skills/loopwright/` as the source package for hosts that support local skill bundles. OpenAI-compatible metadata lives in `skills/loopwright/agents/openai.yaml`.

See `docs/INTEGRATIONS.md` for setup notes.


## ARD / AI Catalog discovery

`npm run build:site` also writes an Agentic Resource Discovery-compatible manifest to `dist/.well-known/ai-catalog.json`, plus one markdown page per loop under `dist/loops/`. Before deploying a public catalog, set:

```bash
AGENT_LOOP_KIT_PUBLIC_URL="https://palette-lab.github.io/agent-loop-kit" npm run build:site
```

Discovery services can crawl the well-known manifest and find individual loops without loading the entire catalog into an agent context window.

## Loop spec

Each loop lives in `loops/<id>.json` and follows `schemas/loop.schema.json`.

Important fields:

- `steps`: the bounded iteration procedure;
- `checks`: quality gates before completion;
- `stopConditions`: success, blocked, stalled, and budget exits;
- `evidence`: what the agent must return;
- `humanApproval`: operations that must not be performed without approval;
- `compatibleAgents`: expected agent runtimes or tools.

## Initial catalog

The first release includes loops across:

- agent workflows;
- engineering;
- evaluation;
- operations;
- security;
- content;
- design;
- product;
- data.

Run `agent-loop-kit list` to see all loop IDs.

Loops are tagged with compatibility metadata for Codex, Claude, Claude Code, Cursor, GitHub Copilot, Gemini CLI, Google AI Studio, Google Antigravity, Aider, goose, opencode, and design-specific Google Stitch use where appropriate.

## Add a loop

```bash
node bin/agent-loop-kit.mjs new my-useful-loop --category engineering
npm run validate
npm test
```

A good loop should be practical, bounded, safe, and evidence-driven. It should not say "keep improving" without a stop condition. It should not allow irreversible actions without human approval.

## Repository layout

```text
loops/                  machine-readable loop specs
schemas/                JSON Schema for loop specs
src/                    zero-dependency library code
bin/                    CLI and MCP server entrypoints
docs/                   spec, quality bar, decisions, examples
skills/loopwright/      agent skill bundle source
.github/                CI, Pages, issue templates, PR template
```

## Roadmap

- Hosted catalog with permalinks for every loop.
- NPM release automation.
- Import/export adapters for common agent instruction formats.
- Richer MCP server with loop composition and validation tools.
- Community review process for loop quality levels.
- Optional benchmark suite for measuring loop effectiveness on real agent tasks.

## License

MIT. Loop text, schema, code, docs, and templates are released under the MIT license unless a file says otherwise.
