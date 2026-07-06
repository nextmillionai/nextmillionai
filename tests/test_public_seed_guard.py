"""The public mirror must never ship internal docs — or links to them.

`scripts/seed-public.sh` curates the public `nextmillionai/nextmillionai`
repo from this private superset by dropping a denylist of internal paths
(`docs/launch/`, `docs/site/`, `docs/archive/`, the seed tooling) and
swapping in a public-safe `CURRENT.md`. A static denylist is fragile:
a new internal doc, or a public doc that links into an excluded one,
slips through silently and becomes a public leak / broken link.

This test is the backstop. It simulates the seed from the *working tree*
(so it's authoritative pre-commit, not one commit behind `git archive
HEAD`), parses the denylist straight from the script so the two can't
drift, and asserts:

  1. the actual seed script's EXCLUDES match this test's expectations;
  2. known-internal sentinel files do NOT survive into the public set;
  3. no Markdown that DOES ship links into an excluded path.
"""

import os
import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "scripts" / "seed-public.sh"
PUBLIC_CURRENT = ROOT / "scripts" / "public" / "CURRENT.public.md"
PUBLIC_CHANGELOG = ROOT / "scripts" / "public" / "CHANGELOG.public.md"

# Files the seed swaps for a public-safe variant — scan the variant that
# actually ships, not the private working file.
SWAPPED = {"CURRENT.md": PUBLIC_CURRENT, "CHANGELOG.md": PUBLIC_CHANGELOG}


def _shipped_text(rel):
    """Text of a shipped doc — the public variant for swapped files."""
    return (SWAPPED.get(rel) or (ROOT / rel)).read_text()


# The seed tooling is itself excluded from the public mirror, so in the
# already-seeded public repo this guard has nothing to check — skip it.
# It runs (and matters) only in the private working superset.
pytestmark = pytest.mark.skipif(
    not SEED.exists(), reason="seed tooling absent — running in the public mirror"
)

# Files that are unambiguously internal and must never reach the public
# mirror. Independent of the parsed denylist (defense in depth): if the
# script's EXCLUDES ever shrink, these still fail.
INTERNAL_SENTINELS = [
    "docs/launch/PRELAUNCH-TASKS.md",
    "docs/launch/CHECKLIST.md",
    "docs/launch/PUBLIC-MIRROR.md",
    "docs/launch/WEBSITE-LAUNCH.md",
    "docs/launch/DISTRIBUTION.md",
    "docs/launch/AFTER-LAUNCH.md",
    "docs/launch/methodology-open-bundle.md",
    "docs/site/index.html",
    "docs/vision/index.html",
    "docs/vision/README.md",
    "docs/agents/WEBSITE.md",
    "netlify.toml",
    "scripts/seed-public.sh",
]


def _parse_excludes():
    """Pull the EXCLUDES=( ... ) array out of the seed script."""
    text = SEED.read_text()
    block = re.search(r"EXCLUDES=\((.*?)\n\)", text, re.S)
    assert block, "could not find EXCLUDES=( ... ) array in seed-public.sh"
    paths = re.findall(r'"([^"]+)"', block.group(1))
    assert paths, "EXCLUDES array parsed empty"
    return [p.rstrip("/") for p in paths]


def _tracked():
    out = subprocess.run(
        ["git", "ls-files"], capture_output=True, text=True, cwd=ROOT
    ).stdout.splitlines()
    return [p for p in out if p]


def _is_excluded(path, excludes):
    return any(path == e or path.startswith(e + "/") for e in excludes)


def _shipped(excludes):
    """Tracked files minus the denylist — i.e. what the seed would ship."""
    return [p for p in _tracked() if not _is_excluded(p, excludes)]


def test_seed_excludes_cover_the_internal_set():
    """The script's own denylist must drop every internal sentinel."""
    excludes = _parse_excludes()
    leaked = [p for p in INTERNAL_SENTINELS if not _is_excluded(p, excludes)]
    assert not leaked, (
        f"seed-public.sh EXCLUDES do not cover internal files: {leaked} "
        f"(current EXCLUDES: {excludes})"
    )


def test_no_internal_file_ships():
    """Belt and braces: the simulated public set contains no sentinel."""
    excludes = _parse_excludes()
    shipped = set(_shipped(excludes))
    leaked = [p for p in INTERNAL_SENTINELS if p in shipped]
    assert not leaked, f"internal files would ship to the public mirror: {leaked}"
    # whole internal trees gone, not just the sentinels
    for tree in ("docs/launch/", "docs/site/", "docs/archive/", "docs/vision/"):
        survivors = [p for p in shipped if p.startswith(tree)]
        assert not survivors, f"{tree} should be fully excluded; survivors: {survivors}"


def test_public_swap_templates_exist_and_are_clean():
    """The public CURRENT.md / CHANGELOG.md templates exist and reference no
    internal path (the seed copies them over the working files)."""
    for label, path in (
        ("CURRENT.public.md", PUBLIC_CURRENT),
        ("CHANGELOG.public.md", PUBLIC_CHANGELOG),
    ):
        assert path.exists(), (
            f"scripts/public/{label} is missing — the seed copies it over the "
            "working file; without it the public repo ships the internal one"
        )
        text = path.read_text()
        for needle in ("docs/launch", "docs/site", "docs/archive"):
            assert needle not in text, (
                f"public {label} references internal path '{needle}' — "
                "it must not link into excluded docs"
            )


def test_no_shipped_markdown_links_into_excluded_paths():
    """Every Markdown that ships must not link to an excluded path.

    Links are resolved relative to their file; a link that lands on a
    path the seed drops would be a dead link (and a structure leak) in
    the public repo. CURRENT.md is checked as its public variant, since
    that's what actually ships.
    """
    excludes = _parse_excludes()
    shipped_md = [p for p in _shipped(excludes) if p.endswith(".md")]
    offenders = []
    for rel in shipped_md:
        text = _shipped_text(rel)
        base = Path(rel).parent
        for target in re.findall(r"\]\(([^)]+)\)", text):
            if target.startswith(("http://", "https://", "#", "mailto:")):
                continue
            target = target.split("#")[0].strip()
            if not target:
                continue
            # resolve the link relative to its file, collapsing ../ segments
            resolved = os.path.normpath(os.path.join(base.as_posix(), target))
            if _is_excluded(resolved, excludes):
                offenders.append(f"{rel} -> {target}")
    assert not offenders, (
        "shipped Markdown links into excluded/internal paths "
        f"(dead links + leaks in the public mirror): {offenders}"
    )


# Personal-machine paths that must never appear in a shipped doc. The owner's
# GitHub handle (@anshulixyz in CODEOWNERS/CONTRIBUTING) is fine; generic
# fixture paths (/Users/dev, /home/user) are fine — only the real home leaks.
PERSONAL_PATH = re.compile(r"/Users/apple|Downloads/nextmillionai|~/Downloads")


def test_no_personal_paths_in_shipped_docs():
    """A shipped doc must not leak the author's local filesystem path."""
    excludes = _parse_excludes()
    docs = [
        p
        for p in _shipped(excludes)
        if (p.endswith((".md", ".html", ".txt")) and not p.startswith("tests/"))
    ]
    offenders = []
    for rel in docs:
        text = _shipped_text(rel)
        for m in PERSONAL_PATH.finditer(text):
            ln = text.count("\n", 0, m.start()) + 1
            offenders.append(f"{rel}:{ln} ({m.group(0)})")
    assert not offenders, f"shipped docs leak a personal path: {offenders}"


def test_no_broken_links_in_shipped_docs():
    """Every relative link in a shipped Markdown doc must resolve.

    Catches the classic 'README copied into a subdir so all ../ paths are
    now wrong' bug, and any doc pointing at a file that was moved/removed.
    CURRENT.md is checked as the public variant that actually ships.
    """
    excludes = _parse_excludes()
    shipped = set(_shipped(excludes))
    shipped_md = [p for p in shipped if p.endswith(".md")]
    broken = []
    for rel in shipped_md:
        text = _shipped_text(rel)
        base = Path(rel).parent
        for target in re.findall(r"\]\(([^)]+)\)", text):
            if target.startswith(("http://", "https://", "#", "mailto:")):
                continue
            target = target.split("#")[0].strip()
            if not target:
                continue
            resolved = os.path.normpath(os.path.join(base.as_posix(), target))
            if resolved in shipped or (ROOT / resolved).exists():
                continue
            broken.append(f"{rel} -> {target}")
    assert not broken, f"shipped docs contain broken relative links: {broken}"
