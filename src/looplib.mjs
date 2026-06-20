import { copyFileSync, readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
  const siteUrl = (process.env.AGENT_LOOP_KIT_PUBLIC_URL || 'https://palette-lab.github.io/agent-loop-kit').replace(/\/$/, '');
  const sourceAssetsDir = join(repoRoot, 'site', 'assets');
  const heroImageName = existsSync(join(sourceAssetsDir, 'agent-loop-hero.png')) ? 'agent-loop-hero.png' : 'hero-contracts.svg';
  const proofImageName = existsSync(join(sourceAssetsDir, 'agent-loop-proof.png')) ? 'agent-loop-proof.png' : 'evidence-gates.svg';
  const socialImageUrl = `${siteUrl}/assets/${heroImageName}`;
  const pageDescription = 'Open, schema-validated completion contracts for AI coding agents with checks, evidence, stop conditions, approval gates, CLI export, MCP, AGENTS.md, ARD, and bilingual English/Korean guidance.';
  const jsonLd = JSON.stringify(buildStructuredData(loops, siteUrl, socialImageUrl), null, 2);
  const featuredIds = ['completion-contract', 'ticket-to-pr-proof', 'prompt-injection-threat-model', 'fresh-clone-contract'];
  const featured = featuredIds.map((id) => findLoop(id, loops)).filter(Boolean);
  const featuredCards = featured.map((loop, index) => `<article class="feature-card"><p class="meta">0${index + 1} / ${loop.category} / ${loop.riskLevel}</p><h3>${escapeHtml(loop.title)}</h3><p>${escapeHtml(loop.summary)}</p><code>agent-loop-kit copy ${loop.id}</code></article>`).join('\n');
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
<meta name="description" content="${escapeHtml(pageDescription)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="bingbot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="Palette Lab">
<meta name="keywords" content="AI agents, coding agents, agent loops, prompt engineering, MCP, AGENTS.md, Claude Code, Cursor, Gemini CLI, GitHub Copilot, AI Studio, agent reliability, completion contracts">
<link rel="canonical" href="${siteUrl}/">
<link rel="alternate" hreflang="en" href="${siteUrl}/?lang=en">
<link rel="alternate" hreflang="ko" href="${siteUrl}/?lang=ko">
<link rel="alternate" hreflang="x-default" href="${siteUrl}/">
<link rel="sitemap" type="application/xml" href="${siteUrl}/sitemap.xml">
<link rel="alternate" type="text/plain" href="${siteUrl}/llms.txt" title="LLMs summary">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Agent Loop Kit">
<meta property="og:title" content="Agent Loop Kit - Completion contracts for AI coding agents">
<meta property="og:description" content="${escapeHtml(pageDescription)}">
<meta property="og:url" content="${siteUrl}/">
<meta property="og:image" content="${socialImageUrl}">
<meta property="og:image:alt" content="Abstract visual of AI agent loop contracts with checks, evidence, and approval gates">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Agent Loop Kit - Completion contracts for AI coding agents">
<meta name="twitter:description" content="${escapeHtml(pageDescription)}">
<meta name="twitter:image" content="${socialImageUrl}">
<script type="application/ld+json">${escapeScriptJson(jsonLd)}</script>
<title>Agent Loop Kit</title>
<style>
* { box-sizing: border-box; }
:root {
  color-scheme: light;
  --ink:#111827;
  --muted:#5d6678;
  --line:#d8dde8;
  --paper:#f7f7f4;
  --white:#ffffff;
  --night:#101522;
  --cyan:#18a7b5;
  --green:#2f9f67;
  --amber:#c78a1b;
  --rose:#b8555d;
  --shadow:0 20px 60px rgba(17,24,39,.14);
}
html { scroll-behavior: smooth; }
body { margin:0; font:16px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; background:var(--paper); color:var(--ink); }
a { color:inherit; text-decoration:none; }
.lang-ko { display:none; }
body[data-lang="ko"] .lang-en { display:none; }
body[data-lang="ko"] .lang-ko { display:inline; }
body[data-lang="ko"] p.lang-ko { display:block; }
.site-nav { position:sticky; top:0; z-index:5; background:rgba(247,247,244,.94); border-bottom:1px solid #1118271a; backdrop-filter:blur(12px); }
.nav-inner { max-width:1180px; margin:auto; padding:14px 24px; display:flex; align-items:center; justify-content:space-between; gap:18px; }
.brand { font-weight:900; font-size:17px; letter-spacing:0; display:flex; align-items:center; gap:12px; }
.brand-logo { width:100px; height:auto; display:block; }
.brand-divider { width:1px; height:20px; background:#11182733; }
.brand-text { white-space:nowrap; }
.nav-links { display:flex; align-items:center; gap:20px; color:#111827; font-size:13px; font-weight:700; text-transform:uppercase; }
.lang-toggle { display:flex; gap:4px; padding:4px; border:1px solid #11182726; border-radius:999px; background:#fff; }
.lang-toggle button { min-height:28px; padding:4px 10px; border:0; border-radius:999px; background:transparent; font-size:12px; }
body[data-lang="en"] .lang-toggle button[data-set-lang="en"], body[data-lang="ko"] .lang-toggle button[data-set-lang="ko"] { background:#111827; color:#fff; }
.hero { background:#050505; color:var(--white); min-height:86vh; display:grid; align-items:center; border-bottom:1px solid #000; }
.hero-inner { max-width:1180px; margin:auto; padding:78px 24px 52px; display:grid; grid-template-columns:minmax(0,1fr) minmax(360px,520px); gap:56px; align-items:center; }
.hero-logo { width:118px; height:auto; filter:invert(1); margin:0 0 34px; opacity:.94; }
.eyebrow { color:#ffffffa8; font-size:13px; font-weight:800; text-transform:uppercase; margin:0 0 16px; letter-spacing:0; }
h1 { font-size:72px; line-height:.98; margin:0 0 24px; max-width:780px; font-weight:900; }
.hero-copy { color:#cbd3df; font-size:20px; max-width:680px; margin:0 0 28px; }
.actions { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:28px; }
.button { border:1px solid #ffffff33; border-radius:8px; padding:12px 16px; font-weight:800; background:#ffffff; color:#101522; }
.button.secondary { background:transparent; color:#ffffff; }
.terminal { border:1px solid #ffffff24; border-radius:8px; background:#080b13; color:#dbeafe; padding:14px 16px; max-width:620px; overflow:auto; }
.terminal code { font:14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
.hero-art { width:100%; border-radius:6px; box-shadow:0 32px 80px #0008; border:1px solid #ffffff1f; display:block; background:#151b2a; }
.visual-strip { display:grid; grid-template-columns:1.15fr .85fr; gap:18px; align-items:stretch; }
.visual-strip img { width:100%; height:100%; object-fit:cover; display:block; border:1px solid #1118271c; border-radius:6px; background:#fff; box-shadow:var(--shadow); }
.bars { display:grid; gap:10px; }
.bar { height:10px; border-radius:8px; background:#ffffff1a; overflow:hidden; }
.bar span { display:block; height:100%; background:var(--cyan); }
.rail { display:grid; gap:10px; }
.rail div { display:flex; align-items:center; gap:10px; color:#d7deeb; font-size:14px; }
.dot { width:12px; height:12px; border-radius:50%; background:var(--green); flex:0 0 auto; }
.dot.amber { background:var(--amber); }
.dot.rose { background:var(--rose); }
.metrics { background:#ffffff; border-bottom:1px solid #1118271a; }
.metrics-inner { max-width:1180px; margin:auto; padding:24px; display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.metric { border:1px solid #1118271a; border-radius:6px; padding:18px; background:#fff; }
.metric strong { display:block; font-size:32px; line-height:1; }
.metric span { color:var(--muted); font-size:14px; }
.section { max-width:1180px; margin:auto; padding:84px 24px; }
.section-head { max-width:760px; margin-bottom:28px; }
.section-head h2 { font-size:44px; line-height:1.02; margin:0 0 14px; font-weight:900; }
.section-head p { color:var(--muted); font-size:18px; margin:0; }
.section-kicker { font-size:13px; font-weight:900; text-transform:uppercase; color:#111827; margin:0 0 14px; }
.korean-note { border:1px solid #1118271a; background:#ffffff; color:#384154; border-radius:6px; padding:16px 18px; margin-top:22px; }
.why-grid { display:grid; grid-template-columns:minmax(0, .9fr) minmax(0, 1.1fr); gap:28px; align-items:start; }
.why-copy { position:sticky; top:92px; }
.proof-panel { border:1px solid #1118271a; border-radius:6px; background:#fff; box-shadow:var(--shadow); padding:24px; }
.proof-title { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:18px; color:#111827; font-weight:900; }
.proof-title span { color:#5d6678; font-size:13px; text-transform:uppercase; }
.featured-section { padding-top:0; }
.featured-head { display:flex; justify-content:space-between; align-items:end; gap:24px; margin-bottom:18px; border-top:1px solid #1118271a; padding-top:34px; }
.featured-head h3 { font-size:28px; line-height:1.1; margin:0; }
.featured-head p { margin:0; color:var(--muted); max-width:520px; }
.feature-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.feature-card, .integration, .loop-card { border:1px solid #1118271a; border-radius:6px; background:var(--white); padding:18px; }
.feature-card h3, .loop-card h3 { margin:0 0 8px; font-size:20px; }
.feature-card p, .loop-card p { color:var(--muted); margin:0 0 14px; }
.feature-card code { display:block; overflow:auto; border:1px solid #1118271a; border-radius:6px; padding:10px; background:#f2f4f7; color:#273246; font-size:13px; }
.meta, .loop-top { color:var(--muted); font-size:13px; font-weight:800; text-transform:uppercase; margin:0 0 10px; }
.proof-flow { display:grid; gap:0; border-top:1px solid #1118271a; }
.proof-step { display:grid; grid-template-columns:68px minmax(0,1fr); gap:18px; padding:20px 0; border-bottom:1px solid #1118271a; background:transparent; }
.proof-step strong { display:block; margin-bottom:6px; font-size:18px; }
.proof-step span { color:var(--muted); }
.proof-num { font-size:28px; line-height:1; font-weight:900; color:#111827; }
.image-band { max-width:1180px; margin:0 auto; padding:0 24px 84px; }
.usage { background:#fff; border-top:1px solid #1118271a; border-bottom:1px solid #1118271a; }
.command-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.command-card { border:1px solid #1118271a; border-radius:6px; background:#f7f7f4; padding:18px; display:grid; gap:14px; }
.command-card strong { font-size:18px; }
.command-card p { color:var(--muted); margin:0; }
.command-card pre { margin:0; min-height:112px; }
.integrations { background:#050505; color:#ffffff; }
.integrations .section-head p { color:#cbd3df; }
.integrations-visual { display:grid; grid-template-columns:.95fr 1.05fr; gap:24px; align-items:center; }
.integrations-visual img { width:100%; display:block; border:1px solid #ffffff24; border-radius:6px; background:#0d1422; box-shadow:0 24px 70px #0005; }
.integration-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.integration { background:#ffffff0f; border-color:#ffffff24; color:#ffffff; }
.integration strong { display:block; margin-bottom:8px; }
.integration span { color:#d0d7e5; }
.catalog { background:#ffffff; border-top:1px solid var(--line); }
.toolbar { display:grid; gap:14px; margin-bottom:22px; }
input { width:100%; min-height:48px; padding:12px 14px; border:1px solid #1118271a; border-radius:6px; background:#ffffff; color:inherit; font:inherit; }
.filters { display:flex; flex-wrap:wrap; gap:8px; }
button { border:1px solid #1118271a; border-radius:6px; background:#f7f8fb; color:inherit; cursor:pointer; min-height:38px; padding:8px 12px; font:inherit; font-weight:700; }
button span { color:var(--muted); }
.catalog-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.loop-top { display:flex; justify-content:space-between; gap:10px; }
.loop-card ul { margin:0 0 14px; padding-left:18px; color:#384154; }
.tags span { display:inline-block; border:1px solid #1118271a; border-radius:6px; padding:2px 7px; margin:2px 4px 2px 0; font-size:12px; color:#536075; }
details { margin-top:12px; }
summary { cursor:pointer; font-weight:800; }
pre { white-space:pre-wrap; overflow:auto; border:1px solid var(--line); border-radius:8px; padding:1rem; background:#111827; color:#e5e7eb; font-size:13px; }
footer { border-top:1px solid var(--line); background:#ffffff; color:var(--muted); }
footer .section { padding-top:28px; padding-bottom:28px; }
@media (max-width: 920px) {
  h1 { font-size:42px; }
  .hero-inner, .why-grid, .visual-strip, .integrations-visual { grid-template-columns:1fr; }
  .why-copy { position:static; }
  .metrics-inner, .feature-grid, .integration-grid, .catalog-grid, .command-grid { grid-template-columns:1fr 1fr; }
}
@media (max-width: 640px) {
  .nav-links a { display:none; }
  .hero-inner { padding-top:48px; }
  h1 { font-size:36px; }
  .hero-copy { font-size:18px; }
  .metrics-inner, .feature-grid, .integration-grid, .catalog-grid, .command-grid { grid-template-columns:1fr; }
}
</style>
</head>
<body data-lang="en">
<nav class="site-nav"><div class="nav-inner"><a class="brand" href="#"><img class="brand-logo" src="https://pltt.ai/landing_logo.svg" alt="" onerror="this.style.display='none'"><span class="brand-divider"></span><span class="brand-text">Agent Loop Kit</span></a><div class="nav-links"><a href="#why"><span class="lang-en">Why</span><span class="lang-ko">소개</span></a><a href="#integrations"><span class="lang-en">Integrations</span><span class="lang-ko">연동</span></a><a href="#catalog"><span class="lang-en">Catalog</span><span class="lang-ko">카탈로그</span></a><a href="https://github.com/palette-lab/agent-loop-kit">GitHub</a><div class="lang-toggle" aria-label="Language"><button type="button" data-set-lang="en">EN</button><button type="button" data-set-lang="ko">KR</button></div></div></div></nav>
<header class="hero"><div class="hero-inner"><div><img class="hero-logo" src="https://pltt.ai/landing_logo.svg" alt="" onerror="this.style.display='none'"><p class="eyebrow"><span class="lang-en">Artful Craft, Reliable Agents</span><span class="lang-ko">감각적인 설계, 신뢰할 수 있는 에이전트</span></p><h1><span class="lang-en">Stop shipping agent work without proof.</span><span class="lang-ko">증거 없는 에이전트 작업 완료를 막으세요.</span></h1><p class="hero-copy lang-en">Agent Loop Kit turns reusable prompts into schema-validated completion contracts with checks, evidence, stop conditions, approval gates, CLI export, MCP, AGENTS.md, and ARD discovery.</p><p class="hero-copy lang-ko">Agent Loop Kit은 재사용 프롬프트를 체크, 증거, 중지 조건, 승인 게이트가 포함된 스키마 검증 완료 계약으로 바꿉니다. CLI, MCP, AGENTS.md, ARD 검색까지 지원합니다.</p><div class="actions"><a class="button" href="#catalog"><span class="lang-en">Browse loops</span><span class="lang-ko">루프 보기</span></a><a class="button secondary" href="https://github.com/palette-lab/agent-loop-kit"><span class="lang-en">View on GitHub</span><span class="lang-ko">GitHub 보기</span></a></div><pre class="terminal"><code>npx agent-loop-kit search "prompt injection"
npx agent-loop-kit copy completion-contract
npx agent-loop-kit export-instructions --target claude</code></pre></div><img class="hero-art" src="assets/${heroImageName}" alt="" aria-hidden="true"></div></header>
<section class="metrics"><div class="metrics-inner"><div class="metric"><strong>${loops.length}</strong><span class="lang-en">validated loops</span><span class="lang-ko">검증된 루프</span></div><div class="metric"><strong>${totalChecks}</strong><span class="lang-en">quality checks</span><span class="lang-ko">품질 체크</span></div><div class="metric"><strong>${totalEvidence}</strong><span class="lang-en">evidence requirements</span><span class="lang-ko">증거 요구사항</span></div><div class="metric"><strong>${totalApprovals}</strong><span class="lang-en">approval gates</span><span class="lang-ko">승인 게이트</span></div></div></section>
<section class="section" id="why"><div class="why-grid"><div class="why-copy"><p class="section-kicker">01 / Contract</p><div class="section-head"><h2><span class="lang-en">A prompt library is not enough.</span><span class="lang-ko">프롬프트 모음만으로는 부족합니다.</span></h2><p class="lang-en">Each loop defines the task boundary, bounded iteration, completion checks, stop conditions, evidence, and approval gates. That makes agent work easier to review and harder to overclaim.</p><p class="lang-ko">각 루프는 작업 범위, 반복 절차, 완료 체크, 중지 조건, 증거, 승인 게이트를 정의합니다. 그래서 에이전트 결과를 검토하기 쉽고, 미완료 작업을 완료처럼 말하기 어렵습니다.</p><div class="korean-note"><span class="lang-en">English and Korean guidance is included for repository instructions, Claude Code, Cursor, Gemini CLI, Google AI Studio, Google Stitch, and MCP.</span><span class="lang-ko">저장소 지침, Claude Code, Cursor, Gemini CLI, Google AI Studio, Google Stitch, MCP 사용법을 영어와 한국어로 제공합니다.</span></div></div></div><div class="proof-panel"><div class="proof-title"><strong><span class="lang-en">Completion contract</span><span class="lang-ko">완료 계약</span></strong><span>checks / evidence / gates</span></div><div class="proof-flow"><div class="proof-step"><div class="proof-num">01</div><div><strong><span class="lang-en">Bound the task</span><span class="lang-ko">작업 범위 설정</span></strong><span class="lang-en">Name the scope, inputs, risk, budget, and allowed actions before work begins.</span><span class="lang-ko">시작 전에 범위, 입력, 위험도, 예산, 허용된 행동을 정합니다.</span></div></div><div class="proof-step"><div class="proof-num">02</div><div><strong><span class="lang-en">Iterate with checks</span><span class="lang-ko">체크와 함께 반복</span></strong><span class="lang-en">Run the loop in small passes and keep quality gates visible.</span><span class="lang-ko">작은 단위로 반복하고 품질 게이트를 계속 확인합니다.</span></div></div><div class="proof-step"><div class="proof-num">03</div><div><strong><span class="lang-en">Stop deliberately</span><span class="lang-ko">명확하게 중지</span></strong><span class="lang-en">Exit on success, blocked state, stalled progress, or approval-gated work.</span><span class="lang-ko">성공, 차단, 정체, 승인 필요 상태에서 명확히 멈춥니다.</span></div></div><div class="proof-step"><div class="proof-num">04</div><div><strong><span class="lang-en">Return evidence</span><span class="lang-ko">증거 반환</span></strong><span class="lang-en">Finish with tests, logs, screenshots, citations, diffs, or reviewer notes.</span><span class="lang-ko">테스트, 로그, 스크린샷, 출처, diff, 리뷰 노트로 마무리합니다.</span></div></div></div></div></div></section>
<section class="image-band"><div class="visual-strip"><img src="assets/${proofImageName}" alt="" aria-hidden="true"><img src="assets/catalog-preview.svg" alt="" aria-hidden="true"></div></section>
<section class="section featured-section"><div class="featured-head"><h3><span class="lang-en">Start with the loops that make completion visible.</span><span class="lang-ko">완료 기준을 눈에 보이게 만드는 루프부터 시작하세요.</span></h3><p class="lang-en">Use these first when an agent needs to change code, prove a fix, or handle risk.</p><p class="lang-ko">에이전트가 코드를 바꾸거나 수정 증거를 남기거나 위험을 다룰 때 먼저 사용하세요.</p></div><div class="feature-grid">${featuredCards}</div></section>
<section class="usage"><div class="section"><p class="section-kicker">02 / Use</p><div class="section-head"><h2><span class="lang-en">Drop contracts into the agent surface you already use.</span><span class="lang-ko">이미 쓰는 에이전트 환경에 계약을 바로 넣으세요.</span></h2><p class="lang-en">Search, copy, export, or expose loops through MCP without adding runtime dependencies.</p><p class="lang-ko">런타임 의존성을 추가하지 않고 루프를 검색, 복사, 내보내기, MCP로 노출할 수 있습니다.</p></div><div class="command-grid"><article class="command-card"><strong>CLI</strong><p class="lang-en">Find and copy the right loop for a task.</p><p class="lang-ko">작업에 맞는 루프를 찾고 복사합니다.</p><pre><code>npx agent-loop-kit search "regression"
npx agent-loop-kit copy completion-contract</code></pre></article><article class="command-card"><strong>Instructions</strong><p class="lang-en">Export repository instructions for your coding agent.</p><p class="lang-ko">코딩 에이전트용 저장소 지침을 내보냅니다.</p><pre><code>npx agent-loop-kit export-instructions --target claude
npx agent-loop-kit export-instructions --target cursor</code></pre></article><article class="command-card"><strong>MCP</strong><p class="lang-en">Expose loops as prompts, resources, and tools.</p><p class="lang-ko">루프를 프롬프트, 리소스, 도구로 노출합니다.</p><pre><code>node bin/agent-loop-mcp.mjs</code></pre></article></div></div></section>
<section class="integrations" id="integrations"><div class="section"><div class="integrations-visual"><img src="assets/integrations-map.svg" alt="" aria-hidden="true"><div><p class="section-kicker" style="color:#fff">03 / Integrations</p><div class="section-head"><h2><span class="lang-en">Portable across agent tools.</span><span class="lang-ko">여러 에이전트 도구에서 그대로 사용합니다.</span></h2><p class="lang-en">Export the same loop contracts into the instruction format your team already uses.</p><p class="lang-ko">팀이 이미 쓰는 지침 형식으로 같은 루프 계약을 내보냅니다.</p></div><div class="integration-grid">${integrationTargets}</div></div></div></div></section>
<section class="catalog" id="catalog"><div class="section"><p class="section-kicker">04 / Catalog</p><div class="section-head"><h2><span class="lang-en">Search the loop catalog.</span><span class="lang-ko">루프 카탈로그 검색</span></h2><p class="lang-en">Find reusable contracts for engineering, security, evaluation, design, product, content, data, operations, and multi-agent work.</p><p class="lang-ko">엔지니어링, 보안, 평가, 디자인, 제품, 콘텐츠, 데이터, 운영, 멀티 에이전트 작업에 맞는 재사용 가능한 계약을 찾으세요.</p></div><div class="toolbar"><input id="q" placeholder="Search loops, checks, tags, categories..."><div class="filters"><button type="button" data-filter="all">all <span>${loops.length}</span></button> ${categoryList}</div></div><main class="catalog-grid">${cards}</main></div></section>
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
  writeDiscoveryFiles(outDir, loops, siteUrl, socialImageUrl);
  return { count: loops.length, outDir };
}

function writeSiteAssets(outDir) {
  const assetsDir = join(outDir, 'assets');
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });
  const sourceAssetsDir = join(repoRoot, 'site', 'assets');
  if (existsSync(sourceAssetsDir)) {
    for (const file of readdirSync(sourceAssetsDir).filter((name) => /\.(png|jpe?g|webp|svg)$/i.test(name))) {
      copyFileSync(join(sourceAssetsDir, file), join(assetsDir, file));
    }
  }
  writeFileSync(join(assetsDir, 'hero-contracts.svg'), HERO_CONTRACTS_SVG);
  writeFileSync(join(assetsDir, 'evidence-gates.svg'), EVIDENCE_GATES_SVG);
  writeFileSync(join(assetsDir, 'catalog-preview.svg'), CATALOG_PREVIEW_SVG);
  writeFileSync(join(assetsDir, 'integrations-map.svg'), INTEGRATIONS_MAP_SVG);
}

function writeDiscoveryFiles(outDir, loops, siteUrl, socialImageUrl) {
  const updated = loops.map((loop) => loop.updated).sort().at(-1) || new Date().toISOString().slice(0, 10);
  const sitemapUrls = [
    { loc: `${siteUrl}/`, priority: '1.0' },
    { loc: `${siteUrl}/loops.json`, priority: '0.8' },
    { loc: `${siteUrl}/llms.txt`, priority: '0.7' },
    { loc: `${siteUrl}/llms-full.txt`, priority: '0.7' },
    { loc: `${siteUrl}/.well-known/ai-catalog.json`, priority: '0.7' },
    ...loops.map((loop) => ({ loc: `${siteUrl}/loops/${loop.id}.md`, priority: '0.6', lastmod: loop.updated }))
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((item) => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <lastmod>${item.lastmod || updated}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  const robots = `User-agent: *
Allow: /

# Agent and AI discovery surfaces
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /loops.json
Allow: /loops/
Allow: /.well-known/ai-catalog.json

Sitemap: ${siteUrl}/sitemap.xml
`;
  const topLoops = ['completion-contract', 'ticket-to-pr-proof', 'prompt-injection-threat-model', 'fresh-clone-contract']
    .map((id) => findLoop(id, loops))
    .filter(Boolean);
  const llms = `# Agent Loop Kit

Agent Loop Kit is an open-source library of schema-validated completion contracts for AI coding agents.

Use it when an agent needs explicit task boundaries, bounded iteration steps, checks, stop conditions, evidence requirements, and human approval gates.

## Core URLs

- Website: ${siteUrl}/
- Machine-readable loops: ${siteUrl}/loops.json
- AI catalog: ${siteUrl}/.well-known/ai-catalog.json
- Sitemap: ${siteUrl}/sitemap.xml
- GitHub: https://github.com/palette-lab/agent-loop-kit

## Capabilities

- CLI search, show, copy, validate, site build, and instruction export.
- MCP stdio server exposing loops as prompts, resources, and search tools.
- Exports for AGENTS.md, CLAUDE.md, GEMINI.md, Cursor rules, Google AI Studio, and Google Stitch.
- English and Korean guidance.

## Recommended loops

${topLoops.map((loop) => `- ${loop.title}: ${loop.summary} (${siteUrl}/loops/${loop.id}.md)`).join('\n')}
`;
  const llmsFull = `# Agent Loop Kit Full Context

Website: ${siteUrl}/
Repository: https://github.com/palette-lab/agent-loop-kit
Image: ${socialImageUrl}

Agent Loop Kit provides validated agent loop contracts. Each loop includes inputs, steps, checks, stop conditions, evidence requirements, human approval gates, compatible agents, and a copyable prompt.

## All Loops

${loops.map((loop) => `### ${loop.title}

- ID: ${loop.id}
- Category: ${loop.category}
- Risk: ${loop.riskLevel}
- Tags: ${loop.tags.join(', ')}
- URL: ${siteUrl}/loops/${loop.id}.md
- Summary: ${loop.summary}
- Checks: ${loop.checks.join('; ')}
- Evidence: ${loop.evidence.join('; ')}
- Stop conditions: ${loop.stopConditions.join('; ')}
`).join('\n')}
`;
  const humans = `/* TEAM */
Maintainer: Palette Lab
Site: ${siteUrl}/
Repository: https://github.com/palette-lab/agent-loop-kit

/* SITE */
Standards: HTML, CSS, JSON-LD, ARD AI Catalog, llms.txt, sitemap.xml
Language: English, Korean
License: MIT
`;
  writeFileSync(join(outDir, 'sitemap.xml'), sitemap);
  writeFileSync(join(outDir, 'robots.txt'), robots);
  writeFileSync(join(outDir, 'llms.txt'), llms);
  writeFileSync(join(outDir, 'llms-full.txt'), llmsFull);
  writeFileSync(join(outDir, 'humans.txt'), humans);
}

function buildStructuredData(loops, siteUrl, imageUrl) {
  const updated = loops.map((loop) => loop.updated).sort().at(-1) || new Date().toISOString().slice(0, 10);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'Agent Loop Kit',
        url: `${siteUrl}/`,
        inLanguage: ['en', 'ko'],
        description: 'Open, schema-validated completion contracts for AI coding agents.',
        publisher: { '@id': `${siteUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Palette Lab',
        url: 'https://pltt.xyz/en',
        logo: 'https://pltt.ai/landing_logo.svg'
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': `${siteUrl}/#software`,
        name: 'Agent Loop Kit',
        codeRepository: 'https://github.com/palette-lab/agent-loop-kit',
        programmingLanguage: 'JavaScript',
        runtimePlatform: 'Node.js',
        license: 'https://opensource.org/license/mit',
        dateModified: updated,
        image: imageUrl,
        applicationCategory: 'DeveloperTool',
        operatingSystem: 'macOS, Linux, Windows',
        description: 'A zero-dependency Node.js toolkit for validated AI agent loop contracts, CLI export, MCP, AGENTS.md, ARD, and bilingual documentation.'
      },
      {
        '@type': 'Dataset',
        '@id': `${siteUrl}/#loop-catalog`,
        name: 'Agent Loop Kit Loop Catalog',
        url: `${siteUrl}/loops.json`,
        license: 'https://opensource.org/license/mit',
        dateModified: updated,
        inLanguage: ['en', 'ko'],
        description: `${loops.length} machine-readable AI agent loop contracts with checks, evidence, stop conditions, and approval gates.`,
        distribution: [
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${siteUrl}/loops.json`
          },
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${siteUrl}/.well-known/ai-catalog.json`
          }
        ]
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${siteUrl}/#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${siteUrl}/#catalog` }
        ]
      }
    ]
  };
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

function escapeXml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function escapeScriptJson(text) {
  return String(text).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}
