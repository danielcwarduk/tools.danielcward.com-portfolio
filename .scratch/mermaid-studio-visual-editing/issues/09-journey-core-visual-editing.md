# 09: Edit journey sections and tasks visually

**What to build:** Let diagram authors add, edit, reorder, and delete user-journey sections and tasks through the visual editor.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Authors can add, edit, reorder, and delete sections and tasks.
- [x] Moving a task between sections is reflected in the preview and source.
- [x] Valid edits participate in undo/redo; unsupported syntax remains intact and falls back to source editing.
- [x] Browser verification covers section/task editing, source output, fallback, and export.

**Verification:** Journey model and browser suites passed; `diagram-types` passed (26/26); `npm run build` passed.

**Boundaries:** Visual editing supports plain, flat sections and tasks. Existing scores and actors are preserved. New sections receive a default task, and every section retains at least one visible task.
