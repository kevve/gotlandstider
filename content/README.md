# Content sources

This folder is the source-of-truth workspace for the Git-as-CMS migration.

Nothing in this folder is wired into the live site yet. These files establish the content model that later PRs will validate, transform, and publish into generated JSON and static pages.

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
- `legacySources`

For existing homepage videos, `provider` is set to `"legacy-local"` to reflect the current repo-hosted media files. Future videos are expected to prefer metadata plus an external embed URL instead of committing new video binaries to the repo.

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
