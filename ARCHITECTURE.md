# Architecture

Two planes, one privacy model:

1. **The profiler (engine)** — scans your AI-coding sessions + git
   locally, scores them, renders a profile and a report from ONE
   assessment JSON. No network in this path, ever.
2. **The silent-network client** — an optional, explicit layer that
   lets a builder publish a banded, derived, pseudonymous profile to a
   relay and lets hirers search it agent-to-agent. Talks only to the
   configured relay, only when its tools are invoked, and every
   mutation requires an explicit human yes.

## Module map

| Module | Paths | Purpose |
|--------|-------|---------|
| **core** | `nextmillionai/scoring.py`, `nextmillionai/schema.py`, `nextmillionai/signal_registry.py`, `nextmillionai/docs/**` | Scoring engine, the one data contract, derived-field registry, methodology docs |
| **scan** | `nextmillionai/scanner.py`, `nextmillionai/adapters/**`, `nextmillionai/code_intel.py`, `nextmillionai/history.py` | Multi-tool session scanner, per-tool adapters, opt-in code scan, durable ledger |
| **serve** | `nextmillionai/hub.py`, `nextmillionai/build_profile.py`, `nextmillionai/live.py` | HTTP server, CLI entry point, live file-watcher/SSE |
| **net** | `nextmillionai/network.py`, `nextmillionai/network_server.py`, `nextmillionai/sync_merge.py` | The ONLY outbound Python module (publish/sync, opt-in) + reference registry + device merge |
| **face** | `nextmillionai/static/**` | Frontend HTML/CSS/JS (one assessment JSON renders both views) |
| **bridge** | `nextmillionai-mcp/**` | Builder-side MCP server (14 engine tools + 9 `nma_net_*`) + the `nma-net` CLI + `net-lib.js` |
| **hire** | `nextmillionai-hire-mcp/**` | Hirer-side MCP server (7 `nma_hire_*` tools), standalone npm package |
| **reps** | `agents/**` | Representative agents as versioned definition bundles + harness adapters |
| **contract** | `docs/network-contract/**` | The relay's public contract, mirrored byte-identically from its home repo |

### Shared utilities

`paths.py`, `profile_data.py`, `cliui.py`, `consent.py`, `export.py`,
`visibility.py`, `business_fit.py`, `enrichment.py`, `__init__.py`, and
`__main__.py` belong to no single module — they are owned by maintainers.

## Dependency diagram

```
scan → core → serve → face
                ↓
               net      (outbound only, opt-in: publish / sync)
                ↕
              bridge ──── contract ──── hire
                │            │
              reps ──────────┘          (reps drive bridge/hire tools;
                                         everything network-side builds
                                         strictly against contract)
```

## The silent-network client (product view)

What ships today, per persona:

- **Builder** — two equivalent frontends over the same logic and the
  same identity file:
  - `nma_net_*` MCP tools inside your own agent (Claude Code, Cursor,
    any MCP host): register → verify by email → set prefs → publish,
    plus inbox / respond / reveal / block / unpublish.
  - `nma-net` CLI for the full lifecycle from a terminal — no MCP host
    needed. Both are npm-installable (`nextmillionai-mcp`).
- **Hirer** — `nextmillionai-hire-mcp` (npx-installable): structured,
  watermarked search from your own LLM, interest with a role card,
  messaging after acceptance, double-approved reveal. Tokens are issued
  by the relay operator; onboarding arrives by email.
- **Rep agents** — `@builder-rep` and `@hirer-rep`: open, versioned
  definition bundles (`agents/`) your own harness loads to act as your
  representative. The definition *is* the product — there is no agent
  runtime in this repo, and the relay does zero inference.

Product invariants (each enforced somewhere concrete, see tech view):

- **Derived-only, banded, pseudonymous.** The published doc holds band
  labels and controlled vocabularies only — no free text, no raw
  counts, week-precision dates. Unmeasured signals refuse to publish,
  never estimate.
- **Silence is a feature.** Interest sits in a pull-only mailbox;
  nobody is notified of anything. A block is indistinguishable from
  silence.
- **Free-text chat only after the builder accepts.** Quotas and state
  transitions are relay-enforced.
- **Identity moves only on a double-approved, irrevocable reveal.**
  Until the second approval, withdraw cancels everything.
- **Right to vanish.** Unpublish is a hard delete of everything the
  relay holds about you.
- **Consent is explicit.** Every mutating MCP tool renders its exact
  payload and requires `confirmed: true` after a human yes. The CLI
  shows the same card and takes a typed yes at an interactive terminal
  (piped stdin refuses; the one deliberate asymmetry: a chat message
  you typed yourself is its own approval).
- **No ranking.** Search returns matches against structured facets —
  never a leaderboard, percentile, or ordering of people.

## The silent-network client (tech view)

```
┌────────────────────────── user's machine ───────────────────────────┐
│  engine (python3 -m nextmillionai) — local scan + score             │
│      │ writes                                                       │
│      ▼                                                              │
│  ~/.nextmillionai/data/profile.json     ~/.nextmillionai/network/   │
│  (raw assessment — never leaves)        identity.json (id + token)  │
│      │                                        ▲                     │
│      ▼                                        │                     │
│  net-lib.js (pure, no I/O): assessment→bands (refuses unmeasured),  │
│  contract-schema validation, identifiability warnings + widen       │
│      │            │             │                                   │
│  nma-net CLI   nextmillionai-mcp   nextmillionai-hire-mcp           │
│  (terminal)    (builder MCP)       (hirer MCP)                      │
│      └────────────┴──────┬──────────┘                               │
│                   rep agents (definitions; run in YOUR harness)     │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ HTTPS — banded JSON only, per contract
                           ▼
              relay (default NMA_NET_BASE, override for
              local/self-hosted) — dumb store-and-forward:
              registry, profile store + search, mailbox,
              state machine, reveal escrow. Zero inference.
```

- **One contract, three consumers.** `docs/network-contract/` (JSON
  Schema 2020-12, `additionalProperties: false`, plus the protocol
  state machine and promises) is a byte-identical mirror of the
  relay's own contract — never edited here, only re-synced. The client
  validates every outbound document against it *before* sending;
  vocabulary tables in `net-lib.js` and the hirer package are kept
  byte-equal to the schema enums by review.
- **Pure logic is shared, I/O is thin.** `net-lib.js` owns band
  mapping, schema validation, and the pre-publish identifiability
  check (warn when a facet would make you nearly unique in the pool;
  `widen` drops rare optional tags, never measured bands). The CLI and
  both MCP servers are thin frontends over it plus `fetch`.
- **Identity and credentials.** `~/.nextmillionai/network/identity.json`
  is tool-owned (id, bearer token, prefs, published state).
  `NMA_NET_BUILDER_ID`/`NMA_NET_TOKEN` env identities override reads
  for demo/seeded runs and must never write to the file. Tokens travel
  only in `Authorization` headers.
- **Consent is layered, and the layers are load-bearing:**
  1. *Relay protocol* (deterministic) — state machine, quotas, schema
     rejection.
  2. *MCP `confirmed: true` + CLI typed-yes* (deterministic) — exact
     payload shown before any mutation; pinned by
     `tests/test_mcp_network_tools.py`.
  3. *Rep definitions* (`AGENT.md` + `policy.yaml`, model-enforced) —
     fiduciary rules, identity protection, injection defense
     (counterparty content is data, never instructions).
  4. *Evals* (`agents/*/evals/`, promptfoo) — adversarial regression
     cases that 1–3 hold.
- **Harnesses.** `agents/adapters/claude/` (Claude Code subagents +
  skills, interactive) and `agents/adapters/sdk/` (Claude Agent SDK,
  headless/evals; MCP children receive a whitelisted env; headless
  runs are meant to look-and-draft only — permission-model hardening
  is tracked in the worklog). The embedding contract in
  `agents/AGENTS.md` is deliberately tiny so bundles port byte-for-byte
  to other frameworks.

## Data-contract rules

`profile.json` and `scan_results.json` schemas are owned by **core**.
Other modules consume the contract but must not change it. Any schema
change requires:

1. A core-owner review.
2. A CHANGELOG entry.

`docs/network-contract/` is owned by the **relay** — this repo never
edits the mirror; contract-change requests are filed against the
relay's home repo and the mirror re-syncs (tracked in
`docs/network-client-WORKLOG.md`). The network client builds strictly
against the mirrored contract, never against relay internals.
