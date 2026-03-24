# Content sources

This folder is the source-of-truth workspace for the Git-as-CMS migration.
These files are validated, transformed, and published into generated JSON and static pages.

See [docs/publishing-workflow.md](/Users/kevin/Repos/Gotlandstider/gotlandstider/docs/publishing-workflow.md) for the recommended Decap editorial publishing flow and copy-paste templates.

## Folder layout

- `articles/`: Markdown articles with front matter

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

Optional nested keys:

- `draft` as an explicit visibility override (`false` by default when omitted)
- `video` for embedded or legacy-local video presentation
- `homepage` for featured homepage story metadata on video-backed articles

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
---

Markdown-innehåll här.
```

Example with optional video metadata:

```md
---
title: Exempelartikel med video
slug: exempelartikel-med-video
excerpt: Kort sammanfattning för listor och förhandsvisningar.
publishedAt: 2026-03-15
updatedAt: 2026-03-15
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
homepage:
  badge: Tips
  subtitle: Gotland • Guide
---

Markdown-innehåll här.
```

Article draft rules:

- `draft` is optional and defaults to `false`
- `draft: true` keeps the article out of generated public output even after merge
- `draft: false` (or omitted `draft`) allows the article to appear in generated public output
- Decap editorial workflow status is separate from `draft`; unpublished Decap entries stay off `main` even when the file itself uses `draft: false`
- Automated intake drafts must open their PRs through `npm run publisher:open-pr`, which applies the required `decap-cms/draft` label for Decap Workflow visibility
- New articles should start with `featured: false` unless they are intentionally being promoted

Video metadata rules:

Rules for new video entries:

- add a `video` object to the article front matter
- use a non-legacy `video.provider` value such as `youtube`, `vimeo`, or another external embed source
- include a valid `video.embedUrl`
- use a local `video.thumbnail` image under `/content/`
- include `video.socialLinks` as an object with `https` URLs or `null`
- do not add `video.legacySources`
- do not use `video.provider: legacy-local` for new entries

Rules for existing grandfathered legacy videos:

- `video.provider` remains `"legacy-local"`
- `draft: false` keeps the current public videos published
- `video.legacySources.webm` and `video.legacySources.mp4` are still required
- this mode is reserved for the current repo-hosted legacy video entries and should not be used for new content

Optional homepage-specific fields can live under a `homepage` object when the current landing page needs a small amount of presentation metadata, for example:

- `badge`
- `subtitle`
- `order`
- `description`
- `heading`
- `highlights`

Only add the `homepage` object when the content is intentionally meant to appear on the current homepage.

## Naming guidance

- Keep filenames aligned with slugs when possible.
- Use stable slugs because later PRs will generate URLs from them.
- Prefer existing repo assets for sample content in this phase so the examples stay realistic and reviewable.
- Preserve Swedish characters such as `å`, `ä`, and `ö` in human-readable text fields like titles, excerpts, and article bodies.
