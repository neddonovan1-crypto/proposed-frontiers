# Proposed Frontiers / Sykes Picot

This repository contains the game served at https://sykespicot.io.

## Setup and checks

Use Node.js 22 or newer. Run `npm ci`, then `npm run build` and `npm test`.
Edit source files at the repository root, never generated `dist/` files directly. Rebuild and include the updated generated output with each release.

## Preserve

- Keep existing browser saves readable and the original storage key unchanged.
- Scores are recomputed by the server using the same chronicle engine as the browser.
- Never edit published database migrations, reset production data, or submit test league entries to production.
- Keep credentials outside the repository. Cloudflare account and database IDs in its config are identifiers, not credentials.
- Preserve historical source records in `docs/` and map data. Player-facing copy should be concise, without implementation notes or rule spoilers.

## Hosting

Production uses the existing `sykes-picot` Cloudflare Worker and `sykes-picot-league` D1 database. Build with `npm run build`; deploy with `npx wrangler@4.142.0 deploy --config cloudflare/wrangler.jsonc` only through an authorized deployment environment. See `cloudflare/README.md`.
