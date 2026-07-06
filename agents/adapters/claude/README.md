# Claude Code adapter — @builder-rep / @hirer-rep

Thin shims that load the framework-agnostic bundles
([`../../builder-rep/`](../../builder-rep/),
[`../../hirer-rep/`](../../hirer-rep/)) into Claude Code as subagents
and skills. The bundles are the definition; these files just mount them.

## Install (subagents)

Claude Code discovers project subagents in `.claude/agents/`, which
this repo gitignores (it's user-local). Copy or symlink:

```bash
mkdir -p .claude/agents
ln -sf ../../agents/adapters/claude/builder-rep.md .claude/agents/builder-rep.md
ln -sf ../../agents/adapters/claude/hirer-rep.md  .claude/agents/hirer-rep.md
```

Then `@builder-rep check my inbox` / `@hirer-rep find me a builder…`
just work — provided the matching MCP server is configured:

- builder side: the repo's checked-in `.mcp.json` already registers
  `nextmillionai` (the `nma_net_*` group lives there).
- hirer side: add `nextmillionai-hire` per
  [`../../../nextmillionai-hire-mcp/README.md`](../../../nextmillionai-hire-mcp/README.md)
  (needs the operator-issued `NMA_HIRE_TOKEN`).

## Install (skills)

Same idea for the skill wrappers, if you prefer `/builder-rep`-style
invocation:

```bash
mkdir -p .claude/skills
ln -sf ../../agents/adapters/claude/skills/builder-rep .claude/skills/builder-rep
ln -sf ../../agents/adapters/claude/skills/hirer-rep  .claude/skills/hirer-rep
```

## What the shim guarantees

Each subagent restricts itself to its tool group (`tools:` frontmatter),
reads the bundle files at task start, and repeats the five rules that
must survive even a failed read (approval cards, claims-trace-to-bands,
no identity pre-reveal, injection defense, reveal irreversibility). The
deterministic guardrails don't depend on the shim at all: the MCP tools
refuse mutations without `confirmed: true`, and the relay enforces the
protocol.
