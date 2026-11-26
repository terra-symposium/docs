"""Convert supported literal DocsBlock payloads into authored Markdown."""

from __future__ import annotations

import json
import re
from typing import Any

TAG = re.compile(r'^<DocsBlock type="([^"]+)" data=\{(\{.*\})\} />$', re.MULTILINE)


def image(data: dict[str, Any]) -> str:
    """Render an image payload as a Markdown image link.

    Args:
        data (dict[str, Any]): Legacy image fields with URL and optional caption.

    Returns:
        str: A Markdown image reference.

    Raises:
        ValueError: The payload has no URL.
    """
    if not data.get("url"):
        raise ValueError("image lacks a URL")
    title = (
        " " + json.dumps(data["title"], ensure_ascii=False) if data.get("title") else ""
    )
    return "![" + data.get("alt", "") + "](" + data["url"] + title + ")"


def array(items: list[Any]) -> str:
    """Serialize node or edge records as a static JSON array prop.

    Args:
        items (list[Any]): Records from the legacy DocsBlock payload.

    Returns:
        str: A compact JSON array expression.
    """
    return json.dumps(items, ensure_ascii=False, separators=(",", ":"))


def replacement(match: re.Match[str]) -> str:
    """Convert one supported DocsBlock match to its authored source form.

    Args:
        match (re.Match[str]): The full legacy tag and captured block type and payload.

    Returns:
        str: Replacement Markdown or the original tag when conversion is unsafe.
    """
    kind, raw = match.groups()
    data = json.loads(raw)
    if kind == "docImage":
        return image(data)
    if kind == "nodes":
        nodes, edges = data.get("nodes"), data.get("edges")
        if not nodes or not edges:
            return match.group(0)
        attrs = " ".join(
            f"{key}={{{json.dumps(value, ensure_ascii=False)}}}"
            for key, value in data.items()
            if key not in {"_type", "nodes", "edges"}
        )
        return (
            "<Nodes\n\tnodes={"
            + array(nodes)
            + "}\n\tedges={"
            + array(edges)
            + "}\n\t"
            + attrs
            + "\n/>"
        )
    if kind == "accordion":
        items = []
        for item in data.get("items", []):
            bodies = item.get("content", [])
            if not bodies or any(body.get("_type") != "docImage" for body in bodies):
                return match.group(0)
            items.append(
                "===["
                + item["title"]
                + "]\n\n"
                + "\n\n".join(image(body) for body in bodies)
                + "\n\n==="
            )
        return "\n\n".join(items) if items else match.group(0)
    return match.group(0)


def convert(source: str, visible: str | None = None) -> str:
    """Convert visible legacy DocsBlock tags without touching fenced examples.

    Args:
        source (str): Original Markdown source.
        visible (str | None): Source with code fences masked, when available.

    Returns:
        str: Source with supported tags replaced in place.
    """
    changes = []
    for match in TAG.finditer(source):
        if visible is not None and not TAG.match(visible, match.start()):
            continue
        try:
            result = replacement(match)
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            continue
        if result != match.group(0):
            changes.append((match.start(), match.end(), result))
    for start, end, result in reversed(changes):
        source = source[:start] + result + source[end:]
    return source
