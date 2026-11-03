# Developing Proposed Frontiers

Proposed Frontiers is **vibe coded**: built and iterated with AI coding assistants. This repository includes the map editor, shared simulation logic, server, tests and design references.

## Build and test

Use Node.js 22 or newer and npm.

```sh
git clone https://github.com/neddonovan1-crypto/proposed-frontiers.git
cd proposed-frontiers
npm ci
npm run build
npm test
```

The build creates `dist/index.html`, fingerprinted browser assets and the Cloudflare Worker. Edit the source files at the repository root, then rebuild; do not edit generated `dist/` files directly.

For a local browser preview of the game, serve the built directory:

```sh
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. This static preview does not run the league API. League submissions require the Worker and a configured D1 database; see the [Cloudflare guide](cloudflare/README.md).

## Find the code

| Area | Location |
| --- | --- |
| Map editor markup and styles | `game.html`, `game.css` |
| Painting, assignments and map navigation | `map.js` |
| Map and compiled geographical data | `map-data.json`, `cell-metrics.json`, `db/hexes.json` |
| Shared chronicle and scoring engine | `chronicle.js` |
| Browser saves | `bootstrap.js` |
| League UI and server validation | `league.js`, `worker/league.mjs` |
| Database schema and migrations | `db/schema.ts`, `drizzle/` |
| Historical and design references | `docs/` |
| Automated tests and recorded playtests | `tests/`, `playtests/` |

## Working rules

- Preserve existing browser saves and the original storage key.
- Keep the browser and server on the same chronicle and scoring implementation.
- Do not edit published database migrations or submit test scores to the live league.
- Preserve historical source references and distinguish game fiction from historical evidence.

The optional geometry-compilation scripts require Playwright and a browser. Install Playwright in your development environment, or set `PLAYWRIGHT_MODULE` to an existing installation; use `CHROME_BIN` for your browser path. These tools are not required for the ordinary build or test commands above.

## Deployment

The [Cloudflare configuration and guide](cloudflare/README.md) describe the existing production installation. A separate deployment needs your own account, Worker, domain and D1 database. Keep credentials outside Git. The public GitHub workflow builds and tests only; it does not deploy to the live site.

See [AGENTS.md](AGENTS.md) for the full working agreement and [SOURCE_RELEASE.md](SOURCE_RELEASE.md) for the publication date and source revision.
