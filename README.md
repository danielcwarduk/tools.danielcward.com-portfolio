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
