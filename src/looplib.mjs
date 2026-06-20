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
  const cards = loops.map((loop) => `<article class="card" data-category="${loop.category}" data-tags="${loop.tags.join(' ')}"><div class="meta">${loop.category} / ${loop.riskLevel}</div><h2>${loop.title}</h2><p>${loop.summary}</p><p class="tags">${loop.tags.map((tag) => `<span>${tag}</span>`).join('')}</p><details><summary>Copy loop</summary><pre>${escapeHtml(loop.prompt)}</pre></details></article>`).join('\n');
  const categoryList = Object.keys(byCategory).sort().map((cat) => `<button data-filter="${cat}">${cat} (${byCategory[cat].length})</button>`).join(' ');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Loop Kit</title>
<style>
:root { color-scheme: light dark; --border:#9994; --bg:#0b1020; --card:#141b34; --text:#f4f7ff; --muted:#aeb7d4; }
body { margin:0; font:16px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; background:var(--bg); color:var(--text); }
header { padding:4rem 2rem 2rem; max-width:1100px; margin:auto; }
h1 { font-size:clamp(2.4rem, 6vw, 5rem); line-height:1; margin:0 0 1rem; }
.lede { font-size:1.25rem; max-width:760px; color:var(--muted); }
.toolbar { max-width:1100px; margin:0 auto 1rem; padding:0 2rem; display:grid; gap:.75rem; }
input { padding:.9rem 1rem; border:1px solid var(--border); border-radius:12px; background:#fff1; color:inherit; font:inherit; }
button { margin:.2rem .2rem .2rem 0; padding:.55rem .8rem; border:1px solid var(--border); border-radius:999px; background:#fff1; color:inherit; cursor:pointer; }
main { max-width:1100px; margin:auto; padding:1rem 2rem 4rem; display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:1rem; }
.card { border:1px solid var(--border); border-radius:18px; background:var(--card); padding:1.1rem; }
.meta, .tags { color:var(--muted); font-size:.9rem; }
.tags span { display:inline-block; border:1px solid var(--border); border-radius:999px; padding:.1rem .45rem; margin:.1rem; }
pre { white-space:pre-wrap; overflow:auto; border:1px solid var(--border); border-radius:12px; padding:1rem; background:#0004; }
a { color:inherit; }
</style>
</head>
<body>
<header><h1>Agent Loop Kit</h1><p class="lede">Open, schema-validated loops for coding agents, evaluators, operators, designers, security reviewers, and product teams. Each loop has checks, stop conditions, evidence, and approval gates.</p><p>${loops.length} loop specs.</p></header>
<section class="toolbar"><input id="q" placeholder="Search loops, checks, tags, categories..."><div><button data-filter="all">all</button> ${categoryList}</div></section>
<main id="catalog">${cards}</main>
<script>
const q = document.querySelector('#q');
const cards = [...document.querySelectorAll('.card')];
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
