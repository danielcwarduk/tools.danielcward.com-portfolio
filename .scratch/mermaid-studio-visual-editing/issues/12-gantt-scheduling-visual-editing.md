# 12: Edit Gantt scheduling visually

**What to build:** Let diagram authors edit task dates, durations, and dependencies through the visual editor.

**Blocked by:** 11: Edit Gantt sections and tasks visually (resolved; ticket 11 completed before this ticket).

**Status:** complete

- [x] Authors can set and edit supported task dates and durations.
- [x] Authors can add and edit task dependencies, and invalid or dangling references are rejected without source loss.
- [x] Valid edits serialize to Mermaid source, update the preview, and participate in undo/redo.
- [x] Unsupported scheduling syntax remains intact and falls back to source editing; browser verification covers scheduling and fallback.

**Verification:** Gantt schedule model and browser suites passed. Browser coverage includes date, duration, one dependency, invalid dangling/zero-duration source preservation, undo/redo, protected delete, export, and fallback; `diagram-types` passed (26/26); `npm run build` passed with the existing chunk warning.
