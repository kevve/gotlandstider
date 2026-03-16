# Content sources

This folder is the source-of-truth workspace for the Git-as-CMS migration.
These files are validated, transformed, and published into generated JSON and static pages.

Current publishing note: the article files in this repo are still draft/testing content. They may be used to validate the build pipeline and generate local pages, but they are not yet included in public sitemap or other public SEO outputs.

## Folder layout

- `articles/`: Markdown articles with front matter
- `videos/`: JSON metadata for videos

## Article format

Article files live in `content/articles/` and use Markdown with YAML front matter.

Required front matter keys for the current migration plan:

- `title`
- `slug`
- `excerpt`
- `publishedAt`
- `updatedAt`
- `heroImage`
- `tags`
- `featured`
- `draft`

Example:

```md
---
title: Exempelartikel
slug: exempelartikel
excerpt: Kort sammanfattning för listor och förhandsvisningar.
publishedAt: 2026-03-15
updatedAt: 2026-03-15
heroImage: /content/example.webp
tags:
  - Gotland
  - Guide
featured: false
draft: true
---

Markdown-innehåll här.
```

## Video format

Video files live in `content/videos/` and use JSON.

Current planned keys:

- `title`
- `slug`
- `excerpt`
- `publishedAt`
- `thumbnail`
- `provider`
- `embedUrl`
- `socialLinks`
- `featured`
- `legacySources` for grandfathered `legacy-local` entries only

For the current grandfathered homepage videos, `provider` is set to `"legacy-local"` to reflect the existing repo-hosted media files. New videos should use metadata plus an external embed URL instead of committing new video binaries to the repo.

Rules for new video entries:

- use a non-legacy provider value such as `youtube`, `vimeo`, or another external embed source
- include a valid `embedUrl`
- use a local thumbnail image under `/content/`
- do not add `legacySources`
- do not use `provider: "legacy-local"` for new entries

Rules for existing grandfathered legacy videos:

- `provider` remains `"legacy-local"`
- `legacySources.webm` and `legacySources.mp4` are still required
- this mode is reserved for the current repo-hosted legacy video entries and should not be used for new content

Optional homepage-specific fields can live under a `homepage` object when the current landing page needs a small amount of presentation metadata, for example:

- `badge`
- `subtitle`
- `order`
- `description`
- `heading`
- `highlights`

## Naming guidance

- Keep filenames aligned with slugs when possible.
- Use stable slugs because later PRs will generate URLs from them.
- Prefer existing repo assets for sample content in this phase so the examples stay realistic and reviewable.
- Preserve Swedish characters such as `å`, `ä`, and `ö` in human-readable text fields like titles, excerpts, and article bodies.
