# Editor refinements — November 2026

User-requested outcomes: no menu jump during autosave; more mnemonic Shift creation keys and faithful shape miniatures; standard arrow-label inputs; preserve a manually chosen view when adding shapes; Shift-click and Shift-drag extend selection; new identifiers S1/S2; focus ring above diagram content.

Implementation contract:
- Saving/Not saved occupies a fixed slot in each context heading, after its title. Only errors use the footer; ordinary save transitions cannot change menu bounds.
- A shared registry defines all 18 Shift shortcuts and their hints/reference rows. Existing seven bindings remain. Additional keys: S subprocess, H hexagon/preparation, M manual operation, I manual input, E event, X extract, J junction, O stored data, W window/internal storage, L lined document, A asymmetric.
- Every supported shape has a dedicated outline matching Mermaid's geometry, with no generic rectangle fallback. Correct mismatched manual-input/manual-file names.
- Flowchart and sequence arrow labels are text inputs. A reversible escape codec preserves existing line breaks and literal backslashes; escaped newline text can represent multiline labels in a single line.
- Fit is explicit state, distinct from numeric 100%. Manual zoom and panning leave Fit. On redraw, retain native SVG scale and a stable node's screen position; the whole-diagram viewBox remains unchanged for exports. Explicit Fit clears manual sizing and fits the entire diagram again.
- Shift-click toggles selection like Ctrl/Command-click. Shift-drag preserves existing selection while adding marquee contents. Shift+letter still creates shapes.
- New shape IDs find the first free S number across nodes, groups and named arrows. Existing IDs are never renamed.
- A pointer-transparent rounded overlay draws the orange focus ring above all canvas content.

Verification: `verification/refinements.mjs` covers menu bounds, label preservation, all creation bindings, unique IDs/icons, modifier selection, stable camera scale/location, Fit versus 100%, and pixel colour where a zoomed shape intersects the focus ring. Existing flowchart, sequence, source editor and export suites provide regression coverage. Read-only independent review is required before release.

Release evidence: production build passed. All 13 refinement journeys, 118 existing browser checks and 14 sequence-model checks passed, plus direct codec roundtrips for mixed backslashes and line breaks. Independent review completed with no remaining blockers. Pixel verification confirms the foreground orange ring remains visible where a zoomed shape crosses it.
