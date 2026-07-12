# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — the developer package on npm: both personas are one-liners

- **`nextmillionai-mcp@1.1.1` published to npm** — the developer side
  (all 23 MCP tools + the `nma-net` CLI) installs with
  `npm install -g nextmillionai-mcp` (CLI) or
  `claude mcp add nextmillionai -- npx -y nextmillionai-mcp` (MCP);
  cloning the repo is only needed to run the Python engine (profile
  generation) or work from source. The tarball is standalone: it ships
  its own copy of the network contract (generated at pack time from
  `docs/network-contract/`), so schema validation works with no repo
  present, plus LICENSE/NOTICE and full registry metadata.
- **Root README** gains the two-persona install table — developer and
  hiring person, one command each, both defaulting to the hosted relay.

### Changed — consent UX: authored messages send without a second yes

- In the `nma-net` CLI, a chat MESSAGE you typed yourself now sends
  immediately — running the command is the approval; the v0
  readable-bodies note still prints. Accept/decline/withdraw (state
  changes) and reveal/unpublish/block/register/publish (irreversible)
  keep the payload card + explicit yes. Piped stdin still refuses,
  with sharper wording: a script can neither consent nor speak for
  you. **Agent-composed MCP messages keep the approval card
  unconditionally** — that card is the prompt-injection/auto-reply
  guard, and it is untouched.

### Changed — hirer onboarding: automatic, and one-line install

- **`nextmillionai-hire-mcp@0.1.0` published to npm** — install is now
  `npx -y nextmillionai-hire-mcp` in any MCP host (Claude Code:
  `claude mcp add nextmillionai-hire -- npx -y nextmillionai-hire-mcp`);
  cloning the repo is only needed to run from source. The package
  ships index.js + README + LICENSE/NOTICE only.
- **Hirer onboarding is automatic**: the relay emails the bearer token
  (with setup steps) to the registered work address at registration —
  free-mail is rejected and the email must match the company domain,
  so inbox delivery is the verification. The GitHub-issue approval
  step is gone; token rotation still goes through a GitHub issue
  carrying only the pseudonymous id. Docs and the register tool's
  copy updated to match; contract mirror re-synced.

### Added — the silent network, client side (demo)

- **Contract mirror** at `docs/network-contract/`: the relay's entire
  public interface (payload schemas, protocol state machine, promises
  3–5, endpoint map) — the user-auditable half of agent-to-agent hiring.
- **`nma_net_*` tool group** in `nextmillionai-mcp` (now 23 tools):
  register/verify, prefs, publish (banded `network_profile.v1` built
  from the local assessment — unmeasured refuses, never estimates;
  client-side schema validation; pre-publish identifiability check
  against pool histograms with optional widen), status, pull-only
  inbox, typed-envelope respond, double-opt-in reveal with the
  irreversibility warning, block, hard-delete unpublish. Every mutating
  tool renders its exact payload and requires `confirmed: true` after
  an explicit human yes.
- **`nextmillionai-hire-mcp/`** — the hirer side: structured facet
  search (10-card pages, watermarked), card view, role-card interest
  (10/day quota), inbox, human-approved messaging, reveal.
- **`agents/`** — builder-rep and hirer-rep as versioned,
  framework-agnostic definition bundles (AGENT.md + policy.yaml +
  context.md), Claude Code subagent/skill adapters, a Claude Agent SDK
  headless harness, and the AGENTS.md embedding contract with a
  LangGraph / OpenAI Agents SDK porting note.
- **Guardrail evals**: promptfoo suites (13 cases per rep — safety,
  fidelity, protocol, quality), `make eval-agents`, written
  runnable-later (no key required to ship them).
- **`docs/DEMO-NETWORK.md`** — the end-to-end walkthrough (search →
  interest → silent inbox → accept → chat → double-approved reveal),
  verified live against a running relay.

## [1.0.0] - 2026-06-24

First public release. nextmillionai is a local-first AI coding profile
builder — the open alternative to Paxel.

### Added

- **Local-first assessment.** Scans the AI coding sessions already on your
  machine (Claude Code, Cursor, Codex) plus git, and scores how you build
  with AI — entirely on your machine. No account, no upload.
- **Six measured dimensions**, scored as arithmetic over counted local
  signals against research-anchored bands: Signal Clarity, Build Stability,
  Decision Weight, Recovery Velocity, Context Command, Orchestration Range.
  Anything that can't be measured is marked *insufficient*, never estimated.
- **Archetypes, crafts, and positioning.** Nine archetypes, twelve crafts
  plus the AI Explorer baseline, and a build-domain × leverage positioning
  map — a map, never a ladder (no percentiles, cohorts, or rankings).
- **One assessment JSON renders two views** — a shareable profile and a deep
  report (builder card, 2D positioning map, competency radar, Business Fit
  Map, heatmap, and a right-click "explain this number").
- **Wide tool coverage.** Claude Code, Cursor (all storage generations),
  Codex, git, and Claude Desktop (opt-in); a wider field of editors and CLIs
  (Aider, Cline, Continue, Copilot, Windsurf, Cody, JetBrains AI, Zed) and
  local model runtimes (Ollama, LM Studio, llama.cpp), with per-adapter
  fidelity shown in Provenance.
- **Opt-in enrichment** (`enrich`): narrative written by your own agent from
  real signals and bounded, secret-stripped excerpts; strictly validated and
  revocable — it never changes a score.
- **Opt-in code scan** (`assess --code`): repo files reduced to metrics only,
  on a raise-only basis, to sharpen build-domain classification.
- **Open, transparent methodology.** Every formula and band is documented and
  served at `/methodology`, with provenance and citations; a machine-readable
  registry drives the docs and a fingerprint test pins the formulas.
- **Privacy by construction.** No network in the assessment path; a single
  outbound module handles the explicit, derived-only, revocable `publish`.
  Your shareable profile carries derived numbers only — never your source
  code, prompts, or transcripts.
- **Surfaces.** A CLI, a self-hostable web profile + report + JSON, static
  export, an opt-in reference registry, and a Claude Code plugin.
- **Runs straight from the clone.** Python 3.9+, zero runtime dependencies.
