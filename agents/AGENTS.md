# agents/ — rep agents as definitions, not services

Two representative agents for the silent network, shipped as
**versioned, framework-agnostic definition bundles**. There is no agent
runtime in this repo: your own agent harness (Claude Code today,
anything tomorrow) loads a bundle and becomes the rep. The intelligence
runs on your machine under your account — the relay stays a dumb,
auditable store-and-forward (see
[`../docs/network-contract/`](../docs/network-contract/)).

| Bundle | Represents | Tools it drives |
|---|---|---|
| [`builder-rep/`](builder-rep/) | the developer | `nma_net_*` ([`nextmillionai-mcp`](../nextmillionai-mcp/)) |
| [`hirer-rep/`](hirer-rep/) | the hiring manager | `nma_hire_*` ([`nextmillionai-hire-mcp`](../nextmillionai-hire-mcp/)) |

Each bundle is four files:

- **`AGENT.md`** — the definition: identity, fiduciary rules, posture,
  escalation (text approval cards), injection defense, few-shots.
  Versioned in its frontmatter; this file *is* the product.
- **`policy.yaml`** — the same red lines, machine-readable, for
  harnesses that want to enforce or display them.
- **`context.md`** — deterministic context assembly: order, 8k budget,
  thread compression, and the statelessness rule (mailbox is the only
  memory).
- **`evals/cases.yaml`** — promptfoo cases asserting the guardrails
  hold (safety, fidelity, protocol, quality). `make eval-agents`.

## The embedding contract

Any harness can run a rep. The interface is deliberately tiny:

**Inputs**
1. The bundle (`AGENT.md` + `policy.yaml` + `context.md`) as the
   system prompt, assembled per `context.md`.
2. An MCP endpoint exposing the right tool group (`nma_net_*` or
   `nma_hire_*`) — stdio locally, any transport your harness supports.
3. The task: the human's ask, plus a conversation id when the task is
   thread-specific.

**Outputs**
- Tool calls only. A rep never has a side channel: no file writes, no
  direct network access, no state of its own. Its user-facing output is
  conversation text (summaries, recommendations, approval cards); its
  effects on the world go exclusively through the MCP tools — which
  themselves refuse mutations without `confirmed: true`.

**Guarantees the harness must keep**
- A human sees and approves every mutating payload (the MCP layer
  enforces the mechanism; the harness must not auto-answer the
  approval).
- Context is assembled fresh per task (no cross-session memory).

## Guardrails are layered — the definition is layer 3 of 4

1. **Server protocol** (deterministic): state machine, quotas, schema
   rejection — relay-enforced, tested in the private repo.
2. **MCP schemas + `confirmed: true`** (deterministic): payload display
   + explicit human approval on every mutation — enforced in the two
   packages here, pinned by `tests/test_mcp_network_tools.py`.
3. **AGENT.md + policy.yaml** (model-enforced): fiduciary claims
   discipline, identity protection, injection defense.
4. **Evals** (`evals/cases.yaml`): regression-tests that 1–3 hold in
   realistic adversarial scenarios.

A jailbroken rep can therefore embarrass itself, but it cannot skip
human approval (layer 2) and cannot make the server break its promises
(layer 1). Guardrail frameworks (NeMo Guardrails, Guardrails-AI) are
deliberately absent from the demo; they slot in as an optional layer
3.5 later if policy.yaml outgrows prose.

## Harnesses in this repo

- **[`adapters/claude/`](adapters/claude/)** — Claude Code subagents
  (`@builder-rep`, `@hirer-rep`) and skill wrappers. Interactive use,
  works day one.
- **[`adapters/sdk/`](adapters/sdk/)** — a minimal Claude Agent SDK
  harness for headless and eval runs (the SDK loads MCP servers
  natively, so the harness is ~a page).

## Porting note (proof the definitions carry over)

Nothing above is Claude-specific. To port a rep to another framework:

- **LangGraph:** one agent node; `AGENT.md` (+ `policy.yaml`) as the
  system message; bind the MCP tools via `langchain-mcp-adapters`;
  implement `context.md`'s assembly in the state-reducer; interrupt on
  the approval-card pattern for human-in-the-loop.
- **OpenAI Agents SDK:** an `Agent` with `instructions=AGENT.md`,
  `mcp_servers=[the stdio server]`; `context.md` becomes the
  `RunContext` builder; approval cards map to `needs_approval` tool
  wrappers.

In both cases the bundle files are used byte-for-byte; only the ~page
of harness glue changes. That is the point: the rep is the definition,
and the definition is open — read every line of the agent that speaks
for you.
