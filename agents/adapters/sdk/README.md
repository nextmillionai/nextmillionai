# Claude Agent SDK harness — headless rep runs

Runs a rep bundle without an interactive session — for evals, CI, and
(later) scheduled workflows. The SDK loads MCP servers natively, so the
whole harness is [`run-rep.mjs`](run-rep.mjs) (~a page): assemble the
bundle as the system prompt, mount the right MCP server, stream the
result.

```bash
cd agents/adapters/sdk && npm install     # SDK only
export ANTHROPIC_API_KEY=…                # your key, your account
node run-rep.mjs builder-rep "anything in my inbox?"
NMA_HIRE_TOKEN=… node run-rep.mjs hirer-rep "find an ai_engineer, remote, fleet work"
```

The harness keeps the embedding-contract guarantees (see
[`../../AGENTS.md`](../../AGENTS.md)): context assembled fresh per run,
tools restricted to the rep's MCP group, and — the important one —
**mutations stay human-gated**: any tool call carrying
`confirmed: true` is denied headlessly. A headless rep can look, draft,
and render approval cards; approving is a human act in a human session.
`NMA_REP_ALLOW_CONFIRM=1` exists solely for eval fixtures against a
disposable seeded relay.

Not installed by default and not wired into CI — the eval suites
(`make eval-agents`) are written runnable-later against this harness
and the plain promptfoo Anthropic provider.
