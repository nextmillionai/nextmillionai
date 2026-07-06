# nextmillionai-mcp

The nextmillionai engine, as MCP tools. Same engine as the CLI: every
tool shells out to the Python package in this repo or reads its local
JSON. Fully local by default — the only tool that sends anything
anywhere is `nma_publish`, which is explicitly gated behind a two-step
consent protocol and revocable via `nma_unpublish`.

## Setup

**Claude Code, inside this repo:** nothing to do. The checked-in
`.mcp.json` at the repo root registers the server; approve it when
Claude Code asks.

**Claude Desktop / Cursor / any MCP client:** point the client at
`index.js` with an absolute path:

```json
{
  "mcpServers": {
    "nextmillionai": {
      "command": "node",
      "args": ["/absolute/path/to/nextmillionai/nextmillionai-mcp/index.js"]
    }
  }
}
```

Requirements: Node 18+ and a checkout of this repo. No pip install
needed — the server locates the Python engine from its own path and
runs it with your `python3`. Run `npm install` in this directory once
(installs the MCP SDK and zod; nothing else).

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

Config: `NMA_NET_BASE` (default `http://127.0.0.1:7750`); identity is
stored at `~/.nextmillionai/network/identity.json` by
`nma_net_register`, or supplied via `NMA_NET_BUILDER_ID` /
`NMA_NET_TOKEN` for demo identities. The end-to-end walkthrough is
[`docs/DEMO-NETWORK.md`](../docs/DEMO-NETWORK.md).

## Privacy

Everything runs on your machine. `nma_publish` is the single network
path, it sends only the curated, visibility-filtered, derived-only
profile, and `nma_unpublish` revokes it. The engine's privacy guards
are CI-enforced in the main package — see [PRIVACY.md](../PRIVACY.md).
