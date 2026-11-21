"""Normalize Docs block delimiters without rewriting fenced code."""

import re

OPEN = re.compile(
    r"^(?P<indent>[ \t]{0,3})(?P<mark>\|\|\||===|:{3,}[A-Za-z][A-Za-z0-9_-]*)"
    r"\s*\[(?P<title>[^\]\n]+)\](?P<rest>.*)$"
)
CLOSE = re.compile(r"^(?P<indent>[ \t]{0,3})\\?(?P<mark>\|\|\||===|:{3,})[ \t]*$")
TAIL_CLOSE = re.compile(r"^(?P<body>.*?)[ \t]+\\?(?P<mark>\|\|\||===|:{3,})[ \t]*$")
CODE_FENCE = re.compile(r"^[ \t]{0,3}(?P<mark>`{3,}|~{3,})(?:[^`~].*)?$")


def kind(mark: str) -> str:
    """Classify a block delimiter by its fence family.

    Args:
        mark (str): Delimiter text from the Markdown source.

    Returns:
        str: ``colon`` for colon fences, or the original marker otherwise.
    """
    return "colon" if mark.startswith(":") else mark


def normalize(source: str) -> str:
    """Place Docs delimiters on separate lines while preserving fenced code.

    Args:
        source (str): Markdown to normalize.

    Returns:
        str: Markdown with consistent delimiter spacing and its original final newline.
    """
    output: list[str] = []
    stack = []
    code_mark = None
    skip_next_blank = False

    def blank() -> None:
        """Append one separator line after nonblank output."""
        if output and output[-1] != "":
            output.append("")

    for line in source.splitlines():
        if skip_next_blank:
            skip_next_blank = False
            if line == "":
                continue
        code = CODE_FENCE.match(line)
        if code_mark:
            output.append(line)
            if (
                code
                and code.group("mark")[0] == code_mark[0]
                and len(code.group("mark")) >= len(code_mark)
            ):
                code_mark = None
            continue
        if code:
            code_mark = code.group("mark")
            output.append(line)
            continue
        opening = OPEN.match(line)
        if opening:
            marker = opening.group("mark")
            rest = opening.group("rest").strip()
            header = (
                opening.group("indent") + marker + "[" + opening.group("title") + "]"
            )
            output.append(header)
            blank()
            skip_next_blank = True
            stack.append(kind(marker))
            if rest:
                tail = TAIL_CLOSE.match(rest)
                if tail and kind(tail.group("mark")) == stack[-1]:
                    body = tail.group("body").strip()
                    if body:
                        output.append(opening.group("indent") + body)
                    blank()
                    output.append(opening.group("indent") + tail.group("mark"))
                    stack.pop()
                else:
                    output.append(opening.group("indent") + rest)
            continue
        closer = CLOSE.match(line)
        if closer and stack and kind(closer.group("mark")) == stack[-1]:
            blank()
            output.append(closer.group("indent") + closer.group("mark"))
            stack.pop()
            continue
        tail = TAIL_CLOSE.match(line)
        if tail and stack and kind(tail.group("mark")) == stack[-1]:
            body = tail.group("body").rstrip()
            if body:
                output.append(body)
            blank()
            output.append(tail.group("mark"))
            stack.pop()
            continue
        output.append(line)
    return "\n".join(output) + ("\n" if source.endswith("\n") else "")
