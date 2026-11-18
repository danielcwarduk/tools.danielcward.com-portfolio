# 07: Edit entities and fields visually

**What to build:** Let diagram authors add, rename, and delete entities, and edit their fields through the visual editor.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Authors can add, rename, and delete entities and edit supported fields.
- [x] Field names, types, and supported key markers can be edited visually.
- [x] Valid edits serialize to Mermaid source, update the preview, and participate in undo/redo.
- [x] Unsupported entity syntax remains intact and falls back to source editing; browser verification covers editing and fallback.

**Verification:** ER model and browser suites passed; `diagram-types` passed (26/26); `npm run build` passed.

**Boundaries:** Visual editing supports a bounded entity/field syntax subset. Relationship editing remains source-only until ticket 08.
