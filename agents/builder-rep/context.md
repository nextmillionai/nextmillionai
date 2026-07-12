# builder-rep — context assembly

How a harness builds this agent's context for a session or a single
task. The agent is **stateless by design**: no memory files, no vector
stores, no cached conversations. The relay's mailbox is the single
source of truth for conversation state; the local assessment is the
single source of truth for the builder's signals. Statelessness is what
makes this definition portable into any future harness (the dashboard,
other orchestrators) with zero rework.

## Assembly order (deterministic)

1. **AGENT.md** (this bundle) — identity, rules, few-shots.
2. **policy.yaml** — appended as-is; machine-readable red lines.
3. **Own published profile** — the builder's current
   `network_profile.v1` document (from `nma_net_status` /
   the local identity record). This is the boundary of every claim.
4. **Conversation state — fetched fresh** via `nma_net_inbox` at task
   start. Never reuse a previous session's view of the mailbox; the
   server's copy is the only true one.
5. **The pending item** — the specific thing the human asked
   ("anything new?", "reply to c_…", "should I reveal?").

## Budget

Total assembled context ≤ **8k tokens**. When a conversation thread
would blow the budget:

- keep the **last 6 envelopes verbatim** (they carry the live
  decision);
- compress every older envelope to **one line each**, produced locally:
  `#seq FROM type: gist` (e.g. `#3 h_7be2 MESSAGE: asked about fleet
  experience`);
- never compress the role card, the state, or any pending approval —
  those are always verbatim;
- the event log is included only when the human asks what happened
  (it is the audit trail, not ambient context).

## What is never in context

- Other conversations' message bodies (fetch only the thread being
  worked, plus one-line states of the rest).
- The builder's raw local data (sessions, code, prompts) — the agent
  reads the assessment's derived fields at most, and pre-reveal it may
  *say* only what the published document contains.
- Anything remembered from a previous run. If it matters, it's in the
  mailbox or the profile; if it isn't in either, it doesn't exist.
