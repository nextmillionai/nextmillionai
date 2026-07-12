# Docs map — what's here for what

Every doc in the project, grouped by purpose, so you can find the right
one without opening five. Paths are relative to the repo root.

> Reading order for a new contributor or agent is in
> [`CURRENT.md`](../CURRENT.md) (the project's single source of truth).
> This page is the *flat map by topic*; that one is the *ordered path*.

## Start here

| Doc | For |
|---|---|
| [`README.md`](../README.md) | What it is, install (git clone), quickstart. |
| [`CURRENT.md`](../CURRENT.md) | Live project state, what's done, open work, reading order. |
| [`CLAUDE.md`](../CLAUDE.md) | Rules for agents working in the repo (values, gates, conventions). |

## Why it exists (product & thesis)

| Doc | For |
|---|---|
| [`THESIS.md`](../THESIS.md) | The argument: why measure how you build with AI. |
| [`REFERENCES.md`](REFERENCES.md) | The formal bibliography behind the scoring. |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) · [`REPO-FLOW.md`](REPO-FLOW.md) | Module map + repo chart/flow (mermaid). |
| [`BUILDER-MODEL.md`](../BUILDER-MODEL.md) · [`TAXONOMY.md`](../TAXONOMY.md) | The positioning enum, archetypes, and kinds. |
| [`agents/`](agents/) | Agent-readable specs per surface (profile, report, website). |

## The contracts (versioned — change deliberately)

| Doc | For |
|---|---|
| [`nextmillionai/docs/SCORING-METHODOLOGY.md`](../nextmillionai/docs/SCORING-METHODOLOGY.md) | Every scoring formula and band. Served at `/methodology`. |
| [`nextmillionai/docs/SCHEMA.md`](../nextmillionai/docs/SCHEMA.md) | The one assessment JSON + shareable/private map. |
| [`HARDLINES.md`](HARDLINES.md) | What must not change without owner sign-off, and how that's enforced. |
| [`proposals/`](proposals/) | Methodology change proposals — draft, review, compare, publish — before a contract moves (`scripts/proposals.py`). |
| [`BUSINESS-FIT-MAP.md`](BUSINESS-FIT-MAP.md) | Fit-map formulas + naming policy. |

## The silent network (opt-in, contract-first)

The hosted relay's implementation is private; its **interface is public**
and mirrored here verbatim, so you can read exactly what leaves your
machine and what the server stores without trusting anyone.

| Doc | For |
|---|---|
| [`network-contract/NETWORK-PROMISES.md`](network-contract/NETWORK-PROMISES.md) | Promises 3–5: what the server stores, what it can see, what reveal means. |
| [`network-contract/PROTOCOL.md`](network-contract/PROTOCOL.md) | The conversation state machine and every rule the relay enforces. |
| [`network-contract/network_profile.v1.json`](network-contract/network_profile.v1.json) · [`network-contract/envelopes.v1.json`](network-contract/envelopes.v1.json) | The only payloads that exist on the network (JSON Schema). |
| [`network-contract/openapi.yaml`](network-contract/openapi.yaml) | Endpoints, methods, status codes. |
| [`network-contract/HANDOFF.md`](network-contract/HANDOFF.md) | Client-integration brief: auth, endpoint map, what clients must enforce. |
| [`DEMO-NETWORK.md`](DEMO-NETWORK.md) | The end-to-end demo: both MCP servers + rep agents, incl. a double-approved reveal. |
| [`../agents/AGENTS.md`](../agents/AGENTS.md) | The rep agents: embedding contract, layered guardrails, porting note. |

## How it reads your data (privacy & coverage)

| Doc | For |
|---|---|
| [`ADAPTERS.md`](ADAPTERS.md) | Every tool read: versions, exact reads, fidelity. |
| [`../CODE-INTELLIGENCE.md`](../CODE-INTELLIGENCE.md) | The opt-in `--code` scan. |
| [`../DATA_COLLECTION.md`](../DATA_COLLECTION.md) · [`../PRIVACY.md`](../PRIVACY.md) · [`../SECURITY.md`](../SECURITY.md) | What's read, the two promises, vuln reporting. |
| [`SYNC.md`](SYNC.md) | Multi-device merge rule. |
| [`../ENRICHMENT-PROMPT.md`](../ENRICHMENT-PROMPT.md) | The prompt handed to the user's own agent for narrative. |

## Trust & design

| Doc | For |
|---|---|
| [`TRUST.md`](TRUST.md) | Anti-gaming: what a report proves, what it doesn't, what we won't do. |
| [`DESIGN.md`](DESIGN.md) | The design language — real tokens/components from the shipped UI. |

## Launch & marketing (internal)

Launch and marketing material lives in a separate `launch/` folder, kept
clearly *above the software*: the launch website, the go/no-go checklist,
the install/distribution plan, and the post-launch roadmap. This folder is
**internal — excluded from the public mirror**, so it is not linked here.

## Contributing

| Doc | For |
|---|---|
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Setup, how to raise a PR, the four gates. |
| [`../CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) · [`../CHANGELOG.md`](../CHANGELOG.md) | Conduct, release notes. |

## Marketing assets

[`assets/`](assets/) — the README hero screenshots and the social-preview
card. (Kept next to the README that embeds them.)
