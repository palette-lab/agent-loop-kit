# Agentic Resource Discovery support

Agent Loop Kit can publish an AI Catalog manifest for Agentic Resource Discovery (ARD).

Build the site with a public URL:

```bash
AGENT_LOOP_KIT_PUBLIC_URL="https://palette-lab.github.io/agent-loop-kit" npm run build:site
```

The build writes:

- `dist/.well-known/ai-catalog.json` — the static discovery manifest.
- `dist/loops/<loop-id>.md` — one dereferenceable markdown artifact per loop.
- `dist/loops.json` — the full machine-readable loop list.

Each catalog entry includes:

- a domain-anchored `urn:air:<host>:loop:<id>` identifier;
- a `text/markdown` artifact URL;
- tags, representative queries, checks as capabilities, risk level, evidence, and compatible-agent metadata.

When deploying to GitHub Pages, rebuild after setting `AGENT_LOOP_KIT_PUBLIC_URL` to the final Pages or custom-domain URL so crawlers receive absolute URLs for every entry.
