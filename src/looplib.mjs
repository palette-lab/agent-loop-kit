import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, '..');
export const loopsDir = join(repoRoot, 'loops');

export const allowedCategories = new Set(['agent', 'content', 'data', 'design', 'engineering', 'evaluation', 'operations', 'product', 'security']);
export const allowedRisk = new Set(['low', 'medium', 'high']);

export function loadLoops(dir = loopsDir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const loop = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      return { ...loop, sourceFile: join(dir, file) };
    });
}

function hasStringArray(value, min = 1) {
  return Array.isArray(value) && value.length >= min && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

export function validateLoop(loop) {
  const errors = [];
  const required = ['id', 'title', 'category', 'summary', 'tags', 'useCases', 'riskLevel', 'inputs', 'steps', 'checks', 'stopConditions', 'evidence', 'humanApproval', 'compatibleAgents', 'prompt', 'version', 'updated', 'author', 'license'];
  for (const key of required) {
    if (!(key in loop)) errors.push(`missing required field: ${key}`);
  }
  if (typeof loop.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(loop.id)) errors.push('id must be kebab-case');
  if (typeof loop.title !== 'string' || loop.title.length < 3) errors.push('title must be at least 3 characters');
  if (!allowedCategories.has(loop.category)) errors.push(`category must be one of ${Array.from(allowedCategories).join(', ')}`);
  if (!allowedRisk.has(loop.riskLevel)) errors.push('riskLevel must be low, medium, or high');
  if (typeof loop.summary !== 'string' || loop.summary.length < 20) errors.push('summary must be at least 20 characters');
  if (!hasStringArray(loop.tags)) errors.push('tags must be a non-empty string array');
  if (Array.isArray(loop.tags) && new Set(loop.tags).size !== loop.tags.length) errors.push('tags must be unique');
  if (!hasStringArray(loop.useCases)) errors.push('useCases must be a non-empty string array');
  if (!hasStringArray(loop.inputs)) errors.push('inputs must be a non-empty string array');
  if (!hasStringArray(loop.steps, 3)) errors.push('steps must contain at least 3 items');
  if (!hasStringArray(loop.checks, 3)) errors.push('checks must contain at least 3 items');
  if (!hasStringArray(loop.stopConditions, 2)) errors.push('stopConditions must contain at least 2 items');
  if (!hasStringArray(loop.evidence, 2)) errors.push('evidence must contain at least 2 items');
  if (!hasStringArray(loop.humanApproval)) errors.push('humanApproval must be a non-empty string array');
  if (!hasStringArray(loop.compatibleAgents)) errors.push('compatibleAgents must be a non-empty string array');
  if (typeof loop.prompt !== 'string' || loop.prompt.length < 100) errors.push('prompt must be at least 100 characters');
  if (typeof loop.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(loop.version)) errors.push('version must be semver-like, for example 0.1.0');
  if (typeof loop.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(loop.updated)) errors.push('updated must use YYYY-MM-DD');
  return errors;
}

export function validateAll(dir = loopsDir) {
  const loops = loadLoops(dir);
  const ids = new Set();
  const errors = [];
  for (const loop of loops) {
    if (ids.has(loop.id)) errors.push(`${loop.sourceFile}: duplicate id ${loop.id}`);
    ids.add(loop.id);
    for (const error of validateLoop(loop)) {
      errors.push(`${loop.sourceFile}: ${error}`);
    }
  }
  return { ok: errors.length === 0, errors, count: loops.length };
}

function normalize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function searchLoops(query, options = {}) {
  const loops = options.loops ?? loadLoops();
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const category = options.category;
  const tag = options.tag;
  return loops
    .filter((loop) => !category || loop.category === category)
    .filter((loop) => !tag || loop.tags.includes(tag))
    .map((loop) => {
      const haystack = normalize([
        loop.id,
        loop.title,
        loop.category,
        loop.summary,
        loop.tags.join(' '),
        loop.useCases.join(' '),
        loop.checks.join(' '),
        loop.stopConditions.join(' ')
      ].join(' '));
      const score = terms.length === 0 ? 1 : terms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
      return { loop, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.loop.id.localeCompare(b.loop.id))
    .map(({ loop }) => loop);
}

export function findLoop(id, loops = loadLoops()) {
  return loops.find((loop) => loop.id === id || loop.title.toLowerCase() === String(id).toLowerCase());
}

function bullets(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

export function renderLoop(loop, mode = 'full') {
  if (mode === 'prompt') return loop.prompt;
  if (mode === 'json') return JSON.stringify(loop, null, 2);
  if (mode === 'brief') {
    return `# ${loop.title}\n\n${loop.summary}\n\nCategory: ${loop.category}\nRisk: ${loop.riskLevel}\nTags: ${loop.tags.join(', ')}\n`;
  }
  return `# ${loop.title}\n\n${loop.summary}\n\n- ID: ${loop.id}\n- Category: ${loop.category}\n- Risk: ${loop.riskLevel}\n- Tags: ${loop.tags.join(', ')}\n- Compatible agents: ${loop.compatibleAgents.join(', ')}\n\n## Use cases\n${bullets(loop.useCases)}\n\n## Inputs\n${bullets(loop.inputs)}\n\n## Loop prompt\n\n${loop.prompt}\n\n## Checks\n${bullets(loop.checks)}\n\n## Stop conditions\n${bullets(loop.stopConditions)}\n\n## Evidence\n${bullets(loop.evidence)}\n\n## Human approval gates\n${bullets(loop.humanApproval)}\n`;
}

export function exportAgentsMd(loopIds, outPath, loops = loadLoops()) {
  const selected = selectLoops(loopIds, loops);
  const body = [
    '# AGENTS.md',
    '',
    '## Agent Loop Kit instructions',
    '',
    'Use the loops below when a task matches the described pattern. Before acting, preserve the task boundary, quality gates, stop conditions, and required evidence. Do not declare completion until the evidence section is satisfied.',
    '',
    ...selected.map((loop) => renderLoop(loop, 'full'))
  ].join('\n');
  ensureParentDir(outPath);
  writeFileSync(outPath, body + '\n');
  return { count: selected.length, outPath };
}

export const instructionTargets = {
  agents: {
    outPath: 'AGENTS.md',
    title: 'AGENTS.md',
    intro: 'Use the loops below when a task matches the described pattern. Before acting, preserve the task boundary, quality gates, stop conditions, and required evidence. Do not declare completion until the evidence section is satisfied.'
  },
  claude: {
    outPath: 'CLAUDE.md',
    title: 'CLAUDE.md',
    intro: 'Claude Code instructions. Use these loop contracts for bounded implementation, review, design, debugging, and release tasks. Keep the stated evidence and approval gates intact.'
  },
  gemini: {
    outPath: 'GEMINI.md',
    title: 'GEMINI.md',
    intro: 'Gemini CLI context. Use these loop contracts to keep repository work bounded, verifiable, and evidence-driven.'
  },
  cursor: {
    outPath: '.cursor/rules/agent-loop-kit.mdc',
    title: 'Agent Loop Kit Cursor Rules',
    intro: 'Use these loop contracts in Cursor when planning, editing, reviewing, testing, or preparing a pull request.',
    frontmatter: '---\nalwaysApply: true\n---\n\n'
  },
  'google-ai-studio': {
    outPath: 'google-ai-studio-loop-prompts.md',
    title: 'Google AI Studio Loop Prompts',
    intro: 'Paste a selected loop into Google AI Studio system instructions or the prompt area when prototyping agents, prompts, tools, and evaluation workflows.'
  },
  'google-stitch': {
    outPath: 'google-stitch-design-loops.md',
    title: 'Google Stitch Design Loops',
    intro: 'Use these design loops as structured briefs for Google Stitch or similar AI design tools. Keep accessibility, responsive behavior, visual evidence, and human approval gates intact.',
    defaultCategory: 'design'
  }
};

export const instructionTargetAliases = {
  'claude-code': 'claude',
  'google-studio': 'google-ai-studio',
  'ai-studio': 'google-ai-studio',
  studio: 'google-ai-studio',
  stitch: 'google-stitch'
};

export function exportInstructions(targetName, loopIds, outPath, loops = loadLoops()) {
  const resolvedTargetName = instructionTargetAliases[targetName] || targetName;
  const target = instructionTargets[resolvedTargetName];
  if (!target) throw new Error(`Unknown instruction target: ${targetName}`);
  const available = target.defaultCategory && loopIds.length === 0
    ? loops.filter((loop) => loop.category === target.defaultCategory)
    : loops;
  const selected = selectLoops(loopIds, available);
  const bodyParts = [
    `# ${target.title}`,
    '',
    target.intro,
    '',
    ...selected.map((loop) => renderLoop(loop, 'full'))
  ];
  if (target.frontmatter) bodyParts.unshift(target.frontmatter.trimEnd(), '');
  const body = bodyParts.join('\n');
  const finalOutPath = outPath || target.outPath;
  ensureParentDir(finalOutPath);
  writeFileSync(finalOutPath, body + '\n');
  return { count: selected.length, outPath: finalOutPath, target: resolvedTargetName };
}

function selectLoops(loopIds, loops) {
  return loopIds.length ? loopIds.map((id) => findLoop(id, loops)).filter(Boolean) : loops;
}

function ensureParentDir(path) {
  const dir = dirname(path);
  if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function buildAiCatalog(loops = loadLoops(), options = {}) {
  const baseUrl = (options.baseUrl || process.env.AGENT_LOOP_KIT_PUBLIC_URL || 'https://palette-lab.github.io/agent-loop-kit').replace(/\/$/, '');
  const hostDomain = options.hostDomain || process.env.AGENT_LOOP_KIT_HOST || new URL(baseUrl).host;
  return {
    specVersion: '1.0',
    host: {
      displayName: options.hostDisplayName || 'Agent Loop Kit',
      identifier: `did:web:${hostDomain}`,
      documentationUrl: `${baseUrl}/`
    },
    entries: loops.map((loop) => ({
      identifier: `urn:air:${hostDomain}:loop:${loop.id}`,
      displayName: loop.title,
      type: 'text/markdown',
      url: `${baseUrl}/loops/${loop.id}.md`,
      description: loop.summary,
      tags: [...new Set(['agent-loop', loop.category, loop.riskLevel, ...loop.tags])],
      capabilities: loop.checks.slice(0, 5),
      representativeQueries: loop.useCases.slice(0, 5),
      version: loop.version,
      updatedAt: `${loop.updated}T00:00:00Z`,
      metadata: {
        category: loop.category,
        riskLevel: loop.riskLevel,
        compatibleAgents: loop.compatibleAgents,
        evidence: loop.evidence,
        stopConditions: loop.stopConditions
      }
    }))
  };
}

export function buildCatalog(outDir = join(repoRoot, 'dist'), loops = loadLoops()) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const byCategory = Object.groupBy ? Object.groupBy(loops, (loop) => loop.category) : loops.reduce((acc, loop) => { (acc[loop.category] ||= []).push(loop); return acc; }, {});
  const totalChecks = loops.reduce((sum, loop) => sum + loop.checks.length, 0);
  const totalEvidence = loops.reduce((sum, loop) => sum + loop.evidence.length, 0);
  const totalApprovals = loops.reduce((sum, loop) => sum + loop.humanApproval.length, 0);
  const featuredIds = ['completion-contract', 'ticket-to-pr-proof', 'prompt-injection-threat-model', 'fresh-clone-contract'];
  const featured = featuredIds.map((id) => findLoop(id, loops)).filter(Boolean);
  const featuredCards = featured.map((loop) => `<article class="feature-card"><p class="meta">${loop.category} / ${loop.riskLevel}</p><h3>${escapeHtml(loop.title)}</h3><p>${escapeHtml(loop.summary)}</p><code>agent-loop-kit copy ${loop.id}</code></article>`).join('\n');
  const integrationTargets = [
    ['AGENTS.md', 'Repository instructions for Codex, Copilot, and compatible agents.'],
    ['CLAUDE.md', 'Claude Code guidance with the same loop contracts.'],
    ['GEMINI.md', 'Gemini CLI context for bounded repository work.'],
    ['Cursor rules', 'Reusable rules under .cursor/rules/.'],
    ['AI Studio', 'Prompt briefs for prototypes and evals.'],
    ['Stitch', 'Design-loop briefs for UI exploration.']
  ].map(([name, text]) => `<article class="integration"><strong>${name}</strong><span>${text}</span></article>`).join('\n');
  const cards = loops.map((loop) => `<article class="loop-card" data-category="${loop.category}" data-tags="${loop.tags.join(' ')}"><div class="loop-top"><span>${loop.category}</span><span>${loop.riskLevel}</span></div><h3>${escapeHtml(loop.title)}</h3><p>${escapeHtml(loop.summary)}</p><ul>${loop.checks.slice(0, 3).map((check) => `<li>${escapeHtml(check)}</li>`).join('')}</ul><p class="tags">${loop.tags.slice(0, 5).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</p><details><summary>Copy prompt</summary><pre>${escapeHtml(loop.prompt)}</pre></details></article>`).join('\n');
  const categoryList = Object.keys(byCategory).sort().map((cat) => `<button type="button" data-filter="${cat}">${cat} <span>${byCategory[cat].length}</span></button>`).join(' ');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Open, schema-validated completion contracts for AI coding agents.">
<title>Agent Loop Kit</title>
<style>
* { box-sizing: border-box; }
:root {
  color-scheme: light;
  --ink:#111827;
  --muted:#5d6678;
  --line:#d8dde8;
  --paper:#f6f4ef;
  --white:#ffffff;
  --night:#101522;
  --cyan:#18a7b5;
  --green:#2f9f67;
  --amber:#c78a1b;
  --rose:#b8555d;
}
html { scroll-behavior: smooth; }
body { margin:0; font:16px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; background:var(--paper); color:var(--ink); }
a { color:inherit; text-decoration:none; }
.site-nav { position:sticky; top:0; z-index:5; background:rgba(246,244,239,.92); border-bottom:1px solid var(--line); backdrop-filter:blur(12px); }
.nav-inner { max-width:1180px; margin:auto; padding:14px 24px; display:flex; align-items:center; justify-content:space-between; gap:18px; }
.brand { font-weight:800; font-size:18px; }
.nav-links { display:flex; gap:18px; color:var(--muted); font-size:14px; }
.hero { background:var(--night); color:var(--white); min-height:86vh; display:grid; align-items:center; border-bottom:1px solid #000; }
.hero-inner { max-width:1180px; margin:auto; padding:72px 24px 44px; display:grid; grid-template-columns:minmax(0,1fr) minmax(360px,520px); gap:44px; align-items:center; }
.eyebrow { color:#9ed8c0; font-size:13px; font-weight:800; text-transform:uppercase; margin:0 0 14px; }
h1 { font-size:64px; line-height:1.02; margin:0 0 22px; max-width:760px; }
.hero-copy { color:#cbd3df; font-size:20px; max-width:680px; margin:0 0 28px; }
.actions { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:28px; }
.button { border:1px solid #ffffff33; border-radius:8px; padding:12px 16px; font-weight:800; background:#ffffff; color:#101522; }
.button.secondary { background:transparent; color:#ffffff; }
.terminal { border:1px solid #ffffff24; border-radius:8px; background:#080b13; color:#dbeafe; padding:14px 16px; max-width:620px; overflow:auto; }
.terminal code { font:14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
.hero-visual { border:1px solid #ffffff1f; border-radius:8px; min-height:520px; background:#151b2a; padding:20px; display:grid; gap:14px; box-shadow:0 32px 80px #0008; }
.visual-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.visual-panel, .orbit { border:1px solid #ffffff21; border-radius:8px; background:#0c111d; padding:16px; }
.orbit { min-height:238px; display:grid; place-items:center; position:relative; }
.orbit-core { width:104px; height:104px; border:2px solid var(--green); border-radius:50%; display:grid; place-items:center; font-weight:900; color:#d8ffe9; }
.orbit-step { position:absolute; width:76px; height:44px; border:1px solid #ffffff2d; border-radius:8px; background:#172132; }
.orbit-step:nth-child(2) { top:26px; left:28px; border-color:#18a7b580; }
.orbit-step:nth-child(3) { top:26px; right:28px; border-color:#c78a1b80; }
.orbit-step:nth-child(4) { bottom:26px; left:28px; border-color:#b8555d80; }
.orbit-step:nth-child(5) { bottom:26px; right:28px; border-color:#2f9f6780; }
.visual-panel h2 { font-size:18px; margin:0 0 12px; }
.bars { display:grid; gap:10px; }
.bar { height:10px; border-radius:8px; background:#ffffff1a; overflow:hidden; }
.bar span { display:block; height:100%; background:var(--cyan); }
.rail { display:grid; gap:10px; }
.rail div { display:flex; align-items:center; gap:10px; color:#d7deeb; font-size:14px; }
.dot { width:12px; height:12px; border-radius:50%; background:var(--green); flex:0 0 auto; }
.dot.amber { background:var(--amber); }
.dot.rose { background:var(--rose); }
.metrics { background:#ffffff; border-bottom:1px solid var(--line); }
.metrics-inner { max-width:1180px; margin:auto; padding:24px; display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.metric { border:1px solid var(--line); border-radius:8px; padding:18px; background:#fbfaf7; }
.metric strong { display:block; font-size:32px; line-height:1; }
.metric span { color:var(--muted); font-size:14px; }
.section { max-width:1180px; margin:auto; padding:72px 24px; }
.section-head { max-width:760px; margin-bottom:28px; }
.section-head h2 { font-size:38px; line-height:1.1; margin:0 0 12px; }
.section-head p { color:var(--muted); font-size:18px; margin:0; }
.feature-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.feature-card, .integration, .loop-card { border:1px solid var(--line); border-radius:8px; background:var(--white); padding:18px; }
.feature-card h3, .loop-card h3 { margin:0 0 8px; font-size:20px; }
.feature-card p, .loop-card p { color:var(--muted); margin:0 0 14px; }
.feature-card code { display:block; overflow:auto; border:1px solid var(--line); border-radius:8px; padding:10px; background:#f2f4f7; color:#273246; font-size:13px; }
.meta, .loop-top { color:var(--muted); font-size:13px; font-weight:800; text-transform:uppercase; margin:0 0 10px; }
.proof { display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start; }
.proof-flow { border:1px solid var(--line); border-radius:8px; background:#ffffff; padding:22px; display:grid; gap:12px; }
.proof-step { border-left:4px solid var(--cyan); padding:12px 14px; background:#f7fbfc; border-radius:8px; }
.proof-step:nth-child(2) { border-color:var(--green); }
.proof-step:nth-child(3) { border-color:var(--amber); }
.proof-step:nth-child(4) { border-color:var(--rose); }
.proof-step strong { display:block; margin-bottom:4px; }
.proof-step span { color:var(--muted); }
.integrations { background:#111827; color:#ffffff; }
.integrations .section-head p { color:#cbd3df; }
.integration-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.integration { background:#ffffff0f; border-color:#ffffff24; color:#ffffff; }
.integration strong { display:block; margin-bottom:8px; }
.integration span { color:#d0d7e5; }
.catalog { background:#ffffff; border-top:1px solid var(--line); }
.toolbar { display:grid; gap:14px; margin-bottom:22px; }
input { width:100%; min-height:48px; padding:12px 14px; border:1px solid var(--line); border-radius:8px; background:#ffffff; color:inherit; font:inherit; }
.filters { display:flex; flex-wrap:wrap; gap:8px; }
button { border:1px solid var(--line); border-radius:8px; background:#f7f8fb; color:inherit; cursor:pointer; min-height:38px; padding:8px 12px; font:inherit; font-weight:700; }
button span { color:var(--muted); }
.catalog-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.loop-top { display:flex; justify-content:space-between; gap:10px; }
.loop-card ul { margin:0 0 14px; padding-left:18px; color:#384154; }
.tags span { display:inline-block; border:1px solid var(--line); border-radius:8px; padding:2px 7px; margin:2px 4px 2px 0; font-size:12px; color:#536075; }
details { margin-top:12px; }
summary { cursor:pointer; font-weight:800; }
pre { white-space:pre-wrap; overflow:auto; border:1px solid var(--line); border-radius:8px; padding:1rem; background:#111827; color:#e5e7eb; font-size:13px; }
footer { border-top:1px solid var(--line); background:#ffffff; color:var(--muted); }
footer .section { padding-top:28px; padding-bottom:28px; }
@media (max-width: 920px) {
  h1 { font-size:42px; }
  .hero-inner, .proof { grid-template-columns:1fr; }
  .hero-visual { min-height:420px; }
  .metrics-inner, .feature-grid, .integration-grid, .catalog-grid { grid-template-columns:1fr 1fr; }
}
@media (max-width: 640px) {
  .nav-links { display:none; }
  .hero-inner { padding-top:48px; }
  h1 { font-size:36px; }
  .hero-copy { font-size:18px; }
  .metrics-inner, .feature-grid, .integration-grid, .catalog-grid { grid-template-columns:1fr; }
  .visual-row { grid-template-columns:1fr; }
}
</style>
</head>
<body>
<nav class="site-nav"><div class="nav-inner"><a class="brand" href="#">Agent Loop Kit</a><div class="nav-links"><a href="#why">Why</a><a href="#integrations">Integrations</a><a href="#catalog">Catalog</a><a href="https://github.com/palette-lab/agent-loop-kit">GitHub</a></div></div></nav>
<header class="hero"><div class="hero-inner"><div><p class="eyebrow">Open completion contracts for coding agents</p><h1>Stop shipping agent work without proof.</h1><p class="hero-copy">Agent Loop Kit turns reusable prompts into schema-validated loop contracts with checks, evidence, stop conditions, approval gates, CLI export, MCP, AGENTS.md, and ARD discovery.</p><div class="actions"><a class="button" href="#catalog">Browse loops</a><a class="button secondary" href="https://github.com/palette-lab/agent-loop-kit">View on GitHub</a></div><pre class="terminal"><code>npx agent-loop-kit search "prompt injection"
npx agent-loop-kit copy completion-contract
npx agent-loop-kit export-instructions --target claude</code></pre></div><div class="hero-visual" aria-label="Loop contract visual"><div class="orbit"><div class="orbit-core">52</div><div class="orbit-step"></div><div class="orbit-step"></div><div class="orbit-step"></div><div class="orbit-step"></div></div><div class="visual-row"><div class="visual-panel"><h2>Quality gates</h2><div class="bars"><div class="bar"><span style="width:92%"></span></div><div class="bar"><span style="width:78%;background:var(--green)"></span></div><div class="bar"><span style="width:64%;background:var(--amber)"></span></div></div></div><div class="visual-panel"><h2>Completion proof</h2><div class="rail"><div><span class="dot"></span>checks</div><div><span class="dot amber"></span>evidence</div><div><span class="dot rose"></span>approval</div></div></div></div></div></div></header>
<section class="metrics"><div class="metrics-inner"><div class="metric"><strong>${loops.length}</strong><span>validated loops</span></div><div class="metric"><strong>${totalChecks}</strong><span>quality checks</span></div><div class="metric"><strong>${totalEvidence}</strong><span>evidence requirements</span></div><div class="metric"><strong>${totalApprovals}</strong><span>approval gates</span></div></div></section>
<section class="section" id="why"><div class="section-head"><h2>A prompt library is not enough.</h2><p>Each loop defines the task boundary, bounded iteration, completion checks, stop conditions, evidence, and approval gates. That makes agent work easier to review and harder to overclaim.</p></div><div class="proof"><div class="proof-flow"><div class="proof-step"><strong>1. Bound the task</strong><span>Name the scope, inputs, risk, budget, and allowed actions before work begins.</span></div><div class="proof-step"><strong>2. Iterate with checks</strong><span>Run the loop in small passes and keep quality gates visible.</span></div><div class="proof-step"><strong>3. Stop deliberately</strong><span>Exit on success, blocked state, stalled progress, or approval-gated work.</span></div><div class="proof-step"><strong>4. Return evidence</strong><span>Finish with tests, logs, screenshots, citations, diffs, or reviewer notes.</span></div></div><div class="feature-grid">${featuredCards}</div></div></section>
<section class="integrations" id="integrations"><div class="section"><div class="section-head"><h2>Portable across agent tools.</h2><p>Export the same loop contracts into the instruction format your team already uses.</p></div><div class="integration-grid">${integrationTargets}</div></div></section>
<section class="catalog" id="catalog"><div class="section"><div class="section-head"><h2>Search the loop catalog.</h2><p>Find reusable contracts for engineering, security, evaluation, design, product, content, data, operations, and multi-agent work.</p></div><div class="toolbar"><input id="q" placeholder="Search loops, checks, tags, categories..."><div class="filters"><button type="button" data-filter="all">all <span>${loops.length}</span></button> ${categoryList}</div></div><main class="catalog-grid">${cards}</main></div></section>
<footer><div class="section">MIT licensed. Built by Palette Lab for practical agent engineering.</div></footer>
<script>
const q = document.querySelector('#q');
const cards = [...document.querySelectorAll('.loop-card')];
let filter = 'all';
function apply(){ const term = q.value.toLowerCase(); for (const card of cards){ const okFilter = filter === 'all' || card.dataset.category === filter; const okText = card.textContent.toLowerCase().includes(term); card.style.display = okFilter && okText ? '' : 'none'; }}
document.querySelectorAll('button[data-filter]').forEach(btn => btn.addEventListener('click', () => { filter = btn.dataset.filter; apply(); }));
q.addEventListener('input', apply);
</script>
</body>
</html>`;
  writeFileSync(join(outDir, 'index.html'), html);
  writeFileSync(join(outDir, 'loops.json'), JSON.stringify(loops, null, 2));

  const loopDocsDir = join(outDir, 'loops');
  if (!existsSync(loopDocsDir)) mkdirSync(loopDocsDir, { recursive: true });
  for (const loop of loops) {
    writeFileSync(join(loopDocsDir, `${loop.id}.md`), renderLoop(loop, 'full') + '\n');
  }

  const wellKnownDir = join(outDir, '.well-known');
  if (!existsSync(wellKnownDir)) mkdirSync(wellKnownDir, { recursive: true });
  writeFileSync(join(wellKnownDir, 'ai-catalog.json'), JSON.stringify(buildAiCatalog(loops), null, 2) + '\n');
  return { count: loops.length, outDir };
}

function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
