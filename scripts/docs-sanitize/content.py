"""Remove presentation-only Markdown syntax and obsolete Docs component shims."""

import re

from normalize import CODE_FENCE

NODES_IMPORT = re.compile(
    r"^import\s*\{\s*NodesBlock\s*\}\s*from\s*[\'\"]@terra-symposium/docs[\'\"];?\s*$"
)
NODES_EXPORT = re.compile(
    r"^export\s+const\s+Nodes\s*=\s*(?:\(?\s*props\s*\)?)\s*=>\s*<NodesBlock\s+block=\{props\}\s*/>;?\s*$"
)


def has_live_nodes_block(source: str) -> bool:
    """Check whether an active NodesBlock tag exists outside code fences.

    Args:
        source (str): Markdown source to inspect.

    Returns:
        bool: Whether a live NodesBlock tag was found.
    """
    fence = None
    for line in source.splitlines():
        found = CODE_FENCE.match(line)
        if fence:
            if (
                found
                and found.group("mark")[0] == fence[0]
                and len(found.group("mark")) >= len(fence)
            ):
                fence = None
            continue
        if found:
            fence = found.group("mark")
            continue
        if re.match(r"^[ \t]*<NodesBlock\b", line):
            return True
    return False


def clean(source: str) -> str:
    """Remove obsolete presentation dividers and unused Nodes shims.

    Args:
        source (str): Markdown source to clean.

    Returns:
        str: Source with safe, presentation-only lines removed.
    """
    lines = source.splitlines(keepends=True)
    result = []
    fence = None
    frontmatter = bool(lines and lines[0].strip() == "---")
    frontmatter_closed = False
    direct_nodes_block = has_live_nodes_block(source)
    for index, line in enumerate(lines):
        stripped = line.strip()
        if frontmatter and not frontmatter_closed:
            result.append(line)
            if index > 0 and stripped == "---":
                frontmatter_closed = True
            continue
        found = CODE_FENCE.match(line.rstrip("\r\n"))
        if fence:
            result.append(line)
            if (
                found
                and found.group("mark")[0] == fence[0]
                and len(found.group("mark")) >= len(fence)
            ):
                fence = None
            continue
        if found:
            fence = found.group("mark")
            result.append(line)
            continue
        if stripped == "---":
            if result and not result[-1].strip():
                result.pop()
            continue
        if not direct_nodes_block and (
            NODES_IMPORT.fullmatch(stripped) or NODES_EXPORT.fullmatch(stripped)
        ):
            if result and not result[-1].strip():
                result.pop()
            continue
        result.append(line)
    return "".join(result)


def content_findings(source: str) -> list[str]:
    """List obsolete presentation syntax that remains in active Markdown.

    Args:
        source (str): Markdown source to inspect.

    Returns:
        list[str]: Human-readable findings with source line numbers.
    """
    issues = []
    lines = source.splitlines()
    fence = None
    frontmatter = bool(lines and lines[0].strip() == "---")
    frontmatter_closed = False
    direct_nodes_block = has_live_nodes_block(source)
    for index, line in enumerate(lines):
        stripped = line.strip()
        if frontmatter and not frontmatter_closed:
            if index > 0 and stripped == "---":
                frontmatter_closed = True
            continue
        found = CODE_FENCE.match(line)
        if fence:
            if (
                found
                and found.group("mark")[0] == fence[0]
                and len(found.group("mark")) >= len(fence)
            ):
                fence = None
            continue
        if found:
            fence = found.group("mark")
            continue
        if stripped == "---":
            issues.append(f"Markdown divider at line {index + 1}")
        elif not direct_nodes_block and (
            NODES_IMPORT.fullmatch(stripped) or NODES_EXPORT.fullmatch(stripped)
        ):
            issues.append(f"obsolete Nodes shim at line {index + 1}")
    return issues
