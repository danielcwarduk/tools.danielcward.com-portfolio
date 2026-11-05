import { mermaidConnection } from './connections';
import { colourPalette, edgeColour } from './colours';

export function bindRenderedEdges(svg, model) {
  const occurrences = new Map();
  const ids = new Map();
  model.edges.map(mermaidConnection).forEach(({ from, to, id }, index) => {
    const pair = JSON.stringify([from, to]);
    const count = occurrences.get(pair) ?? 0;
    occurrences.set(pair, count + 1);
    const key = id || `L_${from}_${to}_${count ? count + 1 : 0}`;
    if (ids.has(key)) throw Error('Two connections have the same rendered ID.');
    ids.set(key, index);
  });

  const paths = [...svg.querySelectorAll('.flowchart-link')];
  const matches = new Map();
  // ELK 0.2 appends a duplicate counter to the original Mermaid ID.
  // Resolve the entire set together, since a user ID may itself end in "_0".
  for (const suffix of ['', '_0']) {
    matches.clear();
    for (const path of paths) {
      const renderedId = path.getAttribute('data-id') || '';
      const base = suffix ? renderedId.endsWith(suffix) && renderedId.slice(0, -suffix.length) : renderedId;
      const index = ids.get(base);
      if (index !== undefined && !matches.has(index)) matches.set(index, path);
    }
    if (matches.size === ids.size && paths.length === ids.size) break;
  }
  if (matches.size !== ids.size || paths.length !== ids.size) return false;

  const labels = new Map([...svg.querySelectorAll('g.edgeLabel')].map(label =>
    [label.querySelector('[data-id]')?.getAttribute('data-id'), label]));
  for (const [index, path] of matches) {
    path.dataset.edgeIndex = index;
    const label = labels.get(path.getAttribute('data-id'));
    if (!label) continue;
    label.dataset.edgeIndex = index;
    const palette = colourPalette.find(colour => colour.id === edgeColour(model, model.edges[index].id));
    if (palette) {
      const color = palette.id === 'black' ? palette.stroke : palette.text;
      for (const text of label.querySelectorAll('span, p, text, tspan')) {
        text.style.setProperty('color', color, 'important');
        text.style.setProperty('fill', color, 'important');
      }
    }
  }
  return true;
}
