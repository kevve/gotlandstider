# Decap editorial publishing workflow

This repository uses Decap CMS editorial workflow as the primary publishing lifecycle:

- Draft
- In Review
- Ready
- Publish

Entries stay off `main` until you click **Publish** in Decap CMS.

## Three draft concepts

- `Decap draft`: an unpublished editorial workflow entry that lives on its own branch and PR until you publish it from Decap.
- `draft: true`: a merged article that stays hidden from public generated output.
- `GitHub draft PR`: a GitHub review flag only. It does not control Decap workflow state or site visibility.

## Recommended flow

1. Create or edit an article in Decap CMS.
2. Saving the entry as a draft creates or updates a Decap editorial-workflow PR.
3. Move the entry through Draft, In Review, and Ready as needed.
4. Run local checks when needed:

```bash
npm run check:site
```

5. Click **Publish** in Decap CMS to merge the PR into `main`.
6. GitHub Pages deploy runs from `main` and publishes the generated site.

## Intake automation flow

Use this flow when the Content Publisher skill is creating article drafts from `ready_for_upload/`:

1. Prepare a clean worktree:

```bash
npm run publisher:prepare -- --path ../gotlandstider-content-publisher
```

2. Run Content Publisher from that clean worktree, not from your everyday checkout.
3. Have Publisher assemble exactly one article source file under `content/articles/` with `draft: false`.
4. Run the publisher preflight in the clean worktree:

```bash
npm run publisher:preflight -- --expected content/articles/<slug>.md
```

5. Create or update branch `cms/articles/<slug>`, commit the article file, and push it.
6. Open or reuse the Decap PR with the helper:

```bash
npm run publisher:open-pr -- --branch cms/articles/<slug> --title "Create Decap draft article: <title>" --body "Decap draft article generated from the intake folder transcript via $content-writer."
```

7. The helper adds and verifies the required `decap-cms/draft` label. Branch naming alone is not enough for Decap Workflow visibility.
8. Confirm the PR appears in Decap CMS as an unpublished entry.
9. Click **Publish** in Decap CMS when the entry is ready to merge.

The publisher preflight intentionally restores generated files after `npm run check:site` so the PR stays limited to the single article source file while CI still validates the full site build.
The PR helper fails fast if the PR is not open against `main` or if the Decap workflow label is still missing, which keeps the intake folder from being archived too early.

## Frontmatter defaults

- `draft` is optional.
- If `draft` is omitted, it is treated as `false`.
- Use `draft: true` only when you intentionally want a merged article to stay hidden from public output.

## Article template

Copy this into a new file under `content/articles/`:

```md
---
title: Exempelrubrik
slug: exempelrubrik
excerpt: Kort sammanfattning som kan visas i listor och förhandsvisningar.
publishedAt: 2026-03-16
updatedAt: 2026-03-16
heroImage: /content/example.webp
tags:
  - Gotland
featured: false
---

Ingress eller brödtext här.
```

## Video-backed article template

Copy this into a new file under `content/articles/`:

```md
---
title: Exempelvideo
slug: exempelvideo
excerpt: Kort sammanfattning som kan visas i listor och förhandsvisningar.
publishedAt: 2026-03-16
updatedAt: 2026-03-16
heroImage: /content/example.webp
tags:
  - Gotland
featured: false
video:
  provider: youtube
  embedUrl: https://www.youtube.com/embed/VIDEO_ID
  thumbnail: /content/example.webp
  socialLinks:
    instagram: https://www.instagram.com/gotlandstider/
    tiktok: null
---

Ingress eller brödtext här.
```

Add a `homepage` block only when the article should appear in the homepage story section.

## Publishing rules

- `draft: true` keeps content out of public JSON, public routes, sitemap, and homepage structured data.
- `draft: false` (or omitted `draft`) makes content eligible for public generated output.
- New Content Publisher entries should start as Decap drafts with `draft: false` so Decap Publish makes them public on merge.
- New videos should use article front matter plus an external embed URL and a local thumbnail image.
- Video-backed articles should include `video.socialLinks`, using `null` for channels that are not used.
- New videos should not include `video.legacySources`.

## Decap and Pages artifact scope

The GitHub Pages artifact excludes `content/articles/`, but that does not block editorial work in Decap CMS.
Decap reads and writes the hosted GitHub repository directly, while Pages only serves the generated public output.

## One-time cleanup for existing `draft: true` entries on `main`

If older entries are already merged with `draft: true`, decide each one:

- keep hidden for now (`draft: true`), or
- publish publicly by changing to `draft: false`.

To list current candidates:

```bash
rg -n "^draft:\s*true$" content/articles/*.md
```

## Useful commands

```bash
npm run build:site
npm run check:site
```

- `build:site` rebuilds generated content, static pages, SEO output, and CSS.
- `check:site` validates content, runs tests, and rebuilds the site end to end.
