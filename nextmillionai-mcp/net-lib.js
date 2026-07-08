/**
 * Pure logic for the nma_net_* tools: local profile → network_profile.v1
 * mapping, client-side contract validation, and the pre-publish
 * identifiability check. No I/O, no network — everything here is unit
 * testable and everything the network sees flows through it.
 *
 * The contract lives at docs/network-contract/ (mirrored verbatim from
 * the backend). Rules honored here:
 *  - banded, derived, pseudonymous — never exact counts, never free text;
 *  - unmeasured = insufficient = refuse to publish, never estimated;
 *  - the client validates before sending (belt and suspenders — the
 *    server rejects too, but the user hears it from their own machine).
 */

// ── Band vocabularies (contract: network_profile.v1.json) ───────────────────

export const DIMENSIONS = [
  'signal_clarity', 'build_stability', 'decision_weight',
  'recovery_velocity', 'context_command', 'orchestration_range',
];

/** Same arithmetic as the engine's public `_get_level` thresholds
 * (scoring.py — the open methodology). A null score is unmeasured and
 * maps to null: the caller must refuse to publish, never estimate. */
export function dimensionBand(score) {
  if (score === null || score === undefined) return null;
  if (score >= 85) return 'elite';
  if (score >= 70) return 'advanced';
  if (score >= 55) return 'proficient';
  if (score >= 35) return 'developing';
  return 'emerging';
}

/** Engine archetype id → contract craft id. Only crafts the engine can
 * verify are ever emitted; the rest of the contract vocabulary
 * (eval_driven_builder, model_trainer, …) has no engine signal yet and
 * is never fabricated. cli_native has no craft equivalent. */
export const CRAFT_FROM_ARCHETYPE = {
  agent_builder: 'agent_harness_builder',
  integration_architect: 'integration_mcp_engineer',
  multi_agent_orchestrator: 'multi_agent_orchestrator',
  context_engineer: 'context_engineer',
  automation_engineer: 'production_guardian',
  system_thinker: 'system_architect',
  rapid_prototyper: 'rapid_prototyper',
  code_weaver: 'code_weaver',
};

/** Engine stack-language names → contract stack_tags vocabulary.
 * Languages outside the controlled vocabulary are dropped, not guessed. */
export const STACK_TAG_FROM_LANGUAGE = {
  javascript: 'javascript', typescript: 'typescript', python: 'python',
  go: 'go', rust: 'rust', java: 'java', kotlin: 'kotlin', swift: 'swift',
  c: 'c', 'c++': 'cpp', cpp: 'cpp', 'c#': 'csharp', csharp: 'csharp',
  ruby: 'ruby', php: 'php', elixir: 'elixir', scala: 'scala', sql: 'sql',
  shell: 'shell', bash: 'shell', zsh: 'shell',
  html: 'html_css', css: 'html_css', 'html/css': 'html_css',
  terraform: 'terraform', kubernetes: 'kubernetes',
};

export function bandSessionHours(hours) {
  if (hours === null || hours === undefined) return null;
  if (hours < 30) return '<30';
  if (hours < 100) return '30-100';
  if (hours < 300) return '100-300';
  if (hours < 1000) return '300-1000';
  return '1000+';
}

export function bandLocSurvived(lines) {
  // 0 means the git-attribution scan measured nothing, not "under 1k lines
  // survived" — unmeasured is insufficient (refuse), never the lowest band.
  if (lines === null || lines === undefined || lines <= 0) return null;
  if (lines < 1000) return '<1k';
  if (lines < 10000) return '1k-10k';
  if (lines < 50000) return '10k-50k';
  if (lines < 200000) return '50k-200k';
  return '200k+';
}

/** assessment.dateRange is "YYYY-MM-DD to YYYY-MM-DD". */
export function bandHistorySpan(dateRange) {
  const m = /^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/.exec(dateRange || '');
  if (!m) return null;
  const days = (new Date(m[2]) - new Date(m[1])) / 86_400_000;
  if (!(days >= 0)) return null;
  if (days < 30) return '<1mo';
  if (days < 91) return '1-3mo';
  if (days < 182) return '3-6mo';
  if (days < 365) return '6-12mo';
  return '12mo+';
}

/** ISO-8601 week stamp, e.g. "2026-W28" — week precision by contract. */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ── profile.json → network_profile.v1 ───────────────────────────────────────

const dimScore = (v) =>
  typeof v === 'number' ? v
    : v && typeof v === 'object' && typeof v.score === 'number' ? v.score
    : null;

/**
 * Map the local assessment to the only payload the network accepts.
 * Returns { doc, insufficiencies } — a non-empty insufficiencies list
 * means the profile MUST NOT be published (unmeasured is insufficient,
 * never estimated). prefs = { availability, roles, remote, tz_band }
 * are the user's own choices, not derived.
 */
export function buildNetworkProfile(profile, prefs, builderId, now = new Date()) {
  const insufficiencies = [];

  const dims = {};
  for (const key of DIMENSIONS) {
    const band = dimensionBand(dimScore((profile.dimensions || {})[key]));
    if (band === null) insufficiencies.push(`dimension ${key} is unmeasured (insufficient — run assess with wider coverage)`);
    else dims[key] = band;
  }

  const archetypes = profile.archetypes || [];
  const archetype = archetypes[0] && archetypes[0].id;
  if (!archetype || !(archetype in { ...CRAFT_FROM_ARCHETYPE, cli_native: 1 })) {
    insufficiencies.push('no dominant archetype detected');
  }

  const crafts = [];
  for (const a of archetypes) {
    const craft = CRAFT_FROM_ARCHETYPE[a.id];
    if (craft && typeof a.score === 'number' && a.score >= 55 && !crafts.includes(craft)) {
      crafts.push(craft);
    }
    if (crafts.length === 4) break;
  }
  if (crafts.length === 0) {
    // minItems 1: fall back to the dominant archetype's craft if mappable
    const fallback = archetypes.map((a) => CRAFT_FROM_ARCHETYPE[a.id]).find(Boolean);
    if (fallback) crafts.push(fallback);
    else insufficiencies.push('no verifiable craft (no mappable archetype signal)');
  }

  const ws = profile.wrappedStats || {};
  const signals = profile.signals || {};
  const assessment = profile.assessment || {};

  const sessionHours = bandSessionHours(ws.totalActiveHours);
  if (!sessionHours) insufficiencies.push('session hours unmeasured');
  const locSurvived = bandLocSurvived(signals.ai_lines_survived);
  if (!locSurvived) insufficiencies.push('AI-LOC-survived unmeasured (needs git-backed sessions)');
  const span = bandHistorySpan(assessment.dateRange);
  if (!span) insufficiencies.push('history span unmeasured');
  const sources = (assessment.sources_used || []).length;
  if (sources < 1) insufficiencies.push('no corroborating data sources');
  const confidence = typeof assessment.confidence === 'number'
    ? Math.round(assessment.confidence) / 100 : null;
  if (confidence === null) insufficiencies.push('engine confidence missing');

  for (const [field, label] of [
    ['availability', 'availability (open | passive | paused)'],
    ['roles', 'role preferences (1-3)'],
    ['remote', 'remote preference (true/false)'],
    ['tz_band', 'timezone band'],
  ]) {
    if (prefs?.[field] === undefined || prefs?.[field] === null
      || (field === 'roles' && !(prefs.roles || []).length)) {
      insufficiencies.push(`preference not set: ${label} — set it via nma_net_prefs or the publish arguments`);
    }
  }

  const languages = Object.entries((profile.stackSummary || {}).languages || {})
    .sort((a, b) => b[1] - a[1]);
  const stackTags = [];
  for (const [name] of languages) {
    const tag = STACK_TAG_FROM_LANGUAGE[String(name).toLowerCase()];
    if (tag && !stackTags.includes(tag)) stackTags.push(tag);
    if (stackTags.length === 5) break;
  }

  if (insufficiencies.length) return { doc: null, insufficiencies };

  const doc = {
    schema: 'network_profile.v1',
    builder_id: builderId,
    methodology_version: String(assessment.methodology_version || ''),
    dimensions: dims,
    archetype,
    crafts,
    evidence: {
      session_hours_band: sessionHours,
      ai_loc_survived_band: locSurvived,
      tools_verified: Math.max(1, Math.min(10, sources)),
      history_span_band: span,
      confidence,
    },
    stack_tags: stackTags,
    availability: prefs.availability,
    prefs: {
      roles: prefs.roles,
      remote: prefs.remote,
      tz_band: prefs.tz_band,
    },
    published_at_week: isoWeek(now),
  };
  return { doc, insufficiencies: [] };
}

// ── Client-side contract validation (belt and suspenders) ───────────────────

/**
 * Minimal JSON-Schema-subset validator, sufficient for the contract
 * schemas (type, required, properties, additionalProperties:false, enum,
 * const, pattern, min/max, minItems/maxItems, uniqueItems, items,
 * multipleOf, $ref into $defs). Returns a list of "path: problem"
 * strings; empty = valid.
 */
export function validateAgainstSchema(value, schema, root = schema, path = '$') {
  const errors = [];
  if (schema.$ref) {
    const ref = schema.$ref.replace('#/$defs/', '');
    const target = (root.$defs || {})[ref];
    if (!target) return [`${path}: unresolvable $ref ${schema.$ref}`];
    return validateAgainstSchema(value, target, root, path);
  }
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: must be ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} not in ${JSON.stringify(schema.enum)}`);
  }
  const type = schema.type;
  if (type) {
    const ok =
      type === 'object' ? (value !== null && typeof value === 'object' && !Array.isArray(value))
        : type === 'array' ? Array.isArray(value)
        : type === 'string' ? typeof value === 'string'
        : type === 'number' ? typeof value === 'number'
        : type === 'integer' ? Number.isInteger(value)
        : type === 'boolean' ? typeof value === 'boolean'
        : true;
    if (!ok) return [...errors, `${path}: expected ${type}`];
  }
  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${path}: does not match ${schema.pattern}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: too short`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path}: too long`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: < ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: > ${schema.maximum}`);
    if (schema.multipleOf !== undefined) {
      const q = value / schema.multipleOf;
      if (Math.abs(q - Math.round(q)) > 1e-9) errors.push(`${path}: not a multiple of ${schema.multipleOf}`);
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: more than ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) {
      errors.push(`${path}: items not unique`);
    }
    if (schema.items) {
      value.forEach((v, i) => errors.push(...validateAgainstSchema(v, schema.items, root, `${path}[${i}]`)));
    }
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const req of schema.required || []) {
      if (!(req in value)) errors.push(`${path}.${req}: required`);
    }
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (k in props) {
        errors.push(...validateAgainstSchema(v, props[k], root, `${path}.${k}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${k}: unknown key (the contract rejects unknown keys)`);
      }
    }
  }
  return errors;
}

// ── Pre-publish identifiability check ────────────────────────────────────────

/**
 * Compare the to-be-published document against the pool's anonymized
 * band histograms (GET /v1/pool/histograms — the histogram never sees
 * the unpublished profile). A band the user would occupy alone (pool
 * count 0) or nearly alone (count 1) is a de-anonymization risk worth a
 * plain-words warning before anything is sent.
 *
 * histograms = { pool_size, dimensions: {dim: {band: n}},
 *                facets: {availability, tz_band, archetype, crafts, stack_tags} }
 */
export function identifiabilityWarnings(doc, histograms) {
  const warnings = [];
  const pool = histograms?.pool_size ?? 0;
  const note = (count) => (count === 0
    ? 'you would be the ONLY profile there'
    : 'only one other profile is there');

  for (const [dim, band] of Object.entries(doc.dimensions || {})) {
    const count = histograms?.dimensions?.[dim]?.[band] ?? 0;
    if (count <= 1) {
      warnings.push({ field: `dimensions.${dim}`, value: band, poolCount: count, widenable: false, note: `${note(count)} — this band is measured and cannot be changed, only noted` });
    }
  }
  const facet = (name, value, widenable) => {
    const count = histograms?.facets?.[name]?.[value] ?? 0;
    if (count <= 1) warnings.push({ field: name, value, poolCount: count, widenable, note: note(count) });
  };
  facet('archetype', doc.archetype, false);
  facet('tz_band', doc.prefs?.tz_band, false);
  for (const c of doc.crafts || []) facet('crafts', c, (doc.crafts || []).length > 1);
  for (const t of doc.stack_tags || []) facet('stack_tags', t, true);

  return { poolSize: pool, warnings };
}

/**
 * Widen the identifying surface where the contract allows it: drop rare
 * stack_tags (optional, 0..5) and rare crafts while at least one craft
 * remains. Measured bands (dimensions, archetype, evidence) are never
 * altered — that would be lying about arithmetic. Returns
 * { doc, dropped } with a new document; the caller re-validates.
 */
export function widenProfile(doc, warnings) {
  const dropped = [];
  const out = JSON.parse(JSON.stringify(doc));
  const rareTags = new Set(warnings.filter((w) => w.field === 'stack_tags').map((w) => w.value));
  out.stack_tags = out.stack_tags.filter((t) => {
    if (!rareTags.has(t)) return true;
    dropped.push(`stack_tags:${t}`);
    return false;
  });
  const rareCrafts = warnings.filter((w) => w.field === 'crafts').map((w) => w.value);
  for (const c of rareCrafts) {
    if (out.crafts.length > 1) {
      out.crafts = out.crafts.filter((x) => x !== c);
      dropped.push(`crafts:${c}`);
    }
  }
  return { doc: out, dropped };
}
