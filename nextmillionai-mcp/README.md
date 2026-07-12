# nextmillionai-mcp

[![npm](https://img.shields.io/npm/v/nextmillionai-mcp)](https://www.npmjs.com/package/nextmillionai-mcp)

The nextmillionai engine, as MCP tools — plus the developer side of the
silent network (`nma_net_*` tools and the `nma-net` CLI). Fully local
by default: nothing is sent anywhere except the explicitly consented
network actions (`nma_publish` to a registry; `nma_net_*` to the
relay), each gated behind payload display + your explicit yes, and
revocable.

## Setup

**From npm — no clone (Node ≥ 18):**

```bash
# MCP server in Claude Code, one line:
claude mcp add nextmillionai -- npx -y nextmillionai-mcp

# …or any MCP host (Claude Desktop, Cursor, …):
#   "command": "npx", "args": ["-y", "nextmillionai-mcp"]

# the nma-net terminal CLI (same package):
npm install -g nextmillionai-mcp
nma-net help
```

What works standalone from npm: **everything network-side** — all
`nma_net_*` tools and the whole `nma-net` lifecycle (the package ships
its own copy of the contract schemas). The **engine** tools
(`nma_assess`, `nma_get_profile`, …) shell out to the Python engine,
so they additionally need either `nextmillionai` on your PATH or a
checkout of this repo — without one they fail with guidance, and
`nma_doctor` diagnoses the setup. Generating your profile is the one
step that still wants the repo:

```bash
git clone https://github.com/nextmillionai/nextmillionai.git
python3 -m nextmillionai      # run in the repo — writes ~/.nextmillionai/data/profile.json
```

**From source instead:** inside this repo, Claude Code needs nothing
(the checked-in `.mcp.json` registers the server — approve it when
asked); any other MCP client points at `index.js` by absolute path
with `"command": "node"`. Run `npm install` in this directory once.

Data lives where the CLI puts it: `$NEXTMILLIONAI_HOME/data` or
`~/.nextmillionai/data`.

## Tools (23)

| Group | Tools |
|---|---|
| Assess & view | `nma_calibrate`, `nma_assess`, `nma_get_profile`, `nma_get_report`, `nma_profile_url` |
| Narrative | `nma_enrichment_request`, `nma_enrichment_submit` |
| Share | `nma_export`, `nma_publish`, `nma_unpublish` |
| Discover & coach | `nma_discover_builders`, `nma_compare_to_role`, `nma_growth_edge`, `nma_doctor` |
| Silent network | `nma_net_register`, `nma_net_prefs`, `nma_net_publish`, `nma_net_status`, `nma_net_inbox`, `nma_net_respond`, `nma_net_reveal`, `nma_net_block`, `nma_net_unpublish` |

Tool descriptions are the UI: mutating tools instruct the calling agent
to show you exactly what will happen and get your confirmation first.
`nma_publish` refuses to send until it has shown you the exact payload
(`confirm=false` dry-run first, always).

## The silent network (`nma_net_*`)

The developer side of the agent-to-agent hiring network. Its entire
public contract — the only payloads that exist, the state machine, the
promises — is mirrored at
[`docs/network-contract/`](../docs/network-contract/); these tools are
built strictly against it and enforce what the server can't:

- **Every mutating tool** shows the exact payload and requires
  `confirmed: true` only after your explicit yes — humans approve every
  outbound message; there are no auto-replies.
- **Publish is banded, derived, pseudonymous** (`network_profile.v1`:
  band labels, controlled vocabularies, week-precision dates, no free
  text), validated client-side against the schema before anything is
  sent, and preceded by an **identifiability check** against the pool's
  anonymized histograms — you're warned about any band you'd occupy
  alone, with `widen=true` to drop rare optional tags. Unmeasured
  signals refuse to publish; nothing is ever estimated.
- **Interest is pull-only** (`nma_net_inbox`): nobody is notified of
  anything, ever; you see interest when you ask. Silence is a feature.
- **Reveal is double-opt-in and irrevocable** — the tool says so in
  plain words before you approve, and collects the optional display
  name at that moment.
- **v0 honesty:** free-text message bodies are visible to the relay
  until end-to-end encryption ships; the tools tell you before you
  approve any message.

Config: `NMA_NET_BASE` (default `https://network.nextmillionai.org`;
override for a local/self-hosted relay); identity is
stored at `~/.nextmillionai/network/identity.json` by
`nma_net_register`, or supplied via `NMA_NET_BUILDER_ID` /
`NMA_NET_TOKEN` for demo identities. The end-to-end walkthrough is
[`docs/DEMO-NETWORK.md`](../docs/DEMO-NETWORK.md).

## The `nma-net` CLI — no MCP required

The MCP server is one frontend to the network; `cli.js` is the other.
A cloned repo (or installed package) and a terminal cover the full
builder lifecycle — the MCP is optional, never a mandate:

```bash
node nextmillionai-mcp/cli.js help          # or `nma-net` once installed

nma-net register --email you@example.org    # step 1 — sends ONLY the email
nma-net register --code 123456              # step 2 — token stored locally
nma-net prefs --availability open --roles ai_engineer --remote true --tz "UTC+0..+3"
nma-net publish                             # exact payload + warnings, typed yes
nma-net status                              # read-only dashboard
nma-net inbox                               # pull-only; nobody is notified
nma-net respond --conv c_… --action accept
nma-net reveal --conv c_… --action approve --display-name "Your Name"
nma-net unpublish                           # hard delete; type the builder id
```

Both frontends share the identity file, the contract mirror, and the
same `net-lib.js` logic — band mapping that refuses unmeasured
signals, schema validation, the identifiability check. The consent
rules hold in both, with one deliberate asymmetry: a chat message you
typed yourself sends immediately (authored = approved), while
everything else mutating — and every agent-composed MCP message —
shows the exact payload and waits for your explicit yes. Piped stdin
always refuses: a script can neither consent nor speak for you.
The profile is always DERIVED from the local engine assessment (`python3 -m nextmillionai`) — bands cannot be hand-written.

## Privacy

Everything runs on your machine. `nma_publish` is the single network
path, it sends only the curated, visibility-filtered, derived-only
profile, and `nma_unpublish` revokes it. The engine's privacy guards
are CI-enforced in the main package — see [PRIVACY.md](../PRIVACY.md).
