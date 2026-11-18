# 08: Edit entity relationships visually

**What to build:** Let diagram authors create, edit, and delete relationships between entities, including endpoint cardinality.

**Blocked by:** 07: Edit entities and fields visually.

**Status:** complete

- [x] Authors can add, edit, and delete supported relationships between existing entities.
- [x] Relationship label, direction, and cardinality at both ends can be changed visually.
- [x] Valid edits serialize to Mermaid source, update the preview, and participate in undo/redo.
- [x] Unsupported relationships remain intact and fall back to source editing; browser verification covers editing and fallback.

**Verification:** ER model suite passed for all cardinality/style pairs; ER browser suite passed for editing, reverse, reorder, delete, history, export, and fallback; class regression suite and `npm run build` passed.
