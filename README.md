# Daniel C Ward Tools

Public tools site for tools.danielcward.com.

- `/`: minimal tool picker.
- `/mermaid/`: Mermaid Studio, preserving the completed visual editor.
- Palette and locally hosted fonts match danielcward.com: olive `#3f4a24`, cream `#f6efe3`, orange `#b34a00`.
- Diagrams remain browser-local. Export `.mmd` files to move diagrams between devices or domains.

## Development

Run `npm ci`, then `npm run dev`. Run `npm run build` to build both pages into `dist/`. `npm run preview` serves the production build.

Browser verification: create `verification-results/`, launch the production preview on port 5176 and run `node verification/site.mjs`. `SITE_URL` overrides the preview origin. The suite covers the minimal homepage, actual brand colours, mobile layout, editor navigation and direct reload, visual editing, source download, zoom and browser-local persistence.

## Hosting

`.openai/hosting.json` stores the Sites identity and static output directory. Reuse that project ID for future updates. Source is synchronized through the Sites workflow helper; production deployments use a saved source version and matching build archive. The custom hostname requires the DNS routing and ownership-validation records returned by the hosting provider.

The original local editor remains in `/Users/clark/dev-projects/mermaid`; this project is the source for the hosted website.

Mermaid icon: official vector mark from https://mermaid.js.org/favicon.svg, recoloured in the site olive/cream palette. The Tools header has no icon.

## Reverse connections

Select an arrow or finish drawing a connection to show a small focused reverse button above it. Press Enter to reverse, Escape to dismiss, or use Reverse direction beside Delete in the connection menu. Reversal preserves the label, line style and endpoint markers. The menu action coalesces with pending edits using the existing 250 ms autosave. The floating action follows pan/zoom and does not steal focus from source or text editing. Run `node verification/reverse.mjs` against the production preview to verify these interactions.

## Unified editing

Double-left-click or right-click a shape or arrow to open its context editor with Label focused. R focuses shape choices (or arrow line type), F focuses colour, E focuses label, and F2 focuses ID. These controls also accept the same shortcuts while a non-text control has focus; arrow keys navigate the icon grids and Enter applies the focused choice. Text fields retain normal typing. Tab follows normal browser focus order; it no longer explicitly switches between source and canvas. The separate reshape picker is removed.

Arrow IDs are optional. New connections and ordinary label/style edits stay unnamed. Choosing a colour adds a short native Mermaid ID only when needed (`A e1@--> B`); users may also enter an explicit ID. Names are unique across nodes, subgraphs and arrows. Shared `studioEdgeColor_*` classes colour arrow lines, heads and labels without filling curved paths. Rename/delete/Default update class membership and remove unused preset definitions. Existing node colours and user classes are preserved.

For keyboard connections, select a source and press C, move through candidates with WASD, then press Enter to connect to the highlighted destination. Navigation leaves source and undo history unchanged until confirmation. Escape or C cancels. The fixed source has a dashed outline. Pointer selection and handle dragging still create connections immediately.

Verification: `node verification/unified-editor.mjs`, `node verification/keyboard-connect.mjs`, `node verification/reverse.mjs`, `node verification/label-gaps.mjs`, and `node verification/site.mjs` against the production preview.
