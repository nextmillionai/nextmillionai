#!/usr/bin/env node
/**
 * Claude Agent SDK harness — run a rep headlessly (evals, CI, cron).
 *
 *   node run-rep.mjs builder-rep "anything in my inbox?"
 *   node run-rep.mjs hirer-rep  "find an ai_engineer, remote, fleet work"
 *
 * Requires: npm install (this directory), ANTHROPIC_API_KEY, and the
 * relay running (NMA_NET_BASE, plus NMA_HIRE_TOKEN for hirer-rep).
 *
 * The harness keeps the embedding contract's guarantees (agents/AGENTS.md):
 *  - context assembled fresh per run from the bundle (no memory);
 *  - the rep only reaches the world through its MCP tool group;
 *  - mutations stay human-gated: any tool call carrying confirmed:true
 *    is DENIED unless NMA_REP_ALLOW_CONFIRM=1 (eval fixtures only) —
 *    headless runs may look, draft, and render approval cards, but a
 *    human session is where approvals happen.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');

const [rep, ...taskParts] = process.argv.slice(2);
const task = taskParts.join(' ');
if (!['builder-rep', 'hirer-rep'].includes(rep) || !task) {
  console.error('usage: run-rep.mjs <builder-rep|hirer-rep> "<task>"');
  process.exit(2);
}

const bundle = join(REPO, 'agents', rep);
const systemPrompt = [
  await readFile(join(bundle, 'AGENT.md'), 'utf-8'),
  '\n\n# policy.yaml (machine-readable red lines)\n\n```yaml\n'
    + await readFile(join(bundle, 'policy.yaml'), 'utf-8') + '\n```',
  '\n\n# Context rules\n\n' + await readFile(join(bundle, 'context.md'), 'utf-8'),
].join('');

/** The MCP child gets ONLY what it needs — never the parent's full env
 * (ANTHROPIC_API_KEY and whatever else the shell carries stay out of the
 * rep's tool process). PATH/HOME so node resolves and the identity file
 * lands under the right home. */
const pickEnv = (names) =>
  Object.fromEntries(names.filter((n) => process.env[n] !== undefined).map((n) => [n, process.env[n]]));
const SHARED_ENV = ['PATH', 'HOME', 'NEXTMILLIONAI_HOME', 'NMA_NET_BASE'];

const mcpServers = rep === 'builder-rep'
  ? {
      nextmillionai: {
        command: 'node',
        args: [join(REPO, 'nextmillionai-mcp', 'index.js')],
        env: pickEnv([...SHARED_ENV, 'NMA_NET_BUILDER_ID', 'NMA_NET_TOKEN', 'NEXTMILLIONAI_PROFILE_PATH']),
      },
    }
  : {
      'nextmillionai-hire': {
        command: 'node',
        args: [join(REPO, 'nextmillionai-hire-mcp', 'index.js')],
        env: pickEnv([...SHARED_ENV, 'NMA_HIRE_TOKEN']),
      },
    };

const allowConfirm = process.env.NMA_REP_ALLOW_CONFIRM === '1';

for await (const message of query({
  prompt: task,
  options: {
    systemPrompt,
    mcpServers,
    allowedTools: rep === 'builder-rep' ? ['mcp__nextmillionai'] : ['mcp__nextmillionai-hire'],
    permissionMode: 'default',
    canUseTool: async (toolName, input) => {
      if (input && input.confirmed === true && !allowConfirm) {
        return {
          behavior: 'deny',
          message: 'Headless runs cannot approve mutations: confirmed:true requires a human session (set NMA_REP_ALLOW_CONFIRM=1 only in eval fixtures).',
        };
      }
      return { behavior: 'allow', updatedInput: input };
    },
  },
})) {
  if (message.type === 'assistant') {
    for (const block of message.message.content) {
      if (block.type === 'text') process.stdout.write(block.text);
    }
  }
  if (message.type === 'result') {
    process.stdout.write('\n');
    process.exit(message.is_error ? 1 : 0);
  }
}
