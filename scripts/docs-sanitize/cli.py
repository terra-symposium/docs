"""Check or safely repair Markdown used by Terra Docs sites."""

import argparse
import json
import re
import sys
from collections.abc import Iterator
from pathlib import Path

from content import clean, content_findings
from legacy_codeblocks import convert, tag_end
from legacy_docsblocks import convert as convert_docsblocks
from normalize import CODE_FENCE, normalize

SKIP = {".git", "node_modules", "dist", ".astro", "archive", "_audit"}
LEGACY = re.compile(r"^\s*<(CodeBlock|DocsBlock)\b", re.MULTILINE)
NODES = re.compile(r"^[ \t]*<Nodes\b", re.MULTILINE)
DIRECT_NODES_BLOCK = re.compile(r"^[ \t]*<NodesBlock\b", re.MULTILINE)
EMPTY = re.compile(
    r'\b(nodes|edges)\s*=\s*\{\s*(?:`|["\'])?\s*\[\s*\]\s*(?:`|["\'])?\s*\}', re.DOTALL
)
BLOCK_GUIDANCE = re.compile(r"^\s*<DocsBlock\s+data=(['\"])(.*?)\1\s*/>\s*$")


def is_block_guidance(source: str, candidate: re.Match[str]) -> bool:
    """Return whether a DocsBlock line is a current typed guidance node.

    Args:
        source (str): Visible Markdown source with code fences masked.
        candidate (re.Match[str]): Matched DocsBlock tag prefix.

    Returns:
        bool: Whether its data is a blockGuidance object with a non-empty ID.
    """
    tag_start = candidate.end() - len("<DocsBlock")
    line_start = source.rfind("\n", 0, tag_start) + 1
    line_end = source.find("\n", tag_start)
    if line_end == -1:
        line_end = len(source)
    match = BLOCK_GUIDANCE.match(source[line_start:line_end])
    if not match:
        return False
    try:
        data = json.loads(match.group(2))
    except json.JSONDecodeError:
        return False
    return (
        isinstance(data, dict)
        and data.get("_type") == "blockGuidance"
        and isinstance(data.get("id"), str)
        and bool(data["id"].strip())
    )


def visible_source(source: str) -> str:
    """Mask code fences so examples are not treated as live components.

    Args:
        source (str): Markdown source to inspect.

    Returns:
        str: Text with fenced code replaced by spaces while line positions remain.
    """
    masked = []
    fence = None
    for line in source.splitlines(keepends=True):
        found = CODE_FENCE.match(line.rstrip("\r\n"))
        if fence:
            masked.append("".join("\n" if char == "\n" else " " for char in line))
            if (
                found
                and found.group("mark")[0] == fence[0]
                and len(found.group("mark")) >= len(fence)
            ):
                fence = None
        elif found:
            fence = found.group("mark")
            masked.append("".join("\n" if char == "\n" else " " for char in line))
        else:
            masked.append(line)
    return "".join(masked)


def json_array_prop(props: str, name: str) -> bool:
    """Return whether a JSX prop contains a static JSON array expression.

    Args:
        props (str): JSX properties to inspect.
        name (str): Name of the property to find.

    Returns:
        bool: Whether the property contains a JSON array.
    """
    match = re.search(rf"\b{name}\s*=\s*\{{", props)
    if not match:
        return False
    start = match.end()
    depth = 1
    quote = None
    escaped = False
    for index in range(start, len(props)):
        char = props[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in ('"', "'", "`"):
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                expression = props[start:index].strip()
                if expression.startswith("`") and expression.endswith("`"):
                    expression = expression[1:-1]
                try:
                    return isinstance(json.loads(expression), list)
                except json.JSONDecodeError:
                    return False
    return False


def findings(source: str, validate_markdown_nodes: bool = True) -> list[str]:
    """Collect delimiter, obsolete block, and incomplete diagram findings.

    Args:
        source (str): Markdown source to inspect.
        validate_markdown_nodes (bool): Whether to check Markdown Nodes blocks.

    Returns:
        list[str]: Human-readable findings for the source file.
    """
    issues = []
    if normalize(source) != source:
        issues.append("Docs delimiter spacing")
    issues.extend(content_findings(source))
    visible = visible_source(source)
    for match in DIRECT_NODES_BLOCK.finditer(visible):
        line = visible.count("\n", 0, match.start()) + 1
        issues.append(f"direct <NodesBlock> requires migration at line {line}")
    for match in LEGACY.finditer(visible):
        if match.group(1) == "DocsBlock" and is_block_guidance(visible, match):
            continue
        line = visible.count("\n", 0, match.start()) + 1
        issues.append(f"legacy <{match.group(1)}> at line {line}")
    for match in NODES.finditer(visible):
        line = visible.count("\n", 0, match.start()) + 1
        try:
            end = tag_end(visible, match.end())
        except ValueError:
            # Legacy escaped JSX can contain literal backticks and angle
            # brackets. Leave it for the renderer rather than misreporting it.
            continue
        props = visible[match.end() : end]
        if "frontmatter." in props:
            issues.append(f"Nodes still references frontmatter at line {line}")
        if not re.search(r"\bnodes\s*=", props) or not re.search(r"\bedges\s*=", props):
            issues.append(f"Nodes lacks nodes or edges at line {line}")
        if EMPTY.search(props):
            issues.append(f"Nodes contains empty diagram data at line {line}")
        elif validate_markdown_nodes and (
            not json_array_prop(props, "nodes") or not json_array_prop(props, "edges")
        ):
            issues.append(f"Nodes arrays must be static JSON at line {line}")
    return issues


def markdown_files(roots: list[str]) -> Iterator[Path]:
    """Yield authored Markdown files under the requested paths.

    Args:
        roots (list[str]): Files or directories to inspect.

    Yields:
        Path: Markdown paths outside generated and dependency directories.

    Raises:
        FileNotFoundError: A requested path does not exist.
    """
    for root in roots:
        path = Path(root)
        if path.is_file():
            if path.suffix in {".md", ".mdx"}:
                yield path
            continue
        if not path.exists():
            raise FileNotFoundError(path)
        yield from (
            p
            for p in path.rglob("*")
            if p.suffix in {".md", ".mdx"} and not SKIP.intersection(p.parts)
        )


def main() -> bool:
    """Run the requested check or safe repair and print its findings.

    Returns:
        bool: Whether any source file still has findings.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("check", "fix"))
    parser.add_argument(
        "roots",
        nargs="*",
        default=["docs"],
        help="Markdown files or directories; defaults to docs/",
    )
    parser.add_argument(
        "--json", action="store_true", help="print machine-readable findings"
    )
    args = parser.parse_args()
    report = []
    for path in sorted(set(markdown_files(args.roots))):
        original = path.read_text(encoding="utf-8")
        source = original
        if args.mode == "fix":
            # Only lossless conversions are automatic. DocsBlock and missing
            # diagram data require an author to recover the original source.
            if not re.search(r"^\s*<CodeBlock\b", visible_source(source), re.MULTILINE):
                source = normalize(source)
            else:
                try:
                    source = normalize(convert(source, visible_source(source)))
                except (ValueError, SyntaxError) as exc:
                    report.append(
                        {"path": str(path), "issues": [f"CodeBlock conversion: {exc}"]}
                    )
                    continue
            source = normalize(convert_docsblocks(source, visible_source(source)))
            source = clean(source)
            if source != original:
                path.write_text(source, encoding="utf-8")
        issues = findings(source, path.suffix != ".mdx")
        if issues:
            report.append({"path": str(path), "issues": issues})
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        for item in report:
            print(f"{item['path']}: " + "; ".join(item["issues"]))
        print(f"{len(report)} file(s) with findings")
    return bool(report)


if __name__ == "__main__":
    sys.exit(main())
