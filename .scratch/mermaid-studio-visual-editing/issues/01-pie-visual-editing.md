# 01: Add visual editing for pie charts

**What to build:** Let diagram authors select pie slices and add, edit, reorder, or delete slice labels and values through the visual editor, with each change reflected in Mermaid source and preview.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Authors can add, edit, reorder, and delete slices using canvas and context controls.
- [x] Valid edits serialize to Mermaid source, update the preview, and participate in undo/redo.
- [x] Unsupported or invalid pie syntax remains intact and falls back to source editing.
- [x] Browser verification covers the visual journey, source result, fallback, and export.

**Verification:** 6 model checks passed; `npm run build` passed; `verification/pie-editor.mjs` passed.
