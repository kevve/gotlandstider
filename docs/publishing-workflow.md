# Draft-first publishing workflow

This repo now supports a simple Git-as-CMS workflow where new content starts as a draft in the repo and only becomes public when `draft` is changed to `false`.

## Recommended flow

1. Add a new source file in `content/articles/` or `content/videos/`.
2. Start with:
   - `draft: true`
   - `featured: false`
3. Only add homepage-specific metadata when the content is meant to appear on the homepage.
4. For new videos, use an external embed provider and do not use `legacy-local`.
5. Run:

```bash
npm run check:site
```

6. Open a pull request.
7. Merge the draft PR when you want the content saved in the repo but not yet public.
8. Publish later in a small follow-up PR by changing only `draft: true` to `draft: false`.

## Draft article template

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
draft: true
---

Ingress eller brödtext här.
```

## Draft video template

Copy this into a new file under `content/videos/`:

```json
{
  "title": "Exempelvideo",
  "slug": "exempelvideo",
  "excerpt": "Kort sammanfattning som kan visas i listor och förhandsvisningar.",
  "publishedAt": "2026-03-16",
  "thumbnail": "/content/example.webp",
  "provider": "youtube",
  "embedUrl": "https://www.youtube.com/embed/VIDEO_ID",
  "socialLinks": {
    "instagram": "https://www.instagram.com/gotlandstider/"
  },
  "featured": false,
  "draft": true
}
```

## Publishing rules

- `draft: true` keeps the content out of public JSON, public routes, sitemap, and homepage structured data.
- `draft: false` makes the content eligible for public generated output.
- Articles remain excluded from public SEO until the article launch work is intentionally revisited.
- New videos should use metadata plus an external embed URL and a local thumbnail image.
- New videos should not include `legacySources`.

## Useful commands

```bash
npm run build:site
npm run check:site
```

- `build:site` rebuilds generated content, static pages, SEO output, and CSS.
- `check:site` validates content, runs tests, and rebuilds the site end to end.
