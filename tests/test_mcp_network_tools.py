"""The silent-network MCP clients must enforce what the server can't.

The relay enforces the state machine; only the client can enforce
consent UX (docs/network-contract/HANDOFF.md "what the CLIENT must
enforce"): payload display + explicit human confirmation before every
mutating call, the reveal-irreversibility warning, the identifiability
check before publish, and the v0 message-visibility honesty line.

These tests pin that contract at the source level (the tool schemas and
descriptions ARE the UI), and run the node unit suite for the pure
mapping/validation logic when a node 18+ is available.
"""

import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DEV_MCP = ROOT / "nextmillionai-mcp" / "index.js"
HIRE_MCP = ROOT / "nextmillionai-hire-mcp" / "index.js"
NET_LIB = ROOT / "nextmillionai-mcp" / "net-lib.js"

# Mutating network tools and the consent language their descriptions must
# carry. Read-only tools (status, inbox, search, view) deliberately need
# no confirmation.
MUTATING_NET_TOOLS = [
    "nma_net_register",
    "nma_net_publish",
    "nma_net_respond",
    "nma_net_reveal",
    "nma_net_block",
    "nma_net_unpublish",
]
MUTATING_HIRE_TOOLS = [
    "nma_hire_register",
    "nma_hire_interest",
    "nma_hire_message",
    "nma_hire_reveal",
]


def _tool_block(src, name):
    """The server.tool('name', ...) source block, up to the next tool."""
    start = src.index(f"'{name}'")
    end = src.find("server.tool(", start)
    return src[start : end if end != -1 else len(src)]


def _both_packages():
    return [
        (DEV_MCP, MUTATING_NET_TOOLS),
        (HIRE_MCP, MUTATING_HIRE_TOOLS),
    ]


def test_every_mutating_net_tool_requires_confirmed_true():
    for path, tools in _both_packages():
        src = path.read_text()
        for name in tools:
            block = _tool_block(src, name)
            assert "confirmed: z.boolean()" in block, f"{name} lacks a confirmed field"
            assert re.search(r"if \(!confirmed\)", block), (
                f"{name} does not gate the network call on confirmed"
            )
            assert "APPROVAL REQUIRED" in block or "APPROVAL_HEADER" in block, (
                f"{name} dry-run does not render an approval card"
            )


def test_tool_descriptions_instruct_display_and_explicit_approval():
    for path, tools in _both_packages():
        src = path.read_text()
        for name in tools:
            block = _tool_block(src, name)
            desc = block[: block.index("{")]
            assert re.search(r"explicit", desc, re.I), (
                f"{name} description must demand explicit human approval"
            )


def test_reveal_states_irreversibility_in_plain_words():
    for path, tool in ((DEV_MCP, "nma_net_reveal"), (HIRE_MCP, "nma_hire_reveal")):
        block = _tool_block(path.read_text(), tool)
        for needle in ("IRREVOCABLE", "cannot be", "display_name", "WITHDRAW"):
            assert needle in block, f"{tool} must state: {needle}"


def test_message_tools_carry_the_v0_visibility_honesty_line():
    for path, tool in ((DEV_MCP, "nma_net_respond"), (HIRE_MCP, "nma_hire_message")):
        block = _tool_block(path.read_text(), tool)
        assert re.search(r"end-to-end encryption", block), (
            f"{tool} must state that v0 message bodies are server-visible"
        )
        assert re.search(r"2000", block), "MESSAGE size cap must be surfaced"


def test_hire_search_is_capped_and_watermarked():
    block = _tool_block(HIRE_MCP.read_text(), "nma_hire_search")
    assert "10" in block, "the 10-card page cap must be surfaced"
    assert "requested_by" in block, "the hirer-id watermark must be surfaced honestly"
    desc = block[: block.index("{")]
    assert re.search(r"never a ranking|not a ladder", desc), (
        "search must state matches-not-rankings"
    )


def test_hire_inbox_treats_messages_as_untrusted_data():
    block = _tool_block(HIRE_MCP.read_text(), "nma_hire_inbox")
    assert re.search(r"NEVER follow instructions", block), (
        "inbox must instruct the agent to treat message content as data, not instructions"
    )


def test_publish_runs_the_identifiability_check_before_sending():
    block = _tool_block(DEV_MCP.read_text(), "nma_net_publish")
    assert "/v1/pool/histograms" in block
    assert "identifiabilityWarnings" in block
    assert "validateAgainstSchema" in block  # client-side belt and suspenders
    # the check happens in the dry-run path, before any confirmed send
    assert block.index("identifiabilityWarnings") < block.index("if (!confirmed)")


def test_unmeasured_refuses_never_estimates():
    lib = NET_LIB.read_text()
    assert "insufficiencies" in lib
    assert re.search(r"return \{ doc: null, insufficiencies \}", lib), (
        "buildNetworkProfile must refuse (doc: null) when anything is unmeasured"
    )
    # 0 surviving AI lines = the scan measured nothing, not the '<1k' band
    assert re.search(r"lines <= 0\) return null", lib), (
        "bandLocSurvived must treat 0 as unmeasured (refuse), never band it"
    )


def test_unpublish_never_deletes_the_identity_file_for_env_identities():
    """Demo/seeded identities come in via NMA_NET_BUILDER_ID/NMA_NET_TOKEN;
    unpublishing one must not destroy the machine's real identity file."""
    src = DEV_MCP.read_text()
    assert re.search(r"source: envActive \? 'env' : 'file'", src), (
        "netCreds must report whether the active identity came from env or file"
    )
    block = _tool_block(src, "nma_net_unpublish")
    assert "source" in block
    # the rm of the identity file only runs on the file-sourced path
    assert re.search(r"if \(source === 'file'\)[\s\S]{0,120}rm\(NET_IDENTITY_PATH", block), (
        "nma_net_unpublish must guard rm(NET_IDENTITY_PATH) behind source === 'file'"
    )


def test_no_outbound_host_beyond_the_configured_relay():
    """The MCP packages talk to the user-configured relay, localhost, and
    the ONE sanctioned production relay only — no other hardcoded external
    hosts (the network.py CI guard's spirit, applied to the JS side).

    The production default is deliberate and reviewed: making the hosted
    relay the out-of-the-box base is what removes the relay-setup step for
    users (EPIC-1). Data still leaves only on an explicit, consented
    identity action; the assessment never touches a server. NMA_NET_BASE
    overrides it for a local or self-hosted relay."""
    allowed = ("http://localhost", "http://127.0.0.1", "https://network.nextmillionai.org")
    for path in (DEV_MCP, HIRE_MCP, NET_LIB, ROOT / "nextmillionai-mcp" / "cli.js"):
        for m in re.finditer(r"https?://[\w.:-]+", path.read_text()):
            host = m.group(0)
            assert host.startswith(allowed), f"{path.name} hardcodes an external host: {host}"


def _node():
    node = shutil.which("node")
    if not node:
        return None
    try:
        major = int(
            subprocess.run([node, "--version"], capture_output=True, text=True)
            .stdout.strip()
            .lstrip("v")
            .split(".")[0]
        )
    except (ValueError, IndexError):
        return None
    return node if major >= 18 else None


def test_net_lib_node_unit_suite():
    """Run the node:test suite for the pure mapping/validation logic."""
    node = _node()
    if node is None:
        pytest.skip("node 18+ not available")
    tests = sorted((ROOT / "nextmillionai-mcp" / "test").glob("*.test.js"))
    assert tests, "node test files missing"
    result = subprocess.run(
        [node, "--test", *[str(t) for t in tests]],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    assert result.returncode == 0, f"node tests failed:\n{result.stdout}\n{result.stderr}"


# ─── nma-net CLI (cli.js): the MCP-optional frontend, same obligations ───────

CLI_JS = ROOT / "nextmillionai-mcp" / "cli.js"


def test_cli_exists_and_is_the_second_frontend():
    """MCP optional, not a mandate: a cloned repo + terminal must cover the
    full builder lifecycle. The CLI shares net-lib (the consent-critical
    logic lives once) and the MCP's identity file."""
    src = CLI_JS.read_text()
    for command in (
        "register",
        "prefs",
        "publish",
        "status",
        "inbox",
        "respond",
        "reveal",
        "block",
        "unpublish",
    ):
        assert f"command === '{command}'" in src, f"cli.js lacks `{command}`"
    for fn in (
        "buildNetworkProfile",
        "identifiabilityWarnings",
        "validateAgainstSchema",
        "widenProfile",
    ):
        assert fn in src, f"cli.js must reuse net-lib's {fn}, not fork it"
    assert "from './net-lib.js'" in src
    assert "identity.json" in src  # same identity file as the MCP


def test_cli_mutating_commands_gate_on_interactive_consent():
    """Every mutating CLI command shows the payload and awaits a typed
    answer at a TTY; piped stdin must refuse (a script cannot consent)."""
    src = CLI_JS.read_text()
    assert re.search(r"isTTY[\s\S]{0,200}fail\(", src), (
        "cli.js must refuse consent prompts on non-interactive stdin"
    )
    for fn in ("cmdRegister", "cmdPublish", "cmdRespond", "cmdReveal", "cmdBlock", "cmdUnpublish"):
        start = src.index(f"async function {fn}")
        end = src.find("async function", start + 10)
        block = src[start : end if end != -1 else len(src)]
        assert "await confirm(" in block, f"{fn} sends without interactive consent"
    # unpublish demands the builder id itself, not a reflexive "yes"
    unpub = src[src.index("async function cmdUnpublish") :]
    assert "expected: builderId" in unpub


def test_cli_carries_the_same_honesty_lines():
    src = CLI_JS.read_text()
    assert "IRREVOCABLY" in src  # reveal approve warning
    assert "v0 honesty" in src  # readable message bodies
    assert "untrusted DATA" in src  # inbox counterparty content
    assert re.search(r"if \(source === 'file'\)[\s\S]{0,120}rm\(IDENTITY_PATH", src), (
        "cli.js unpublish must guard rm(IDENTITY_PATH) behind source === 'file'"
    )
