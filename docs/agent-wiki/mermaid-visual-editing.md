# Mermaid visual editing initiative

## Goal and scope

On 2026-11-17, the user approved a roadmap to add visual editing for the eight Mermaid diagram templates that had source editing with live preview but no visual editor: pie, timeline, state, mind map, class, entity relationship, user journey, and Gantt. Flowchart and sequence editing were existing interactive paths documented in the source notes below.

The agreed approach is to reuse the editor's interaction and source-update patterns, while implementing type-specific editing models and safe source fallbacks. The approved backlog contains 12 end-to-end tickets; implementation has not been recorded here as complete.

## Sources

- User approval in the Codex conversation, 2026-11-17.
- Project feature contract: `docs/features/diagram-types.md`.
- Earlier architecture investigation: `.scratch/mermaid-studio-architecture/spec.md` and `.scratch/mermaid-studio-architecture/tickets/README.md` (these notes are retained as sources, not copied into this wiki).

Code baseline claims above refer to repository commit `cefcf9f2989bd2189dbd4e0e0a243600c8128f4f`, observed on 2026-11-17. Update this page with a new dated entry when implementation changes the baseline.
