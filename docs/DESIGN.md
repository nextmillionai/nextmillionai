# nextmillionai design language

The design system behind the profile, the report, and `/methodology`.
Every token and rule below is pulled from the shipped CSS/JS
(`nextmillionai/static/`) — if a value here disagrees with the code,
the code wins and this doc has a bug. Structure and rigor modeled on
[Material Design](https://m3.material.io/)'s documentation standard;
[GitHub Primer](https://primer.style/), [Shopify
Polaris](https://polaris.shopify.com/), and [IBM
Carbon](https://carbondesignsystem.com/) are further exemplars of the
calibre we hold this file to.

---

## 1. Principles

1. **A credential, not a dashboard toy.** Warm, printed-document calm:
   light paper background, ink text, generous whitespace. The energy
   comes from the data, not from chrome.
2. **One warm accent.** A single brand orange carries identity. It
   marks headings' section numbers, active states, "you" markers, and
   the live pulse — never large surfaces.
3. **Color is information.** Band colors (good/mid/low) appear **only
   on scores** — rings, bars, score text. They are never decoration,
   never backgrounds for prose.
4. **Honesty in the chrome.** Every number's basis is reachable where
   the number is shown ("what this means", right-click → explain →
   `/methodology#anchor`). Caps, estimators, and insufficient data are
   stated in place.
5. **A map, not a ladder.** No percentile badges, no progress-to-rank
   visuals, no "X to go" affordances anywhere in the UI.
6. **Click, never hover-open.** All disclosure is click-driven
   (`<details>`, panel toggles). Hover may only restyle, never reveal.
7. **No emoji.** One monoline icon set (`icons.js`) renders every mark.
   Emoji render differently per OS and read as unpolished on a
   credential.

## 2. Foundations

### 2.1 Color tokens

Defined in `:root` of both `profile.css` and `report.css` (the two
files share one palette by contract):

| Token | Value | Role |
|---|---|---|
| `--bg` | `#FAF8F3` | page background (warm paper) |
| `--surface` | `#FFFFFF` | cards, panels |
| `--surface-2` | `#FBF9F4` | nested surfaces, table heads |
| `--tint` | `#F4EFE6` | soft fill (tags, card tops) |
| `--ink` | `#23211C` | primary text |
| `--ink-soft` | `#4A463E` | secondary text |
| `--muted` | `#8C877A` | metadata, captions |
| `--line` | `#EAE4D8` | borders |
| `--line-2` | `#F1ECE2` | hairlines, row dividers |
| `--accent` | `#E2542C` | THE brand accent (see Principle 2) |
| `--accent-soft` | `#F6D9CC` | accent tint (report) |
| `--good` | `#1F9254` | score band ≥ 75 |
| `--mid` | `#CF8A1A` | score band 50–74 |
| `--low` | `#CB5A45` | score band < 50 |
| `--blue` / `--blue-bg` | `#3F6CC7` / `#EAF0FB` | links-as-actions (e.g. refresh) |
| `--purple` / `--purple-bg` | `#7C5BD6` / `#F1ECFA` | experimental/Lab marking only |
| `--g0…--g4` | `#EDE7DB → #1F9254` | heatmap intensity ramp |
| `--hm-ai/mix/hum/act` | heatmap AI-mix categories | activity calendar |

Band mapping lives in one JS function per view (`band(s)`):
`s>=75 → --good`, `s>=50 → --mid`, else `--low`. The CLI mirrors the
same bands (`cliui.band`).

### 2.2 Typography

Three families, loaded from Google Fonts, one role each:

| Token | Family | Role |
|---|---|---|
| `--disp` | Space Grotesk (400–700) | display: names, headings, big numbers |
| `--body` | Inter (400–700) | running text, buttons, tabs |
| `--mono` | JetBrains Mono (400–700) | metadata, evidence, labels, code |

Scale (shipped sizes): body `15px/1.6`; `h1` `clamp(28px,4vw,40px)`
(profile) / `clamp(30px,4.2vw,46px)` (report); `h2` `22–24px`; card
numbers `21px` (`.pcard .a`) and `25px` (`.bc-title` up to 34);
metadata runs `10–12px` mono. Report long-form prose: `16px/1.78`,
max-measure `66ch`, first-paragraph drop-cap accent. Mono labels are
uppercased with `letter-spacing: .06–.16em`.

### 2.3 Shape & spacing

- Radii: `14px`/`16px` cards and panels, `12px` inner cards, `10px`
  cells, `8px` buttons, `7px` small controls, `100px`/`999px` pills.
- Page: `max-width: 940px`, `24px` gutters.
- Rhythm: sections separated by `hr.div` (1px `--line`, `30–44px`
  margins); cards pad `14–28px`; grids gap `6–18px`.
- Borders are 1px `--line`; emphasis = `2px --accent` (the "you" cell),
  never heavier.

### 2.4 Iconography

One monoline set in `icons.js` (`NMA_GLYPHS`): 32 glyphs, 24×24,
`stroke=currentColor`, no fills. Archetypes/kinds map to glyphs via
`NMA_GLYPH_MAP`; UI marks (eye, lock, signal, repo, commit, download,
info, …) come from the same set via `glyph(key,size)`. Adding an icon
= adding a path set here; raster icons and emoji are rejected in
review.

### 2.5 Motion

Small, purposeful, and skippable:

- Standard transitions: `.15s` (borders, color), `.18s` (transform),
  `.22s ease` (panel max-height) — nothing slower.
- The one looping animation: the live badge equalizer (`@keyframes
  nmaEq`, 5 bars, 1.15s ease-in-out, staggered `.18s`; speeds up to
  `.55s` while refreshing) — a gym-console pulse, accent-colored.
- Cards may rest at ±1.6° rotation (report wrapped cards) and settle
  flat on hover.
- `prefers-reduced-motion: reduce` disables ALL transitions and
  animations globally (shipped rule, both views).

## 3. Components

| Component | Class(es) | Contract |
|---|---|---|
| Builder card | `.bcard`, `.bc-*` | the identity mark; accent title, chips; PNG-exportable |
| Wrapped card | `.card` (profile) / `.pcard` (report) | one number + one question; profile cards are `<details>` with "what this means/how it is measured"; report tops carry the dot+weave texture |
| Stat-card colour | `.cards-legend` + `.card` tint/top-accent | colour = *what the number measures*, not how good it is: **Cadence** (`--good`, time/consistency), **Output** (`--mid`, what AI shipped), **Orchestration** (`--purple`, agents/leverage), **Direction** (neutral/white, how you steer — descriptive style signals, deliberately uncoloured for breathing room). A legend above the grid is the reference; colour is reinforcement — the eyebrow label and legend words carry the meaning (colour-blind safe). Never a ranking. |
| Score ring/bar | `ringSVG()`, `.sd .sb` | band-colored only; confidence always adjacent |
| Dimension panel | `.dim-panel`, `openDim()` | click-to-open, one at a time; what/evidence/how columns |
| Positioning map | `.pm`, `.pm-cell` | THE shared 2D grid (profile + report identical): rows = leverage, columns = build domain, cell shading `rgba(accent, --w)` from footprint weight, `you` dot, dashed nearest-expansion cell |
| Heatmap | `.hm-wrap`, `.gcell` | per-day union calendar, AI-mix colors, Sunday-anchored, ends today; scrubber for history |
| Donut | `donutBlock()` | proportional mixes (languages/surfaces/models) |
| Live badge | `.live-badge`, `.eq` | equalizer when live, `snapshot · date` + refresh/go-live otherwise |
| Tags/chips | `.tag`, `.lev-tag`, `.bc-chip` | mono 11px pills; `builds:`/`operates at:` positioning tags |
| Fidelity chip | `.fid-{deep,counts,presence}` | provenance honesty markers |
| Tabs | `.tabs .tab` | underline-active with accent; shared across views |
| Explain popover | `#nmaCtx` | right-click on any section → how it's computed + `/methodology#anchor` + agent prompt |
| PDF style toggle | `.pdfstyle` | Full / Snapshot, persisted |

## 4. Patterns & information architecture

- **The flip:** `/profile` (credential dashboard) ↔ `/report` (deep
  prose deliverable). Both render from ONE assessment JSON; the report
  owns the radar, fit map, all-13 kinds, per-project breakdown,
  timeline, and evidence appendix. Demarcation is deliberate: nothing
  rank-flavored on the profile.
- **Tabs:** profile = Overview · Work · Lab · Provenance · Share;
  report = Report · Lab. Lab (purple-marked) holds experimental and
  estimate-class signals — they never appear on main surfaces or in
  shared artifacts.
- **Privacy in the IA:** growth areas are private-by-default with an
  explicit share toggle; "view as public" shows exactly what a
  stranger sees; hidden projects never render in shared artifacts.
- **Empty states:** sections hide when data is insufficient — never a
  zero pretending to be a measurement.

## 5. Print

Print is a first-class surface (the PDF is the document):

- `print-color-adjust: exact` everywhere — brand colors survive.
- Two PDF targets: **Profile PDF** (`.pdf-profile`) and **Report PDF**
  (`.pdf-report`). Each shows all visible content for that surface;
  the report hides only the evidence appendix.
- Cross-page print: clicking "Download PDF" for the other surface
  opens it in a new window with `?print=1`, auto-prints, then closes.
- Chrome (tabs, buttons, live badge) hides; `break-inside: avoid` on
  cards, map, tables.

## 6. Accessibility

- Click-driven disclosure only (Principle 6) — keyboard reachable by
  construction (`<details>/<summary>`, real `<button>`s).
- `prefers-reduced-motion` honored globally.
- Information never carried by color alone: band colors always pair
  with the numeral; fidelity chips carry text, not just hue.
- Hit targets: buttons pad ≥ `8px 14px`; cells ≥ `64px` min-height.

## 7. Voice & tone

- Plain, measured, first-person-neutral: "computed over", "measured",
  "insufficient — not estimated". Never hype.
- Numbers carry their basis in the same breath ("ledger-preserved",
  "capped 8h", "usage, not installs").
- Banned vocabulary anywhere in the UI: percentile, top X%, rank,
  leaderboard, "X to go". Banned visuals: ladders, progress-to-rank.
- Estimates are labeled "estimate" with the method stated
  (solo-equivalent band, confidence on Lab cards).

## 8. Working on the UI

- Palette and tokens change in BOTH css files together (shared by
  contract).
- Bump `?v=` in all three HTML files whenever css/js change
  (cache-busting for long-lived tabs).
- Dates in JS use `_localDate()`, never `toISOString()` (timezone
  shift).
- New sections register a right-click explain entry
  (`PROFILE_EXPLAIN`/`REPORT_EXPLAIN`) and, if they show a derived
  number, a `signal_registry` entry.
