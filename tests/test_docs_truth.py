"""Docs must stay true to the code.

Every CLI flag, CSS token, class, and internal link mentioned in
README.md / docs/DESIGN.md / docs/TRUST.md must exist in the shipped
code; the bundled example profile must load, be rich, and leak nothing.
Docs drift = red CI, same as any other contract.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ["README.md", "docs/DESIGN.md", "docs/TRUST.md"]


def _read(p):
    return (ROOT / p).read_text()


def test_cli_flags_and_tokens_exist():
    cli_src = _read("nextmillionai/build_profile.py")
    # The README also documents the node `nma-net` CLI's flags.
    nma_net_src = _read("nextmillionai-mcp/cli.js")
    css = (
        _read("nextmillionai/static/css/profile.css")
        + _read("nextmillionai/static/css/report.css")
        + _read("nextmillionai/static/css/tabs-shared.css")
    )
    for doc in DOCS:
        text = _read(doc)
        mentions = set(
            re.findall(r"`(--[a-z0-9-]+)`", text)
            + re.findall(r"nextmillionai [a-z]+ (--[a-z-]+)", text)
        )
        for m in mentions:
            assert f'"{m}"' in cli_src or m in nma_net_src or m in css, (
                f"{doc} mentions {m} — not a CLI flag (python or nma-net) and not a CSS token"
            )


def test_design_doc_classes_and_functions_exist():
    css = (
        _read("nextmillionai/static/css/profile.css")
        + _read("nextmillionai/static/css/report.css")
        + _read("nextmillionai/static/css/tabs-shared.css")
    )
    js = "".join(
        _read(f"nextmillionai/static/js/{n}.js")
        for n in ("profile", "report", "icons", "tabs-shared")
    )
    text = _read("docs/DESIGN.md")
    for cls in set(re.findall(r"`\.([a-zA-Z][\w-]+)`", text)):
        assert f".{cls}" in css or cls in js, f"DESIGN.md class .{cls} not in shipped UI"
    for fn in set(re.findall(r"`(\w+)\(\)`", text)):
        assert fn + "(" in js, f"DESIGN.md function {fn}() not in shipped JS"


def test_design_tokens_match_css_values():
    css = _read("nextmillionai/static/css/profile.css")
    for tok, val in [
        ("--bg", "#FAF8F3"),
        ("--accent", "#E2542C"),
        ("--good", "#1F9254"),
        ("--mid", "#CF8A1A"),
        ("--low", "#CB5A45"),
    ]:
        assert f"{tok}:{val}" in css
        assert val in _read("docs/DESIGN.md")


def test_internal_links_resolve():
    for doc in DOCS:
        base = (ROOT / doc).parent
        for target in re.findall(r"\]\(([^)]+)\)", _read(doc)):
            if target.startswith(("http", "#")):
                continue
            target = target.split("#")[0]
            assert (base / target).exists() or (ROOT / target).exists(), (
                f"{doc}: broken link {target}"
            )


def test_example_profile_loads_rich_and_clean():
    from nextmillionai.schema import SCHEMA_VERSION, build_shareable_profile

    raw = _read("nextmillionai/examples/profile.json")
    ex = json.loads(raw)
    assert ex["schema_version"] == SCHEMA_VERSION, (
        "bundled example was built by an older engine — regenerate with "
        "scripts/make_example_profile.py"
    )
    assert ex["composite"] and ex["composite"] > 40
    assert all(v["score"] is not None for v in ex["dimensions"].values())
    assert ex.get("leverage"), "example should showcase the leverage card"
    # never any real-machine paths or identity
    assert "/Users/apple" not in raw and "anshuli" not in raw.lower()
    shareable = build_shareable_profile(ex, {})
    assert "leverage" not in shareable and "experimental" not in shareable


def test_readme_privacy_wording_is_the_two_promises():
    readme = _read("README.md")
    assert "never reach nextmillionai" in readme
    assert "computed entirely from local files" in readme
    # no overclaim anywhere
    trust = _read("docs/TRUST.md")
    assert 'We do not claim "ungameable."' in trust
    # Flag actual ranking CLAIMS ("87th percentile", "top 5%") — the
    # negations ("no percentiles") are the policy and are fine
    claim = re.compile(r"\d+(st|nd|rd|th)\s+percentile|top\s+\d+%", re.I)
    for doc in DOCS:
        assert not claim.search(_read(doc)), f"{doc} makes a ranking claim"


def test_howitworks_reference_covers_every_command_truthfully():
    """/how-it-works is the command reference: every subcommand in
    argparse has a card, every card names a real subcommand, and every
    flag shown exists in the CLI. A new command without a card (or a
    documented flag that doesn't exist) is a doc bug, same as README."""
    html = _read("nextmillionai/static/howitworks.html")
    cli_src = _read("nextmillionai/build_profile.py")

    real_cmds = set(re.findall(r'add_parser\(\s*"(\w+)"', cli_src))
    page_cmds = set(re.findall(r'<div class="cmd" id="c-(\w+)">', html))
    assert real_cmds == page_cmds, (
        f"missing cards: {real_cmds - page_cmds}; phantom cards: {page_cmds - real_cmds}"
    )

    # flags appear in <code> and synopsis spans only (raw scan would
    # catch CSS variables like var(--mono))
    flag_surfaces = re.findall(r"<code>([^<]*)</code>", html) + re.findall(
        r'class="opt">([^<]*)<', html
    )
    for flag in set(re.findall(r"(--[a-z-]+)", " ".join(flag_surfaces))):
        assert f'"{flag}"' in cli_src, f"how-it-works documents {flag} — not a real flag"

    # the pre-hydration fallback must be the invocation that always works
    assert html.count('class="cliP">python3 -m nextmillionai<') >= 10
    # hydrated from the serving machine's real invocation
    assert "/api/cli" in html


def test_hardlines_registry_exists_and_is_wired():
    """docs/HARDLINES.md is the confirm-first registry: indexed in
    CURRENT.md, pointed to from CLAUDE.md, and naming the version
    constants and the only-outbound module so it can't drift vague."""
    hard = _read("docs/HARDLINES.md")
    for anchor in (
        "METHODOLOGY_VERSION",
        "SCHEMA_VERSION",
        "TAXONOMY_VERSION",
        "network.py",
        "@generated",
        "enrichment_prompt.txt",
        "make_example_profile.py",
    ):
        assert anchor in hard, f"HARDLINES.md must name {anchor}"
    assert "HARDLINES.md" in _read("CURRENT.md")
    assert "HARDLINES.md" in _read("CLAUDE.md")
    # the bundled example's directory marks it @generated
    ex_readme = _read("nextmillionai/examples/README.md")
    assert "@generated" in ex_readme and "make_example_profile.py" in ex_readme


def test_howitworks_features_section_matches_shipped_ui():
    """The 'In the Profile & Report' section documents only features
    that exist in the shipped UI — each card is pinned to the JS/CSS
    that implements it. Search must ship with the page."""
    html = _read("nextmillionai/static/howitworks.html")
    assert 'id="docSearch"' in html and "function docFilter(" in html

    js = "".join(
        _read(f"nextmillionai/static/js/{n}.js")
        for n in ("profile", "report", "icons", "tabs-shared")
    )
    css = _read("nextmillionai/static/css/profile.css")  # noqa: F841 — used by f-live (post-launch)
    impl = {
        # "f-live": ("live-badge", css),  # post-launch — hidden from docs
        "f-flip": ("nmaInitFlip", js),
        "f-tabs": ("renderProvenance", js),
        "f-explain": ("_explainRegistry", js),
        "f-agent": ("askAgent", js),
        "f-share": ("visToggle", js),
        "f-pdf": ("window.print()", js),
    }
    for fid, (anchor, surface) in impl.items():
        assert f'id="{fid}"' in html, f"feature card {fid} missing"
        assert anchor in surface, f"docs claim feature {fid} but {anchor} is not in the shipped UI"


def test_every_doc_is_in_the_current_md_index():
    """The CURRENT.md doc index is a REGISTRY, not a courtesy: every
    tracked .md must be in it (or explicitly exempt below). Makes the
    'update the index in the same commit' rule mechanical — a new doc
    that isn't registered fails CI instead of relying on review."""
    import subprocess

    tracked = subprocess.run(
        ["git", "ls-files", "*.md"], capture_output=True, text=True, cwd=ROOT
    ).stdout.splitlines()
    exempt = {
        "CURRENT.md",  # the index itself
        "CHANGELOG.md",  # community/convention files, not working docs
        "CODE_OF_CONDUCT.md",
        "CONTRIBUTING.md",
        "nextmillionai/examples/README.md",  # @generated marker for the example
        "scripts/public/CURRENT.public.md",  # public-seed template, not a working doc
        "scripts/public/CHANGELOG.public.md",  # public-seed template, not a working doc
    }
    index = _read("CURRENT.md")
    missing = [
        p
        for p in tracked
        if p not in exempt
        and not p.startswith(("docs/archive/", ".github/", "docs/proposals/"))
        and f"`{p}`" not in index
        and f"`{p.rsplit('/', 1)[-1]}`" not in index
    ]
    assert not missing, (
        f"docs missing from the CURRENT.md index: {missing} — register them "
        "(or add to the exempt set here with a reason)"
    )
