# 05: Edit classes and members visually

**What to build:** Let diagram authors add, rename, edit, and delete classes and their members through the visual editor, with changes reflected in Mermaid source and preview.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Authors can add, rename, and delete classes and edit their supported members.
- [x] Valid edits serialize to Mermaid source, update the preview, and participate in undo/redo.
- [x] Unsupported class syntax remains intact and falls back to source editing.
- [x] Browser verification covers class/member editing, source output, fallback, and export.

**Verification:** 5/5 model checks passed; class browser journey passed, covering multiple members, rename/delete relationship references, history, fallback, and export; `diagram-types` passed (26/26) with no page errors; `npm run build` passed.
