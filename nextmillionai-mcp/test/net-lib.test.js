/**
 * Unit tests for net-lib.js — the pure logic every network-bound byte
 * flows through. Run: node --test nextmillionai-mcp/test/ (node 18+).
 * CI runs these via tests/test_mcp_network_tools.py.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dimensionBand, bandSessionHours, bandLocSurvived, bandHistorySpan,
  isoWeek, buildNetworkProfile, validateAgainstSchema,
  identifiabilityWarnings, widenProfile,
} from '../net-lib.js';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const SCHEMA = JSON.parse(
  await readFile(join(ROOT, 'docs', 'network-contract', 'network_profile.v1.json'), 'utf-8')
);

const FIXTURE_PROFILE = {
  dimensions: {
    signal_clarity: { score: 64 }, build_stability: { score: 86 },
    decision_weight: { score: 50 }, recovery_velocity: { score: 100 },
    context_command: { score: 48 }, orchestration_range: { score: 49 },
  },
  archetypes: [
    { id: 'context_engineer', score: 64 },
    { id: 'integration_architect', score: 60 },
    { id: 'cli_native', score: 58 },
  ],
  wrappedStats: { totalActiveHours: 37.5 },
  signals: { ai_lines_survived: 4118 },
  assessment: {
    methodology_version: '0.4.4', confidence: 79,
    dateRange: '2024-09-01 to 2026-06-15',
    sources_used: ['Claude Code', 'Cursor IDE', 'git'],
  },
  stackSummary: { languages: { JavaScript: 0.5, TypeScript: 0.3, Liquid: 0.1 } },
};
const FIXTURE_PREFS = {
  availability: 'open', roles: ['ai_engineer'], remote: true, tz_band: 'UTC+3..+7',
};
const B_ID = 'b_0123456789abcdef';

test('dimension bands use the engine thresholds (35/55/70/85)', () => {
  assert.equal(dimensionBand(0), 'emerging');
  assert.equal(dimensionBand(35), 'developing');
  assert.equal(dimensionBand(55), 'proficient');
  assert.equal(dimensionBand(70), 'advanced');
  assert.equal(dimensionBand(85), 'elite');
  assert.equal(dimensionBand(100), 'elite');
  assert.equal(dimensionBand(null), null); // unmeasured is never estimated
});

test('evidence bands', () => {
  assert.equal(bandSessionHours(29.9), '<30');
  assert.equal(bandSessionHours(37.5), '30-100');
  assert.equal(bandSessionHours(1000), '1000+');
  assert.equal(bandLocSurvived(4118), '1k-10k');
  assert.equal(bandLocSurvived(999), '<1k');
  assert.equal(bandHistorySpan('2024-09-01 to 2026-06-15'), '12mo+');
  assert.equal(bandHistorySpan('2026-05-01 to 2026-06-15'), '1-3mo');
  assert.equal(bandHistorySpan('garbage'), null);
  assert.match(isoWeek(new Date(Date.UTC(2026, 0, 1))), /^\d{4}-W\d{2}$/);
});

test('a measured profile builds a contract-valid document', () => {
  const { doc, insufficiencies } = buildNetworkProfile(FIXTURE_PROFILE, FIXTURE_PREFS, B_ID);
  assert.deepEqual(insufficiencies, []);
  assert.deepEqual(validateAgainstSchema(doc, SCHEMA), []);
  assert.equal(doc.archetype, 'context_engineer');
  // crafts: only engine-verifiable, proficient+; cli_native has no craft
  assert.deepEqual(doc.crafts, ['context_engineer', 'integration_mcp_engineer']);
  // stack tags map through the controlled vocabulary; Liquid is dropped, not guessed
  assert.deepEqual(doc.stack_tags, ['javascript', 'typescript']);
  assert.equal(doc.evidence.confidence, 0.79);
});

test('unmeasured dimension refuses to publish — never estimates', () => {
  const p = structuredClone(FIXTURE_PROFILE);
  p.dimensions.context_command = { score: null };
  const { doc, insufficiencies } = buildNetworkProfile(p, FIXTURE_PREFS, B_ID);
  assert.equal(doc, null);
  assert.ok(insufficiencies.some((i) => i.includes('context_command')));
});

test('missing prefs refuse to publish (they are choices, not derivations)', () => {
  const { doc, insufficiencies } = buildNetworkProfile(FIXTURE_PROFILE, {}, B_ID);
  assert.equal(doc, null);
  assert.ok(insufficiencies.some((i) => i.includes('availability')));
  assert.ok(insufficiencies.some((i) => i.includes('timezone')));
});

test('validator rejects unknown keys and exact numbers where bands belong', () => {
  const { doc } = buildNetworkProfile(FIXTURE_PROFILE, FIXTURE_PREFS, B_ID);
  const withUnknown = { ...doc, favorite_editor: 'vim' };
  assert.ok(validateAgainstSchema(withUnknown, SCHEMA).some((e) => e.includes('unknown key')));
  const withExact = structuredClone(doc);
  withExact.evidence.session_hours_band = 37.5; // exact number, not a band
  assert.ok(validateAgainstSchema(withExact, SCHEMA).length > 0);
  const badWeek = structuredClone(doc);
  badWeek.published_at_week = '2026-06-15T10:00:00Z'; // precise timestamp
  assert.ok(validateAgainstSchema(badWeek, SCHEMA).some((e) => e.includes('published_at_week')));
});

const HIST = {
  pool_size: 3,
  dimensions: { signal_clarity: { proficient: 0, advanced: 2, elite: 1 } },
  facets: {
    archetype: { context_engineer: 2 },
    tz_band: { 'UTC+3..+7': 2 },
    crafts: { context_engineer: 2, integration_mcp_engineer: 0 },
    stack_tags: { javascript: 2, typescript: 1 },
  },
};

test('identifiability flags bands occupied alone or nearly alone', () => {
  const { doc } = buildNetworkProfile(FIXTURE_PROFILE, FIXTURE_PREFS, B_ID);
  const { poolSize, warnings } = identifiabilityWarnings(doc, HIST);
  assert.equal(poolSize, 3);
  const fields = warnings.map((w) => `${w.field}=${w.value}`);
  assert.ok(fields.includes('dimensions.signal_clarity=proficient')); // count 0
  assert.ok(fields.includes('crafts=integration_mcp_engineer')); // count 0
  assert.ok(fields.includes('stack_tags=typescript')); // count 1
  assert.ok(!fields.includes('archetype=context_engineer')); // count 2: fine
  // measured bands are flagged but never widenable
  const dim = warnings.find((w) => w.field === 'dimensions.signal_clarity');
  assert.equal(dim.widenable, false);
});

test('widen drops rare optional facets, never measured bands, never below minItems', () => {
  const { doc } = buildNetworkProfile(FIXTURE_PROFILE, FIXTURE_PREFS, B_ID);
  const { warnings } = identifiabilityWarnings(doc, HIST);
  const { doc: widened, dropped } = widenProfile(doc, warnings.filter((w) => w.widenable));
  assert.deepEqual(widened.dimensions, doc.dimensions); // untouched
  assert.equal(widened.archetype, doc.archetype); // untouched
  assert.ok(dropped.includes('crafts:integration_mcp_engineer'));
  assert.ok(dropped.includes('stack_tags:typescript'));
  assert.ok(widened.crafts.length >= 1); // minItems respected
  assert.deepEqual(validateAgainstSchema(widened, SCHEMA), []); // still valid
});
