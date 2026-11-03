# Cloudflare deployment

This entry point serves the built game in the owner's Cloudflare account. The league API uses the game's guest cookie for leaderboard identity. The former host's identity-header path has been removed; arbitrary request headers cannot select a player account. Existing Cloudflare player keys and scores are unchanged.

The production URL is https://sykespicot.io. The fallback URL, also used to verify the deployment during domain activation, is https://sykes-picot.neddonovan1.workers.dev. The `sykes-picot` Worker uses the dedicated `sykes-picot-league` D1 database through its `DB` binding. The custom domain and database ID are recorded in `wrangler.jsonc`.

Run from the project root:

```sh
npm run build
node --test cloudflare/adapter.test.mjs
WRANGLER_SEND_METRICS=false npx wrangler@4.142.0 d1 migrations apply DB --remote --config cloudflare/wrangler.jsonc
WRANGLER_SEND_METRICS=false npx wrangler@4.142.0 deploy --config cloudflare/wrangler.jsonc
```

The league schema is in `../drizzle/0000_complete_black_cat.sql`. Migrations apply only to the dedicated game database. Existing unrelated Workers and databases must not be modified. Wrangler retains the owner's approved OAuth access outside this repository; credentials must never be committed.

Browser saves belong to their original domain and do not automatically transfer to a new origin.

## Automatic releases

The private GitHub repository `neddonovan1-crypto/sykespicot` is connected to this Worker through Cloudflare Builds. Pushes to `main` run `npm run build && npm test`, followed by `npx wrangler@4.142.0 deploy --config cloudflare/wrangler.jsonc`. Preview builds are disabled. A dedicated `sykespicot build token` is retained by Cloudflare; no deployment credential belongs in the repository or Codex environment.

Cloud development uses Node.js 22 or newer and `npm ci`. Open the repository in a Codex cloud environment, make and test changes, then merge them into `main` to publish. The Mac does not have to be running.
