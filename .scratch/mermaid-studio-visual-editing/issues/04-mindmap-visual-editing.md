# 04: Add visual editing for mind maps

**What to build:** Let diagram authors add, edit, move, and delete mind-map branches through the visual editor while keeping the parent-child structure understandable.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Authors can add, edit, move, and delete branches and labels on the canvas.
- [x] Moving a branch preserves its descendants and produces the expected tree in the preview.
- [x] Valid edits serialize to Mermaid source and participate in undo/redo.
- [x] Unsupported or invalid syntax remains intact and falls back to source editing; browser verification covers editing and fallback.

**Verification:** 5/5 model checks passed; focused Mind map browser suite passed; `diagram-types` passed (26/26) with zero page errors; `npm run build` passed.

**Boundaries:** Visual editing supports the plain-text root/descendant subset. Unsupported forms remain source-only.
