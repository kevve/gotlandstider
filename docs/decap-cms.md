# Decap CMS workflow

This repository uses Decap CMS native `editorial_workflow` for article publishing.

## Editorial lifecycle

Decap manages the lifecycle directly in the CMS UI:

- Draft
- In Review
- Ready
- Publish

When you click **Publish**, Decap merges the entry PR into `main`.

## Visibility model

Public visibility is controlled by article frontmatter:

- `draft: true` keeps the article non-public
- `draft: false` (or omitted `draft`) allows public generation

Important: Decap workflow status and site visibility are separate concepts. A merged entry with `draft: true` stays hidden on the public site.

## GitHub Actions model

The publishing pipeline is intentionally minimal:

1. PR CI runs `npm run check:site`.
2. Pushes to `main` run Pages build + deploy.
3. No custom Decap auto-merge workflow is used.

## Branch protection

Use branch protection on `main` with:

1. pull requests required
2. required status check `validate-and-build`

This keeps Decap and non-Decap changes on the same reviewed merge path.

## One-time cleanup for existing `draft: true` entries on `main`

If an older entry is already on `main` with `draft: true`, choose one:

- keep hidden for now, or
- set `draft: false` in a follow-up PR to publish it.

List current entries:

```bash
rg -n "^draft:\s*true$" content/articles/*.md
```
