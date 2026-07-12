# DEMO — the silent network, end to end

Two people, two agents, zero paid accounts, nothing leaving your
machines except banded documents you approved. This walkthrough runs
the whole hiring loop — search → interest → the silent moment → chat →
double-approved reveal — against a locally-running relay, driven
through `@hirer-rep` and `@builder-rep` in Claude Code.

The relay's public contract (everything the server can see, store, or
do) is mirrored at [`network-contract/`](network-contract/). The demo
never depends on anything beyond it.

## 0. Prerequisites

- This repo, with MCP dependencies installed:
  `(cd nextmillionai-mcp && npm install)` and
  `(cd nextmillionai-hire-mcp && npm install)`. Node 18+.
- The relay (private backend repo) running locally with demo seeds —
  from that repo:

  ```bash
  python3 -m venv .venv && .venv/bin/pip install fastapi uvicorn
  .venv/bin/python seed_demo.py --db network.db     # prints all tokens
  .venv/bin/python -m server serve --db network.db  # http://127.0.0.1:7750
  ```

  The seed prints 3 builder identities (id + token) with published
  profiles and 1 approved hirer token. Keep them handy.

## 1. Configure the two MCP servers

**Builder side** — the repo's checked-in `.mcp.json` already registers
the `nextmillionai` server for Claude Code. To act as a *seeded* demo
builder, export its identity before launching Claude Code:

```bash
export NMA_NET_BUILDER_ID=b_…   # seeded builder 1 (multi_agent_orchestrator)
export NMA_NET_TOKEN=…
```

(Claude Desktop / other clients: see
[`../nextmillionai-mcp/README.md`](../nextmillionai-mcp/README.md).)

**Hirer side** — any MCP client; with Claude Desktop or a second
Claude Code session (the package is
[on npm](https://www.npmjs.com/package/nextmillionai-hire-mcp), so
`"command": "npx", "args": ["-y", "nextmillionai-hire-mcp"]` works too
— this demo uses the checkout you already have):

```json
{
  "mcpServers": {
    "nextmillionai-hire": {
      "command": "node",
      "args": ["/absolute/path/to/nextmillionai/nextmillionai-hire-mcp/index.js"],
      "env": {
        "NMA_NET_BASE": "http://127.0.0.1:7750",
        "NMA_HIRE_TOKEN": "<seeded hirer token>"
      }
    }
  }
}
```

**Rep agents** — mount the subagents (once):

```bash
mkdir -p .claude/agents
ln -sf ../../agents/adapters/claude/builder-rep.md .claude/agents/builder-rep.md
ln -sf ../../agents/adapters/claude/hirer-rep.md  .claude/agents/hirer-rep.md
```

## 2. The walkthrough

Every outbound step below pauses at a text **approval card** — the
exact payload plus one honest "why" — and proceeds only on your
explicit yes. That's not demo theater; the tools refuse to send
without `confirmed: true`.

**Hirer's Claude:**

> `@hirer-rep` I need an AI engineer who can run our agent fleet.
> Remote, we're a ~30-person AI-infra startup, 150-250k.

The rep translates that into structured facets
(`orchestration_range_min=advanced`, `crafts=multi_agent_orchestrator`,
…), searches (10-card pages, watermarked with your hirer id), presents
the matching card — bands and evidence only, `b_…` pseudonym — and
renders the INTEREST approval card with the full role card (no company
name: pre-reveal you're exactly as pseudonymous as the builder).
Approve it. State: `interested`.

**Builder's Claude — the silent moment.** Nothing was pushed, nobody
was notified. Whenever the builder feels like it:

> `@builder-rep` anything in my inbox?

The rep polls the mailbox, finds the interest, checks the role card
against the published prefs, and recommends — with an approval card for
ACCEPT_CHAT (or DECLINE, which is terminal and final). Accept. State:
`active`. (Try sending a message *before* accepting: the relay itself
rejects it with 409 — attention is opt-in at the protocol level.)

**Chat, human-approved, both sides.** Each message is drafted by the
rep, shown verbatim, approved explicitly — with the v0 honesty note
that message bodies are relay-readable until E2E encryption ships.
Claims trace to bands and the role card; identity questions get
deflected to the reveal flow (ask the builder "which company are you
at?" and watch the rep refuse politely).

**Reveal — double opt-in, then it really moves.**

> hirer: `@hirer-rep` request the reveal.
> hirer: approve our side. *(display name collected now; first
> approval — nothing moves)*
> builder: `@builder-rep` approve the reveal. *(irreversibility stated
> in plain words; second approval — fulfillment)*

Both sides' contact cards land in the conversation: the *verified*
registration emails, the display names given at approval time, and the
hirer's company domain — symmetric, irrevocable, logged. Ask either rep
"what happened?" to render the agent log (state transitions only —
message bodies are never in it).

## 3. Joining as yourself (fresh identities)

The seeded identities skip onboarding. The real paths work end to end
too:

- **Builder:** `nma_net_register` (email only; approval-carded) → the
  verification code prints on the *relay server's console* (demo
  stand-in for email) → register again with the code → `nma_net_prefs`
  (availability, roles, remote, tz band) → `nma_net_publish`. Publish
  refuses while anything is unmeasured, validates against the contract
  schema client-side, and shows the pool-histogram **identifiability
  warnings** ("you would be the only profile in this band") with
  `widen=true` to drop rare optional tags before anything is sent.
  `nma_net_unpublish` is the exit: one hard delete — profile, vault
  email, conversations, registration — and the token dies.
- **Hirer:** `nma_hire_register` (work email + company domain;
  free-mail rejected) → the operator approves manually from the backend
  repo (`python -m server approve-hirer h_…`) and the printed token
  goes into `NMA_HIRE_TOKEN`.

## 4. When something 4xx's

| Code | Meaning |
|---|---|
| 401 | bad/missing token — or the identity was hard-deleted |
| 403 | wrong party (e.g. hirer token on a builder route) |
| 404 | not found *or not your conversation* — deliberately indistinguishable |
| 409 | illegal state transition (the state machine said no) |
| 422 | payload violates the public schema (field-level errors in the body) |
| 429 | interest quota: 10/day per hirer |

Everything above was verified live against the seeded relay: the full
search → interest → accept → chat → double-approved reveal loop, the
409 on premature MESSAGE, and the fresh-identity register → publish →
hard-delete loop, all driven through the two MCP servers.
