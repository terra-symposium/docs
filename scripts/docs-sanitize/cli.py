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


def findings(source: str) -> list[str]:
    """Collect delimiter, obsolete block, and incomplete diagram findings.

    Args:
        source (str): Markdown source to inspect.

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
        issues = findings(source)
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
