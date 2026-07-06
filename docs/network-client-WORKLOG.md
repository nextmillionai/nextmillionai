# Silent-network client — session worklog

Work log for the `feat/silent-network-client` branch: the developer-side
`nma_net_*` MCP tools, the hirer-side `nextmillionai-hire-mcp/` package,
the rep-agent definitions under `agents/`, and the mirrored network
contract. Each commit carries an APE (AI Product Engineer) review note;
open product questions are tagged `PO-DECISION-NEEDED`, contract gaps
`CONTRACT-CHANGE-NEEDED`.

Ground rules for this branch: build strictly against
`docs/network-contract/` (never against private server internals); every
mutating MCP tool displays its exact payload and requires `confirmed:
true` after explicit human approval; humans approve every outbound
message — no auto-ACKs; no core-engine or core-schema changes.

## Session log — 2026-07-06

### Prerequisite check

- Contract package (6 files) received and read: `NETWORK-PROMISES.md`,
  `PROTOCOL.md`, `HANDOFF.md`, `openapi.yaml`, `envelopes.v1.json`,
  `network_profile.v1.json`. Mirrored verbatim (diff-verified) into
  `docs/network-contract/`.
- Backend runs locally per the contract HANDOFF (seeded demo server on
  `127.0.0.1:7750`). Note: the program handover referred to the backend
  checkout by its repo name; the local directory name differs — flagged
  to the PO, not blocking (the contract files are identical).
- PO answers to the §5 questions were provided up front: extend
  `nextmillionai-mcp/` (B1); mirror verbatim to `docs/network-contract/`
  (B2); everything client-side is public (B3); promptfoo suites are
  written runnable-later, not executed (B4); humans approve every
  outbound message (B5); vision HTMLs go under `docs/vision/`, internal
  and excluded from the public mirror (B6).

### Design decisions (client-side, this session)

- **D-C1 · profile → network_profile.v1 mapping is client-side, banded,
  and refuses when unmeasured.** Dimension scores band with the engine's
  own public thresholds (35/55/70/85 → emerging…elite — same arithmetic
  as `_get_level` in `scoring.py`; an `undetected` dimension refuses to
  publish rather than estimating). Crafts derive from archetypes at
  proficient-or-above, mapped to the contract's craft vocabulary; only
  engine-verifiable crafts are ever emitted. Evidence bands come from
  counted signals (`totalActiveHours`, `ai_lines_survived`,
  `sources_used`, assessment date range, confidence). Nothing exact,
  nothing estimated, no free text.

### CONTRACT-CHANGE-NEEDED (running list)

1. **`GET /v1/pool/histograms` response shape is undocumented.** The
   contract (openapi.yaml) leaves the 200 body as an empty schema. The
   client codes against the observed shape
   `{pool_size, dimensions: {dim: {band: n}}, facets: {availability,
   tz_band, archetype, crafts, stack_tags}}` — the identifiability
   check depends on it, so it should be pinned in the contract.
2. **`GET /v1/mailbox` top-level shape is undocumented.** HANDOFF.md
   documents the per-conversation object but not the envelope; observed:
   `{conversations: [...]}`. Should be pinned.
3. **No single-profile view endpoint for hirers.** A hirer cannot fetch
   one builder's card by id (search cards are the only card source).
   `nma_hire_view` therefore re-scans search pages to find the id —
   fine at demo scale, wrong at real scale. Proposal: a hirer-scoped
   `GET /v1/profiles/{builder_id}` returning the same card as search.
4. **Contract doc nit:** `network_profile.v1.json` says crafts come
   "from the public taxonomy", but the OSS taxonomy's kind ids differ
   from the contract's craft ids (e.g. engine `agent_builder` ↔
   contract `agent_harness_builder`). The client maps deterministically
   (see D-C1); the two vocabularies should be reconciled or the mapping
   documented contract-side.

---

## Commits

<!-- One entry per commit: scope, APE review (3–6 lines), verdict. -->

### Commit 1 — docs(network): mirror the silent-network contract

Scope: `docs/network-contract/` (6 files, diff-verified verbatim),
CURRENT.md + public-variant + docs/README.md index entries, this worklog.

**APE review:** Scope matches Prompt B §1/B2 exactly — a verbatim mirror,
no invented endpoints, no edits to the contract files. Privacy grep of
the diff: no code, no outbound calls, no logging; the only "data" added
is the already-public contract text. Naming follows the repo's doc
conventions (docs/ tree, CURRENT.md registry updated in the same commit,
public CURRENT variant kept in sync per PUBLIC-MIRROR.md). Gates: 645
tests + ruff + format + mypy all green. Verdict: **APPROVE**.

### Commit 2 — docs(vision): internal vision mockups under docs/vision/

Scope: PO decision B6 — the three vision HTMLs (+ token/chat CSS +
index) placed at `docs/vision/`, marked internal and excluded from the
public mirror by the same mechanism as `docs/launch/`: seed-script
EXCLUDES, guard-test sentinels + tree check, PUBLIC-MIRROR.md table,
CURRENT.md index row — all in this one commit so the denylist and its
docs can't drift.

**APE review:** Scope matches B6 verbatim. Privacy grep: static mockup
HTML/CSS only, fictional data, no scripts calling out, no personal
paths. Naming/mechanism copies the existing internal-folder pattern
exactly (guard test extended, not bypassed). Gates all green — the
seed-guard test now actively proves docs/vision/ never ships. Verdict:
**APPROVE**.

### Commit 3 — feat(mcp): nma_net_* developer-side network tools

Scope: 9 tools in `nextmillionai-mcp/index.js` (register, prefs,
publish, status, inbox, respond, reveal, block, unpublish); pure logic
in `net-lib.js` (profile→network_profile.v1 mapping, subset JSON-Schema
validator, identifiability check, widen); node:test suite (8 tests) +
pytest layer pinning the consent contract; README + tool counts.
Verified against the live local relay: the real profile builds a
contract-valid doc, pool warnings fire, widen drops only optional
facets.

**APE review:** Scope matches Prompt B §3A + HANDOFF "what the client
must enforce" — all five client obligations implemented (payload
confirmation, identifiability-before-publish, reveal irreversibility
wording, client-side schema validation, v0 honesty line). Privacy grep
of the diff: the only fetch targets are `NMA_NET_BASE` (localhost
default) and the existing registry constant; no logging of emails or
message bodies; identity lives in a tool-owned
`~/.nextmillionai/network/` namespace (the engine's data dir stays
engine-written only — hardline respected); unmeasured signals refuse,
never estimate. Naming matches the existing `nma_*` tool style and the
terse-text response idiom. Gates: 653 tests + ruff + format + mypy
green; node suite 8/8. Verdict: **APPROVE**.
