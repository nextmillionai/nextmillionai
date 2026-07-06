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
NET_LIB = ROOT / "nextmillionai-mcp" / "net-lib.js"

# Mutating network tools and the consent language their descriptions must
# carry. Read-only tools (status, inbox) deliberately need no confirmation.
MUTATING_NET_TOOLS = [
    "nma_net_register",
    "nma_net_publish",
    "nma_net_respond",
    "nma_net_reveal",
    "nma_net_block",
    "nma_net_unpublish",
]


def _tool_block(src, name):
    """The server.tool('name', ...) source block, up to the next tool."""
    start = src.index(f"'{name}'")
    end = src.find("server.tool(", start)
    return src[start : end if end != -1 else len(src)]


def test_every_mutating_net_tool_requires_confirmed_true():
    src = DEV_MCP.read_text()
    for name in MUTATING_NET_TOOLS:
        block = _tool_block(src, name)
        assert "confirmed: z.boolean()" in block, f"{name} lacks a confirmed field"
        assert re.search(r"if \(!confirmed\)", block), (
            f"{name} does not gate the network call on confirmed"
        )
        assert "APPROVAL REQUIRED" in block or "NET_APPROVAL_HEADER" in block, (
            f"{name} dry-run does not render an approval card"
        )


def test_tool_descriptions_instruct_display_and_explicit_approval():
    src = DEV_MCP.read_text()
    for name in MUTATING_NET_TOOLS:
        block = _tool_block(src, name)
        desc = block[: block.index("{")]
        assert re.search(r"explicit", desc, re.I), (
            f"{name} description must demand explicit human approval"
        )


def test_reveal_states_irreversibility_in_plain_words():
    block = _tool_block(DEV_MCP.read_text(), "nma_net_reveal")
    for needle in ("IRREVOCABLE", "cannot be", "display_name", "WITHDRAW"):
        assert needle in block, f"nma_net_reveal must state: {needle}"


def test_message_tools_carry_the_v0_visibility_honesty_line():
    block = _tool_block(DEV_MCP.read_text(), "nma_net_respond")
    assert re.search(r"end-to-end encryption", block), (
        "nma_net_respond must state that v0 message bodies are server-visible"
    )
    assert re.search(r"2000", block), "MESSAGE size cap must be surfaced"


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


def test_no_outbound_host_beyond_the_configured_relay():
    """The MCP packages talk to the user-configured relay and localhost
    defaults only — no hardcoded external hosts anywhere (the network.py
    CI guard's spirit, applied to the JS side)."""
    for path in (DEV_MCP, NET_LIB):
        for m in re.finditer(r"https?://[\w.:-]+", path.read_text()):
            host = m.group(0)
            assert host.startswith(("http://localhost", "http://127.0.0.1")), (
                f"{path.name} hardcodes an external host: {host}"
            )


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
