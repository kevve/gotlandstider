# Gotlandstider

Gotlandstider is the public website for [www.gotlandstider.se](https://www.gotlandstider.se), currently built as a simple static site with HTML, JavaScript, and Tailwind-generated CSS.

The current production site continues to be served from the repository root. This repo is being migrated incrementally toward an agent-friendly publishing setup where articles and videos can be added through structured content files and deployed automatically, without breaking the existing site along the way.

## Current site structure

- `index.html`: current homepage
- `navscripts.js`: navigation and scroll interactions
- `storyscripts.js`: story modal/archive interactions
- `src/input.css` -> `output.css`: Tailwind source and generated CSS
- `content/`: images and current legacy video assets

## Publishing migration direction

The target state is a Git-as-CMS workflow with:

- articles stored as Markdown with front matter
- videos stored as structured JSON metadata
- generated JSON indexes committed under `generated/content/`
- static archive/detail pages for articles and videos
- GitHub Actions used for validation, build, and deployment

For new videos, the preferred publishing model is metadata plus an external embed and local thumbnail image. The current repo-hosted video files are grandfathered legacy entries and should not be used as the pattern for new content.

The migration is intentionally split into small, reviewable pull requests so each step is safe to test and easy to roll back.

See [docs/publishing-architecture.md](/Users/kevin/Repos/Gotlandstider/gotlandstider/docs/publishing-architecture.md) for the implementation approach and folder responsibilities.

## Local development

Install dependencies:

```bash
npm install
```

Build CSS once:

```bash
npm run build
```

Watch CSS during development:

```bash
npm run dev
```

Run the full validation and static build pipeline locally:

```bash
npm run validate:content
npm run build:content
npm run test:content
npm run build:pages
npm run test:pages
npm run test:seo
npm run build:seo
npm run build
```

## Deployment

GitHub Pages deployment is handled by [`.github/workflows/deploy-pages.yml`](/Users/kevin/Repos/Gotlandstider/gotlandstider/.github/workflows/deploy-pages.yml). On pushes to `main`, it:

- installs dependencies with `npm ci`
- validates content
- rebuilds generated content and static pages
- regenerates `sitemap.xml` and homepage structured data
- rebuilds `output.css`
- stages the public site into a GitHub Pages artifact
- deploys that artifact with GitHub Actions

The staged Pages artifact includes the production files and directories the site currently needs:

- `index.html`
- `articles/`
- `videos/`
- `generated/`
- `content/` asset files only
- `fonts/`
- `navscripts.js`
- `storyscripts.js`
- `output.css`
- `favicon-v2.svg`
- `robots.txt`
- `sitemap.xml`
- `CNAME`

Source content files remain in the repo, but the deploy artifact excludes:

- `content/articles/`
- `content/videos/`

This keeps Markdown article sources and video JSON metadata private even though the rest of `/content/` is still used for public assets.

Public SEO scope is intentionally limited for now:

- the sitemap includes the homepage and public video routes
- homepage structured data includes the public homepage videos
- article routes are still excluded from sitemap and other public SEO features until the article content is ready to publish

Manual repo setup for the first deploy:

1. In GitHub repo settings, open Pages.
2. Set the build and deployment source to GitHub Actions if it is still publishing from a branch.
3. Merge the deploy workflow PR and confirm the first Actions deploy completes successfully.

## Planned workspace folders

- `content/articles/`: future article source files
- `content/videos/`: future video metadata files
- `generated/content/`: future generated indexes consumed by the site
- `scripts/`: future validation/build scripts
- `templates/`: future static page templates

## Notes

- `CNAME` must remain in place for GitHub Pages and the custom domain.
- Existing URLs, assets, and homepage behavior should stay stable until later migration PRs explicitly change them.
