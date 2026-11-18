# 10: Edit journey actors and ratings visually

**What to build:** Let diagram authors set the actor and rating for each user-journey task through the visual editor.

**Blocked by:** 09: Edit journey sections and tasks visually.

**Status:** complete

- [x] Authors can choose supported actors for each task and set a valid rating.
- [x] Changes remain attached to the intended task when sections or tasks are reordered.
- [x] Valid edits serialize to Mermaid source, update the preview, and participate in undo/redo.
- [x] Unsupported syntax remains intact and falls back to source editing; browser verification covers edits and fallback.

**Verification:** Journey model and browser suites passed; `diagram-types` passed (26/26); `npm run build` passed.

**Boundaries:** Ratings are integers from 1 to 5. Actors use comma-separated Mermaid values. Invalid values are rejected before source changes.
