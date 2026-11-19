"""Remove presentation-only Markdown syntax and obsolete Docs component shims."""

import re

from normalize import CODE_FENCE

NODES_IMPORT = re.compile(r'^import\s*\{\s*NodesBlock\s*\}\s*from\s*[\'\"]@terra-symposium/docs[\'\"];?\s*$')
NODES_EXPORT = re.compile(r'^export\s+const\s+Nodes\s*=\s*(?:\(?\s*props\s*\)?)\s*=>\s*<NodesBlock\s+block=\{props\}\s*/>;?\s*$')


def clean(source):
    lines = source.splitlines(keepends=True)
    result = []
    fence = None
    frontmatter = bool(lines and lines[0].strip() == '---')
    frontmatter_closed = False
    direct_nodes_block = bool(re.search(r'^[ \t]*<NodesBlock\b', source, re.M))
    for index, line in enumerate(lines):
        stripped = line.strip()
        if frontmatter and not frontmatter_closed:
            result.append(line)
            if index > 0 and stripped == '---':
                frontmatter_closed = True
            continue
        found = CODE_FENCE.match(line.rstrip('\r\n'))
        if fence:
            result.append(line)
            if found and found.group('mark')[0] == fence[0] and len(found.group('mark')) >= len(fence):
                fence = None
            continue
        if found:
            fence = found.group('mark')
            result.append(line)
            continue
        if stripped == '---':
            if result and not result[-1].strip():
                result.pop()
            continue
        if not direct_nodes_block and (NODES_IMPORT.fullmatch(stripped) or NODES_EXPORT.fullmatch(stripped)):
            if result and not result[-1].strip():
                result.pop()
            continue
        result.append(line)
    return ''.join(result)


def content_findings(source):
    issues = []
    lines = source.splitlines()
    fence = None
    frontmatter = bool(lines and lines[0].strip() == '---')
    frontmatter_closed = False
    direct_nodes_block = bool(re.search(r'^[ \t]*<NodesBlock\b', source, re.M))
    for index, line in enumerate(lines):
        stripped = line.strip()
        if frontmatter and not frontmatter_closed:
            if index > 0 and stripped == '---':
                frontmatter_closed = True
            continue
        found = CODE_FENCE.match(line)
        if fence:
            if found and found.group('mark')[0] == fence[0] and len(found.group('mark')) >= len(fence):
                fence = None
            continue
        if found:
            fence = found.group('mark')
            continue
        if stripped == '---':
            issues.append(f'Markdown divider at line {index + 1}')
        elif not direct_nodes_block and (NODES_IMPORT.fullmatch(stripped) or NODES_EXPORT.fullmatch(stripped)):
            issues.append(f'obsolete Nodes shim at line {index + 1}')
    return issues
