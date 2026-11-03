# Diagram types: journey and delivery contract

## Journey brief
The public Mermaid Studio should let people start the right kind of diagram without remembering Mermaid headers. Existing source remains authoritative and browser-local. New opens a compact template picker; choosing a template shows a replacement warning before Create. Cancel preserves the working diagram and Undo can restore it after replacement.

Approved scope (user accepted the proposed next step): templates and automatic detection for other diagram types, followed by sequence visual editing. Flowchart interactions, palette, source editing, zoom, history, source download and image exports continue to work. Sequence participants and messages use the established double-left/right-click context menu, default label focus and 250 ms saving. Participants can be added, renamed, changed between actor/participant and deleted. Messages can be drawn between participants, edited, reversed, reordered and deleted; activation can be edited. Keyboard C chooses a destination without committing until Enter.

Advanced sequence blocks and other diagram types remain source-editable with live preview and export. No conversion between diagram types, no automatic replacement on selection alone, no visual editors for state/class/ER in this release. Assumptions: high confidence that New replaces the current working document with warning and undo; medium confidence/low consequence on template defaults and ordering. No unresolved high-risk product questions.

## Impact and solution
Current flowchart parser/serializer is intentionally strict and shares a model with its pointer and keyboard handlers. Extend through an independent sequence model and controller, with a small integration into render/type detection. Keep flowchart handler code isolated by intercepting sequence interactions. Reuse source/history, context save, positioning/focus, neutral theme and PNG/SVG exports. Sequence edits must preserve comments, message order, notes, numbering and untouched source lines. Reject unsupported syntax for visual editing rather than rewriting it. Mermaid renderer remains final validation.

Sequence model supports participant/actor declarations and implicit participants; basic messages, standalone/inline activation, notes, autonumber and comments. Validate IDs and activation consistency before committing changes. Advanced fragments remain untouched in source mode. Sequence context has participant type/ID/label or message source/destination/style/activation/label; colours use the existing renderer theme (individual sequence colours are not a native class feature). No new palette or alternate context menu pattern.

Reuse existing controls and styling; validate compact picker/menu on desktop and mobile directly in the running product. No new visual design system is introduced.

## Change summary
New creates a diagram from one of ten small templates. The source determines the active type. Flowchart and simple sequence diagrams support visual editing; other types and advanced syntax keep source preview and export. Existing documents are never replaced automatically.

## Tickets (serial, authorized for this release)
1. **Template picker** — New, ten valid templates, warning/Create/Cancel, undo, detected type and responsive layout. Verify all templates render, cancellation preserves source and undo restores it. No dependency.
2. **Sequence visual editing** — participants/messages selectable; same context interactions; IDs/labels/type, endpoints/arrow style, activation; add/connect/reverse/reorder/delete; source preservation, history, clear source-only fallback. Depends on 1 for entry point. Verify pure model mutations and browser journeys, including malformed/advanced source and keyboard confirmation.
3. **Integrate and publish** — contextual tips/hints, export/zoom/persistence, flowchart regressions, responsive QA, build, source sync and public deployment. Depends on 1–2. Review final diff against this contract before release.

## Evidence
Mermaid sequence syntax: https://mermaid.js.org/syntax/sequenceDiagram.html (checked against the installed Mermaid renderer; current public docs include newer features that are deliberately excluded).

## Delivery evidence
All ten templates render in the installed Mermaid version. Browser checks cover replacement/Cancel/Undo, automatic detection, participant and message editing, deferred saves, keyboard confirmation, drag connections, activation validation, reorder/reverse/delete, source-only fallback, exports and mobile bounds. Independent review identified statement-separator data loss, pending-save/index races, multiline target mapping, immediate actions after saves and native Tab traversal; each has a focused regression. Follow-up review caught unsupported entity decoding and pending participant-rename targets; named entities now fall back to source, numeric Unicode uses full code points, and pending targets resolve renamed IDs. Review fixes verified by the feature suite and model checks.

Delivery status: all three tickets complete. Production build passed; 14 source-model checks and 118 browser checks passed (26 new type/sequence journeys, 92 existing regression checks). Independent review completed with no remaining blockers. Source-only diagrams advertise source editing rather than appearing to be permanently updating.
