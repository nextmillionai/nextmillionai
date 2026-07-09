# HANDOFF — for session 2 (client side, OSS repo)

You are building the client side of the silent network inside the
open-source repo: the `nma_net_*` tool group in `nextmillionai-mcp/`,
the new `nextmillionai-hire-mcp/` package, and both rep-agent
definitions. Everything you need is in this `contract/` directory —
you should never need to read the private server code. Mirror this
directory verbatim into the OSS repo at `docs/network-contract/`
(PO decision A3/B2).

## Read order

1. `NETWORK-PROMISES.md` — the product truth your tool descriptions
   must repeat (especially reveal irreversibility and v0
   server-visible messages).
2. `PROTOCOL.md` — the state machine your tools drive.
3. `network_profile.v1.json` + `envelopes.v1.json` — the only payloads
   that exist.
4. `openapi.yaml` — endpoints, methods, status codes.

## Running the backend locally

```bash
git clone <private repo> nextmillionai-network-backend
cd nextmillionai-network-backend
python3.11 -m venv .venv && .venv/bin/pip install fastapi uvicorn
.venv/bin/python seed_demo.py --db network.db     # prints all tokens
.venv/bin/python -m server serve --db network.db  # http://127.0.0.1:7750
```

`seed_demo.py` prints: 3 builder ids + tokens (published profiles,
distinct archetypes/timezones/availability) and 1 approved hirer id +
token. Base URL: `http://127.0.0.1:7750`. See `DEMO-SERVER.md` at the
repo root for the full walkthrough including registering fresh
identities.

## Auth (v0)

`Authorization: Bearer <token>` on everything except
`POST /v1/builders`, `POST /v1/builders/verify`, `POST /v1/hirers`,
`GET /v1/pool/histograms`, `GET /v1/health`.

- Builder token: returned by `POST /v1/builders/verify`. The
  verification code is printed to the *server console* in demo mode —
  the dev-side flow should tell the user to look there (it stands in
  for a verification email).
- Hirer token: emailed automatically to the registered work address by
  `POST /v1/hirers` (auto-onboard; printed to the *server console* in
  demo mode, like the builder code). The email's domain must equal
  `company_domain` and free-mail domains are rejected, so delivery IS
  the verification. The operator CLI
  (`python -m server approve-hirer <hirer_id>`) remains the manual
  valve for re-issuing/rotating a token. The hirer MCP is configured
  with this token.
- 401 = bad/missing token (or hirer not yet approved). 403 = wrong
  party (e.g. token doesn't own the profile). 404 = not found OR not
  your conversation (deliberately indistinguishable). 409 = illegal
  state transition. 422 = contract violation (response body lists
  field-level errors). 429 = interest quota (10/day/hirer).

## Endpoint map (details in openapi.yaml)

| Endpoint | Who | Notes |
| --- | --- | --- |
| POST /v1/builders | public | body `{email, pubkey?}` → `{builder_id}`; code → server console |
| POST /v1/builders/verify | public | `{builder_id, code}` → `{token}` |
| PUT /v1/profiles/{id} | builder | body = full `network_profile.v1` doc; 204 |
| DELETE /v1/profiles/{id} | builder | HARD delete; token dies with it; 204 |
| GET /v1/pool/histograms | public | for the pre-publish identifiability check |
| POST /v1/hirers | public | `{email, company_domain}`; free-mail/domain-mismatch rejected (403); 201 → `{hirer_id, status: "approved"}`, token emailed (demo: server console) |
| GET /v1/search | hirer | query params below; max 10 cards/page |
| POST /v1/interests | hirer | `{builder_id, role_card}`; 201 → `{conv, state}` |
| GET /v1/mailbox | both | full conversations: state, role_card, messages, events |
| POST /v1/messages | both | envelope: ACCEPT_CHAT / DECLINE / MESSAGE / REVEAL_REQUEST / WITHDRAW |
| POST /v1/reveals/{conv} | both | `{display_name?}`; second approval returns `contact_cards` |
| POST /v1/blocks | builder | `{hirer_id}`; 204 |

`GET /v1/search` query params: `<dimension>_min` (band id) for each of
the six dimensions, `crafts` (repeatable), `stack_tags` (repeatable),
`availability`, `tz_band`, `remote` (bool), `archetype`, `page`
(0-based). Response: `{requested_by, page, page_size, cards[]}` —
`requested_by` is the watermark; surface it in the hirer MCP so the
watermarking is honest and visible.

Mailbox response per conversation:
`{conv, state, counterpart, role_card, messages[], events[]}` where
`messages[]` items are `{seq, from, type: MESSAGE|CONTACT_CARD, body,
at}` (CONTACT_CARD body: `{builder: {email, display_name}, hirer:
{email, display_name, company_domain}}`) and `events[]` items are
`{seq, event, actor, at_week}`. The events list is the "agent log" —
render it when users ask what happened.

## What the CLIENT must enforce (server can't do it for you)

1. **Payload confirmation before every mutating call.** Every mutating
   MCP tool description must instruct the agent to display the exact
   payload and get explicit user confirmation first (the approval-card
   pattern from the vision demos). Humans approve every outbound
   message in the demo — no auto-ACKs (PO decision B5).
2. **Identifiability check before publish.** Fetch
   `/v1/pool/histograms`, flag any band the user would occupy alone or
   nearly alone, and offer to widen before `PUT /v1/profiles/{id}`.
3. **Reveal irreversibility warning.** Before POST /v1/reveals, the
   tool must state in plain words: both-sides consent, verified email
   + optional display name delivered, cannot be undone once the other
   side has also approved. Collect the optional display_name at that
   moment.
4. **Client-side schema validation** (belt and suspenders): validate
   the profile against `network_profile.v1.json` before sending; the
   server will also reject, but the user should hear it from their own
   machine first.
5. **The v0 honesty line** in the dev-side tool descriptions: message
   bodies are server-visible until E2E ships (Promise 4).

## Seed data reference

Three builders (exact ids/tokens printed at seed time):
multi_agent_orchestrator (python/typescript, UTC+3..+7, open) ·
context_engineer (python/go/terraform, UTC-8..-4, passive) ·
rapid_prototyper (typescript/python/sql, UTC+0..+3, open). One
approved hirer: `cto@acme-armadillo.dev` / domain `acme-armadillo.dev`.

A natural demo script: hirer searches
`orchestration_range_min=advanced&crafts=multi_agent_orchestrator`,
finds builder 1, sends INTEREST → builder polls mailbox, ACCEPT_CHAT,
messages back and forth, hirer REVEAL_REQUEST, both approve, contact
cards land in the conversation.

## Known v0 gaps (do not paper over them in tool descriptions)

- Bearer tokens, not Ed25519 signatures (PRODUCTION markers in place).
- Vault plaintext at rest (demo only).
- Message bodies server-visible (E2E is the first fast-follow).
- Verification code via server console, not email.
- No conversation expiry, no reports endpoint (blocks only).

## Contract change protocol

If the client needs anything the contract doesn't provide, do NOT
work around it: file it as `CONTRACT-CHANGE-NEEDED` in your worklog
(REVIEW-PIPELINE.md §2/§3) and the PO will route it to a backend
follow-up session. The mirrored `docs/network-contract/` must always
match this directory exactly.
