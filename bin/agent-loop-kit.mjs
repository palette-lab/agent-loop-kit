#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { buildCatalog, exportAgentsMd, exportInstructions, findLoop, instructionTargetAliases, instructionTargets, loadLoops, renderLoop, searchLoops, validateAll } from '../src/looplib.mjs';

const args = process.argv.slice(2);
const command = args.shift() ?? 'help';

function option(name, fallback = undefined) {
  const flag = `--${name}`;
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  return args[index + 1] ?? true;
}

function printHelp() {
  console.log(`Agent Loop Kit

Usage:
  agent-loop-kit list [--category engineering]
  agent-loop-kit search <query> [--category security] [--tag mcp]
  agent-loop-kit show <id> [--mode full|prompt|brief|json]
  agent-loop-kit copy <id>
  agent-loop-kit validate
  agent-loop-kit export-agents-md [--out AGENTS.md] [loop-id...]
  agent-loop-kit export-instructions --target claude|gemini|cursor|agents|google-ai-studio|google-stitch [--out path] [loop-id...]
  agent-loop-kit build-site [--out dist]
  agent-loop-kit new <id> [--category engineering]
`);
}

function summarize(loop) {
  return `${loop.id.padEnd(34)} ${loop.category.padEnd(12)} ${loop.riskLevel.padEnd(6)} ${loop.title}`;
}

if (command === 'help' || command === '--help' || command === '-h') {
  printHelp();
} else if (command === 'list') {
  const category = option('category');
  const loops = loadLoops().filter((loop) => !category || loop.category === category);
  for (const loop of loops) console.log(summarize(loop));
  console.error(`\n${loops.length} loop(s)`);
} else if (command === 'search') {
  const category = option('category');
  const tag = option('tag');
  const query = args.filter((arg) => !arg.startsWith('--')).join(' ');
  const loops = searchLoops(query, { category, tag });
  for (const loop of loops) console.log(summarize(loop));
  console.error(`\n${loops.length} match(es)`);
} else if (command === 'show' || command === 'copy') {
  const id = args[0];
  if (!id) throw new Error(`${command} requires a loop id`);
  const loop = findLoop(id);
  if (!loop) throw new Error(`Unknown loop: ${id}`);
  const mode = command === 'copy' ? 'prompt' : option('mode', 'full');
  console.log(renderLoop(loop, mode));
} else if (command === 'validate') {
  const result = validateAll();
  if (!result.ok) {
    console.error(result.errors.join('\n'));
    process.exit(1);
  }
  console.log(`OK: ${result.count} loop specs validated`);
} else if (command === 'export-agents-md') {
  const out = option('out', 'AGENTS.generated.md');
  const ids = args.filter((arg, i) => !(args[i - 1] === '--out') && arg !== '--out' && !arg.startsWith('--'));
  const result = exportAgentsMd(ids, out);
  console.log(`Wrote ${result.count} loop(s) to ${result.outPath}`);
} else if (command === 'export-instructions') {
  const target = option('target');
  const resolvedTarget = instructionTargetAliases[target] || target;
  if (!resolvedTarget || !instructionTargets[resolvedTarget]) {
    throw new Error(`export-instructions requires --target ${Object.keys(instructionTargets).join('|')}`);
  }
  const out = option('out');
  const ids = args.filter((arg, i) => {
    const previous = args[i - 1];
    return previous !== '--out' && previous !== '--target' && arg !== '--out' && arg !== '--target' && !arg.startsWith('--');
  });
  const result = exportInstructions(target, ids, out);
  console.log(`Wrote ${result.count} loop(s) to ${result.outPath}`);
} else if (command === 'build-site') {
  const out = option('out', 'dist');
  const result = buildCatalog(out);
  console.log(`Built catalog with ${result.count} loops in ${result.outDir}`);
} else if (command === 'new') {
  const id = args[0];
  if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('new requires a kebab-case id');
  const category = option('category', 'engineering');
  const title = id.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
  const loop = {
    id,
    title,
    category,
    summary: 'TODO: describe the practical problem this loop solves in one sentence.',
    tags: ['todo'],
    useCases: ['TODO'],
    riskLevel: 'medium',
    inputs: ['task', 'budget'],
    steps: ['TODO: define the starting state.', 'TODO: run one bounded iteration.', 'TODO: verify the result.'],
    checks: ['TODO: check one', 'TODO: check two', 'TODO: check three'],
    stopConditions: ['TODO: success condition', 'TODO: blocked condition'],
    evidence: ['TODO: evidence one', 'TODO: evidence two'],
    humanApproval: ['TODO: approval gate'],
    compatibleAgents: ['codex', 'github-copilot', 'claude', 'claude-code', 'cursor', 'gemini-cli', 'google-ai-studio'],
    prompt: 'TODO: write the copyable loop prompt with task boundary, steps, checks, stop conditions, evidence, and approval gates.',
    version: '0.1.0',
    updated: new Date().toISOString().slice(0, 10),
    author: 'your-name',
    license: 'MIT'
  };
  const path = `loops/${id}.json`;
  writeFileSync(path, JSON.stringify(loop, null, 2) + '\n');
  console.log(`Created ${path}`);
} else {
  console.error(`Unknown command: ${command}\n`);
  printHelp();
  process.exit(1);
}
