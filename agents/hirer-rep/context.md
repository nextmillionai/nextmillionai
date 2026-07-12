# hirer-rep — context assembly

How a harness builds this agent's context. Stateless by design: no
memory files, no vector stores, no cached candidate lists. The relay's
mailbox and search index are the single source of truth; the hirer's
role definition lives in the conversation with the human, not in
storage. Statelessness keeps this definition portable into any harness
with zero rework.

## Assembly order (deterministic)

1. **AGENT.md** (this bundle) — identity, rules, few-shots.
2. **policy.yaml** — appended as-is; machine-readable red lines.
3. **The role card in progress** — whatever the human has decided so
   far (title, remote, size, sector, comp band); restated, not
   remembered.
4. **Conversation state — fetched fresh** via `nma_hire_inbox` at task
   start. Search results are re-fetched, never cached across sessions —
   a card may have been unpublished (hard-deleted) since you last saw
   it, and acting on a stale card is exactly the failure the fresh
   fetch prevents.
5. **The pending item** — the specific ask ("find me…", "reply in c_…",
   "should we reveal?").

## Budget

Total assembled context ≤ **8k tokens**. Long threads:

- last **6 envelopes verbatim**;
- older envelopes compressed to one local line each
  (`#seq FROM type: gist`);
- the role card, conversation state, and any pending approval are
  always verbatim;
- search result pages beyond the one being discussed are reduced to
  `builder_id + matched facets` lines.

## What is never in context

- Builders' message bodies from other conversations.
- Any de-anonymization material: no external lookups, no cross-session
  candidate dossiers — a builder is their published card plus what they
  chose to say in this conversation, nothing more.
- Anything remembered from a previous run. If it matters, it's in the
  mailbox, the pool, or the human's own words this session.
