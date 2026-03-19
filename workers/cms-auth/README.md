# Gotlandstider CMS auth worker

This Cloudflare Worker hosts the GitHub OAuth proxy used by Decap CMS at `https://www.gotlandstider.se/admin/`.

The implementation follows the same Decap popup flow used by `sterlingwes/decap-proxy`, with an added OAuth state-cookie check before the GitHub callback is accepted.

## Domain

- Worker URL: `https://cms-auth.gotlandstider.se`
- GitHub OAuth callback: `https://cms-auth.gotlandstider.se/callback`

## Configure

`wrangler.toml` is already set for the Gotlandstider zone and custom domain.

Add secrets before deploy:

```bash
npx wrangler secret put GITHUB_OAUTH_ID
npx wrangler secret put GITHUB_OAUTH_SECRET
```

Leave `GITHUB_REPO_PRIVATE` at `0` unless the repo becomes private.

## Commands

```bash
npm install
npm run check
npm run deploy
```

## Smoke test

1. Visit `https://cms-auth.gotlandstider.se/` and confirm the health response.
2. Open `https://www.gotlandstider.se/admin/`.
3. Sign in with GitHub and confirm the popup closes successfully.
