# Decisions

## Zero runtime dependencies

The first release uses only built-in Node.js APIs. This keeps `npx` usage fast, reduces supply-chain risk, and makes the project easy to audit.

## JSON as the source of truth

Loops are stored as JSON instead of free-form Markdown so they can be validated, searched, exported, rendered into a site, and served over MCP.

## Evidence before completion

Every loop includes `evidence` because agent systems often sound confident before they have proved the task. The project treats completion as a contract, not a feeling.

## Human approval gates

Loops include approval gates because agent workflows increasingly have access to code, tools, credentials, browsers, and production-adjacent systems. The library should make safe stopping behavior normal.
