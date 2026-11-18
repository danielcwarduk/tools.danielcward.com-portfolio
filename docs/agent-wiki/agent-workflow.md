# Agent workflow observations

This page records a point-in-time view of the development workflow. It does not promise that these details remain true after the cited commit.

## Repository snapshot

On 2026-11-17, at commit `cefcf9f2989bd2189dbd4e0e0a243600c8128f4f`:

- `package.json` defined `dev`, `build`, and `preview` scripts; it did not define a package-level lint or test script.
- Browser verification scripts lived under `verification/`. `README.md` described using a production preview at port 5176 and running the browser scripts against it.
- `verification/diagram-types.mjs` and the other named scripts provided prior art for browser-level interaction and fallback checks.
- `.scratch/mermaid-studio-architecture/` contained earlier local architecture notes. Git reported `.scratch/` as untracked, so new notes were kept in a separate feature directory and the earlier architecture notes were left untouched.
- No repository-level `AGENTS.md` or existing wiki index was found in the inspected paths; the only discovered `AGENTS.md` was within `node_modules/cytoscape`.

## Verification improvements to consider

On 2026-11-17, repository inspection suggested two useful improvements before the diagram-editor backlog grows: document one standard command for launching the production preview and relevant browser suite, and add stable parser/serializer model checks alongside browser journeys. These are proposals, not approved tickets.

## Sources

- `package.json`, `README.md`, and `verification/diagram-types.mjs` at commit `cefcf9f2989bd2189dbd4e0e0a243600c8128f4f`.
- Git status and file inventory observed on 2026-11-17.
