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
5. **Mailbox MESSAGE `body` shape is undocumented.** HANDOFF.md lists
   `messages[]` items as `{seq, from, type, body, at}` but does not say
   MESSAGE bodies arrive as `{text: "…"}` objects (only CONTACT_CARD's
   object shape is documented). Found live: both clients rendered
   `[object Object]` until fixed. Pin the shape in the contract.

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

### Commit 4 — feat(hire-mcp): hirer-side MCP package

Scope: new `nextmillionai-hire-mcp/` (7 tools: register, search, view,
interest, inbox, message, reveal). The search input schema is the query
language (band minimums, crafts, stack, availability, tz — the hirer's
LLM does the natural-language work, the server stays structured); the
`requested_by` watermark is surfaced in every result; interest is a
structured role card with the 10/day quota named; inbox instructs the
agent to treat builder messages as untrusted data. Consent tests
extended to cover both packages.

**APE review:** Scope matches Prompt B §3B; no invented endpoints — the
single-card gap is worked around via page scan and filed as
CONTRACT-CHANGE-NEEDED #3 rather than papered over. Privacy grep: only
fetch target is `NMA_NET_BASE` (localhost default); the token comes
from env, is never logged or echoed; no ranking language anywhere
(matches-not-rankings stated in the tool text, pinned by test). Naming
mirrors the sibling package; license set to Apache-2.0 to match the
repo (note: the older dev package's package.json says MIT — pre-existing
inconsistency, flagged for the PO, not changed here). Gates: 655 green.
Verdict: **APPROVE**.

### Commit 5 — feat(agents): rep-agent definition bundles + adapters

Scope: `agents/` — builder-rep and hirer-rep bundles (AGENT.md with
fiduciary rules / posture / approval-card escalation / injection
defense / 3 few-shots each; policy.yaml; context.md with 8k budget +
statelessness), AGENTS.md (embedding contract: inputs = definition +
MCP endpoint + conversation id, outputs = tool calls only; layered
guardrails; LangGraph + OpenAI Agents SDK porting note), Claude Code
adapters (subagent shims restricted to their tool group + skill
wrappers + install README), Claude Agent SDK headless harness
(run-rep.mjs — denies confirmed:true headlessly so approvals stay
human). Index rows added to CURRENT.md and the public variant.

**APE review:** Scope matches Prompt B §3C including the "definitions,
not services" framing — no runtime, no frameworks beyond the allowed
SDK harness, guardrail frameworks explicitly deferred in AGENTS.md.
Privacy check: the bundles instruct claims-trace-to-bands, no identity
pre-reveal, mailbox-as-untrusted-data; the SDK harness's canUseTool
denies mutations headlessly — the human-approval line survives every
layer. Few-shots model refusal of identity-fishing on both sides.
Naming: kebab-case bundle dirs, adapter shims match Claude Code
subagent/skill conventions. Gates: 655 green, docs registry green with
files staged. Verdict: **APPROVE**.

### Commit 6 — test(agents): promptfoo guardrail suites + make eval-agents

Scope: 13 cases per rep across safety (identity-fishing /
de-anonymization, injection-in-message, approval-skipping pressure,
out-of-band contact), fidelity (unmeasured → "the profile doesn't
measure that"; bands over exact numbers; no role-card inflation; no
ranking), protocol (approval cards render before any send; reveal
irreversibility + display-name collection; pull-only inbox; quota +
decline-is-final), quality (llm-rubric: summaries faithful to the exact
payload). Per PO decision B4 the suites are runnable-later: complete
promptfoo configs (Anthropic provider incl. rubric grading), NOT
executed, gated in `make eval-agents` behind ANTHROPIC_API_KEY.

**APE review:** Scope matches Prompt B §3C evals (10–15 cases per
agent, four groups, llm-rubric for quality) and B4 (write, don't run).
The cases assert the layered-guardrail story rather than prompt
wording, so they survive AGENT.md edits. YAML parse-validated (13+13);
Makefile target fails informatively without a key and calls promptfoo
via npx (no new dependency). Privacy: cases contain only fictional
pseudonyms/payloads. Gates: 655 green. Verdict: **APPROVE**.

### Commit 7 — docs(network): DEMO-NETWORK.md + README surfaces + CHANGELOG

Scope: the end-to-end walkthrough (`docs/DEMO-NETWORK.md`), a silent-
network section + 23-tool table in the root README, docs-map rows,
CHANGELOG Unreleased entry, index registrations. **Verified live before
writing:** an MCP stdio driver exercised both servers against the
seeded relay — 18/18 steps passed (search with watermark, interest
dry-run + confirmed, pull inbox, relay 409 on MESSAGE-before-accept,
approval-carded accept/messages with the v0 honesty note, reveal
request → first approval (nothing moves) → second approval delivering
both contact cards, agent log render) — plus the fresh-identity loop
(register approval card → console code → verify → publish refused
without prefs → prefs → dry-run with identifiability warnings →
widened publish → status → hard-delete unpublish) in an isolated
NEXTMILLIONAI_HOME.

**APE review:** Scope matches Prompt B §3D: the demo doc documents only
verified behavior (each claim was executed this session), includes the
sample MCP config JSON, and stays inside the public contract. Privacy:
no personal paths, no tokens, backend referenced generically as the
private repo; README copy is promise-driven with zero ranking language.
Naming and voice match the existing README (blunt, no hype). Gates: 655
green with all docs staged. Verdict: **APPROVE**.

### Commit 8 — fix(mcp): render MESSAGE bodies from the relay's object shape

Scope: found by running the full loop live through both MCP servers —
mailbox MESSAGE bodies arrive as `{text: "…"}` objects (undocumented;
filed as CONTRACT-CHANGE-NEEDED #5), so both thread renderers printed
`[object Object]`. One-line fix in each `renderConversation`
(string-or-object tolerant), re-verified live on both packages against
a real thread.

**APE review:** Minimal targeted fix at the render layer only; no
payloads, endpoints, or consent flow touched — privacy surface
unchanged (grep: no new logging/sending). The tolerant read
(`typeof m.body === 'string' ? … : m.body?.text`) survives the contract
being pinned either way. Gates: 655 green; live re-render verified on
builder and hirer sides. Verdict: **APPROVE**.

### Commit 9 — docs(public-mirror): network entries for the public variant templates

Scope: the public-mirror variant templates lagged the branch —
`scripts/public/CURRENT.public.md` was missing the index row for
`docs/network-client-WORKLOG.md` (a mirror-included doc, so
`test_docs_truth` would fail in a mirror seeded from this branch), and
`scripts/public/CHANGELOG.public.md` had no entry for the silent-network
client work. Added the worklog row and an `[Unreleased]` changelog entry
(the private entry, with the private-backend provenance line adapted to
the public voice).

**APE review:** Template-only change (`scripts/public/*` never ships in
the mirror itself; it *becomes* the mirror's CURRENT.md/CHANGELOG.md).
Content is a copy of already-public-voiced rows/entries; no internal
paths introduced (guard test asserts the templates reference no
excluded trees — green). Gates: 654+1skip pytest, ruff, format, mypy
all green. Verdict: **APPROVE**.

### Commit 11 — fix(net-lib): zero surviving AI lines refuses to publish

Scope: review finding F3 (staging blocker). `bandLocSurvived(0)`
returned the `'<1k'` band, publishing a measured-looking evidence claim
when the git-attribution scan had in fact measured nothing. Zero (or
negative) now maps to null — the existing insufficiency path refuses
with "AI-LOC-survived unmeasured", same as every other unmeasured
signal. Node test extended (0 and -1 band to null; a fixture with
`ai_lines_survived: 0` refuses); the pytest pin now asserts the
source-level guard.

**APE review:** One-line semantic fix inside the pure library, aligned
with the hardline "unmeasurable → insufficient, never estimated" — this
was the one place the client could over-claim evidence. No payload or
consent surface touched. Gates: node 9/9, pytest 663 green, ruff,
format, mypy clean. Verdict: **APPROVE**.

### Commit 12 — fix(mcp): env-supplied demo identities never touch identity.json

Scope: review finding F2 (staging blocker). `netCreds()` lets
`NMA_NET_BUILDER_ID`/`NMA_NET_TOKEN` override the identity file for
seeded/demo identities — but `nma_net_unpublish` then removed
`~/.nextmillionai/network/identity.json` unconditionally, so
unpublishing a demo identity destroyed the machine's REAL pseudonym
(token unrecoverable by design). `netCreds` now reports its source
(`env` | `file`); unpublish deletes the file only on the file path, and
the approval card states which identity dies and whether the file is
touched. Pytest pins the guard at source level; verified behaviorally
(dry-run with env creds + decoy identity file: card says "NOT touched",
decoy survives).

**APE review:** Smallest change that closes the destruction path —
credential precedence is untouched (env still wins for reads/sends), so
seeded demos keep working; only the destructive tail is source-gated.
The approval card gained the one line a human needs to catch the
wrong-identity case. Gates: pytest 664, node 9/9, ruff, format, mypy
green. Verdict: **APPROVE**.
