"""Lossless conversion of legacy CodeBlock tags with string-literal code props."""

from __future__ import annotations

import ast
import json
import re

START = re.compile(r"<CodeBlock\b")
CODE = re.compile(
    r"""\bcode\s*=\s*\{\s*((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'))\s*\}""", re.DOTALL
)
LANG = re.compile(
    r"""\blanguage\s*=\s*(?:(["'])([^"']+)\1|\{\s*(["'])([^"']+)\3\s*\})""", re.DOTALL
)


def tag_end(source: str, pos: int) -> int:
    """Find the closing bracket of a JSX tag without stopping inside a prop.

    Args:
        source (str): Text containing the tag.
        pos (int): Position immediately after the tag name.

    Returns:
        int: The position immediately after the closing bracket.

    Raises:
        ValueError: The tag does not close.
    """
    quote = None
    escaped = False
    braces = 0
    for i in range(pos, len(source) - 1):
        ch = source[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
        elif ch in ('"', "'", "`"):
            quote = ch
        elif ch == "{":
            braces += 1
        elif ch == "}":
            braces -= 1
        elif ch == "/" and source[i + 1] == ">" and braces == 0:
            return i + 2
    raise ValueError("unclosed CodeBlock tag")


def convert(source: str, visible: str | None = None) -> str:
    """Replace supported literal CodeBlock tags with Markdown code fences.

    Args:
        source (str): Original Markdown source.
        visible (str | None): Source with code fences masked, when available.

    Returns:
        str: Source with supported tags converted without changing other text.

    Raises:
        ValueError: A live tag has unsupported props or cannot be closed.
    """
    changes = []
    cursor = 0
    while match := START.search(source, cursor):
        if visible is not None and not START.match(visible, match.start()):
            cursor = match.end()
            continue
        end = tag_end(source, match.end())
        tag = source[match.start() : end]
        code = CODE.search(tag)
        lang = LANG.search(tag)
        if not code or not lang:
            raise ValueError(f"unsupported CodeBlock at offset {match.start()}")
        contents = (
            json.loads(code.group(1))
            if code.group(1).startswith('"')
            else ast.literal_eval(code.group(1))
        )
        language = lang.group(2) or lang.group(4)
        fence = "`" * max(
            3,
            max((len(m.group(0)) for m in re.finditer(r"`+", contents)), default=0) + 1,
        )
        body = "\n".join(line.rstrip() for line in contents.rstrip("\n").split("\n"))
        changes.append((match.start(), end, f"{fence}{language}\n{body}\n{fence}"))
        cursor = end
    for start, end, replacement in reversed(changes):
        source = source[:start] + replacement + source[end:]
    return source
