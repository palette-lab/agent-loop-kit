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
  const catalog = JSON.parse(readFileSync(join(out, '.well-known', 'ai-catalog.json'), 'utf8'));
  assert.equal(catalog.specVersion, '1.0');
  assert.ok(catalog.entries.some((entry) => entry.identifier.includes(':loop:completion-contract')));
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
