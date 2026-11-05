import { splitPreamble } from './source-preamble.js';

const attribute = /^([\w][\w()[\]-]*)[ \t]+(\*?[\w][\w()[\]-]*)(?:[ \t]+((?:PK|FK|UK)(?:[ \t]*,[ \t]*(?:PK|FK|UK))*))?(?:[ \t]+("[^"]*"))?$/;
const entity = /^(?:"[^"]+"|[\w-]+)(?:\s*\[[^\]]+\])?\s*\{$/;
const classBlock = /^class\s+[\w.-]+\s*\{$/;

function alignAttributes(rows, indent) {
  const parsed = rows.map(row => row.trim().match(attribute));
  if (parsed.some((match, index) => !match && rows[index].trim() && !rows[index].trim().startsWith('%%'))) {
    return rows;
  }
  const fields = parsed.filter(Boolean);
  const typeWidth = Math.max(0, ...fields.map(([, type]) => type.length));
  const nameWidth = Math.max(0, ...fields.map(([, , name]) => name.length));
  const keyWidth = Math.max(0, ...fields.map(([, , , keys]) => keys?.length ?? 0));
  return rows.map((row, index) => {
    const match = parsed[index];
    if (!match) return row.trim() ? indent + row.trim() : '';
    const [, type, name, keys = '', comment = ''] = match;
    let formatted = type.padEnd(typeWidth) + ' ' + name;
    if (keys || comment) formatted = type.padEnd(typeWidth) + ' ' + name.padEnd(nameWidth) + ' ' + keys;
    if (comment) formatted += ' '.repeat(keyWidth - keys.length + 1) + comment;
    return indent + formatted;
  });
}

export function formatSource(source) {
  const { preamble, body } = splitPreamble(source);
  const eol = body.includes('\r\n') ? '\r\n' : '\n';
  const lines = body.split(/\r?\n/);
  const isEr = /^erDiagram\b/.test(lines[0]?.trim());
  if (!isEr && !/^classDiagram\b/.test(lines[0]?.trim())) return source;
  const opener = isEr ? entity : classBlock;
  for (let start = 1; start < lines.length; start++) {
    if (!opener.test(lines[start].trim())) continue;
    let end = start + 1;
    while (end < lines.length && lines[end].trim() !== '}' && !opener.test(lines[end].trim())) end++;
    if (lines[end]?.trim() !== '}') continue;
    const indent = lines[start].match(/^[ \t]*/)[0];
    const rows = lines.slice(start + 1, end);
    if (!isEr && rows.some(row => (row.match(/["']/g)?.length ?? 0) % 2)) continue;
    const formatted = isEr ? alignAttributes(rows, indent + '  ')
      : rows.map(row => row.trim() ? indent + '  ' + row.trim() : '');
    lines.splice(start + 1, rows.length, ...formatted);
    start = end;
  }
  return preamble + lines.join(eol);
}
