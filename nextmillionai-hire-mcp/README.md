# nextmillionai-hire-mcp

[![npm](https://img.shields.io/npm/v/nextmillionai-hire-mcp)](https://www.npmjs.com/package/nextmillionai-hire-mcp)

The hiring side of the silent network, as MCP tools for your own LLM.
The relay does zero inference — it cannot rank, summarize, or match.
Your agent translates a role description into structured facets, reads
banded pseudonymous cards, and drives a double-opt-in conversation. The
whole server contract is public and mirrored at
[`docs/network-contract/`](https://github.com/nextmillionai/nextmillionai/tree/feat/silent-network-client/docs/network-contract):
read every line the network can see.

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

## Getting onboarded (hiring side)

Hirer onboarding is gated by your work email: registration requires an
address on your company's own domain (free-mail is rejected, and the
email must match the domain you claim), and your access token is
delivered **only to that inbox** — so holding a token proves control
of a company-domain address. That is the network's abuse valve, and it
is why builders can trust that interest comes from real companies.
Onboarding is fully automatic: no human approval step, no waiting.

**What you need:** Node ≥ 18 · an MCP host (Claude Code, Claude
Desktop, Cursor, …) · a work email on your company's domain
(free-mail addresses like gmail are rejected for hirers).

### Step 1 — Add the MCP server (no clone, no token yet — that's fine)

The package is on npm, so `npx` fetches and runs it — nothing to clone
or install. Registration works without a token; everything else
refuses until you have one. The client talks to the hosted relay
(`network.nextmillionai.org`) by default — no relay setup, no
`NMA_NET_BASE` needed.

Claude Code, one line:

```bash
claude mcp add nextmillionai-hire -- npx -y nextmillionai-hire-mcp
```

Any other MCP host (Claude Desktop, Cursor, …):

```json
{
  "mcpServers": {
    "nextmillionai-hire": {
      "command": "npx",
      "args": ["-y", "nextmillionai-hire-mcp"]
    }
  }
}
```

Prefer running from source? Clone and point your host at the file
instead:

```bash
git clone -b feat/silent-network-client https://github.com/nextmillionai/nextmillionai.git
cd nextmillionai/nextmillionai-hire-mcp && npm install
# "command": "node", "args": ["/absolute/path/to/nextmillionai-hire-mcp/index.js"]
```

### Step 2 — Register

In your MCP host, ask your agent to register you — it drives
`nma_hire_register` with your **work email** + **company domain** (the
two must match). You'll see the exact payload and approve it before
anything is sent. Keep the returned pseudonymous id (`h_…`).

Prefer a terminal? Registration is one call:

```bash
curl -X POST https://network.nextmillionai.org/v1/hirers \
  -H 'Content-Type: application/json' \
  -d '{"email": "you@yourcompany.com", "company_domain": "yourcompany.com"}'
```

What the network stores: one vault row (pseudonym → your email) and
your company domain. Builders see **company size + sector only** until
a double-approved reveal; the domain itself is disclosed to a builder
only at reveal fulfillment.

### Step 3 — Check your work email

Registration onboards you on the spot: an email arrives at the work
address you registered, carrying your pseudonymous id, your bearer
token, and these same setup steps. The token travels **only in that
email** — it is never in the API response and never posted anywhere
public. No email after a minute or two? Check spam, then re-register
(a failed delivery leaves nothing usable behind; you simply get a
fresh id).

### Step 4 — Add the token and restart your MCP host

Claude Code:

```bash
claude mcp remove nextmillionai-hire
claude mcp add nextmillionai-hire --env NMA_HIRE_TOKEN=<token from the onboarding email> -- npx -y nextmillionai-hire-mcp
```

Other hosts — add the `env` block to the server entry from step 1:

```json
      "env": { "NMA_HIRE_TOKEN": "<token from the onboarding email>" }
```

### Step 5 — First session

- `nma_hire_search` with your role's facets — if you get a (possibly
  empty) watermarked result page, you're live.
- Expect the flow to be slower than a job board, on purpose: interest
  → builder pulls their mailbox on their own schedule → chat only if
  they accept → reveal only if you both approve. Silence is normal and
  means "not now".

Treat the token like a password: env only, never commit it. If it
leaks, open a GitHub issue on this repo titled
`token rotation: h_<your-id>` (the id is pseudonymous — never post the
token or your email). The operator rotates it and the new token
arrives at your registered work address; the old one dies.

### If something fails

| Symptom | Meaning / fix |
|---|---|
| `NMA_HIRE_TOKEN is not set` | Steps 3–4 not done yet — only register works tokenless |
| `401` on any tool | Wrong/revoked token — use the one from the onboarding email |
| `403` at registration | Free-mail domain, or email doesn't match `company_domain` |
| `502` at registration | The onboarding email couldn't be sent — nothing was created; try again |
| `503` at registration | Relay's daily email budget hit — try again later |
| `429` on interests | Daily quota (10/day) reached — resets next UTC day |
| `429` elsewhere / `Retry-After` | Relay rate limit — back off and retry |
| `fetch is not defined` | Node < 18 — upgrade (`nvm install 22`) |

Self-hosting a relay (or testing locally)? Point the client at it with
`"NMA_NET_BASE": "http://127.0.0.1:7750"` in the `env` block.

## Tools (7)

| Tool | What |
|---|---|
| `nma_hire_register` | Work-email + company-domain registration; your token arrives by email at that address. |
| `nma_hire_search` | Structured facet search; 10-card pages; watermarked. |
| `nma_hire_view` | One builder's full published card by `b_…` id. |
| `nma_hire_interest` | Structured role card → opens a conversation (`confirmed: true` gated). |
| `nma_hire_inbox` | Your conversations: state, messages, agent log. |
| `nma_hire_message` | Free text in `active` (human-approved, 2000 chars) or WITHDRAW. |
| `nma_hire_reveal` | Double-opt-in reveal: request / approve, irreversibility stated in plain words. |

A ready-made hirer rep agent that drives these tools honestly lives at
[`agents/hirer-rep/`](https://github.com/nextmillionai/nextmillionai/tree/feat/silent-network-client/agents/hirer-rep)
— the end-to-end demo is
[`docs/DEMO-NETWORK.md`](https://github.com/nextmillionai/nextmillionai/blob/feat/silent-network-client/docs/DEMO-NETWORK.md).
