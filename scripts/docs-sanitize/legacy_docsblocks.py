"""Convert supported literal DocsBlock payloads into authored Markdown."""

import json
import re

TAG = re.compile(r'^<DocsBlock type="([^"]+)" data=\{(\{.*\})\} />$', re.M)


def image(data):
    if not data.get('url'):
        raise ValueError('image lacks a URL')
    title = ' ' + json.dumps(data['title'], ensure_ascii=False) if data.get('title') else ''
    return '![' + data.get('alt', '') + '](' + data['url'] + title + ')'


def array(items):
    return '[\n' + ''.join('\t' + json.dumps(item, ensure_ascii=False, separators=(', ', ': ')) + ',\n' for item in items) + ']'


def replacement(match):
    kind, raw = match.groups()
    data = json.loads(raw)
    if kind == 'docImage':
        return image(data)
    if kind == 'nodes':
        nodes, edges = data.get('nodes'), data.get('edges')
        if not nodes or not edges:
            return match.group(0)
        attrs = ' '.join(f'{key}={{{json.dumps(value, ensure_ascii=False)}}}' for key, value in data.items() if key not in {'_type', 'nodes', 'edges'})
        return '<Nodes\n\tnodes={' + array(nodes) + '}\n\tedges={' + array(edges) + '}\n\t' + attrs + '\n/>'
    if kind == 'accordion':
        items = []
        for item in data.get('items', []):
            bodies = item.get('content', [])
            if not bodies or any(body.get('_type') != 'docImage' for body in bodies):
                return match.group(0)
            items.append('===[' + item['title'] + ']\n\n' + '\n\n'.join(image(body) for body in bodies) + '\n\n===')
        return '\n\n'.join(items) if items else match.group(0)
    return match.group(0)


def convert(source, visible=None):
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
