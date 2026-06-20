import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const cli = new URL('../bin/agent-loop-kit.mjs', import.meta.url).pathname;

test('cli list returns loops', () => {
  const output = execFileSync(process.execPath, [cli, 'list'], { encoding: 'utf8' });
  assert.match(output, /completion-contract/);
});

test('cli validate succeeds', () => {
  const output = execFileSync(process.execPath, [cli, 'validate'], { encoding: 'utf8' });
  assert.match(output, /OK:/);
});

test('cli exposes instruction export command', () => {
  const output = execFileSync(process.execPath, [cli, 'help'], { encoding: 'utf8' });
  assert.match(output, /export-instructions/);
});
