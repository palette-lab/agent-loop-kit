#!/usr/bin/env node
import { findLoop, loadLoops, renderLoop, searchLoops } from '../src/looplib.mjs';

const loops = loadLoops();
const serverInfo = { name: 'agent-loop-kit', version: '0.1.0' };

process.stdout.on('error', (err) => {
  if (err && err.code === 'EPIPE') process.exit(0);
  throw err;
});

function result(id, value) {
  return JSON.stringify({ jsonrpc: '2.0', id, result: value }) + '\n';
}

function error(id, code, message) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n';
}

function handle(message) {
  const { id, method, params = {} } = message;
  if (method === 'initialize') {
    return result(id, {
      protocolVersion: params.protocolVersion ?? '2025-06-18',
      capabilities: { prompts: {}, resources: {}, tools: {} },
      serverInfo
    });
  }
  if (method === 'notifications/initialized') return '';
  if (method === 'prompts/list') {
    return result(id, { prompts: loops.map((loop) => ({
      name: loop.id,
      title: loop.title,
      description: loop.summary,
      arguments: loop.inputs.map((name) => ({ name, description: `Value for ${name}`, required: true }))
    })) });
  }
  if (method === 'prompts/get') {
    const loop = findLoop(params.name, loops);
    if (!loop) return error(id, -32602, `Unknown loop: ${params.name}`);
    return result(id, {
      description: loop.summary,
      messages: [{ role: 'user', content: { type: 'text', text: renderLoop(loop, 'prompt') } }]
    });
  }
  if (method === 'resources/list') {
    return result(id, { resources: loops.map((loop) => ({ uri: `loop://${loop.id}`, name: loop.title, description: loop.summary, mimeType: 'text/markdown' })) });
  }
  if (method === 'resources/read') {
    const idFromUri = String(params.uri || '').replace('loop://', '');
    const loop = findLoop(idFromUri, loops);
    if (!loop) return error(id, -32602, `Unknown resource: ${params.uri}`);
    return result(id, { contents: [{ uri: params.uri, mimeType: 'text/markdown', text: renderLoop(loop, 'full') }] });
  }
  if (method === 'tools/list') {
    return result(id, { tools: [{
      name: 'search_loops',
      description: 'Search Agent Loop Kit for a loop by query, category, or tag.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' }, category: { type: 'string' }, tag: { type: 'string' } },
        required: ['query']
      }
    }] });
  }
  if (method === 'tools/call') {
    if (params.name !== 'search_loops') return error(id, -32602, `Unknown tool: ${params.name}`);
    const found = searchLoops(params.arguments?.query ?? '', { category: params.arguments?.category, tag: params.arguments?.tag, loops });
    return result(id, { content: [{ type: 'text', text: found.slice(0, 10).map((loop) => `${loop.id}: ${loop.summary}`).join('\n') }] });
  }
  return error(id, -32601, `Method not found: ${method}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    try {
      const reply = handle(JSON.parse(line));
      if (reply) process.stdout.write(reply);
    } catch (err) {
      process.stdout.write(error(null, -32700, err.message));
    }
  }
});
