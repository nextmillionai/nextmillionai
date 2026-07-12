# Network Promises

nextmillionai's PRIVACY.md makes two promises about the local
assessment. The silent network adds three more. Like the first two,
they are literally true, enforced in code, and tested in CI — and
where v0 falls short of the ideal, we say so here instead of hiding it.

## Promise 3 — What the network stores

**The server stores your banded, derived, pseudonymous profile — and
one email address. Nothing else about you exists on our side.**

- The published profile is exactly the `network_profile.v1` document
  you confirmed at publish: band labels, controlled-vocabulary tags,
  week-precision dates. No free text. The server *rejects* any payload
  with an unknown field or an exact number where a band belongs — it
  cannot quietly start collecting more.
- Your verified email lives in a separate identity vault holding
  exactly one row: your pseudonym → your email. No name, no phone, no
  CV, no links. It is read by exactly one code path: reveal
  fulfillment.
- `unpublish` is a **hard delete** — profile, vault row,
  conversations, event logs, registration: gone in one transaction.
  We do not keep a copy to "win you back" with.
- Honest v0 gaps: the vault is not yet encrypted at rest, and
  requests are authenticated by bearer token rather than by signatures
  from a key only you hold. Both are marked in the code and are
  prerequisites for hosting real users.

## Promise 4 — What the server can see (and what it can't do)

**The server is a dumb relay. It performs zero AI inference — it
cannot rank you, summarize you, or speak as you.**

- Every message on the network is a typed envelope from a public
  schema. The intelligence composing and reading those envelopes is
  your own agent, on your machine, under your account.
- **Blunt v0 honesty: free-text chat messages are visible to the
  server.** They are stored so they can be relayed, and whoever
  operates the server could read them. End-to-end encryption of
  message bodies is the first fast-follow, and until it ships you
  should write messages knowing the operator *could* see them.
  Everything else — profiles, role cards — is banded and structured,
  so there is nothing sensitive for the server to see there.
- Server logs contain event types and pseudonymous ids only. A CI
  guard fails the build if any handler logs an email, a message body,
  or a profile field.
- Nobody is notified of anything, ever. Interest sits in a mailbox
  until you ask your own agent. Silence is a feature.

## Promise 5 — What reveal means

**Identity moves only when both sides have explicitly said yes — and
then it really moves.**

- Pre-reveal, a hirer sees your bands and tags under a `b_…`
  pseudonym; you see their role card with company size and sector but
  no company name. The symmetry is deliberate.
- Reveal requires an explicit approval from each side, per
  conversation. Requesting a reveal is not approving it. Your approval
  is the consent record.
- On the second approval the server delivers both contact cards — the
  *verified* email each side registered with (not an address typed in
  the moment) plus an optional display name, and the hirer's company
  domain. **This is irrevocable.** Your tools are required to tell you
  so before you approve. Until that moment, either side can withdraw
  and nothing identifying has moved.
- Losing your key (v0: your token) severs the pseudonym by design.
  There is no recovery flow: rotate, get a new pseudonym, republish.
  We cannot link the old one to you — that's the point.

---

If you find any path through the server's observable behavior that
violates these promises, that is a security bug — report it exactly as
SECURITY.md in the open repo describes. The server code is private;
these promises, the schemas, and the protocol are the public contract
it is held to.
