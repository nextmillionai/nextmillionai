# Surface spec: the Report (agent-readable)

A structured reference for AI agents on what the **report** is and how it
differs from the profile. JSON contract: [`SCHEMA.md`](../../nextmillionai/docs/SCHEMA.md).

- **What it is:** the deep, shareable deliverable — prose + the full
  evidence. Same person as the profile, more depth.
- **Route:** `/report` (served by `hub.py`). The Profile↔Report
  **segmented toggle** flips between them; the active tab rides the URL
  hash, so `/report#lab` deep-links.
- **Rendered from:** the same `profile.json` as the profile. Identical
  masthead; only the body differs.

## Structure (Overview body, then shared tabs)

1. **Hero** — `AI CODING REPORT` eyebrow, archetype line (`primaryTitle`
   + `composite` + `confidence`), the **narrative** opening
   (`enrichment.narrative`) and positioning line.
2. **Wrapped cards** — the scattered stat highlights.
3. **The numbers behind it** — `composite` + per-dimension gauges
   (`dimensions{}`; insufficient rows render as a dash).
4. **Where you sit** — the same 2D positioning map as the profile
   (build domain × leverage) + footprint distribution.
5. **Per-project breakdown** — private; hidden from shared artifacts.
6. **Evidence appendix** — every claim → its measured pointer.
7. **Shared tabs** — Work · Lab · Provenance · Share (identical to the
   profile; see [PROFILE.md](PROFILE.md)).

## PDF / print

- Share tab exposes two PDF buttons: **Profile PDF** (`.pdf-profile`)
  and **Report PDF** (`.pdf-report`). Each shows all visible content
  for that surface. Cross-page print opens the target page with
  `?print=1`, auto-prints, then closes. Brand colors kept in print.

## Invariants

- Same JSON as the profile → no fact differs between the two views.
- The narrative is interpretation written by the user's own agent (or a
  local heuristic); it can never change a score, title, or positioning
  value.
- Private sections (per-project breakdown, Lab, growth) are excluded from
  export/publish by allowlist + verifier.
