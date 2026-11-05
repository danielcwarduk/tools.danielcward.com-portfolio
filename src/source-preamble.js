// Keep configuration and comments ahead of the diagram verbatim on visual edits.
export function splitPreamble(source) {
  let offset = 0;
  while (offset < source.length) {
    const rest = source.slice(offset);
    const prefix = rest.match(/^(?:[ \t]*\r?\n|\uFEFF)/);
    if (prefix) {
      offset += prefix[0].length;
      continue;
    }
    const block = rest.match(/^---[ \t]*\r?\n[\s\S]*?^---[ \t]*\r?\n/m);
    if (block?.index === 0) {
      offset += block[0].length;
      continue;
    }
    const directive = rest.match(/^[ \t]*%%\{[\s\S]*?\}%%[ \t]*\r?\n/);
    if (directive) {
      offset += directive[0].length;
      continue;
    }
    const comment = rest.match(/^[ \t]*%%(?!\{)[^\r\n]*\r?\n/);
    if (!comment) break;
    offset += comment[0].length;
  }
  return { preamble: source.slice(0, offset), body: source.slice(offset) };
}
