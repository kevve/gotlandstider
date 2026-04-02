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

The `publisher:*` commands below stay anchored in this repo for operators, but they execute the canonical helper implementations from the sibling `gotlandstider-ai` checkout.
Automation should use `/Users/kevin/Repos/Gotlandstider/gotlandstider-ai` as its only Codex workspace and point all article mutation at a dedicated clean site worktree for this repo.

1. Prepare a clean site worktree explicitly from the site repo. For automation rooted in `gotlandstider-ai`, run:

```bash
npm run publisher:prepare -- --repo-dir /Users/kevin/Repos/Gotlandstider/gotlandstider --path <publisher-worktree-path>
```

2. Run Content Writer in standalone bundle mode when you want to prepare the reusable intake artifact first. A standalone Writer run should:
   - create `ready_for_upload/<folder>/<slug>-content-bundle.md`
   - leave the intake folder in place
   - stop instead of overwriting an existing `*-content-bundle.md`
3. Run Content Publisher from that clean worktree, not from your everyday checkout. Have Publisher:
   - reuse and validate `ready_for_upload/<folder>/<slug>-content-bundle.md` when it already exists
   - stop and ask for a Writer rerun if an existing bundle file is invalid
   - call `$content-writer` only when the bundle file is missing
   - upload the intake video through `$youtube-uploader`
   - rerun the same uploader command exactly once under approved network access when the first uploader result is `status: "blocked"`
   - assemble `content/articles/<slug>.md` with `draft: false`
   - use the built-in GitHub plugin for branch, PR, and label work during automation runs instead of `gh`
   - optionally copy one intake JPG/JPEG cover into `content/<slug>-youtube-cover.<ext>` when the YouTube-backed article should use that local thumbnail
4. Run the publisher preflight in the clean worktree:

```bash
npm run publisher:preflight -- --expected content/articles/<slug>.md
```

If a cover image was copied into the repo, include it as a second expected tracked file:

```bash
npm run publisher:preflight -- --expected content/articles/<slug>.md --expected content/<slug>-youtube-cover.<ext>
```

5. Create or update branch `cms/articles/<slug>`, commit the article file and optional copied cover asset, and mirror that final source state to GitHub.
6. For manual operator runs, you may still open or reuse the Decap PR with the helper:

```bash
npm run publisher:open-pr -- --branch cms/articles/<slug> --title "Create Decap draft article: <title>" --body "Decap draft article generated from the intake folder transcript via $content-writer."
```

7. For automation runs, use the built-in GitHub plugin to open or reuse the PR against `main` and apply `decap-cms/draft`, `codex`, and `codex-automation`.
8. Confirm the PR appears in Decap CMS as an unpublished entry when direct verification is available. If not, report that the branch and labels are shaped correctly for Decap Workflow and leave the intake folder in place.
9. Treat successful local `publisher:preflight` as the hard automation gate. Report remote CI separately when it is not directly verifiable instead of blocking the run on `gh`.
10. Archive the processed intake folder only after successful local preflight, positive remote CI confirmation, successful Decap visibility confirmation, an uploader result of `status: "uploaded"`, and a final check that `ready_for_upload/<folder>/<slug>-content-bundle.md` is still present. The archived `_processed/.../<folder>/` copy should keep that bundle file.
11. If the YouTube upload finishes with `status: "partial"` or `status: "blocked"`, or remote CI or Decap visibility remains unresolved, keep the intake folder in place and treat the PR as a plain article draft that can be updated later.
12. Click **Publish** in Decap CMS when the entry is ready to merge.

The publisher preflight intentionally restores generated files after `npm run check:site` so the PR stays limited to the article source file and, when needed, one copied cover asset while CI still validates the full site build.
The manual PR helper fails fast if the PR is not open against `main` or if the Decap workflow label is still missing, which keeps the intake folder from being archived too early. The intake bundle file is an operator artifact and should remain with the source folder rather than being added to the article PR.
In this workflow, `status: "partial"` means the upload failed in an otherwise reachable runtime, while `status: "blocked"` means the runtime could not reach Google OAuth or the YouTube API even after the elevated-network retry.

## YouTube upload credentials

The uploader uses YouTube Data API OAuth credentials from the execution environment:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

Content Publisher should request `unlisted` uploads by default and record the actual returned privacy status in the operator summary.

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
  thumbnail: /content/example.jpg
  socialLinks:
    instagram: null
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
- Content Publisher may copy one intake JPG/JPEG into `/content/<slug>-youtube-cover.<ext>` and point `video.thumbnail` at that local asset.
- If YouTube rejects the custom-thumbnail API call but the video upload itself succeeds, Content Publisher may still use the copied local JPG/JPEG as the article thumbnail.
- If the YouTube upload does not return a usable embed URL, Content Publisher may still open a plain article draft PR without a `video` block and leave the intake folder unarchived for a later rerun.
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
