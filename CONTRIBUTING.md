# Contributing

Thanks for helping make agent loops safer and more useful.

## Add a loop

```bash
node bin/agent-loop-kit.mjs new your-loop-id --category engineering
npm run validate
npm test
```

Before opening a PR, check that the loop is practical, bounded, verifiable, safe, portable, and original.

## Review checklist

- Does the loop solve a real repeated workflow?
- Are stop conditions clear enough to prevent infinite work?
- Are checks and evidence specific?
- Are approval gates strong enough for the risk level?
- Is the text original and vendor-neutral?
- Does `npm run validate` pass?

## Development

This project uses Node 20+ and zero runtime dependencies.
