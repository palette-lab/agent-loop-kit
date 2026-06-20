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
  writeSiteAssets(outDir);
  const byCategory = Object.groupBy ? Object.groupBy(loops, (loop) => loop.category) : loops.reduce((acc, loop) => { (acc[loop.category] ||= []).push(loop); return acc; }, {});
  const totalChecks = loops.reduce((sum, loop) => sum + loop.checks.length, 0);
  const totalEvidence = loops.reduce((sum, loop) => sum + loop.evidence.length, 0);
  const totalApprovals = loops.reduce((sum, loop) => sum + loop.humanApproval.length, 0);
  const featuredIds = ['completion-contract', 'ticket-to-pr-proof', 'prompt-injection-threat-model', 'fresh-clone-contract'];
  const featured = featuredIds.map((id) => findLoop(id, loops)).filter(Boolean);
  const featuredCards = featured.map((loop) => `<article class="feature-card"><p class="meta">${loop.category} / ${loop.riskLevel}</p><h3>${escapeHtml(loop.title)}</h3><p>${escapeHtml(loop.summary)}</p><code>agent-loop-kit copy ${loop.id}</code></article>`).join('\n');
  const integrationTargets = [
    ['AGENTS.md', 'Repository instructions for Codex, Copilot, and compatible agents.', 'Codex, Copilot 등 저장소 지침을 읽는 에이전트용 파일입니다.'],
    ['CLAUDE.md', 'Claude Code guidance with the same loop contracts.', 'Claude Code에서 같은 루프 계약을 쓰도록 내보냅니다.'],
    ['GEMINI.md', 'Gemini CLI context for bounded repository work.', 'Gemini CLI 작업을 범위와 증거 중심으로 유지합니다.'],
    ['Cursor rules', 'Reusable rules under .cursor/rules/.', 'Cursor의 .cursor/rules/에 재사용 가능한 규칙을 만듭니다.'],
    ['AI Studio', 'Prompt briefs for prototypes and evals.', '프로토타입과 평가용 프롬프트 브리프를 제공합니다.'],
    ['Stitch', 'Design-loop briefs for UI exploration.', 'UI 탐색을 위한 디자인 루프 브리프를 제공합니다.']
  ].map(([name, text, koText]) => `<article class="integration"><strong>${name}</strong><span class="lang-en">${text}</span><span class="lang-ko">${koText}</span></article>`).join('\n');
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
  --shadow:0 20px 60px rgba(17,24,39,.16);
}
html { scroll-behavior: smooth; }
body { margin:0; font:16px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; background:var(--paper); color:var(--ink); }
a { color:inherit; text-decoration:none; }
.lang-ko { display:none; }
body[data-lang="ko"] .lang-en { display:none; }
body[data-lang="ko"] .lang-ko { display:inline; }
body[data-lang="ko"] p.lang-ko { display:block; }
.site-nav { position:sticky; top:0; z-index:5; background:rgba(246,244,239,.92); border-bottom:1px solid var(--line); backdrop-filter:blur(12px); }
.nav-inner { max-width:1180px; margin:auto; padding:14px 24px; display:flex; align-items:center; justify-content:space-between; gap:18px; }
.brand { font-weight:900; font-size:18px; letter-spacing:0; display:flex; align-items:center; gap:10px; }
.brand-mark { width:24px; height:24px; border-radius:7px; background:linear-gradient(135deg,var(--cyan),var(--green)); display:inline-block; box-shadow:0 8px 20px rgba(24,167,181,.28); }
.nav-links { display:flex; align-items:center; gap:18px; color:var(--muted); font-size:14px; }
.lang-toggle { display:flex; gap:4px; padding:4px; border:1px solid var(--line); border-radius:8px; background:#fff; }
.lang-toggle button { min-height:28px; padding:4px 9px; border:0; border-radius:6px; background:transparent; font-size:12px; }
body[data-lang="en"] .lang-toggle button[data-set-lang="en"], body[data-lang="ko"] .lang-toggle button[data-set-lang="ko"] { background:#111827; color:#fff; }
.hero { background:var(--night); color:var(--white); min-height:86vh; display:grid; align-items:center; border-bottom:1px solid #000; }
.hero-inner { max-width:1180px; margin:auto; padding:72px 24px 44px; display:grid; grid-template-columns:minmax(0,1fr) minmax(360px,540px); gap:44px; align-items:center; }
.eyebrow { color:#9ed8c0; font-size:13px; font-weight:800; text-transform:uppercase; margin:0 0 14px; }
h1 { font-size:64px; line-height:1.02; margin:0 0 22px; max-width:760px; }
.hero-copy { color:#cbd3df; font-size:20px; max-width:680px; margin:0 0 28px; }
.actions { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:28px; }
.button { border:1px solid #ffffff33; border-radius:8px; padding:12px 16px; font-weight:800; background:#ffffff; color:#101522; }
.button.secondary { background:transparent; color:#ffffff; }
.terminal { border:1px solid #ffffff24; border-radius:8px; background:#080b13; color:#dbeafe; padding:14px 16px; max-width:620px; overflow:auto; }
.terminal code { font:14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
.hero-art { width:100%; border-radius:8px; box-shadow:0 32px 80px #0008; border:1px solid #ffffff1f; display:block; background:#151b2a; }
.visual-strip { display:grid; grid-template-columns:1.1fr .9fr; gap:22px; align-items:center; margin-top:24px; }
.visual-strip img { width:100%; display:block; border:1px solid var(--line); border-radius:8px; background:#fff; box-shadow:var(--shadow); }
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
.korean-note { border:1px solid #b7d8ce; background:#eef8f4; color:#24463b; border-radius:8px; padding:16px 18px; margin-top:18px; }
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
.integrations-visual { display:grid; grid-template-columns:.95fr 1.05fr; gap:24px; align-items:center; }
.integrations-visual img { width:100%; display:block; border:1px solid #ffffff24; border-radius:8px; background:#0d1422; box-shadow:0 24px 70px #0005; }
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
  .hero-inner, .proof, .visual-strip, .integrations-visual { grid-template-columns:1fr; }
  .metrics-inner, .feature-grid, .integration-grid, .catalog-grid { grid-template-columns:1fr 1fr; }
}
@media (max-width: 640px) {
  .nav-links a { display:none; }
  .hero-inner { padding-top:48px; }
  h1 { font-size:36px; }
  .hero-copy { font-size:18px; }
  .metrics-inner, .feature-grid, .integration-grid, .catalog-grid { grid-template-columns:1fr; }
}
</style>
</head>
<body data-lang="en">
<nav class="site-nav"><div class="nav-inner"><a class="brand" href="#"><span class="brand-mark"></span>Agent Loop Kit</a><div class="nav-links"><a href="#why"><span class="lang-en">Why</span><span class="lang-ko">소개</span></a><a href="#integrations"><span class="lang-en">Integrations</span><span class="lang-ko">연동</span></a><a href="#catalog"><span class="lang-en">Catalog</span><span class="lang-ko">카탈로그</span></a><a href="https://github.com/palette-lab/agent-loop-kit">GitHub</a><div class="lang-toggle" aria-label="Language"><button type="button" data-set-lang="en">EN</button><button type="button" data-set-lang="ko">KR</button></div></div></div></nav>
<header class="hero"><div class="hero-inner"><div><p class="eyebrow"><span class="lang-en">Open completion contracts for coding agents</span><span class="lang-ko">코딩 에이전트를 위한 오픈 완료 계약</span></p><h1><span class="lang-en">Stop shipping agent work without proof.</span><span class="lang-ko">증거 없는 에이전트 작업 완료를 막으세요.</span></h1><p class="hero-copy lang-en">Agent Loop Kit turns reusable prompts into schema-validated loop contracts with checks, evidence, stop conditions, approval gates, CLI export, MCP, AGENTS.md, and ARD discovery.</p><p class="hero-copy lang-ko">Agent Loop Kit은 재사용 프롬프트를 체크, 증거, 중지 조건, 승인 게이트가 포함된 스키마 검증 루프 계약으로 바꿉니다. CLI, MCP, AGENTS.md, ARD 검색까지 지원합니다.</p><div class="actions"><a class="button" href="#catalog"><span class="lang-en">Browse loops</span><span class="lang-ko">루프 보기</span></a><a class="button secondary" href="https://github.com/palette-lab/agent-loop-kit"><span class="lang-en">View on GitHub</span><span class="lang-ko">GitHub 보기</span></a></div><pre class="terminal"><code>npx agent-loop-kit search "prompt injection"
npx agent-loop-kit copy completion-contract
npx agent-loop-kit export-instructions --target claude</code></pre></div><img class="hero-art" src="assets/hero-contracts.svg" alt="Abstract workflow image showing checks, evidence, and approval gates around a loop contract"></div></header>
<section class="metrics"><div class="metrics-inner"><div class="metric"><strong>${loops.length}</strong><span class="lang-en">validated loops</span><span class="lang-ko">검증된 루프</span></div><div class="metric"><strong>${totalChecks}</strong><span class="lang-en">quality checks</span><span class="lang-ko">품질 체크</span></div><div class="metric"><strong>${totalEvidence}</strong><span class="lang-en">evidence requirements</span><span class="lang-ko">증거 요구사항</span></div><div class="metric"><strong>${totalApprovals}</strong><span class="lang-en">approval gates</span><span class="lang-ko">승인 게이트</span></div></div></section>
<section class="section" id="why"><div class="section-head"><h2><span class="lang-en">A prompt library is not enough.</span><span class="lang-ko">프롬프트 모음만으로는 부족합니다.</span></h2><p class="lang-en">Each loop defines the task boundary, bounded iteration, completion checks, stop conditions, evidence, and approval gates. That makes agent work easier to review and harder to overclaim.</p><p class="lang-ko">각 루프는 작업 범위, 반복 절차, 완료 체크, 중지 조건, 증거, 승인 게이트를 정의합니다. 그래서 에이전트 결과를 검토하기 쉽고, 미완료 작업을 완료처럼 말하기 어렵습니다.</p><div class="korean-note"><span class="lang-en">Now includes English and Korean guidance for repository instructions, Claude Code, Cursor, Gemini CLI, Google AI Studio, Google Stitch, and MCP.</span><span class="lang-ko">저장소 지침, Claude Code, Cursor, Gemini CLI, Google AI Studio, Google Stitch, MCP 사용법을 영어와 한국어로 제공합니다.</span></div></div><div class="proof"><div><div class="proof-flow"><div class="proof-step"><strong>1. <span class="lang-en">Bound the task</span><span class="lang-ko">작업 범위 설정</span></strong><span class="lang-en">Name the scope, inputs, risk, budget, and allowed actions before work begins.</span><span class="lang-ko">시작 전에 범위, 입력, 위험도, 예산, 허용된 행동을 정합니다.</span></div><div class="proof-step"><strong>2. <span class="lang-en">Iterate with checks</span><span class="lang-ko">체크와 함께 반복</span></strong><span class="lang-en">Run the loop in small passes and keep quality gates visible.</span><span class="lang-ko">작은 단위로 반복하고 품질 게이트를 계속 확인합니다.</span></div><div class="proof-step"><strong>3. <span class="lang-en">Stop deliberately</span><span class="lang-ko">명확하게 중지</span></strong><span class="lang-en">Exit on success, blocked state, stalled progress, or approval-gated work.</span><span class="lang-ko">성공, 차단, 정체, 승인 필요 상태에서 명확히 멈춥니다.</span></div><div class="proof-step"><strong>4. <span class="lang-en">Return evidence</span><span class="lang-ko">증거 반환</span></strong><span class="lang-en">Finish with tests, logs, screenshots, citations, diffs, or reviewer notes.</span><span class="lang-ko">테스트, 로그, 스크린샷, 출처, diff, 리뷰 노트로 마무리합니다.</span></div></div><div class="visual-strip"><img src="assets/evidence-gates.svg" alt="Evidence gate visual showing checks, evidence, stop conditions, and approval"><img src="assets/catalog-preview.svg" alt="Catalog preview visual showing searchable loop cards"></div></div><div class="feature-grid">${featuredCards}</div></div></section>
<section class="integrations" id="integrations"><div class="section"><div class="integrations-visual"><img src="assets/integrations-map.svg" alt="Integration map for AGENTS, Claude, Gemini, Cursor, AI Studio, Stitch, and MCP"><div><div class="section-head"><h2><span class="lang-en">Portable across agent tools.</span><span class="lang-ko">여러 에이전트 도구에서 그대로 사용합니다.</span></h2><p class="lang-en">Export the same loop contracts into the instruction format your team already uses.</p><p class="lang-ko">팀이 이미 쓰는 지침 형식으로 같은 루프 계약을 내보냅니다.</p></div><div class="integration-grid">${integrationTargets}</div></div></div></div></section>
<section class="catalog" id="catalog"><div class="section"><div class="section-head"><h2><span class="lang-en">Search the loop catalog.</span><span class="lang-ko">루프 카탈로그 검색</span></h2><p class="lang-en">Find reusable contracts for engineering, security, evaluation, design, product, content, data, operations, and multi-agent work.</p><p class="lang-ko">엔지니어링, 보안, 평가, 디자인, 제품, 콘텐츠, 데이터, 운영, 멀티 에이전트 작업에 맞는 재사용 가능한 계약을 찾으세요.</p></div><div class="toolbar"><input id="q" placeholder="Search loops, checks, tags, categories..."><div class="filters"><button type="button" data-filter="all">all <span>${loops.length}</span></button> ${categoryList}</div></div><main class="catalog-grid">${cards}</main></div></section>
<footer><div class="section"><span class="lang-en">MIT licensed. Built by Palette Lab for practical agent engineering.</span><span class="lang-ko">MIT 라이선스. Palette Lab이 실무형 에이전트 엔지니어링을 위해 만듭니다.</span></div></footer>
<script>
const q = document.querySelector('#q');
const cards = [...document.querySelectorAll('.loop-card')];
let filter = 'all';
function apply(){ const term = q.value.toLowerCase(); for (const card of cards){ const okFilter = filter === 'all' || card.dataset.category === filter; const okText = card.textContent.toLowerCase().includes(term); card.style.display = okFilter && okText ? '' : 'none'; }}
document.querySelectorAll('button[data-filter]').forEach(btn => btn.addEventListener('click', () => { filter = btn.dataset.filter; apply(); }));
q.addEventListener('input', apply);
document.querySelectorAll('[data-set-lang]').forEach(btn => btn.addEventListener('click', () => { document.body.dataset.lang = btn.dataset.setLang; localStorage.setItem('agentLoopKitLang', btn.dataset.setLang); }));
const savedLang = localStorage.getItem('agentLoopKitLang');
document.body.dataset.lang = savedLang || (((navigator.language || '').toLowerCase().startsWith('ko')) ? 'ko' : 'en');
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

function writeSiteAssets(outDir) {
  const assetsDir = join(outDir, 'assets');
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });
  writeFileSync(join(assetsDir, 'hero-contracts.svg'), HERO_CONTRACTS_SVG);
  writeFileSync(join(assetsDir, 'evidence-gates.svg'), EVIDENCE_GATES_SVG);
  writeFileSync(join(assetsDir, 'catalog-preview.svg'), CATALOG_PREVIEW_SVG);
  writeFileSync(join(assetsDir, 'integrations-map.svg'), INTEGRATIONS_MAP_SVG);
}

const HERO_CONTRACTS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="Abstract loop contract dashboard">
<defs>
<linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0b1020"/><stop offset=".55" stop-color="#141b2d"/><stop offset="1" stop-color="#05070d"/></linearGradient>
<linearGradient id="teal" x1="0" x2="1"><stop stop-color="#18a7b5"/><stop offset="1" stop-color="#2f9f67"/></linearGradient>
<linearGradient id="amber" x1="0" x2="1"><stop stop-color="#e2b75a"/><stop offset="1" stop-color="#c78a1b"/></linearGradient>
<filter id="glow"><feGaussianBlur stdDeviation="10" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="1200" height="900" fill="url(#bg)"/>
<path d="M773 170c145 0 263 118 263 263S918 696 773 696 510 578 510 433s118-263 263-263Z" fill="none" stroke="#ffffff14" stroke-width="2"/>
<path d="M773 230c112 0 203 91 203 203S885 636 773 636 570 545 570 433s91-203 203-203Z" fill="none" stroke="#18a7b544" stroke-width="4"/>
<path d="M773 301c73 0 132 59 132 132s-59 132-132 132-132-59-132-132 59-132 132-132Z" fill="#111827" stroke="url(#teal)" stroke-width="5" filter="url(#glow)"/>
<path d="M745 412h56v44h-56z" fill="#182033" stroke="#d8ffe9" stroke-width="3" rx="8"/>
<path d="M759 412v-19c0-23 28-23 28 0v19" fill="none" stroke="#d8ffe9" stroke-width="6" stroke-linecap="round"/>
<g fill="#111827" stroke-width="3">
<rect x="594" y="116" width="252" height="112" rx="14" stroke="#18a7b5"/>
<rect x="908" y="278" width="218" height="112" rx="14" stroke="#c78a1b"/>
<rect x="896" y="555" width="234" height="112" rx="14" stroke="#2f9f67"/>
<rect x="548" y="662" width="252" height="112" rx="14" stroke="#b8555d"/>
<rect x="292" y="500" width="218" height="112" rx="14" stroke="#18a7b5"/>
</g>
<g stroke="#ffffff40" stroke-width="2" fill="none">
<path d="M720 228v73"/><path d="M905 392l-48 22"/><path d="M895 578l-42-48"/><path d="M674 662l47-101"/><path d="M510 546l119-59"/>
</g>
<g fill="#d8dde8">
<circle cx="632" cy="151" r="9"/><rect x="654" y="143" width="148" height="12" rx="6" fill="#ffffff40"/><rect x="654" y="173" width="112" height="12" rx="6" fill="#ffffff24"/>
<circle cx="947" cy="313" r="9" fill="#e2b75a"/><rect x="969" y="305" width="118" height="12" rx="6" fill="#ffffff40"/><rect x="969" y="335" width="86" height="12" rx="6" fill="#ffffff24"/>
<circle cx="935" cy="590" r="9" fill="#8be0a8"/><rect x="957" y="582" width="126" height="12" rx="6" fill="#ffffff40"/><rect x="957" y="612" width="98" height="12" rx="6" fill="#ffffff24"/>
<circle cx="586" cy="698" r="9" fill="#df7f87"/><rect x="608" y="690" width="142" height="12" rx="6" fill="#ffffff40"/><rect x="608" y="720" width="104" height="12" rx="6" fill="#ffffff24"/>
<circle cx="331" cy="535" r="9" fill="#56c8d2"/><rect x="353" y="527" width="112" height="12" rx="6" fill="#ffffff40"/><rect x="353" y="557" width="88" height="12" rx="6" fill="#ffffff24"/>
</g>
<rect x="88" y="122" width="320" height="596" rx="22" fill="#ffffff08" stroke="#ffffff20"/>
<rect x="122" y="160" width="204" height="14" rx="7" fill="#ffffff40"/><rect x="122" y="195" width="246" height="10" rx="5" fill="#ffffff20"/>
<g fill="#ffffff12" stroke="#ffffff24"><rect x="122" y="256" width="226" height="72" rx="12"/><rect x="122" y="352" width="226" height="72" rx="12"/><rect x="122" y="448" width="226" height="72" rx="12"/><rect x="122" y="544" width="226" height="72" rx="12"/></g>
<circle cx="156" cy="292" r="12" fill="#18a7b5"/><circle cx="156" cy="388" r="12" fill="#2f9f67"/><circle cx="156" cy="484" r="12" fill="#c78a1b"/><circle cx="156" cy="580" r="12" fill="#b8555d"/>
</svg>
`;

const EVIDENCE_GATES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560" role="img" aria-label="Evidence gate visual">
<defs><linearGradient id="a" x1="0" x2="1"><stop stop-color="#18a7b5"/><stop offset="1" stop-color="#2f9f67"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#111827" flood-opacity=".16"/></filter></defs>
<rect width="900" height="560" fill="#fbfaf7"/>
<path d="M75 280h750" stroke="#c7cedb" stroke-width="3" stroke-dasharray="10 14"/>
<g filter="url(#s)">
<rect x="58" y="142" width="184" height="238" rx="18" fill="#fff" stroke="#d8dde8"/>
<rect x="258" y="112" width="184" height="298" rx="18" fill="#fff" stroke="#d8dde8"/>
<rect x="458" y="142" width="184" height="238" rx="18" fill="#fff" stroke="#d8dde8"/>
<rect x="658" y="112" width="184" height="298" rx="18" fill="#fff" stroke="#d8dde8"/>
</g>
<g fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M122 252l26 27 58-70" stroke="#18a7b5"/><path d="M322 248h54M322 282h78M322 316h62" stroke="#2f9f67"/><path d="M522 252l26 27 58-70" stroke="#c78a1b"/><path d="M730 270h42v38h-42zM740 270v-20c0-25 22-25 22 0v20" stroke="#b8555d"/></g>
<g fill="#111827"><circle cx="150" cy="438" r="7"/><circle cx="350" cy="438" r="7"/><circle cx="550" cy="438" r="7"/><circle cx="750" cy="438" r="7"/></g>
<g fill="#5d6678"><rect x="104" y="82" width="92" height="12" rx="6"/><rect x="300" y="68" width="104" height="12" rx="6"/><rect x="504" y="82" width="92" height="12" rx="6"/><rect x="694" y="68" width="112" height="12" rx="6"/></g>
</svg>
`;

const CATALOG_PREVIEW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="560" viewBox="0 0 720 560" role="img" aria-label="Searchable catalog preview">
<rect width="720" height="560" rx="0" fill="#ffffff"/>
<rect x="40" y="40" width="640" height="64" rx="12" fill="#f6f4ef" stroke="#d8dde8"/>
<circle cx="72" cy="72" r="12" fill="#18a7b5"/><rect x="98" y="64" width="260" height="16" rx="8" fill="#5d667830"/><rect x="510" y="58" width="120" height="28" rx="8" fill="#111827"/>
<g stroke="#d8dde8" fill="#fbfaf7"><rect x="40" y="138" width="190" height="156" rx="12"/><rect x="264" y="138" width="190" height="156" rx="12"/><rect x="488" y="138" width="190" height="156" rx="12"/><rect x="40" y="326" width="190" height="156" rx="12"/><rect x="264" y="326" width="190" height="156" rx="12"/><rect x="488" y="326" width="190" height="156" rx="12"/></g>
<g fill="#111827"><rect x="62" y="166" width="118" height="16" rx="8"/><rect x="286" y="166" width="132" height="16" rx="8"/><rect x="510" y="166" width="112" height="16" rx="8"/><rect x="62" y="354" width="124" height="16" rx="8"/><rect x="286" y="354" width="104" height="16" rx="8"/><rect x="510" y="354" width="132" height="16" rx="8"/></g>
<g fill="#5d667850"><rect x="62" y="202" width="140" height="10" rx="5"/><rect x="62" y="224" width="110" height="10" rx="5"/><rect x="286" y="202" width="136" height="10" rx="5"/><rect x="286" y="224" width="116" height="10" rx="5"/><rect x="510" y="202" width="120" height="10" rx="5"/><rect x="510" y="224" width="96" height="10" rx="5"/><rect x="62" y="390" width="136" height="10" rx="5"/><rect x="62" y="412" width="104" height="10" rx="5"/><rect x="286" y="390" width="134" height="10" rx="5"/><rect x="286" y="412" width="110" height="10" rx="5"/><rect x="510" y="390" width="130" height="10" rx="5"/><rect x="510" y="412" width="98" height="10" rx="5"/></g>
<g fill="#18a7b5"><circle cx="74" cy="264" r="6"/><circle cx="298" cy="264" r="6"/><circle cx="522" cy="264" r="6"/></g><g fill="#2f9f67"><circle cx="74" cy="452" r="6"/><circle cx="298" cy="452" r="6"/><circle cx="522" cy="452" r="6"/></g>
</svg>
`;

const INTEGRATIONS_MAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="720" viewBox="0 0 900 720" role="img" aria-label="Integration map visual">
<defs><linearGradient id="core" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#18a7b5"/><stop offset="1" stop-color="#2f9f67"/></linearGradient></defs>
<rect width="900" height="720" fill="#0d1422"/>
<circle cx="450" cy="360" r="128" fill="#111827" stroke="url(#core)" stroke-width="5"/>
<circle cx="450" cy="360" r="72" fill="#172132" stroke="#ffffff2c" stroke-width="2"/>
<path d="M428 348h44v38h-44z" fill="none" stroke="#d8ffe9" stroke-width="5" rx="8"/><path d="M438 348v-18c0-25 24-25 24 0v18" fill="none" stroke="#d8ffe9" stroke-width="6" stroke-linecap="round"/>
<g stroke="#ffffff2f" stroke-width="2"><path d="M450 232V86"/><path d="M560 300l147-92"/><path d="M574 426l145 90"/><path d="M450 488v146"/><path d="M326 424l-145 92"/><path d="M340 298L193 206"/></g>
<g fill="#151d2f" stroke="#ffffff28" stroke-width="2"><rect x="350" y="34" width="200" height="88" rx="16"/><rect x="650" y="158" width="190" height="88" rx="16"/><rect x="650" y="474" width="190" height="88" rx="16"/><rect x="350" y="598" width="200" height="88" rx="16"/><rect x="60" y="474" width="190" height="88" rx="16"/><rect x="60" y="158" width="190" height="88" rx="16"/></g>
<g fill="#ffffff70"><circle cx="382" cy="78" r="9"/><rect x="404" y="70" width="104" height="14" rx="7"/><circle cx="682" cy="202" r="9"/><rect x="704" y="194" width="92" height="14" rx="7"/><circle cx="682" cy="518" r="9"/><rect x="704" y="510" width="94" height="14" rx="7"/><circle cx="382" cy="642" r="9"/><rect x="404" y="634" width="110" height="14" rx="7"/><circle cx="92" cy="518" r="9"/><rect x="114" y="510" width="98" height="14" rx="7"/><circle cx="92" cy="202" r="9"/><rect x="114" y="194" width="106" height="14" rx="7"/></g>
<g fill="#18a7b5"><circle cx="450" cy="86" r="7"/><circle cx="707" cy="208" r="7"/></g><g fill="#2f9f67"><circle cx="719" cy="516" r="7"/><circle cx="450" cy="634" r="7"/></g><g fill="#c78a1b"><circle cx="181" cy="516" r="7"/><circle cx="193" cy="206" r="7"/></g>
</svg>
`;

function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
