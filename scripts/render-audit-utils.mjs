/**
 * Normalizes rendered code before comparing it with its Markdown or Portable Text source.
 * @param value Code text from the source model or rendered viewer.
 * @returns Text with CR/CRLF converted to LF, trailing horizontal space removed, and final line breaks dropped.
 */
export function normalizeCodeForAudit(value) {
  const lines = String(value ?? '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((l) => l.replace(/[\t ]+$/, ''));
  while (lines.at(-1) === '') lines.pop();
  return lines.join('\n');
}
