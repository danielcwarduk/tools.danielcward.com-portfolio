import { Decoration, ViewPlugin } from '@codemirror/view';

function guides(view) {
  const ranges = [];
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to;) {
      const line = view.state.doc.lineAt(pos);
      const indent = line.text.match(/^[\t ]+/)?.[0];
      const end = Math.min(line.from + (indent?.length ?? 0), to);
      const start = Math.max(from, line.from);
      if (end > start) ranges.push(Decoration.mark({ class: 'cm-indent-guide' }).range(start, end));
      pos = line.to + 1;
    }
  }
  return Decoration.set(ranges, true);
}

export const indentGuides = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = guides(view);
  }
  update(update) {
    if (update.docChanged || update.viewportChanged) this.decorations = guides(update.view);
  }
}, { decorations: plugin => plugin.decorations });
