# Proposed Frontiers

**Vibe coded.** Built with AI coding assistants. The source, tests and development documentation are published here.

[Development guide](DEVELOPMENT.md) · [Source release notes](SOURCE_RELEASE.md)

**[Play Proposed Frontiers](https://sykespicot.io)** — draw borders in January 1916 and explore the alternate-history consequences.

A January 1916 border-drawing game. Existing browser proposals retain the original storage key.

## Editable source

- `game.html`, `game.css`: map and editor markup/styles.
- `map.js`: painting, assignments, overlays, city cells, navigation and Results rendering.
- `map-data.json`: map overlays, city geometry and compact legacy-save migration data.
- `cell-metrics.json`: compiled premerge land coverage/pick points; regenerate alongside geometry changes. Legacy migration data is fetched only for version-2 saves.
- `chronicle.js`: deterministic alternate-history events and 40/40/20 league scoring; shared by browser and server.
- `chronicle.css`: intro, chronicle and league styling.
- `league.js`: shared score form and board.
- `bootstrap.js`: local save storage, preserving the original save key.
- `worker/league.mjs`: validates submissions, recomputes outcomes and stores each player's best result per 7-day league round in D1. Rounds use fixed UTC boundaries (7 days from the Unix epoch); old scores remain stored and are excluded from the current board. The first release of rounds starts a fresh board; pre-round scores remain untouched. No scheduled database deletion or migration is required.
- `db/hexes.json`: authoritative playable hex IDs, adjacency, city/port tags and mapped Iraqi Shia-wash area. When changing map geometry, regenerate this registry from the same `chronicleInput()` calculation and verify complete coverage before publishing.
- `scripts/compile-anatolia.mjs`: tags the canonical hex registry with the approximate Anatolian game boundary. Run it after changing the boundary or hex geometry; the build passes the same tags to browser and server scoring.
- `db/schema.ts`, `drizzle/`: generated database schema migrations. Published migrations are immutable.

`npm test` checks branching rules and server-side scoring. `npm run build` creates the native standalone page and Cloudflare Worker in `dist/`; do not edit generated output.

The chronology is game fiction grounded in historical pressures. Trigger checks use actual assigned city cells and topology; polity names never supply territorial boundaries. The Shia rule counts only `Imamate` + `Shia` and compares mapped wash area, not population. Old version-2 and version-3 local proposals remain readable.

Production is hosted on Cloudflare at https://sykespicot.io, with its dedicated D1 database bound as `DB`. Deployment instructions are in `cloudflare/README.md`. No test scores are seeded in production.

Build output serves fingerprinted scripts/data with immutable cache headers. The build derives the Oman-adjacent hex tag from the fixed Oman outline for both browser and server. Historical sources and counterfactual boundaries for the expanded stories are recorded in `docs/historical-branches.md`. Event keys remain stable when newspaper headlines are edited, preserving score rules. Survival counts include created political territories, exclude shared commons, and count changes of government as survival unless the territory is dissolved or absorbed.

`railways.json` records the January 1916 network and source notes. The build draws each section once, with sleeper marks reusing its geometry. Unfinished Taurus/Amanus connections and the interrupted Alexandretta branch have broken lines; the Baghdad–Samarra section remains isolated. `scripts/compile-railways.cjs` produces the operating-route and Rayak-junction tags in `railway-metrics.json`, used identically by browser and league scoring. These are schematic regional alignments, not surveyed track coordinates.

`ethnicity-metrics.json` stores seven mapped-area categories per canonical hex, including absorbed edge fragments. Regenerate with `scripts/compile-ethnicity.cjs` after changing the ethnicity wash or hex geometry. These are area categories, not census population counts. Both compilers accept `PLAYWRIGHT_MODULE` and `CHROME_BIN` when the development machine does not provide them by default.

The build deduplicates coastline/playable geometry and wash paths, losslessly packs cached centroids, excludes unused evidence fields from the browser payload, and minifies shipped scripts and styles. Original geometry and source evidence remain in the editable files. No image rasterisation or geometry simplification is used.

## Cloud development

Open this repository in a cloud development environment or GitHub Codespaces. Use Node.js 22, with `npm ci` as the setup command. Validate changes with `npm run build && npm test`. Cloud environments do not depend on the original Mac being online.

For the maintainer’s existing production Cloudflare Workers Builds integration, use the production development repository connected to the `sykes-picot` Worker, use branch `main`, build command `npm run build && npm test`, and deploy command `npx wrangler@4.142.0 deploy --config cloudflare/wrangler.jsonc`. Keep deployment credentials in Cloudflare, not this repository.
