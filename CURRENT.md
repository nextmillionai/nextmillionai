# CURRENT.md — directional state for AI coding agents

**v0.2.x · gates: pytest + ruff + format + mypy, all green · `main` is the working trunk**

This file is **directional guidance, not a worklog.** Read it to avoid
breaking what exists and to find the right doc — it does not narrate past
sessions. What must never change without sign-off lives in
[`docs/HARDLINES.md`](docs/HARDLINES.md).

nextmillionai is a local-first AI coding profile builder — the open
alternative to Paxel. It scans the user's own AI sessions (Claude Code,
Cursor, Codex) + git, scores how they build with AI, and renders a
shareable **profile** and a deep **report** from ONE assessment JSON.
Opt-in only: publish a curated, derived-only, revocable profile to a
registry. Mission: reverse hiring on proof-based work.

## Doc index — what to read for what

| Read | File | Why |
|---|---|---|
| **Always** | `CLAUDE.md` | values, gates, conventions |
| **Always** | this file | directional invariants + architecture + decisions |
| Contract | `nextmillionai/docs/SCORING-METHODOLOGY.md` | every formula (served at `/methodology`) |
| Contract | `nextmillionai/docs/methodology/DERIVATIONS.md` | @generated per-metric reference (logic + reasoning + provenance + citations) from the methodology registry |
| Contract | `nextmillionai/docs/SCHEMA.md` | the one JSON + shareable/private map |
| Contract | `BUILDER-MODEL.md`, `TAXONOMY.md` | positioning enum, archetypes/kinds |
| Contract | `docs/BUSINESS-FIT-MAP.md` | fit-map formulas + naming policy |
| Map | `docs/README.md` | flat docs map — what every doc is for, by topic |
| Map | `docs/REPO-FLOW.md` | repo chart & flow (mermaid): scan → score → serve → share |
| Map | `docs/agents/PROFILE.md`, `docs/agents/REPORT.md` | agent-readable specs for each surface |
| Contract | `docs/REFERENCES.md` | formal bibliography behind the scoring (with THESIS) |
| Contract | `docs/network-contract/PROTOCOL.md` | silent-network public contract: actors, state machine, enforced rules (mirrored verbatim from the backend) |
| Contract | `docs/network-contract/NETWORK-PROMISES.md` | network promises 3–5: what the server stores/sees, what reveal means, honest v0 gaps |
| Contract | `docs/network-contract/HANDOFF.md` | network client-integration brief: endpoints, auth, what the client must enforce |
| Network | `docs/DEMO-NETWORK.md` | end-to-end silent-network demo: both MCP servers + rep agents against a locally-running relay, incl. a double-approved reveal |
| Network | `agents/AGENTS.md` | rep agents: the embedding contract, layered guardrails, porting note (LangGraph / OpenAI Agents SDK) |
| Network | rep bundles — `AGENT.md`, `context.md` (+ `policy.yaml`) under `agents/builder-rep|hirer-rep/`; Claude adapters `builder-rep.md`, `hirer-rep.md`, `SKILL.md` | the rep-agent definitions (versioned product surface) + harness shims |
| Network | `docs/network-client-WORKLOG.md` | silent-network client branch worklog: decisions, APE reviews, contract-change list |
| **Always** | `docs/HARDLINES.md` | confirm-first registry: generated artifacts, versioned contracts, privacy boundary |
| Process | `docs/proposals/` | methodology change proposals (draft→review→accept); `scripts/proposals.py` to create/compare/render. The reviewable path for any hardline-contract change |
| Contract | `docs/ADAPTERS.md` | tool coverage: every tool, versions/generations, exact reads, fidelity |
| Roadmap | `docs/DEEP-FIDELITY.md` | plan to raise tools from counts→deep (per-tool path + reusable infra), never faking what a tool doesn't expose |
| Contract | `docs/SYNC.md` | multi-device merge rule (dedupe by stable IDs, scores never merge) |
| Feature | `ENRICHMENT-PROMPT.md`, `CODE-INTELLIGENCE.md` | enrichment + `--code` scan |
| Feature | `commands/assess.md`, `commands/enrich.md`, `commands/profile.md` | Claude Code plugin slash commands (MCP) |
| Policy | `PRIVACY.md`, `DATA_COLLECTION.md`, `SECURITY.md` | the two promises, per-source reads |
| Product | `README.md`, `THESIS.md`, `ARCHITECTURE.md` | quickstart, why, module map |
| Product | `docs/TRUST.md` | anti-gaming: what a report proves, what it doesn't, what we won't do |
| Product | `docs/DESIGN.md` | in-app UI design language: real tokens/components from the shipped product (profile/report) |

This index is the what-doc-for-what registry — adding or retiring a doc
without updating this table (same commit) is a review blocker, enforced
by `tests/test_docs_truth.py`.

## Hard invariants (don't break these)

The non-negotiables. Full list + enforcement in `docs/HARDLINES.md`.

- **One assessment JSON renders both views** — never fork a fact per view.
- **Scores are arithmetic** over counted local signals against
  research-anchored bands. A model writes narrative only, never a number.
  Unmeasurable = **insufficient** (renders as a dash), never estimated,
  never 0.
- **Privacy:** no network in the assessment path. `network.py` is the
  ONLY module allowed outbound imports (CI-enforced). publish/sync are
  explicit, derived-only, revocable.
- **No ranking language** anywhere — no percentiles, cohorts, ladders.
- **Measured history never regresses:** the `history.py` ledger
  supersedes via `max()`. Better measurement may *lower* an estimate, but
  evidence (counts/spans) never shrinks.
- **Versioned contracts** (scoring formulas, JSON schema, the three
  version constants, the enrichment six-block) change only via a
  deliberate bump — never as a side effect. The formula fingerprint test
  enforces this.
- **No telemetry, ever** — not even for "verification."

## What already exists (don't rebuild from scratch)

The engine is complete and shipping. Before writing new code, assume the
piece exists and extend it; reach for the contract doc for detail.

- **Adapters** (`adapters/`): Claude Code, Cursor (all three storage
  generations via read-only `state.vscdb`), Codex, git, Claude Desktop
  (opt-in); wider tool field (Aider, Cline, Continue.dev, Copilot Chat,
  Windsurf, Cody, JetBrains AI, Zed) + local model runtimes (Ollama, LM
  Studio, llama.cpp). Coverage contract: `docs/ADAPTERS.md`. Counts/
  presence sources never invent sessions or move scores.
- **Scoring** (`scoring.py`): 6 dimensions, 9 archetypes, 13 kinds (12 crafts
  + the AI Explorer baseline everyone holds), work
  modes, positioning (build-domain × leverage + footprint). Per-event
  gap-based active-time estimator; subagent runs tracked separately as
  agent runtime, never summed into user hours.
- **Pipeline**: `build_profile.run_scan` → `aggregator.py` (activity,
  Lab insights, coverage, 4-factor confidence) → `scoring.py` → ONE
  `profile.json`. Engine-stamped; the scan cache invalidates on any
  schema/methodology version mismatch.
- **Signal registry** (`signal_registry.py`): every derived field
  declares inputs + recompute rule + basis; CI fails if a new metric
  isn't registered.
- **Durable ledger** (`history.py`): append-only sessions/activity/
  snapshots; survives store pruning and repo deletion.
- **Views**: profile ↔ report flip from shared tabs (`tabs-shared.js/.css`);
  builder card, 2D positioning map, donuts, heatmap, right-click explain,
  view-as-public, Full/Snapshot PDF. Zero emoji (icons.js glyphs only).
- **Surfaces**: CLI (`start` / `calibrate` / `assess` / `report` /
  `enrich` / `export` / `sync` / `publish` / …), MCP server (23 tools incl. the silent-network nma_net_* group),
  Claude Code plugin, local hub (`/methodology`, `/how-it-works`, APIs),
  static export, reference network registry. Live mode (post-launch,
  `report --live`, SSE). Multi-device sync via the user's own private git repo
  (deterministic merge; scores never merge).

## Decisions (recorded, not built)

- **No phone-home telemetry, ever.** It would erode "nothing leaves your
  machine." Usage numbers come from GitHub insights (and PyPI/npm later).
  Any future metric must be explicit opt-in, anonymous, aggregate,
  documented — and never in the assessment path.
- **Replit / Lovable / cloud IDEs: roadmap, not now.** They run in the
  cloud — no local session/git to read (breaks local-first) and MCP host
  support is uneven. Revisit only when a platform supports MCP AND offers
  a user-initiated data export.
- **GitHub-clone-first distribution.** No PyPI/npm package yet; runs
  straight from the clone (`python3 -m nextmillionai`).

## Architecture map (60 seconds)

```
adapters/ (claude_code, cursor, codex, git, claude_desktop, local_tools, local_models)
   └→ Session objects + raw dicts
build_profile.run_scan → normalized metrics + harness + footprint inputs
   ├→ history.py ledger (durable: sessions/activity/snapshots)
   ├→ aggregator.py (activity, Lab insights, coverage, confidence, stack)
   └→ scoring.py (dimensions, archetypes, kinds, positioning)
        └→ business_fit.py (report-only fit map)
profile.json (THE assessment JSON, ~/.nextmillionai/data/)
   ├→ hub.py serves /profile /report /methodology /how-it-works + APIs
   ├→ export.py static artifact (redacted via schema.build_shareable_profile
   │   + visibility.py per-section consent)
   └→ network.py publish (ONLY outbound module) → network_server.py registry
static/js: icons.js (glyphs + right-click explain) · profile.js · report.js · tabs-shared.js
nextmillionai-mcp/index.js: 23 tools (14 engine + 9 nma_net_*), self-locating engine
```

## Environment notes

- System `python3` = 3.9 (package floor 3.9; CI runs 3.9–3.12).
- Real data home: `~/.nextmillionai/`; test homes under `/tmp/nma-*`
  (`tests/conftest.py` guards tests off real machines' stores).
- Static assets are `?v=`-cache-busted — bump the version in all HTML
  when changing css/js.
