import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCatalog, exportInstructions, findLoop, loadLoops, renderLoop, searchLoops, validateAll } from '../src/looplib.mjs';

test('all loop specs validate', () => {
  const result = validateAll();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.ok(result.count >= 40);
});

test('search finds security loops', () => {
  const results = searchLoops('prompt injection tools', { category: 'security' });
  assert.ok(results.some((loop) => loop.id === 'prompt-injection-threat-model'));
});

test('render prompt returns copyable text', () => {
  const loop = findLoop('completion-contract', loadLoops());
  assert.ok(loop);
  const prompt = renderLoop(loop, 'prompt');
  assert.match(prompt, /Stop when/);
  assert.match(prompt, /Finish with/);
});


test('buildCatalog emits ARD ai-catalog manifest and loop markdown', () => {
  const out = mkdtempSync(join(tmpdir(), 'agent-loop-kit-'));
  const result = buildCatalog(out);
  assert.ok(result.count >= 40);
  assert.ok(existsSync(join(out, '.well-known', 'ai-catalog.json')));
  assert.ok(existsSync(join(out, 'loops', 'completion-contract.md')));
  assert.ok(existsSync(join(out, 'assets', 'hero-contracts.svg')));
  assert.ok(existsSync(join(out, 'sitemap.xml')));
  assert.ok(existsSync(join(out, 'robots.txt')));
  assert.ok(existsSync(join(out, 'llms.txt')));
  assert.ok(existsSync(join(out, 'llms-full.txt')));
  const catalog = JSON.parse(readFileSync(join(out, '.well-known', 'ai-catalog.json'), 'utf8'));
  assert.equal(catalog.specVersion, '1.0');
  assert.ok(catalog.entries.some((entry) => entry.identifier.includes(':loop:completion-contract')));
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(html, /data-set-lang="ko"/);
  assert.match(html, /증거 없는 에이전트/);
  assert.match(html, /application\/ld\+json/);
  assert.match(readFileSync(join(out, 'robots.txt'), 'utf8'), /Sitemap:/);
  assert.match(readFileSync(join(out, 'llms.txt'), 'utf8'), /Agent Loop Kit/);
});

test('exportInstructions writes target-specific files', () => {
  const out = mkdtempSync(join(tmpdir(), 'agent-loop-kit-target-'));
  const cursorOut = join(out, '.cursor', 'rules', 'agent-loop-kit.mdc');
  const result = exportInstructions('cursor', ['completion-contract'], cursorOut);
  assert.equal(result.count, 1);
  assert.ok(existsSync(cursorOut));
  const content = readFileSync(cursorOut, 'utf8');
  assert.match(content, /alwaysApply: true/);
  assert.match(content, /Completion Contract Loop/);
});
