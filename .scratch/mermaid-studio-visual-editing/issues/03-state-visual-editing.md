# 03: Add visual editing for state diagrams

**What to build:** Let diagram authors create and edit states and transitions on the canvas, including transition labels and start/end states.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Authors can add, edit, and delete states and transitions, including start/end states.
- [x] Transition direction and labels can be changed through the visual editor.
- [x] Valid edits serialize to Mermaid source, update the preview, and participate in undo/redo.
- [x] Unsupported or invalid syntax remains intact and falls back to source editing; browser verification covers edits and fallback.

**Verification:** 5/5 model checks passed; focused State browser suite passed, including end mapping, rename autosave, state creation, history, fallback, and export; `diagram-types.mjs` passed (26/26); `npm run build` passed.

**Boundaries:** Visual editing supports the flat syntax subset. Pressing N adds a transition because Mermaid omits isolated state declarations from its rendered diagram.
