# Mermaid editing ticket decisions

## Approved scope

On 2026-11-17, the user approved 12 local tickets for the eight source-only diagram types. Pie, timeline, state, and mind map each have one complete editor ticket. Class, entity relationship, user journey, and Gantt each have a core ticket followed by a specialized ticket.

The final breakdown is in `.scratch/mermaid-studio-visual-editing/issues/`. At approval, tickets were marked `ready-for-agent` and covered the user-visible interaction, source update, preview, undo, unsupported-syntax fallback, and browser verification.

## Dependency decisions

On 2026-11-17, the user approved independence across diagram types. The advanced slices depend only on the core slice for their own type:

- Class relationships depend on class and member editing.
- Entity relationships depend on entity and field editing.
- Journey actor/rating editing depends on section/task editing.
- Gantt scheduling depends on section/task editing.

The initial ticket frontier on 2026-11-17 was 01–05, 07, 09, and 11. Shared integration points may need coordination during implementation, but they do not create behavioral dependencies between the types.

## Gantt core history

On 2026-11-17, the Gantt core slice was completed with section and task creation, editing, movement, reordering, and deletion; the scheduling follow-up remained a separate ticket. The implementer reported passing Gantt model checks, the full browser journey for reorder/add/move/edit/delete/undo-redo/export/fallback, the diagram-type regression suite (26/26), and the build. The build report noted an existing chunk warning. This is a dated implementation report from the working tree, not a commit-pinned code claim.

At the time of the core completion report, ticket 11 was complete and ticket 12 was the next frontier. That state was superseded by the scheduling completion record below; the ticket retains the original blocker edge as resolved history.

## Gantt scheduling completion history

On 2026-11-17, the Gantt scheduling slice was completed and its dependency on Gantt core ticket 11 was resolved. The implementer reported passing Gantt schedule model and browser tests. Browser coverage included date, duration, one dependency, invalid dangling and zero-duration source preservation, undo/redo, protected delete, export, and fallback. The diagram-type regression suite passed (26/26), and the build passed with the existing chunk warning. This is a dated working-tree completion report, not a commit-pinned code claim.

## Source

These choices were made in the Codex conversation on 2026-11-17. Gantt completion reports are recorded in `.scratch/mermaid-studio-visual-editing/issues/11-gantt-core-visual-editing.md` and `.scratch/mermaid-studio-visual-editing/issues/12-gantt-scheduling-visual-editing.md`. The earlier diagram-type delivery contract is `docs/features/diagram-types.md`.
