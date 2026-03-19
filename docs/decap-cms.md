# Decap CMS setup

This repo serves Decap CMS from `/admin/` and authenticates GitHub logins through a Cloudflare Worker hosted at `https://cms-auth.gotlandstider.se`.

## Branch workflow

Create and work from a clean branch so the Decap setup stays isolated from in-progress content work.

Recommended command:

```bash
git worktree add /tmp/gotlandstider-decap -b codex/decap-cms origin/main
```

## Repo-side changes

- `admin/index.html` loads the Decap CMS app from the CDN.
- `admin/config.yml` points Decap at `kevve/gotlandstider` on `main` and uses `publish_mode: editorial_workflow`.
- `.github/workflows/deploy-pages.yml` now publishes `/admin/` to GitHub Pages.
- `.github/workflows/sync-generated-site.yml` rebuilds and commits tracked generated outputs after source changes land on `main`.
- `scripts/lib/content-validation.mjs` normalizes blank optional Decap social links to `null` before validation.

## GitHub OAuth app

Create a GitHub OAuth App under the GitHub account that owns the repo.

Use:

- Homepage URL: `https://cms-auth.gotlandstider.se`
- Authorization callback URL: `https://cms-auth.gotlandstider.se/callback`

Save the client ID and client secret for the Cloudflare Worker secrets.

## Cloudflare worker

The worker source is vendored in `workers/cms-auth/` and is based on the Decap Cloudflare proxy flow used by `sterlingwes/decap-proxy`.

### Worker config

`workers/cms-auth/wrangler.toml` is preconfigured for:

- worker name: `gotlandstider-cms-auth`
- custom domain: `cms-auth.gotlandstider.se`
- zone: `gotlandstider.se`
- `workers_dev = false`

### Required secrets

Set these secrets in the worker before deploy:

```bash
cd workers/cms-auth
npx wrangler secret put GITHUB_OAUTH_ID
npx wrangler secret put GITHUB_OAUTH_SECRET
```

Because `kevve/gotlandstider` is public, `GITHUB_REPO_PRIVATE` can stay at `0`.

### Deploy

```bash
cd workers/cms-auth
npm install
npx wrangler deploy
```

After deploy, verify:

- `https://cms-auth.gotlandstider.se/` responds with the worker health page
- `https://www.gotlandstider.se/admin/` loads the CMS

## GitHub settings check

Decap creates `cms/...` branches and PRs against `main`.

Before relying on CMS publishing, confirm:

- your editor GitHub account has write access to `kevve/gotlandstider`
- branch protection does not prevent the CMS publish action from merging, or you are prepared to merge the CMS PRs manually in GitHub

## Smoke test

1. Open `https://www.gotlandstider.se/admin/`.
2. Click the GitHub login button and complete OAuth through `cms-auth.gotlandstider.se`.
3. Create a draft article with:
   - `draft: true`
   - a hero image uploaded into `/content/`
4. Save the draft and confirm Decap opens a `cms/articles/...` pull request against `main`.
5. Merge or publish the PR.
6. Confirm the sync workflow commits updated tracked outputs if `generated/`, `articles/`, `index.html`, `output.css`, or `sitemap.xml` changed.
7. Confirm the GitHub Pages deploy completes and the resulting article renders correctly.
