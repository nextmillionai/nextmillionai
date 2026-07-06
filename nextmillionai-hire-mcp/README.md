# nextmillionai-hire-mcp

The hiring side of the silent network, as MCP tools for your own LLM.
The relay does zero inference — it cannot rank, summarize, or match.
Your agent translates a role description into structured facets, reads
banded pseudonymous cards, and drives a double-opt-in conversation. The
whole server contract is public and mirrored at
[`docs/network-contract/`](../docs/network-contract/): read every line
the network can see.

## How hiring works here

1. **Search is structured, not semantic.** `nma_hire_search`'s input
   schema is the entire query language: minimum dimension bands,
   verified crafts, stack tags, availability, timezone band. Max 10
   cards per page, and every result set is watermarked with your hirer
   id — searches are attributable, by design.
2. **Interest is a role card, not a pitch.** Title, remote, company
   size, sector, optional comp band. No company name — pre-reveal you
   are exactly as pseudonymous as the builder. Quota: 10/day.
3. **Silence is the medium.** Builders are never notified. Your
   interest sits in their mailbox until they ask their own agent.
   DECLINE is final; silence means not now.
4. **Chat opens only when the builder accepts.** Free text exists only
   in state `active` (v0 honesty: bodies are readable by the relay
   until end-to-end encryption ships — the tools say so before you
   approve any message).
5. **Reveal is double-opt-in and irrevocable.** Both sides approve
   separately; on the second approval both verified contact cards are
   delivered — including your company domain — and cannot be recalled.

Every mutating tool shows its exact payload and requires
`confirmed: true` only after your explicit yes. Humans approve every
outbound message; there are no auto-replies.

## Setup

Requirements: Node 18+. Run `npm install` in this directory once.

Register (`nma_hire_register` sends work email + company domain;
free-mail domains are rejected), then the network operator manually
approves and issues your bearer token. Configure any MCP client:

```json
{
  "mcpServers": {
    "nextmillionai-hire": {
      "command": "node",
      "args": ["/absolute/path/to/nextmillionai/nextmillionai-hire-mcp/index.js"],
      "env": {
        "NMA_NET_BASE": "http://127.0.0.1:7750",
        "NMA_HIRE_TOKEN": "<token from operator approval>"
      }
    }
  }
}
```

## Tools (7)

| Tool | What |
|---|---|
| `nma_hire_register` | Work-email + company-domain registration (manual operator approval issues the token). |
| `nma_hire_search` | Structured facet search; 10-card pages; watermarked. |
| `nma_hire_view` | One builder's full published card by `b_…` id. |
| `nma_hire_interest` | Structured role card → opens a conversation (`confirmed: true` gated). |
| `nma_hire_inbox` | Your conversations: state, messages, agent log. |
| `nma_hire_message` | Free text in `active` (human-approved, 2000 chars) or WITHDRAW. |
| `nma_hire_reveal` | Double-opt-in reveal: request / approve, irreversibility stated in plain words. |

A ready-made hirer rep agent that drives these tools honestly lives at
`agents/hirer-rep/` — the end-to-end demo is `docs/DEMO-NETWORK.md`.
