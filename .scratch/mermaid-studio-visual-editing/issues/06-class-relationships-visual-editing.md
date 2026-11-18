# 06: Edit class relationships visually

**What to build:** Let diagram authors create, edit, and delete relationships between classes through the visual editor.

**Blocked by:** 05: Edit classes and members visually.

**Status:** complete

- [x] Authors can add, edit, and delete supported relationships between existing classes.
- [x] Relationship type, direction, and label can be changed visually.
- [x] Valid edits serialize to Mermaid source, update the preview, and participate in undo/redo.
- [x] Unsupported relationships remain intact and fall back to source editing; browser verification covers editing and fallback.

**Verification:** 7/7 model checks passed, covering 14 relation tokens; focused class browser journey passed; `diagram-types` passed (26/26); `npm run build` passed.

**Boundaries:** Visual editing supports eight simple class relationship forms and their reverse spellings. Cardinality, two-way, and lollipop relationships remain source-only.
