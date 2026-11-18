# 11: Edit Gantt sections and tasks visually

**What to build:** Let diagram authors add, edit, reorder, and delete Gantt sections and tasks through the visual editor.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Authors can add, edit, reorder, and delete sections and tasks.
- [x] Task labels and section membership update correctly in the preview and source.
- [x] Valid edits participate in undo/redo; unsupported syntax remains intact and falls back to source editing.
- [x] Browser verification covers section/task editing, source output, fallback, and export.

**Verification:** Gantt model checks passed; `verification/gantt-editor.mjs` passed the full browser journey for reorder, add, move, edit, delete, undo/redo, export, and fallback; `verification/diagram-types.mjs` passed (26/26); `npm run build` passed with the existing chunk warning.
