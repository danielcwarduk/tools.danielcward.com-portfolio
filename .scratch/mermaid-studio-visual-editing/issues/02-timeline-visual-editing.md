# 02: Add visual editing for timelines

**What to build:** Let diagram authors select timeline events and add, edit, reorder, or delete events and their labels through the visual editor.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Authors can add, edit, reorder, and delete timeline events and labels.
- [x] Valid edits serialize to Mermaid source, update the preview, and participate in undo/redo.
- [x] Unsupported or invalid timeline syntax remains intact and falls back to source editing.
- [x] Browser verification covers the visual journey, source result, fallback, and export.

**Verification:** 5 model checks passed; Timeline browser suite passed; `diagram-types` suite passed (26/26); `npm run build` passed. Sections and accessibility directives remain source-only.
