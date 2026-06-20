# AGENTS.md

## Project overview

Agent Loop Kit is a zero-dependency Node.js project that ships machine-readable AI agent loop prompts, validation, a CLI, a static catalog generator, and a small MCP stdio server.

## Setup commands

- Run tests: `npm test`
- Validate loops: `npm run validate`
- Build static catalog: `npm run build:site`
- Try the CLI: `node bin/agent-loop-kit.mjs search "regression"`
- Try MCP server manually: `node bin/agent-loop-mcp.mjs`

## Code style

- Use ESM modules and built-in Node APIs unless a dependency is clearly justified.
- Keep the package zero-runtime-dependency by default.
- Prefer readable validation code over clever schema metaprogramming.
- Loop IDs must be kebab-case and match filenames.

## Testing instructions

- Run `npm test` before finishing any code change.
- Run `npm run validate` before finishing any loop change.
- Add tests when changing CLI behavior, validation behavior, rendering, or MCP behavior.

## Loop contribution rules

Every loop must include steps, checks, stop conditions, evidence, and human approval gates. Do not add vague loops that say only "iterate until good." Do not copy proprietary prompt text from another library. Write original loops that solve practical repeatable workflows.

## PR instructions

- Explain the user problem the change solves.
- Include before-after evidence for CLI, validation, site generation, or loop output changes.
- Keep unrelated refactors out of loop-content PRs.
