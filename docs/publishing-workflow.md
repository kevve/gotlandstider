# Decap editorial publishing workflow

This repository uses Decap CMS editorial workflow as the primary publishing lifecycle:

- Draft
- In Review
- Ready
- Publish

Entries stay off `main` until you click **Publish** in Decap CMS.

## Recommended flow

1. Create or edit an article in Decap CMS.
2. Move the entry through Draft, In Review, and Ready as needed.
3. Run local checks when needed:

```bash
npm run check:site
```

4. Click **Publish** in Decap CMS to merge the PR into `main`.
5. GitHub Pages deploy runs from `main` and publishes the generated site.

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
- New videos should use article front matter plus an external embed URL and a local thumbnail image.
- Video-backed articles should include `video.socialLinks`, using `null` for channels that are not used.
- New videos should not include `video.legacySources`.

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
