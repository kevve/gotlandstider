# Draft-first publishing workflow

This repo now supports a simple Git-as-CMS workflow where new content starts as a draft in the repo and only becomes public when `draft` is changed to `false`.

## Recommended flow

1. Add a new source file in `content/articles/`.
2. Start with:
   - `draft: true`
   - `featured: false`
3. Only add homepage-specific metadata when the content is meant to appear on the homepage.
4. For new videos, add a `video` block to the article and use an external embed provider instead of `legacy-local`.
5. Run:

```bash
npm run check:site
```

6. Save the draft in Decap CMS so it opens a `cms/articles/*` pull request.
7. If the PR is still a draft (`decap-cms/draft`) and passes CI, it auto-merges into `main`.
8. Publish later in a small follow-up PR by changing only `draft: true` to `draft: false`.
9. For non-draft Decap states, merge manually.

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

## Draft video-backed article template

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
draft: true
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

- `draft: true` keeps the content out of public JSON, public routes, sitemap, and homepage structured data.
- `draft: false` makes the content eligible for public generated output.
- New videos should use article front matter plus an external embed URL and a local thumbnail image.
- Video-backed articles should include `video.socialLinks`, using `null` for channels that are not used.
- New videos should not include `video.legacySources`.
- Decap editorial state is tracked on PR labels, not in article front matter.

See [Decap CMS workflow](/Users/kevin/Repos/Gotlandstider/gotlandstider/docs/decap-cms.md) for the auto-merge guardrails and branch protection setup.

## Useful commands

```bash
npm run build:site
npm run check:site
```

- `build:site` rebuilds generated content, static pages, SEO output, and CSS.
- `check:site` validates content, runs tests, and rebuilds the site end to end.
