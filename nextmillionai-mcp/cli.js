#!/usr/bin/env node
// nma-net — the silent network from a plain terminal.
//
// The MCP server (index.js) is ONE frontend to the network; this CLI is
// the other. Cloning this repo (or installing this package) is enough —
// no MCP host required. Both frontends share:
//   - the identity file   ~/.nextmillionai/network/identity.json
//     (NEXTMILLIONAI_HOME overrides the root; NMA_NET_BUILDER_ID /
//     NMA_NET_TOKEN env identities win and are never written)
//   - the consent rules   (docs/network-contract/HANDOFF.md): the exact
//     payload is shown and a human types approval at an interactive
//     terminal BEFORE anything mutating is sent — piped stdin refuses
//   - the pure logic      (net-lib.js): band mapping that refuses
//     unmeasured signals, contract-schema validation, identifiability
//     warnings + widen
// It talks ONLY to the configured relay (--base / NMA_NET_BASE,
// default https://network.nextmillionai.org) — never anywhere else.
// Override the base for a local or self-hosted relay.

import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  buildNetworkProfile,
  identifiabilityWarnings,
  validateAgainstSchema,
  widenProfile,
} from './net-lib.js';

const USER_HOME = process.env.NEXTMILLIONAI_HOME || join(homedir(), '.nextmillionai');
const PROFILE_PATH = join(USER_HOME, 'data', 'profile.json');
const NET_DIR = join(USER_HOME, 'network');
const IDENTITY_PATH = join(NET_DIR, 'identity.json');
// Packaged contract copy first (npm install — generated at pack time;
// see package.json "prepack"), repo mirror second (source checkout).
const _PKG_DIR = dirname(fileURLToPath(import.meta.url));
const CONTRACT_DIR = existsSync(join(_PKG_DIR, 'contract'))
  ? join(_PKG_DIR, 'contract')
  : join(dirname(_PKG_DIR), 'docs', 'network-contract');

const ROLES = ['ai_engineer', 'software_engineer', 'platform_engineer', 'founding_engineer', 'staff_engineer', 'engineering_manager', 'consultant_fractional'];
const TZ_BANDS = ['UTC-12..-8', 'UTC-8..-4', 'UTC-4..0', 'UTC+0..+3', 'UTC+3..+7', 'UTC+7..+12'];

const USAGE = `nma-net — the silent network, no MCP required

  nma-net register --email you@example.org     step 1: sends ONLY the email
  nma-net register --code 123456               step 2: verify -> token stored locally
  nma-net prefs [--availability open|passive|paused] [--roles a,b] [--remote true|false] [--tz "UTC+0..+3"]
  nma-net publish [--widen]                    dry-run card + explicit yes, then PUT
  nma-net status                               read-only dashboard
  nma-net inbox [--full]                       pull-only mailbox; nobody is notified
  nma-net respond --conv c_… --action accept|decline|message|withdraw [--message "…"]
  nma-net reveal --conv c_… --action request|approve [--display-name "…"]
  nma-net block --hirer-id h_…
  nma-net unpublish                            HARD delete, type the builder id to confirm

Relay: --base URL or NMA_NET_BASE (default https://network.nextmillionai.org;
       override for a local or self-hosted relay).
Profile source: the local engine assessment (${'~'}/.nextmillionai/data/profile.json) —
generate it with the engine ("python3 -m nextmillionai" in your repo) first.`;

// ── plumbing ─────────────────────────────────────────────────────────────────

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

async function loadIdentity() {
  try {
    return JSON.parse(await readFile(IDENTITY_PATH, 'utf-8'));
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw e;
  }
}

async function saveIdentity(identity) {
  await mkdir(NET_DIR, { recursive: true });
  await writeFile(IDENTITY_PATH, JSON.stringify(identity, null, 2));
}

/** Env identities (seeded demos) win and are never written to disk. */
async function creds() {
  const identity = await loadIdentity();
  const envActive = Boolean(process.env.NMA_NET_BUILDER_ID || process.env.NMA_NET_TOKEN);
  return {
    builderId: process.env.NMA_NET_BUILDER_ID || identity.builder_id || null,
    token: process.env.NMA_NET_TOKEN || identity.token || null,
    identity,
    source: envActive ? 'env' : 'file',
  };
}

function netError(status, json) {
  const meanings = {
    401: 'not authenticated — bad/missing token, or the identity was hard-deleted',
    403: 'wrong party — this token does not own that resource',
    404: 'not found (or not your conversation — the server deliberately does not say which)',
    409: 'illegal state transition — check the conversation state in `nma-net inbox`',
    422: 'contract violation — the payload does not match the public schema',
    429: 'interest quota reached (10/day per hirer)',
  };
  const detail = json && json.detail ? `\n${JSON.stringify(json.detail, null, 2)}` : '';
  return `relay returned ${status}: ${meanings[status] || 'unexpected'}${detail}`;
}

function makeFetcher(base) {
  return async function netFetch(path, { method = 'GET', token = null, body = undefined } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(`${base}${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      fail(`cannot reach the relay at ${base} (${e.cause?.code || e.message}).\n`
        + '  is it running? check <base>/v1/health (hosted relays may cold-start ~10s),\n'
        + '  or point elsewhere with --base / NMA_NET_BASE.');
    }
    let json = null;
    try { json = await res.json(); } catch { /* 204 etc. */ }
    return { status: res.status, json };
  };
}

/** Consent gate: exact payload on screen, human types the answer at a
 * TTY. Piped/non-interactive stdin refuses — a script cannot consent. */
async function confirm(question, { expected = 'yes' } = {}) {
  if (!process.stdin.isTTY) {
    fail('this action needs interactive consent — run from a terminal (a pipe cannot approve).');
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} `)).trim();
  rl.close();
  if (answer !== expected) fail(`not confirmed (expected "${expected}") — nothing was sent.`);
}

function renderRoleCard(rc) {
  if (!rc) return '(no role card)';
  return `${rc.title} · ${rc.remote} · company ${rc.company_size} (${rc.company_sector})`
    + (rc.comp_band && rc.comp_band !== 'unspecified' ? ` · comp ${rc.comp_band}` : '');
}

function renderConversation(c, { full = false } = {}) {
  let out = `[${c.state}] ${c.conv} — from ${c.counterpart}\n  role: ${renderRoleCard(c.role_card)}\n`;
  const messages = c.messages || [];
  for (const m of (full ? messages : messages.slice(-3))) {
    if (m.type === 'CONTACT_CARD') {
      const b = m.body || {};
      out += '  >> CONTACT CARDS (reveal fulfilled)\n';
      if (b.builder) out += `     builder: ${b.builder.display_name || '(no name given)'} <${b.builder.email}>\n`;
      if (b.hirer) out += `     hirer:   ${b.hirer.display_name || '(no name given)'} <${b.hirer.email}> @ ${b.hirer.company_domain}\n`;
    } else {
      const bodyText = typeof m.body === 'string' ? m.body : m.body?.text ?? JSON.stringify(m.body);
      out += `  #${m.seq} ${m.from}: ${bodyText}\n`;
    }
  }
  if (!full && messages.length > 3) out += `  (… ${messages.length - 3} earlier message(s) — --full)\n`;
  return out;
}

// ── commands ─────────────────────────────────────────────────────────────────

async function cmdRegister(net, opts) {
  const identity = await loadIdentity();
  if (opts.code) {
    const builderId = opts['builder-id'] || identity.pending_builder_id;
    if (!builderId) fail('no pending registration — pass --builder-id b_… with the code.');
    const { status, json } = await net('/v1/builders/verify', {
      method: 'POST', body: { builder_id: builderId, code: opts.code },
    });
    if (status !== 200) fail(netError(status, json));
    delete identity.pending_builder_id;
    identity.builder_id = json.builder_id;
    identity.token = json.token;
    await saveIdentity(identity);
    console.log(`Verified. Builder identity ${json.builder_id} is active.`);
    console.log(`Token stored at ${IDENTITY_PATH} — losing it severs the pseudonym by design`);
    console.log('(no recovery; rotate = new pseudonym, republish).');
    console.log('Next: `nma-net prefs`, then `nma-net publish`.');
    return;
  }
  if (!opts.email) fail('register needs --email (step 1) or --code (step 2).');
  console.log('APPROVAL — nothing has been sent yet.');
  console.log(`  Action : POST /v1/builders on ${opts.base}`);
  console.log(`  Payload (the ONLY thing sent): {"email": "${opts.email}"}`);
  console.log('  The network stores one vault row pseudonym -> this email, read only at');
  console.log('  reveal fulfillment. Revocable by `nma-net unpublish` (hard delete).');
  await confirm('Send it? Type yes:');
  const { status, json } = await net('/v1/builders', { method: 'POST', body: { email: opts.email } });
  if (status !== 201) fail(netError(status, json));
  identity.pending_builder_id = json.builder_id;
  await saveIdentity(identity);
  console.log(`Registered: ${json.builder_id} (pending verification).`);
  console.log(`Code delivery: ${json.verify}.`);
  console.log('Then: nma-net register --code <the code>');
}

async function cmdPrefs(opts) {
  const identity = await loadIdentity();
  const prefs = { ...(identity.prefs || {}) };
  if (opts.availability) {
    if (!['open', 'passive', 'paused'].includes(opts.availability)) fail('availability: open|passive|paused');
    prefs.availability = opts.availability;
  }
  if (opts.roles) {
    const roles = opts.roles.split(',').map((r) => r.trim());
    const bad = roles.filter((r) => !ROLES.includes(r));
    if (bad.length || roles.length < 1 || roles.length > 3) {
      fail(`roles: 1-3 of ${ROLES.join('|')}${bad.length ? ` (unknown: ${bad.join(', ')})` : ''}`);
    }
    prefs.roles = roles;
  }
  if (opts.remote !== undefined) prefs.remote = opts.remote === 'true';
  if (opts.tz) {
    if (!TZ_BANDS.includes(opts.tz)) fail(`tz: one of ${TZ_BANDS.join(' | ')}`);
    prefs.tz_band = opts.tz;
  }
  identity.prefs = prefs;
  await saveIdentity(identity);
  console.log('Prefs (stored LOCALLY only — nothing was sent):');
  console.log(JSON.stringify(prefs, null, 2));
  if (identity.published_at_week) console.log('A profile is published — `nma-net publish` pushes the changes.');
}

async function cmdPublish(net, opts) {
  const { builderId, token, identity } = await creds();
  if (!builderId || !token) fail('no network identity — `nma-net register` first.');
  let profile;
  try {
    profile = JSON.parse(await readFile(PROFILE_PATH, 'utf-8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    fail(`no local assessment at ${PROFILE_PATH} — the network profile is DERIVED from\n`
      + 'measured signals, never hand-written. Run the engine ("python3 -m nextmillionai"\n'
      + 'in your repo, or nma_assess via the MCP) first.');
  }
  const { doc: built, insufficiencies } = buildNetworkProfile(profile, identity.prefs || {}, builderId);
  if (insufficiencies.length) {
    fail(`cannot publish — unmeasured is insufficient, never estimated:\n  - ${insufficiencies.join('\n  - ')}`);
  }
  let doc = built;
  const hist = await net('/v1/pool/histograms');
  if (hist.status !== 200) fail(netError(hist.status, hist.json));
  let { poolSize, warnings } = identifiabilityWarnings(doc, hist.json);
  if (opts.widen && warnings.some((w) => w.widenable)) {
    const widened = widenProfile(doc, warnings.filter((w) => w.widenable));
    doc = widened.doc;
    ({ poolSize, warnings } = identifiabilityWarnings(doc, hist.json));
    if (widened.dropped.length) console.log(`Widened — dropped: ${widened.dropped.join(', ')}`);
  }
  const schema = JSON.parse(await readFile(join(CONTRACT_DIR, 'network_profile.v1.json'), 'utf-8'));
  const schemaErrors = validateAgainstSchema(doc, schema);
  if (schemaErrors.length) {
    fail(`built profile violates the public contract (client-side check; nothing sent):\n  - ${schemaErrors.join('\n  - ')}`);
  }
  console.log('APPROVAL — nothing has been sent yet.');
  console.log(`  Action: PUT /v1/profiles/${builderId} on ${opts.base}`);
  console.log('  This exact document — banded, derived, pseudonymous, no free text — is');
  console.log('  everything the network will store about you (plus the one vault email):\n');
  console.log(JSON.stringify(doc, null, 2));
  if (warnings.length) {
    console.log(`\nIDENTIFIABILITY WARNINGS (pool of ${poolSize} published profiles):`);
    for (const w of warnings) console.log(`  - ${w.field} = ${w.value}: ${w.note}${w.widenable ? ' [widenable — re-run with --widen]' : ''}`);
  }
  await confirm('\nPublish this document? Type yes:');
  const { status, json } = await net(`/v1/profiles/${builderId}`, { method: 'PUT', token, body: doc });
  if (status !== 204) fail(netError(status, json));
  identity.published_at_week = doc.published_at_week;
  identity.published_doc = doc;
  await saveIdentity(identity);
  console.log(`Published as ${builderId} (${doc.published_at_week}). Discoverable by approved hirers.`);
  console.log('Revocable any time: `nma-net unpublish` (hard delete). Check interest with');
  console.log('`nma-net inbox` — nobody is notified of anything; silence is a feature.');
}

async function cmdStatus(net) {
  const { builderId, identity } = await creds();
  console.log(`Silent network — status\n${'='.repeat(45)}`);
  if (!builderId) {
    console.log('Identity: none. `nma-net register` creates one (only an email is sent).');
    return;
  }
  console.log(`Identity: ${builderId} (pseudonymous)`);
  const p = identity.prefs || {};
  console.log(`Prefs: availability=${p.availability ?? '?'} roles=${(p.roles || []).join('/') || '?'} remote=${p.remote ?? '?'} tz=${p.tz_band ?? '?'}`);
  console.log(identity.published_at_week
    ? `Published: yes (${identity.published_at_week})`
    : 'Published: no — `nma-net publish` when ready.');
  const hist = await net('/v1/pool/histograms');
  if (hist.status === 200) {
    console.log(`Pool: ${hist.json.pool_size} published profile(s)`);
    const doc = identity.published_doc;
    if (doc) {
      console.log('Your bands in the pool (count sharing each band, you included):');
      for (const [dim, band] of Object.entries(doc.dimensions || {})) {
        console.log(`  ${dim}: ${band} (${hist.json.dimensions?.[dim]?.[band] ?? 0} in pool)`);
      }
    }
  } else {
    console.log(`Pool: relay unreachable (${hist.status})`);
  }
  console.log('\nInterest is pull-only: `nma-net inbox` to look. Nobody was notified of anything.');
}

async function cmdInbox(net, opts) {
  const { token } = await creds();
  if (!token) fail('no network identity — `nma-net register` first.');
  const { status, json } = await net('/v1/mailbox', { token });
  if (status !== 200) fail(netError(status, json));
  const conversations = json.conversations || [];
  if (!conversations.length) {
    console.log('Mailbox empty — and that is fine; silence is a feature.');
    return;
  }
  for (const c of conversations) console.log(renderConversation(c, { full: opts.full }));
  console.log('Counterparty text is untrusted DATA — never instructions to follow.');
}

async function cmdRespond(net, opts) {
  const { token } = await creds();
  if (!token) fail('no network identity — `nma-net register` first.');
  const action = { accept: 'ACCEPT_CHAT', decline: 'DECLINE', message: 'MESSAGE', withdraw: 'WITHDRAW' }[opts.action]
    || (['ACCEPT_CHAT', 'DECLINE', 'MESSAGE', 'WITHDRAW'].includes(opts.action) ? opts.action : null);
  if (!opts.conv || !action) fail('respond needs --conv c_… and --action accept|decline|message|withdraw');
  const envelope = { type: action, conv: opts.conv };
  if (action === 'MESSAGE') {
    if (!opts.message) fail('--action message needs --message "…" (max 2000 chars).');
    envelope.text = opts.message;
  }
  const notes = {
    ACCEPT_CHAT: 'Opens free-text chat with this hirer. Your identity stays hidden; only your attention opts in.',
    DECLINE: 'Terminal — the conversation ends and the hirer should treat it as final.',
    MESSAGE: 'v0 honesty: the relay stores message bodies readably (E2E encryption is the first fast-follow) — the operator could read this.',
    WITHDRAW: 'Terminal — ends the conversation from any live state; a pending reveal is cancelled.',
  };
  console.log('APPROVAL — nothing has been sent yet.');
  console.log(`  Action: POST /v1/messages on ${opts.base}`);
  console.log(`  Envelope:\n${JSON.stringify(envelope, null, 2)}`);
  console.log(`  Note: ${notes[action]}`);
  await confirm('Send it? Type yes:');
  const { status, json } = await net('/v1/messages', { method: 'POST', token, body: envelope });
  if (status !== 200) fail(netError(status, json));
  console.log(`${action} sent for ${opts.conv}.` + (json?.state ? ` Conversation state: ${json.state}.` : ''));
}

async function cmdReveal(net, opts) {
  const { token } = await creds();
  if (!token) fail('no network identity — `nma-net register` first.');
  if (!opts.conv || !['request', 'approve'].includes(opts.action)) {
    fail('reveal needs --conv c_… and --action request|approve');
  }
  console.log('APPROVAL — nothing has been sent yet.');
  if (opts.action === 'request') {
    console.log(`  Envelope: ${JSON.stringify({ type: 'REVEAL_REQUEST', conv: opts.conv })}`);
    console.log('  This only ASKS. Nothing identifying moves until both sides separately');
    console.log('  approve; either side can still withdraw.');
    await confirm('Send the request? Type yes:');
    const { status, json } = await net('/v1/messages', {
      method: 'POST', token, body: { type: 'REVEAL_REQUEST', conv: opts.conv },
    });
    if (status !== 200) fail(netError(status, json));
    console.log(`Reveal requested for ${opts.conv} — now in reveal_pending. Both sides must still approve.`);
    return;
  }
  console.log(`  Action: POST /v1/reveals/${opts.conv} — record YOUR side's consent.`);
  console.log('  - Reveal happens only when BOTH sides have approved.');
  console.log('  - If the other side already approved, this fulfills IMMEDIATELY and');
  console.log('    IRREVOCABLY: both contact cards (verified registration email + the display');
  console.log('    name below) are delivered and cannot be recalled.');
  console.log('  - Until that second approval, withdraw still cancels everything.');
  if (opts['display-name']) console.log(`  Display name on your card: ${opts['display-name']}`);
  await confirm('Approve the reveal? Type yes:');
  const { status, json } = await net(`/v1/reveals/${opts.conv}`, {
    method: 'POST', token, body: opts['display-name'] ? { display_name: opts['display-name'] } : {},
  });
  if (status !== 200) fail(netError(status, json));
  if (json?.contact_cards) {
    const cc = json.contact_cards;
    console.log('REVEAL FULFILLED (second approval) — contact cards delivered, irrevocably:');
    console.log(`  builder: ${cc.builder?.display_name || '(no name)'} <${cc.builder?.email}>`);
    console.log(`  hirer:   ${cc.hirer?.display_name || '(no name)'} <${cc.hirer?.email}> @ ${cc.hirer?.company_domain}`);
  } else {
    console.log(`Approval recorded for ${opts.conv}. Nothing has moved yet — the other side has not approved.`);
  }
}

async function cmdBlock(net, opts) {
  const { token } = await creds();
  if (!token) fail('no network identity — `nma-net register` first.');
  if (!opts['hirer-id']) fail('block needs --hirer-id h_…');
  console.log('APPROVAL — nothing has been sent yet.');
  console.log(`  Action: POST /v1/blocks {"hirer_id": "${opts['hirer-id']}"} on ${opts.base}`);
  console.log('  Effect: open conversations with them are withdrawn; their future interest is');
  console.log('  silently dropped. They see silence, not a block (anti-probing by design).');
  await confirm('Block them? Type yes:');
  const { status, json } = await net('/v1/blocks', { method: 'POST', token, body: { hirer_id: opts['hirer-id'] } });
  if (status !== 204) fail(netError(status, json));
  console.log(`Blocked ${opts['hirer-id']}.`);
}

async function cmdUnpublish(net, opts) {
  const { builderId, token, source } = await creds();
  if (!builderId || !token) fail('no network identity to unpublish.');
  console.log('HARD DELETE — irreversible, one transaction:');
  console.log(`  Action: DELETE /v1/profiles/${builderId} on ${opts.base}`);
  console.log(source === 'env'
    ? `  Deletes the env-supplied identity ${builderId} (the local identity file is NOT touched).`
    : `  Deletes this machine's identity ${builderId} (the local identity file is removed too).`);
  console.log('  Profile gone, vault email gone, ALL conversations gone (both sides lose the');
  console.log('  thread), registration gone, token dead. Re-joining = a NEW pseudonym.');
  await confirm(`Type the builder id (${builderId}) to confirm:`, { expected: builderId });
  const { status, json } = await net(`/v1/profiles/${builderId}`, { method: 'DELETE', token });
  if (status !== 204) fail(netError(status, json));
  if (source === 'file') {
    await rm(IDENTITY_PATH, { force: true });
    console.log('Unpublished — hard delete confirmed by the relay. Local identity file removed.');
  } else {
    console.log('Unpublished — hard delete confirmed by the relay. Env identity; local file untouched.');
  }
}

// ── entry ────────────────────────────────────────────────────────────────────

const { values: opts, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    base: { type: 'string' },
    email: { type: 'string' },
    code: { type: 'string' },
    'builder-id': { type: 'string' },
    availability: { type: 'string' },
    roles: { type: 'string' },
    remote: { type: 'string' },
    tz: { type: 'string' },
    widen: { type: 'boolean' },
    full: { type: 'boolean' },
    conv: { type: 'string' },
    action: { type: 'string' },
    message: { type: 'string' },
    'display-name': { type: 'string' },
    'hirer-id': { type: 'string' },
    help: { type: 'boolean' },
  },
});

const command = positionals[0];
opts.base = (opts.base || process.env.NMA_NET_BASE || 'https://network.nextmillionai.org').replace(/\/$/, '');
const net = makeFetcher(opts.base);

try {
  if (!command || opts.help || command === 'help') console.log(USAGE);
  else if (command === 'register') await cmdRegister(net, opts);
  else if (command === 'prefs') await cmdPrefs(opts);
  else if (command === 'publish') await cmdPublish(net, opts);
  else if (command === 'status') await cmdStatus(net);
  else if (command === 'inbox') await cmdInbox(net, opts);
  else if (command === 'respond') await cmdRespond(net, opts);
  else if (command === 'reveal') await cmdReveal(net, opts);
  else if (command === 'block') await cmdBlock(net, opts);
  else if (command === 'unpublish') await cmdUnpublish(net, opts);
  else fail(`unknown command "${command}" — try: nma-net help`);
} catch (e) {
  fail(e.message);
}
