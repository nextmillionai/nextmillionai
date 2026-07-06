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

*(none yet)*

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
