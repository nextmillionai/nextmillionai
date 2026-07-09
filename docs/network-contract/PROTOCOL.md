# Silent Network Protocol · v0

This document is public. It describes exactly how the hosted relay
behaves — what it accepts, what it enforces, and what it will never do.
The server implementation is private; nothing in it changes behavior
described here. If observed behavior ever differs from this document,
that is a bug in the server, not in the document.

## Actors

- **Builder** — a developer who published a `network_profile.v1`
  (see `network_profile.v1.json`). Pseudonymous: `b_…` id.
- **Hirer** — a hiring manager, registered with a work email on their
  company domain (free-mail rejected) and auto-onboarded: the API
  token is delivered only to that inbox, so holding it proves control
  of a company-domain address. Pseudonymous to builders pre-reveal:
  `h_…` id.
- **Relay** — the hosted server. A typed-message store-and-forward,
  structured search index, and reveal escrow. It performs **zero LLM
  inference** and never generates, rewrites, ranks, or interprets
  content. All intelligence lives in the users' own agents.

## Conversation state machine

A conversation is created by a hirer's INTEREST and moves through:

```
                    INTEREST (hirer, quota-enforced)
                              │
                              ▼
                        ┌──────────┐
        ┌── DECLINE ────┤interested├─── WITHDRAW ──┐
        │   (builder)   └────┬─────┘  (either side) │
        ▼                    │ ACCEPT_CHAT          ▼
   ┌────────┐                │ (builder)      ┌─────────┐
   │declined│                ▼                │withdrawn│
   └────────┘           ┌────────┐            └─────────┘
    terminal            │ active │◄─── MESSAGE ─┐  ▲ terminal
                        └───┬────┘   (both, ≤2000 chars,
                            │         loops in `active`)
                            │ REVEAL_REQUEST (either side)
                            ▼
                     ┌──────────────┐
                     │reveal_pending├─── WITHDRAW (either side,
                     └──────┬───────┘    before fulfillment) ──► withdrawn
                            │ REVEAL_APPROVE × 2
                            │ (each side once; fulfillment
                            │  on the second)
                            ▼
                       ┌─────────┐
                       │revealed │  terminal
                       └─────────┘
```

### Rules the server enforces (every one is tested)

1. **No MESSAGE before ACCEPT_CHAT.** Free-text messaging exists only
   in state `active`. The builder's attention is opt-in, not just
   their identity. A MESSAGE in any other state is rejected (409).
2. **Only the builder can ACCEPT_CHAT or DECLINE**, and only from
   `interested`.
3. **REVEAL_REQUEST** may be sent by either side, only from `active`.
   It moves the conversation to `reveal_pending`. It is *not* an
   approval.
4. **Reveal requires both approvals.** Each side posts REVEAL_APPROVE
   exactly once (including the side that requested). On the second
   approval the server fulfills the reveal — this is the only code
   path that reads the identity vault. Approvals are the recorded
   consent events.
5. **Fulfillment is irrevocable.** Before it, either side can WITHDRAW
   and no identity moves. After it, both contact cards have been
   delivered and cannot be recalled. Client tools must say this in
   plain words before a user approves.
6. **Contact card contents:** the vault's *verified* email (it cannot
   be substituted at approval time), plus an optional display name
   given in the REVEAL_APPROVE, plus — for hirers — the registered
   company domain. Company identity is revealed exactly when personal
   identity is: at fulfillment, symmetrically.
7. **WITHDRAW** works from any non-terminal state, by either side.
8. **Quota:** a hirer may create at most **10 INTERESTs per UTC day**.
9. **Size caps:** MESSAGE text ≤ 2000 characters. All envelopes are
   validated against `envelopes.v1.json`; unknown keys are rejected.
10. **Blocks:** a builder may block a hirer at any time. Blocking
    withdraws open conversations between the two and silently drops
    future INTERESTs from that hirer to that builder.

## Profile lifecycle

- `PUT /v1/profiles/{builder_id}` accepts **only** documents valid
  against `network_profile.v1.json`: banded scores, banded counts,
  week-precision dates, controlled vocabularies, no free text, no
  unknown keys. Anything else is rejected with a field-level error.
- `DELETE /v1/profiles/{builder_id}` is a **hard delete**: the profile
  row, the identity-vault row, every conversation the builder is party
  to (including messages and event logs), and the builder's
  registration itself are permanently removed in one transaction.
  There is no soft-delete, no retention window, no backup replay of
  deleted rows in v0. Re-publishing afterwards means registering
  again — a new pseudonym (this is also the key-loss story: rotate =
  new pseudonym, republish).
- `GET /v1/pool/histograms` returns anonymized band-distribution
  counts for the published pool, so the client can run its pre-publish
  identifiability check ("you would be the only profile in this band —
  widen it?") without the server ever seeing the unpublished profile.

## Search

Search is **structured, not semantic**. The natural-language
understanding happens in the *hirer's own* LLM, which translates a
role description into facets: minimum dimension bands, crafts, stack
tags, availability, timezone band. The server executes indexed SQL.

- Results are capped at **10 cards per page**, paginated.
- Every result set is watermarked with the requesting hirer's id.
- Cards contain only `network_profile.v1` fields — nothing else exists
  server-side to leak.

## Event log (audit trail)

Every conversation accumulates an append-only event log of **state
transitions only** — event type, actor id, sequence, week-precision
timestamp bucket plus exact server timestamp for dispute resolution.
Message bodies are never in the event log. Either party can fetch the
log for their own conversations. This log is the future "agent log"
panel of the product vision.

## Authentication

v0 (demo): bearer tokens issued at registration/verification.
PRODUCTION: every envelope is Ed25519-signed by a key generated on the
user's machine; the public-key fingerprint *is* the pseudonymous id;
the server verifies signatures and rejects mismatches. The schemas
already reserve this shape.

## Reserved (explicitly not in v0)

- `ATTACHMENT_ENRICHMENT` envelope — post-reveal delivery of the
  local enrichment narrative ("reference letter" moment). Reserved
  because the narrative is the most identifying artifact the product
  produces; it does not transit the relay until MESSAGE bodies are
  E2E-encrypted (fast-follow).
- E2E encryption of MESSAGE bodies (per-conversation X25519).
- Conversation expiry (`expired` state), email digests, semantic
  re-ranking, reports endpoint beyond blocks.
