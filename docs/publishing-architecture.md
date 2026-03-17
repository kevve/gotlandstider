# Publishing architecture

## Current state

Gotlandstider is currently a simple static site served from the repository root with:

- `index.html` for the homepage
- `navscripts.js` and `storyscripts.js` for behavior
- `output.css` generated from Tailwind
- media assets stored under `content/`

This migration keeps that production setup working while we incrementally add a content publishing workflow.

## Migration principles

- Keep the current homepage and URLs working throughout the migration.
- Ship small pull requests that are easy to review, test, and roll back.
- Prefer Git as CMS: content files in the repo, generated static output, and GitHub Actions for automation.
- Avoid framework migration unless it becomes clearly necessary later.
- Treat video-backed stories as articles with optional video metadata, while keeping current repo-hosted videos working during the transition.

## Planned folders

- `content/articles/`: article source files in Markdown with front matter.
- `generated/content/`: committed generated indexes such as `articles.json`, `homepage.json`, and `featured.json`.
- `scripts/`: Node-based validation and build scripts.
- `templates/`: static HTML templates used to generate archive and detail pages.

## Planned publishing flow

1. Add structured article source files under `content/`.
2. Validate source files with lightweight scripts before generation.
3. Generate JSON indexes under `generated/content/`.
4. Generate static archive and detail pages under `/articles/`.
5. Update the homepage to read generated featured content instead of hardcoded data.
6. Add GitHub Actions for validation, build, and deployment to GitHub Pages.
7. Block new repo-hosted video binaries for future content while preserving legacy entries through article metadata.

## Non-goals for the early PRs

- No redesign of the site.
- No framework rewrite.
- No change to `CNAME`, Pages compatibility, or existing asset paths.
- No removal of legacy hardcoded content until generated content is proven to work.

## Review expectations

Each PR in the migration should be independently testable and keep the site deployable. If a PR introduces risk that is not easy to roll back, it is too large and should be split further.
