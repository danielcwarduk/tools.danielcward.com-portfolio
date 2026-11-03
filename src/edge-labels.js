// Hide only the rendered connection beneath its label; keep the canvas visible.
export function installEdgeLabelGaps(svg) {
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const make = (name, attrs) => {
    const element = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    return element;
  };
  let defs = svg.querySelector('defs');
  if (!defs) { defs = make('defs', {}); svg.prepend(defs); }
  const edges = [...svg.querySelectorAll('.flowchart-link')];
  for (const [index, edge] of edges.entries()) {
    const labels = [...svg.querySelectorAll('g.edgeLabel')].filter(label => {const id=label.querySelector('[data-id]')?.getAttribute('data-id');return label.textContent.trim()&&id&&(edge.id===id||edge.id.endsWith('-'+id));});
    if (!labels.length) continue;
    const edgeMatrix = edge.getCTM();
    if (!edgeMatrix) continue;
    const box = edge.getBBox(), padding = 32;
    const bounds = {x: box.x-padding, y: box.y-padding, width: box.width+padding*2, height: box.height+padding*2};
    const id = `${svg.id}-label-gap-${index}`;
    const mask = make('mask', {id, maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse', ...bounds, style: 'mask-type:luminance', 'data-edge-label-gap': edge.id});
    mask.append(make('rect', {...bounds, fill: 'white'}));
    for (const label of labels) {
      const labelMatrix = label.getCTM();
      if (!labelMatrix) continue;
      const b = label.getBBox(), gap = 4;
      if (!b.width || !b.height) continue;
      const matrix = edgeMatrix.inverse().multiply(labelMatrix);
      const points = [[b.x-gap,b.y-gap],[b.x+b.width+gap,b.y-gap],[b.x+b.width+gap,b.y+b.height+gap],[b.x-gap,b.y+b.height+gap]].map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix));
      mask.append(make('polygon', {points: points.map(p => `${p.x},${p.y}`).join(' '), fill: 'black'}));
    }
    defs.append(mask);
    edge.setAttribute('mask', `url(#${id})`);
  }
}
