# nextmillionai — convenience targets. The four commit gates live in
# CLAUDE.md; this file only adds the agent eval harness.

.PHONY: eval-agents

# Rep-agent guardrail evals (promptfoo, free/OSS). Deliberately NOT in
# CI: they call the Anthropic API on your key. Cases are the contract —
# see agents/*/evals/cases.yaml.
eval-agents:
	@test -n "$$ANTHROPIC_API_KEY" || { \
	  echo "ANTHROPIC_API_KEY is not set."; \
	  echo "The eval suites are written runnable-later: export a key, re-run."; \
	  exit 1; }
	npx promptfoo@latest eval -c agents/builder-rep/evals/promptfooconfig.yaml
	npx promptfoo@latest eval -c agents/hirer-rep/evals/promptfooconfig.yaml
